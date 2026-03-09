const domain = window.location.hostname

fetch("http://localhost:3000/source?domain=" + domain)
.then(r => r.json())
.then(data => {
  if (data.length > 0) {
    const badge = document.createElement("div")
    badge.innerText = "Trust Score: " + data[0].trust_score
    badge.style.position = "fixed"
    badge.style.top = "10px"
    badge.style.right = "10px"
    badge.style.background = "green"
    badge.style.color = "white"
    badge.style.padding = "5px"
    document.body.appendChild(badge)
  }
})