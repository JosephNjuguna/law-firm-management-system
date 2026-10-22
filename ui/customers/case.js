const CASES = {
    "2026-10-20": [
        { id: 1, title: "Smith v. Harlow Properties", status: "Open" },
        { id: 2, title: "Estate of R. Mwangi", status: "In review" },
        { id: 3, title: "Okoye Employment Dispute", status: "Pending" }
    ],
    "2026-10-23": [
        { id: 4, title: "Kamau Trademark Filing", status: "Open" }
    ]
};

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

// state
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

function renderCases() {
    const list = getCases(keyOf(selected));
    uisection("heading").textContent = `${fmtHeading.format(selected)} Cases`;
    uisection("total").textContent = list.length;
    uisection("cases").innerHTML = list.length
        ? list.map(c => `
            <div class="case">
              <div class="case-title">${esc(c.title)}</div>
              <div class="case-side">
                <span class="status">${esc(c.status)}</span>
                <a class="view-btn" href="#case-${c.id}">View case</a>
              </div>
            </div>`).join("")
        : '<div class="empty">No cases on this date.</div>';
}

function render() {
    renderCalendar();
    renderCases();
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
});

render();