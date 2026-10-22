
let username = document.getElementById("username");
let password = document.getElementById("password");

const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;


username.addEventListener("input", () => {
    let usernameerror = document.getElementById("nameerror");
    if (!usernameRegex.test(username.value.trim())) {
        usernameerror.style.display="flex";
        usernameerror.style.color="red";
        usernameerror.style.fontSize=10;
        usernameerror.textContent ="Username must be 3- characters: letters, numbers, or underscores only."
        return;
    }else {
         usernameerror.style.display="none";
    }
})

password.addEventListener("input", () => {
    let passworderror = document.getElementById("passworderror");
    if (!passwordRegex.test(password.value.trim())) {
        passworderror.style.display="flex";
        passworderror.style.color="red";
        passworderror.style.fontSize=10;
        passworderror.textContent ="Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character."
        return;
    } else {
         passworderror.style.display="none";
    }
})

document.getElementById("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    let role = document.querySelector('input[name="role"]:checked');
    console.log(username.value.trim(), password.value.trim(), role.value);
});