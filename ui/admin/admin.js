import { toFetch } from "../api/api.js";

const CASES = {};

// helpers
const uisection = id => document.getElementById(id);
const pad = n => String(n).padStart(2, "0");
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayOf = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const monthOf = d => new Date(d.getFullYear(), d.getMonth(), 1);
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const getCases = key => CASES[key] ?? [];

const fmtLong = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" });
const fmtHeading = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });
const fmtMonth = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

const today = dayOf(new Date());
let selected = today;
let view = monthOf(today);

function renderCalendar() {
    uisection("monthLabel").textContent = fmtMonth.format(view);
    const grid = uisection("grid");
    grid.innerHTML = "";

    const todayKey = keyOf(today);
    const selectedKey = keyOf(selected);
    const start = new Date(view.getFullYear(), view.getMonth(), 1 - view.getDay());

    for (let i = 0; i < 42; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const key = keyOf(d);
        const b = document.createElement("button");
        b.type = "button";
        b.className = "day";
        b.textContent = d.getDate();
        b.classList.toggle("out", d.getMonth() !== view.getMonth());
        b.classList.toggle("today", key === todayKey);
        b.classList.toggle("selected", key === selectedKey);
        b.addEventListener("click", () => {
            selected = d;
            view = monthOf(d);
            render();
            renderCases();
            adminuisection("fecthcasesbutton").style.color = "black";
            adminuisection("casesrecordsbutton").style.color = "blue";
            adminuisection("usersbutton").style.color = "black";

            adminuisection("fetch-cases-list").style.display = "none";
            adminuisection("saved-cases-list").style.display = "";
            adminuisection("user-section").style.display = "none";
        });
        grid.appendChild(b);
    }
}

function shiftMonth(n) {
    view = new Date(view.getFullYear(), view.getMonth() + n, 1);
    renderCalendar();
}

uisection("todayLabel").textContent = fmtLong.format(today);
uisection("prev").addEventListener("click", () => shiftMonth(-1));
uisection("next").addEventListener("click", () => shiftMonth(1));
uisection("todayBtn").addEventListener("click", () => {
    selected = today;
    view = monthOf(today);
    render();
    renderCases();
    uisection("case-detail").style.display = "none";

    adminuisection("fecthcasesbutton").style.color = "black";
    adminuisection("casesrecordsbutton").style.color = "blue";
    adminuisection("usersbutton").style.color = "black";

    adminuisection("fetch-cases-list").style.display = "none";
    adminuisection("saved-cases-list").style.display = "";
    adminuisection("user-section").style.display = "none";
});
























// const API = "http://localhost:3000";
const API = "https://law-firm-management-system-nfgpma7t1-josephnjugunas-projects.vercel.app";

const token = localStorage.getItem("token");
let customers = [], lawyers = [], currentList = [];


// in sidebar nav
const adminuisection = id => document.getElementById(id);
adminuisection("saved-cases-list").style.display = "none";
adminuisection("user-section").style.display = "none";
adminuisection("fecthcasesbutton").style.color = "blue";

//button to swicth to ui that allows admin to render case
adminuisection("fecthcasesbutton").addEventListener("click", () => {
    adminuisection("fecthcasesbutton").style.color = "blue";
    adminuisection("casesrecordsbutton").style.color = "black";
    adminuisection("usersbutton").style.color = "black";

    adminuisection("fetch-cases-list").style.display = "";
    adminuisection("saved-cases-list").style.display = "none";
    adminuisection("user-section").style.display = "none";
})

//i get all cases
uisection('fetchcases').addEventListener("click", async () => {
    await loadPeople();
    const fetched = await toFetch(uisection("from").value, uisection("to").value);
    saveCasesToObject(fetched);
    renderFetchedCases();
});

// i save the fetched data to objects
// with key as date then inside it
// the value is all important data
function saveCasesToObject(fetched) {
    const list = Array.isArray(fetched) ? fetched : (fetched?.results ?? []);
    const grouped = {};
    for (const c of list) {
        const date = String(c.dateFiled ?? "").slice(0, 10);
        if (!date) {
            continue;
        }
        (grouped[date] ??= []).push({
            id: grouped[date].length + 1,          // display only, don't save this
            caseNo: String(c.cluster_id ?? ""),    // real unique ID from CourtListener
            docketNumber: c.docketNumber ?? "",
            absolute_url: c.absolute_url ?? "",
            attorney: c.attorney ?? "",
            caseName: c.caseName ?? "",
            court: c.court ?? "",
            dateFiled: date,
            status: c.status ?? "",
            syllabus: c.syllabus ?? ""
        });
    }
    Object.assign(CASES, grouped);
    console.log(CASES);
    return grouped;
}

// since i need to assign cases to users and lawyers
// i need to create those users on the db
//then i render those users in order to assign them cases
async function loadPeople() {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    try {
        const customersRes = await fetch(`${API}/api/customers`, { headers });
        if (!customersRes.ok) throw new Error("Failed to load customers");
        customers = await customersRes.json();

        const lawyersRes = await fetch(`${API}/api/lawyers`, { headers });
        if (!lawyersRes.ok) throw new Error("Failed to load lawyers");
        lawyers = await lawyersRes.json();
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
}

// populate the option section with the users(lawyers/clients)
function optionsHtml(items, placeholder) {
    // First is empty "Select..." choice
    let html = `<option value="">${placeholder}</option>`;
    // Add one <option> per user
    for (const user of items) {
        html += `<option value="${user.id}">${esc(user.username)}</option>`;
    }
    return html;
}

//then i render all those cases with(users/lawyers) options set.
function getAllCases() {
    return Object.values(CASES).flat().sort((a, b) => b.dateFiled.localeCompare(a.dateFiled));
}

// i populate the ui witht he fatched cases immediately they are fecthed
function renderFetchedCases() {
    uisection("fetched-cases-list").style.display = "";
    currentList = getAllCases();
    uisection("fetch-total").textContent = currentList.length;
    uisection("fetched-cases").innerHTML = currentList.length
        ? currentList.map((c, i) => `
            <div class="row" data-index="${i}">
                <label class="pick">
                    <input type="checkbox" class="case-check">
                    <span>
                        <div class="title">${esc(c.caseName)}</div>
                        <div class="meta">${esc(c.court)} · Filed ${esc(c.dateFiled)}</div>
                    </span>
                </label>
                <span class="badge">New</span>
                <select class="customer-select" aria-label="Assign customer to ${esc(c.caseName)}">
                    ${optionsHtml(customers, "Select Customer")}
                </select>
                <select class="lawyer-select" aria-label="Assign lawyer to ${esc(c.caseName)}">
                    ${optionsHtml(lawyers, "Assign Lawyer")}
                </select>
            </div>`).join("")
        : '<div class="empty">No cases fetched yet.</div>';
}

// listen to when a case is selected then update ui accordingly
uisection("fetched-cases").addEventListener("change", e => {
    if (e.target.classList.contains("case-check")) {
        uisection("fetch-selected").textContent = document.querySelectorAll("#fetched-cases .case-check:checked").length;
    }
});

//then i save selected cases to a database
document.querySelector(".savebutton .btn").addEventListener("click", async e => {
    const btn = e.currentTarget;
    if (!token) return alert("Please log in first.");

    const rows = [...document.querySelectorAll("#fetched-cases .row")]
        .filter(r => r.querySelector(".case-check").checked);
    if (!rows.length) return alert("Select at least one case.");

    const payload = [];
    for (const r of rows) {
        const c = currentList[r.dataset.index];
        const customerId = r.querySelector(".customer-select").value;
        const lawyerId = r.querySelector(".lawyer-select").value;

        if (!customerId || !lawyerId) {
            return alert(`Pick a customer and a lawyer for "${c.caseName}".`);
        }

        payload.push({
            caseNo: c.caseNo,
            dateFiled: c.dateFiled,
            absoluteUrl: c.absolute_url,
            attorney: c.attorney,
            caseName: c.caseName,
            court: c.court,
            status: c.status,
            syllabus: c.syllabus,
            customerId: Number(customerId),
            lawyerId: Number(lawyerId)
        });
    }

    btn.disabled = true;
    try {
        const res = await fetch(`${API}/api/cases`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ cases: payload })   // matches backend
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Save failed");
        alert(`Saved ${data.saved} case(s)${data.skipped ? `, ${data.skipped} already existed` : ""}.`);
    } catch (err) {
        console.error(err);
        alert(err.message);
    } finally {
        btn.disabled = false;
    }
});








let loadedCases = [];

adminuisection("casesrecordsbutton").addEventListener("click", () => {
    adminuisection("fecthcasesbutton").style.color = "black";
    adminuisection("casesrecordsbutton").style.color = "blue";
    adminuisection("usersbutton").style.color = "black";

    adminuisection("fetch-cases-list").style.display = "none";
    adminuisection("saved-cases-list").style.display = "";
    adminuisection("user-section").style.display = "none";
    renderCases();
});

// function to render saved cases in the ui
async function renderCases() {
    uisection("case-detail").style.display = "none";
    uisection("heading").textContent = `${fmtHeading.format(selected)} Cases`;
    uisection("total").textContent = "…";
    uisection("saved-cases").innerHTML = '<div class="empty">Loading cases…</div>';

    let all;
    const headers = { Authorization: `Bearer ${token}` };
    try {
        const res = await fetch(`${API}/api/getcases`, { headers });
        if (res.status === 401) {
             window.location.href = "../login/login.html";
            return;
        }
        if (res.status === 403) throw new Error("You don't have access to these cases");
        if (!res.ok) throw new Error("Could not load cases");
        all = await res.json();
    } catch (err) {
        uisection("total").textContent = 0;
        uisection("saved-cases").innerHTML = `<div class="empty">${esc(err.message)}</div>`;
        return;
    }

    loadedCases = all;
    const list = all.filter(c => c.dateFiled === keyOf(selected));

    uisection("total").textContent = list.length;
    uisection("saved-cases").innerHTML = list.length
        ? list.map(c => `
            <div class="row">
                <label class="pick">
                    <input type="checkbox">
                    <span>
                        <div class="title">${esc(c.caseName)}</div>
                        <div class="meta">${esc(c.court)} · Filed ${esc(c.dateFiled)}</div>
                    </span>
                </label>
                <a class="view-btn" href="#case-${c.id}" data-id="${c.id}">View case</a>
            </div>
            `).join("")
        : '<div class="empty">No cases on this date.</div>';
}

// in the section where saved cases are shown
// i add listener to the buttons to show cases full details
uisection("saved-cases").addEventListener("click", e => {
    const btn = e.target.closest(".view-btn");
    if (!btn) return;
    e.preventDefault();
    viewCaseDetails(Number(btn.dataset.id));
});

// view case details
function viewCaseDetails(id) {
    const c = loadedCases.find(c => c.id === id && c.dateFiled === keyOf(selected));
    if (!c) return;
    uisection("saved-cases-list").style.display = "none";
    uisection("case-detail").style.display = "";
    uisection("case-detail").innerHTML = `
            <main class="content" data-name="content">
                <header class="header">
                    <div class="title-group">
                        <h1>Case</h1>
                        <p>${esc(c.caseName)}</p>
                    </div>
                    <span class="badge">${esc(c.status)}</span>
                </header>

                <section class="card" aria-label="Case details">
                    <dl class="details-row">
                        <div class="field1">
                            <dt>Court</dt>
                            <dd>${esc(c.court)}</dd>
                        </div>
                        <div class="field2">
                            <dt>Date Filed</dt>
                            <dd>${esc(c.dateFiled)}</dd>
                        </div>
                    </dl>
                </section>

                <section class="card section" aria-labelledby="path-title">
                    <h2 id="path-title">Case URL</h2>
                    <p class="path">${esc(c.absolute_url)}</p>
                </section>

                <section class="card section" aria-labelledby="syllabus-title">
                    <h2 id="syllabus-title">Syllabus</h2>
                    <div class="syllabus-text">
                        <p>${esc(c.syllabus)}</p>
                    </div>
                </section>
            </main>
            `;
}








//button to show saved users
adminuisection("usersbutton").addEventListener("click", () => {
    adminuisection("fecthcasesbutton").style.color = "black";
    adminuisection("casesrecordsbutton").style.color = "black";
    adminuisection("usersbutton").style.color = "blue";

    adminuisection("fetch-cases-list").style.display = "none";
    adminuisection("saved-cases-list").style.display = "none";
    adminuisection("user-section").style.display = "";
})





//button to logout and redirect to login page
uisection("logoutBtn").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "../login/login.html";
})




function render() {
    renderCalendar();
    renderFetchedCases();
    renderCases()
}
render();
