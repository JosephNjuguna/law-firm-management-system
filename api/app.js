import 'dotenv/config';
import http from "http";
import crypto from "crypto";
import pg from "pg";

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10,
});

pool.on("error", (err) => {
    console.error("Unexpected pg pool error:", err.message);
});

async function sql(strings, ...values) {
    const text = strings[0] + values.map((_, i) => `$${i + 1}${strings[i + 1]}`).join("");
    const result = await pool.query(text, values);
    return result.rows;
}

const sessions = new Map();

async function setupTables() {
    await sql`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL
  )`;
}

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

// Reads the token from the "Authorization: Bearer xxx" header
function getLoggedInUser(req) {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    return sessions.get(token);
}

async function createUser(req, res) {
    const { username, password, role } = await readBody(req);

    console.log(username, password, role);

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
        console.log(err);

        send(res, 400, { error: "Username already exists" });
    }
}

const requestHandler = async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
    try {
        const route = `${req.method} ${req.url}`;

        if (route === "POST /api/addusers") {
            return await createUser(req, res);
        }

        send(res, 404, { error: "Not found" });
    } catch (err) {
        console.error(err.message);
        console.log(err.message);

        if (err.message === "Invalid JSON") {
            return send(res, 400, { error: "Send the body as JSON" });
        }
        send(res, 500, { error: "Server error" });
    }
};

setupTables().then(() => {
    http.createServer(requestHandler).listen(3000, () => {
        console.log("Server running at http://localhost:3000");
    });
});

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

await withRetry(setupTables);