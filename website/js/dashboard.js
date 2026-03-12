fetch("/me", {credentials:"include"})
.then(res => res.json())
.then(data => {

    if(!data.userId) {
        document.body.innerHTML += `<a href = "https://sanndex.org/login">Go to login</a>`
        return
    }

    document.body.innerHTML += `<p>Hello ${data.userInfo.username}</p>`
    document.body.innerHTML += `<a href = "https://sanndex.org/account">Account info</a>`

})