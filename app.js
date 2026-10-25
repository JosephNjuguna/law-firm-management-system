import dns from "node:dns";
import net from "node:net";

dns.setDefaultResultOrder("ipv4first");
net.setDefaultAutoSelectFamily(false);

import "dotenv/config";
import http from "http";
import crypto from "crypto";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const SECRET = process.env.SESSION_SECRET;
if (!SECRET) console.error("SESSION_SECRET is not set");

function signToken(payload) {
    const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 12 })).toString("base64url");
    const sig = crypto.createHmac("sha256", SECRET || "").update(body).digest("base64url");
    return `${body}.${sig}`;
}

function verifyToken(token) {
    const [body, sig] = (token || "").split(".");
    if (!body || !sig) return null;
    const expected = crypto.createHmac("sha256", SECRET || "").update(body).digest("base64url");
    const a = Buffer.from(sig), b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    try {
        const data = JSON.parse(Buffer.from(body, "base64url").toString());
        return data.exp > Date.now() ? data : null;
    } catch {
        return null;
    }
}





async function setupTables() {
    await sql`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL
    )`;

    await sql`CREATE TABLE IF NOT EXISTS cases (
        id SERIAL PRIMARY KEY,
        case_no INT NOT NULL,
        date_filed DATE NOT NULL,
        absolute_url TEXT,
        attorney TEXT,
        case_name TEXT,
        court TEXT,
        status TEXT,
        syllabus TEXT,
        customer_id INT REFERENCES users(id),
        lawyer_id INT REFERENCES users(id),
        UNIQUE (date_filed, case_no)
    )`;
}












//HELPER FUNCTIONS
function send(res, status, data) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
            try {
                resolve(JSON.parse(body || "{}"));
            } catch {
                reject(new Error("Invalid JSON"));
            }
        });
        req.on("error", reject);
    });
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}

function passwordMatches(password, saved) {
    const [salt, hash] = saved.split(":");
    const attempt = crypto.scryptSync(password, salt, 64).toString("hex");
    return attempt === hash;
}

function getLoggedInUser(req) {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    return verifyToken(token);
}







// DATABASE INTERACTION FUNCTIONS
async function createUser(req, res) {
    const { username, password, role } = await readBody(req);
    if (!username || !password || !role) {
        return send(res, 400, { error: "username, password and role are required" });
    }

    const count = await sql`SELECT COUNT(*)::int AS n FROM users`;
    const isFirstUser = count[0].n === 0;
    const me = getLoggedInUser(req);

    if (!isFirstUser && me?.role !== "admin") {
        return send(res, 403, { error: "Only an admin can create users" });
    }

    try {
        await sql`INSERT INTO users (username, password_hash, role)
                  VALUES (${username}, ${hashPassword(password)}, ${role})`;
        send(res, 200, { message: "User created" });
    } catch (err) {
        if (err.code === "23505") return send(res, 409, { error: "Username already exists" });
        console.error(err);
        send(res, 500, { error: "Server error" });
    }
}

async function login(req, res) {
    const { username, password } = await readBody(req);
    const rows = await sql`SELECT * FROM users WHERE username = ${username}`;
    const user = rows[0];

    if (!user || !passwordMatches(password, user.password_hash)) {
        return send(res, 401, { error: "Wrong username or password" });
    }

    const token = signToken({ username: user.username, role: user.role });
    send(res, 200, { token, username: user.username, role: user.role });
}

async function saveCases(req, res) {
    if (!getLoggedInUser(req)) return send(res, 401, { error: "Please log in" });

    const body = await readBody(req);
    const list = body.cases;

    if (!Array.isArray(list) || list.length === 0) {
        return send(res, 400, { error: "cases must be a non-empty array" });
    }

    for (const c of list) {
        if (!c.caseNo || !c.caseName || !/^\d{4}-\d{2}-\d{2}$/.test(c.dateFiled || "")) {
            return send(res, 400, { error: "Each case needs caseNo, caseName and dateFiled (YYYY-MM-DD)" });
        }
        if (!Number.isInteger(c.customerId) || !Number.isInteger(c.lawyerId)) {
            return send(res, 400, { error: `Select a customer and lawyer for "${c.caseName}"` });
        }
    }

    let saved = 0;
    let skipped = 0;

    for (const c of list) {
        const rows = await sql`
            INSERT INTO cases (case_no, date_filed, absolute_url, attorney, case_name,
                               court, status, syllabus, customer_id, lawyer_id)
            VALUES (${c.caseNo}, ${c.dateFiled}, ${c.absoluteUrl ?? ""}, ${c.attorney ?? ""},
                    ${c.caseName}, ${c.court ?? ""}, ${c.status ?? ""}, ${c.syllabus ?? ""},
                    ${c.customerId}, ${c.lawyerId})
            ON CONFLICT (date_filed, case_no) DO NOTHING
            RETURNING case_no`;

        if (rows.length) saved++; else skipped++;
    }

    send(res, 200, { saved, skipped });
}

async function GetUsersByRole(req, res, role) {
    try {
        const user = getLoggedInUser(req);

        if (!user) return send(res, 401, { error: "Please log in" });
        if (user.role !== "admin") return send(res, 403, { error: "Admins only" });

        const rows = await sql`SELECT id, username FROM users WHERE role = ${role} ORDER BY username`;
        send(res, 200, rows);
    } catch (err) {
        console.error(err);
        send(res, 500, { error: "Server error" });
    }
}








async function getCases(req, res) {
    const user = getLoggedInUser(req);
    if (!user) return send(res, 401, { error: "Please log in" });

    if (!["admin", "lawyer", "customer"].includes(user.role)) {
        return send(res, 403, { error: "Not allowed" });
    }

    let rows;
    if (user.role === "admin") {
        rows = await sql`
            SELECT case_no AS id, absolute_url, attorney, case_name AS "caseName", court,
                   to_char(date_filed, 'YYYY-MM-DD') AS "dateFiled", status, syllabus
            FROM cases`;
    } else if (user.role === "lawyer") {
        rows = await sql`
            SELECT case_no AS id, absolute_url, attorney, case_name AS "caseName", court,
                   to_char(date_filed, 'YYYY-MM-DD') AS "dateFiled", status, syllabus
            FROM cases
            WHERE lawyer_id = (SELECT id FROM users WHERE username = ${user.username})`;
    } else {
        rows = await sql`
            SELECT case_no AS id, absolute_url, attorney, case_name AS "caseName", court,
                   to_char(date_filed, 'YYYY-MM-DD') AS "dateFiled", status, syllabus
            FROM cases
            WHERE customer_id = (SELECT id FROM users WHERE username = ${user.username})`;
    }

    send(res, 200, rows);
}












// DATABASE SETUP
async function withRetry(fn, retries = 5, delayMs = 2000) {
    for (let i = 1; i <= retries; i++) {
        try {
            return await fn();
        } catch (err) {
            console.error(`DB attempt ${i}/${retries} failed: ${err.code || err.message}`);
            if (i === retries) throw err;
            await new Promise((r) => setTimeout(r, delayMs * i));
        }
    }
}

let tablesReady;
function ensureTables() {
    tablesReady ??= withRetry(setupTables).catch((e) => { tablesReady = undefined; throw e; });
    return tablesReady;
}

const requestHandler = async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

    try {
        await ensureTables();
        const route = `${req.method} ${new URL(req.url, "http://x").pathname}`;

        if (route === "POST /api/addusers") {
            return await createUser(req, res);
        }
        if (route === "POST /api/login") {
            return await login(req, res);
        }
        if (route === "POST /api/cases") {
            return await saveCases(req, res);
        }
        if (route === "GET /api/customers") {
            return await GetUsersByRole(req, res, "customer");
        }
        if (route === "GET /api/lawyers") {
            return await GetUsersByRole(req, res, "lawyer");
        }
        if (route === "GET /api/getcases") {
            return await getCases(req, res);
        }
        send(res, 404, { error: "Not found" });
    } catch (err) {
        console.error(err);
        send(res, 500, { error: "Server error" });
    }
};













export default requestHandler;

if (!process.env.VERCEL) {
    http.createServer(requestHandler).listen(3000, () => {
        console.log("Server running at http://localhost:3000");
    });
}