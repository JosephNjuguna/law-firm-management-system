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






let loadedCases = [];
const API = "http://localhost:3000";
const token = localStorage.getItem("token");
// function to render saved cases in the ui
async function renderCases() {
    uisection("case-detail").style.display = "none";
    uisection("heading").textContent = `${fmtHeading.format(selected)} Cases`;
    uisection("total").textContent = "…";
    uisection("cases").innerHTML = '<div class="empty">Loading cases…</div>';

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
        console.log(all);
        
    } catch (err) {
        uisection("total").textContent = 0;
        uisection("cases").innerHTML = `<div class="empty">${esc(err.message)}</div>`;
        return;
    }

    loadedCases = all;
    const list = all.filter(c => c.dateFiled === keyOf(selected));

    uisection("total").textContent = list.length;
    uisection("cases").innerHTML = list.length
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
uisection("cases").addEventListener("click", e => {
    const btn = e.target.closest(".view-btn");
    if (!btn) return;
    e.preventDefault();
    viewCaseDetails(Number(btn.dataset.id));
});

// view case details
function viewCaseDetails(id) {
    const c = loadedCases.find(c => c.id === id && c.dateFiled === keyOf(selected));
    if (!c) return;
    uisection("cases-list").style.display = "none";
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







uisection("logoutBtn").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "../login/login.html";
})


async function render() {
    renderCalendar();
    await renderCases();
}

render();