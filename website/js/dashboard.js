fetch("/me", {credentials:"include"})
.then(res => res.json())
.then(data => {

    if(!data.loggedIn) {
        document.body.innerHTML += `<a href = "https://sanndex.org/login">Go to login</a>`
        return
    }

    document.body.innerHTML += `<p>Hello ${data.user.username}</p>`
    document.body.innerHTML += `<a href = "https://sanndex.org/account">Account info</a>`

    fetch(`/reports?userId=${data.user.id}`)
    .then(res => res.json())
    .then(data => {
        
        document.body.innerHTML += `<p>All reports:</p>`;

        data.forEach(report => {
            document.body.innerHTML += `<p>${report}</p>`;
        })
    
    })

})