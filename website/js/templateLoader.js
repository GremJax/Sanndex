document.querySelectorAll("[data-template]").forEach(el => {
  const file = el.getAttribute("data-template");

  fetch("/templates/" + file)
    .then(r => r.text())
    .then(html => {
      el.innerHTML = html;
    });
});