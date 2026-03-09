console.log("[Veridex] content script injected");

// Get the current domain
const domain = window.location.hostname.replace(/^www\./, '')

function normalizeDomain(url) {
  return window.location.hostname.replace(/^www\./, '');
}

// Create and insert badge
function insertBadge(targetElement, text) {
    const badge = document.createElement("span");
    badge.innerText = text;
    badge.style.background = "green";
    badge.style.color = "white";
    badge.style.padding = "2px 6px";
    badge.style.borderRadius = "4px";
    badge.style.marginLeft = "6px";
    badge.style.fontWeight = "bold";
    badge.style.fontSize = "0.9em";
    targetElement.appendChild(badge);
}

// Domain-specific logic for finding the name element
function findNameElement() {
  switch (normalizeDomain(domain)) {
    case "youtube.com":
      return document.querySelector("h1.dynamicTextViewModelH1");
    case "twitter.com":
      return document.querySelector("div[data-testid='UserName']");
    case "examplenewsnetwork.com":
      return document.querySelector("h1, .source-name");
    default:
      return null; // unsupported site, no badge
  }
}

// Watch for dynamic content
const observer = new MutationObserver(() => {
    const nameElement = findNameElement();
    if (nameElement && !nameElement.dataset.veridex) {
        nameElement.dataset.veridex = "true"; // prevent duplicates

        fetch(`http://localhost:3000/source?domain=${domain}`)
        .then(res => res.json())
        .then(data => {
            // Always display badge
            const scoreText = data && !data.error ? `Score: ${data.total_score ?? 'N/A'}` : 'Score: N/A';
            insertBadge(nameElement, scoreText);
        })
        .catch(err => {
            insertBadge(nameElement, 'Score: N/A');
            console.error("Veridex fetch error:", err);
        });
    }
});

observer.observe(document.body, { childList: true, subtree: true });