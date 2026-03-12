const parts = window.location.pathname.split("/")

const name = parts[3]

fetch(`/source?domain=${name}`)
.then(res => res.json())
.then(data => {

    document.getElementById("title").innerText =
        `Review for ${data.source.name}`

    document.getElementById("score").innerText =
        `Score: ${data.score}`

}).catch(() => {
    document.getElementById("title").innerText =
        `No review for ${name}`
})