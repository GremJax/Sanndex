console.log("[Veridex] content script injected");

// Get the current domain
const domain = window.location.hostname.replace(/^www\./, '')

function normalizeDomain(url) {
  return window.location.hostname.replace(/^www\./, '');
}

// Get proper icon
function chooseIcon(data) {
    if (!data || data.error) return "unrated.svg";

    switch (data.status) {
        case "pending": return "under_review.svg";
        case "gold_star": return "gold_star.svg";
        case "ai_generated": {
            if (data.total_score == null) return "na_ai.svg";
            if (data.total_score >= 80) return "good_ai.svg";
            if (data.total_score >= 60) return "questionable_ai.svg";
            if (data.total_score >= 40) return "unreliable_ai.svg";
            return "misleading_ai.svg";
        }
        case "verified": {
            if (data.total_score >= 80) return "good_verified.svg";
            if (data.total_score >= 60) return "questionable_verified.svg";
            if (data.total_score >= 40) return "unreliable_verified.svg";
            return "misleading_verified.svg";
        }
        default: {
            if (data.total_score == null) return "na.svg";
            if (data.total_score >= 80) return "good.svg";
            if (data.total_score >= 60) return "questionable.svg";
            if (data.total_score >= 40) return "unreliable.svg";
            return "misleading.svg";
        }
    }
}

function chooseTitle(data) {
    if (!data || data.error) return "No Veridex rating";
    if (data.status == "verified") return "Veridex rating is pending";
    if (data.status == "gold_star") return "Veridex rating: Exemplary";
    if (data.total_score == null) return "Veridex rating is not applicable";
    if (data.total_score >= 80) return "Veridex rating: Good";
    if (data.total_score >= 60) return "Veridex rating: Questionable";
    if (data.total_score >= 40) return "Veridex rating: Unreliable";
    return "Veridex rating: Misleading";
}

// Create and insert badge
function insertBadge(targetElement, size, data, name) {

  const iconName = chooseIcon(data);

  const icon = document.createElement("img");
  const size_px = `${size}px`

  icon.title = chooseTitle(data);

  icon.src = chrome.runtime.getURL(`icons/veridex_${iconName}`);
  icon.style.width = size_px;
  icon.style.height = size_px;
  icon.style.marginLeft = `${size/8}px`;
  icon.style.verticalAlign = "middle";
  icon.style.cursor = "pointer";

  icon.onclick = () => {
    window.open(`https://veridex.example/review/${name}`, "_blank");
  };

  targetElement.appendChild(icon);
}

// Domain-specific logic for finding the name element
function findNameElement() {
    switch (normalizeDomain(domain)) {
        case "youtube.com": {
            // Channel homepage
            const channelHeader = document.querySelector("h1.dynamicTextViewModelH1");
            if (channelHeader) {
                return {
                    element: channelHeader,
                    name: channelHeader.textContent.trim(),
                    size: 32
                };
            }

            // Video page
            const videoChannel = document.querySelector("ytd-channel-name");
            if (videoChannel) {
                return {
                    element: videoChannel,
                    name: videoChannel.textContent.trim(),
                    size: 20
                };
            }

            // Shorts page
            const reelChannel = document.querySelector('a[href^="/@"]');
            if (reelChannel) {
                return {
                    element: reelChannel,
                    name: reelChannel.textContent.replace("@", "").trim(),
                    size: 20
                };
            }

            return null;
        }

        case "x.com": {
            const user = document.querySelector("div[data-testid='UserName']");
            if (user) {
                return {
                    element: user,
                    name: user.textContent.trim(),
                    size: 32
                };
            }
            return null;
        }

        // Unsupported website
        default: {
            console.log("Website is not supported by veridex");
            return null;
        }
    }
}

// Watch for dynamic content
const observer = new MutationObserver(() => {
    const result = findNameElement();

    if (result && !result.element.dataset.veridex) {
        result.element.dataset.veridex = "true"; // prevent duplicates

        fetch(`http://localhost:3000/source?domain=${result.name}`)
        .then(res => res.json())
        .then(data => {
            insertBadge(result.element, result.size, data, result.name);
        })
        .catch(err => {
            insertBadge(result.element, result.size, null, result.name);
            console.error("Veridex fetch error:", err);
        });
    }
});

observer.observe(document.body, { childList: true, subtree: true });