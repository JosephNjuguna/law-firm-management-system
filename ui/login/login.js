
let username = document.getElementById("username");
let password = document.getElementById("password");

const usernameRegex = /^[a-zA-Z]{3,20}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;


username.addEventListener("input", () => {
    let usernameerror = document.getElementById("nameerror");
    if (!usernameRegex.test(username.value.trim())) {
        usernameerror.style.display = "flex";
        usernameerror.style.color = "red";
        usernameerror.style.fontSize = 10;
        usernameerror.textContent = "Username must be 3- characters: letters, no spaces only."
        return;
    } else {
        usernameerror.style.display = "none";
    }
})

password.addEventListener("input", () => {
    let passworderror = document.getElementById("passworderror");
    if (!passwordRegex.test(password.value.trim())) {
        passworderror.style.display = "flex";
        passworderror.style.color = "red";
        passworderror.style.fontSize = 10;
        passworderror.textContent = "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character."
        return;
    } else {
        passworderror.style.display = "none";
    }
})

document.getElementById("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    login(username.value.trim(), password.value.trim());
});

// const API = "http://localhost:3000";
const API = "https://law-firm-management-system-nfgpma7t1-josephnjugunas-projects.vercel.app/";

let token = "";

// Login form
async function login(username, password) {
    const res = await fetch(`${API}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    token = data.token; // keep this for the other calls
    localStorage.setItem("token", data.token);
    localStorage.setItem("username", data.username);
    localStorage.setItem("role", data.role);
    if (data.role === "admin") {
        window.location.href = "../admin/admin.html";
    } else if (data.role === "lawyer") {
        window.location.href = "../lawyers/lawyer.html";
    } else if (data.role === "customer") {
        window.location.href = "../customers/case.html";
    }
}