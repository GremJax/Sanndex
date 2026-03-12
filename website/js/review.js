const parts = window.location.pathname.split("/");

const name = parts[2].trim();
const content = document.querySelector(".content");

fetch(`/source?domain=${name.toLowerCase()}`)
.then(res => {
    if(!res.ok) throw new Error("Not found")
    return res.json()
})
.then(data => {

    document.getElementById("title").innerText = `Review for ${data.source.name}`

    document.getElementById("totalScore").innerText = `Score: ${data.score}`

    document.getElementById("accuracyScore").innerText = `Accuracy Score: ${data.review.accuracy_score}`
    document.getElementById("transparencyScore").innerText = `Transparency Score: ${data.review.transparency_score}`
    document.getElementById("integrityScore").innerText = `Integrity Score: ${data.review.integrity_score}`
    document.getElementById("honestyScore").innerText = `Honesty Score: ${data.review.manipulation_score}`
    document.getElementById("authenticityScore").innerText = `Authenticity Score: ${data.review.authenticity_score}`
    document.getElementById("credibilityScore").innerText = `Credibility Score: ${data.review.credibility_score}`

    fetch(`/user-info?id=${data.review.user_id}`)
    .then(res => res.json())
    .then(data => {
        document.getElementById("reviewer").innerText = `Reviewed by: ${data.username}`
    })


}).catch(() => {
    content.innerHTML = `<h>No review for ${name}</h>`
})