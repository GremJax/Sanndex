fetch("/me", {credentials:"include"})
.then(res => res.json())
.then(data => {

    if(!data.userId) {
        document.body.innerHTML += `<a href = "https://sanndex.org/login">Go to login</a>`
        return
    }

    document.getElementById("username").innerText = data.userInfo.username
    document.getElementById("permissions").innerText = `Permissions: ${data.userInfo.permissions}`
    
    document.getElementById("changeUsernameButton").onClick = async () => {
        const newUsername = document.getElementById("changeUsernameTextarea").value;
        const payload = {userId: data.userId, username: newUsername};

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