fetch("/me", {credentials:"include"})
.then(res => res.json())
.then(data => {

    if(!data.loggedIn) {
        document.body.innerHTML += `<a href = "https://sanndex.org/login">Go to login</a>`
        return
    }

    document.getElementById("username").innerText = `Username: ${data.user.username}`
    document.getElementById("permissions").innerText = `Permissions: ${data.user.permissions}`
    
    document.getElementById("changeUsernameButton").onClick = async () => {
        const newUsername = document.getElementById("changeUsernameTextarea").value;
        const payload = {userId: data.user.id, username: newUsername};

        await fetch("https://sanndex.org/username", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    }
    
    document.getElementById("logoutButton").onClick = async () => {
        await fetch("https://sanndex.org/logout", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({})
        });
    }

})