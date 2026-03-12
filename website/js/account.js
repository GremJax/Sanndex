fetch("/me", {credentials:"include"})
.then(res => res.json())
.then(data => {
    const content = document.querySelector(".content");

    if(!data.loggedIn) {
        content.innerHTML = `<a href = "https://sanndex.org/login">Go to login</a>`
        return
    }

    document.getElementById("username").innerText = `Username: ${data.user.username}`
    document.getElementById("permissions").innerText = `Permissions: ${data.user.permission}`
    
    document.getElementById("changeUsernameButton").onClick = async () => {
        const newUsername = document.getElementById("changeUsernameTextarea").value;

        await fetch("https://sanndex.org/username", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({username: newUsername})
        });
        window.location.reload();
    }
    
    document.getElementById("logoutButton").onClick = async () => {
        await fetch("https://sanndex.org/logout", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });
        window.location.reload();
    }

})