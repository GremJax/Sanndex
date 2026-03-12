fetch("/me", {credentials:"include"})
.then(res => res.json())
.then(data => {

    const content = document.querySelector(".content");

    if(!data.loggedIn) {
        content.innerHTML = `<a href = "https://sanndex.org/login">Go to login</a>`
        return
    }

    content.innerHTML += `<p>Hello ${data.user.username}</p>`
    content.innerHTML += `<a href = "https://sanndex.org/account">Account info</a>`

    fetch(`/reports?userId=${data.user.id}`)
    .then(res => res.json())
    .then(data => {
        
        content.innerHTML += `<p>All reports:</p>`;

        if (data.length == 0) {
            content.innerHTML += `<p>No reports yet</p>`;
        }
        data.forEach(report => {

            let sourceName = "!NameNotFound!"
            fetch(`/source?id=${report.source_id}`)
            .then(res => res.json())
            .then(data => {
                if (!data || data.error) return
                sourceName = data.name
            })

            const reportString = `[${report.created_at}]: Reported ${sourceName}, description: ${report.description}`;
            content.innerHTML += `<p>${reportString}</p><a href=${report.url}>Evidence</a>`;
        })
    
    })

})