// const boxes = document.querySelectorAll('.row input[type="checkbox"]');
// const update = () => {
//     const n = [...boxes].filter(b => b.checked).length;
//     document.getElementById('selected').textContent = n;
//     document.getElementById('bulk-count').textContent = n;
//     document.getElementById('total').textContent = boxes.length;
// };
// boxes.forEach(b => b.addEventListener('change', update));
// update();


import { toFetch } from "../api/api.js";


const adminuisection = id => document.getElementById(id);
adminuisection("saved-cases-list").style.display = "none";
adminuisection("user-section").style.display = "none";

adminuisection("fecthcasesbutton").addEventListener("click", () => {
    adminuisection("fecthcasesbutton").style.color = "blue";
    adminuisection("casesrecordsbutton").style.color = "black";
    adminuisection("usersbutton").style.color = "black";

    adminuisection("fetch-cases-list").style.display = "";
    adminuisection("saved-cases-list").style.display = "none";
    adminuisection("user-section").style.display = "none";
})

adminuisection("casesrecordsbutton").addEventListener("click", () => {
    adminuisection("fecthcasesbutton").style.color = "black";
    adminuisection("casesrecordsbutton").style.color = "blue";
    adminuisection("usersbutton").style.color = "black";

    adminuisection("fetch-cases-list").style.display = "none";
    adminuisection("saved-cases-list").style.display = "";
    adminuisection("user-section").style.display = "none";
})

adminuisection("usersbutton").addEventListener("click", () => {
    adminuisection("fecthcasesbutton").style.color = "black";
    adminuisection("casesrecordsbutton").style.color = "black";
    adminuisection("usersbutton").style.color = "blue";

    adminuisection("fetch-cases-list").style.display = "none";
    adminuisection("saved-cases-list").style.display = "none";
    adminuisection("user-section").style.display = "";
})











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
        });
        grid.appendChild(b);
    }
}

function renderFetchedCases() {
    uisection("fetched-cases-list").style.display = "";
    // uisection("admin-cases-list").style.display = "none";
    const list = getCases(keyOf(selected));
    // uisection("heading").textContent = `${fmtHeading.format(selected)} Cases`;
    uisection("fetch-total").textContent = list.length;
    uisection("fetched-cases").innerHTML = list.length
        ? list.map(c => `
            <div class="row">
                <label class="pick">
                    <input type="checkbox" checked>
                    <span>
                        <div class="title">${esc(c.caseName)}</div>
                        <div class="meta">${esc(c.court)} · Filed ${esc(c.dateFiled)}</div>
                    </span>
                </label>
                <span class="badge">New</span>
                <select aria-label="Assign case 1 to customer">
                    <option>Select Customer</option>
                    <option>[Customer A]</option>
                    <option>[Customer B]</option>
                </select>
                <select aria-label="Assign case 1 to customer">
                    <option>Assign Lawyer</option>
                    <option>[Lawyer A]</option>
                    <option>[Lawyer B]</option>
                </select>
            </div>
            
            `).join("")
        : '<div class="empty">No cases on this date.</div>';
}

function renderCases() {
    uisection("case-detail").style.display = "none";
    const list = getCases(keyOf(selected));
    uisection("heading").textContent = `${fmtHeading.format(selected)} Cases`;
    uisection("total").textContent = list.length;
    uisection("saved-cases").innerHTML = list.length
        ? list.map(c => `
            <div class="row">
                <label class="pick">
                    <input type="checkbox" checked>
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
    uisection("case-detail").style.display = "none";
});





//--view case details
function openCase(id) {
    const c = getCases(keyOf(selected)).find(c => c.id === id);
    if (!c) return;
    uisection("saved-cases-list").style.display = "none";
    uisection("case-detail").style.display = "";
    uisection("case-detail").innerHTML = `
            <main class="content" data-name="content">
                <header class="header">
                    <div class="title-group">
                        <h1>Case</h1>
                        <p>${c.caseName}</p>
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
                        <p>${c.syllabus}</p>
                    </div>
                </section>
            </main>
            `;
}

uisection("saved-cases").addEventListener("click", e => {
    const btn = e.target.closest(".view-btn");
    if (!btn) return;
    e.preventDefault();
    openCase(Number(btn.dataset.id));
});

uisection('getcases').addEventListener("click", async () => {
    let startdate = uisection("from").value;
    let enddate = uisection("to").value;
    let casesfetcheddata = await toFetch(startdate, enddate);
    saveCasesToObject(casesfetcheddata);
})

function saveCasesToObject(fetched) {
    const list = Array.isArray(fetched) ? fetched : (fetched?.results ?? []);
    const grouped = {};
    for (const c of list) {
        const date = String(c.dateFiled ?? "").slice(0, 10);
        if (!date){
           continue; 
        } 
        (grouped[date] ??= []).push({
            id: grouped[date].length + 1,
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


function render() {
    renderCalendar();
    renderFetchedCases();
    renderCases();
}
render();


uisection("logoutBtn").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "../login/login.html";
})