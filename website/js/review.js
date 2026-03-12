const parts = window.location.pathname.split("/");

const name = parts[2];

fetch(`/source?domain=${name.toLowerCase()}`)
.then(res => {
    if(!res.ok) throw new Error("Not found")
    return res.json()
})
.then(data => {

    document.getElementById("title").innerText =
        `Review for ${data.source.name}`

    document.getElementById("score").innerText =
        `Score: ${data.score}`

}).catch(() => {
    document.getElementById("title").innerText =
        `No review for ${name}`
})