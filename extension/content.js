console.log("[Sanndex] content script injected");

// Get the current domain
const domain = window.location.hostname.replace(/^www\./, '')

function normalizeDomain(url) {
  return window.location.hostname.replace(/^www\./, '');
}

// Get proper icon
function chooseIcon(data, totalScore) {
    if (!data || data.error) return "unrated.svg";

    if (data.score_type == "gold_star") return "gold_star.svg";
    if (data.score_type == "na") {
        if (data.status == "ai_generated") return "na_ai.svg";
        else return "na.svg";
    }

    switch (data.status) {
        case "pending": return "under_review.svg";
        case "ai_generated": {
            if (totalScore >= 80) return "good_ai.svg";
            if (totalScore >= 60) return "questionable_ai.svg";
            if (totalScore >= 40) return "unreliable_ai.svg";
            return "misleading_ai.svg";
        }
        case "verified": {
            if (totalScore >= 80) return "good_verified.svg";
            if (totalScore >= 60) return "questionable_verified.svg";
            if (totalScore >= 40) return "unreliable_verified.svg";
            return "misleading_verified.svg";
        }
        default: {
            if (totalScore >= 80) return "good.svg";
            if (totalScore >= 60) return "questionable.svg";
            if (totalScore >= 40) return "unreliable.svg";
            return "misleading.svg";
        }
    }
}

function chooseTitle(data, totalScore) {
    if (!data || data.error) return "No Sanndex rating";
    if (data.status == "verified") return "Sanndex rating is pending";
    if (data.score_type == "gold_star") return "Sanndex rating: Exemplary";
    if (data.score_type == "na") return "Sanndex rating is not needed";
    if (totalScore >= 80) return "Sanndex rating: Good";
    if (totalScore >= 60) return "Sanndex rating: Questionable";
    if (totalScore >= 40) return "Sanndex rating: Unreliable";
    return "Sanndex rating: Misleading";
}

// Create and insert badge
function insertBadge(targetElement, size, data, name, totalScore) {

  const iconName = chooseIcon(data, totalScore);

  const icon = document.createElement("img");
  const size_px = `${size}px`

  icon.title = chooseTitle(data, totalScore);

  icon.src = chrome.runtime.getURL(`icons/sanndex_${iconName}`);
  icon.style.width = size_px;
  icon.style.height = size_px;
  icon.style.marginLeft = `${size/8}px`;
  icon.style.verticalAlign = "middle";
  icon.style.cursor = "pointer";

  icon.onclick = () => {
    openSanndexPopup(data, name);
  };

  targetElement.appendChild(icon);
}

function openSanndexPopup(data, name) {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.5)";
    overlay.style.zIndex = "999999";

    const popup = document.createElement("div");
    popup.style.position = "absolute";
    popup.style.top = "50%";
    popup.style.left = "50%";
    popup.style.transform = "translate(-50%, -50%)";
    popup.style.background = "white";
    popup.style.padding = "20px";
    popup.style.borderRadius = "10px";
    popup.style.width = "320px";
    popup.style.fontFamily = "Arial";
    popup.style.boxShadow = "0 5px 20px rgba(0,0,0,0.3)";

    const title = document.createElement("h2");
    title.textContent = `Sanndex Review`;

    const nameEl = document.createElement("p");
    nameEl.textContent = name;

    const score = document.createElement("p");
    score.textContent = data ? `Score: ${getTotalScore(data)}` : "No rating yet";

    const siteButton = document.createElement("button");
    siteButton.textContent = "View Full Review";
    siteButton.onclick = () => {
        window.open(`https://sanndex.org/review/${name}`, "_blank");
    };

    const reportButton = document.createElement("button");
    reportButton.textContent = "Report Source";
    reportButton.style.marginLeft = "10px";
    reportButton.onclick = () => {
        window.open(`https://sanndex.org/report/${name}`, "_blank");
    };

    const close = document.createElement("button");
    close.textContent = "Close";
    close.style.float = "right";
    close.onclick = () => overlay.remove();

    popup.appendChild(close);
    popup.appendChild(title);
    popup.appendChild(nameEl);
    popup.appendChild(score);
    popup.appendChild(siteButton);
    popup.appendChild(reportButton);

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
}

// Domain-specific logic for finding the name element
function findNameElements() {
    const results = [];

    switch (normalizeDomain(domain)) {
        case "youtube.com": 
        case "youtu.be": {
            // Channel homepage
            const channelHeader = document.querySelector("h1.dynamicTextViewModelH1");
            if (channelHeader && !channelHeader.dataset.sanndex) {
                channelHeader.dataset.sanndex = "true";
                return [{
                    element: channelHeader,
                    name: channelHeader.textContent.replace("@","").trim(),
                    domain: "youtube",
                    size: 32
                }];
            }

            // Video page
            const videoChannel = document.querySelector("ytd-channel-name");
            if (videoChannel && !videoChannel.dataset.sanndex) {
                videoChannel.dataset.sanndex = "true";
                results.push({
                    element: videoChannel,
                    name: videoChannel.textContent.replace("@","").trim(),
                    domain: "youtube",
                    size: 20
                });
            }
            
            // Homepage and shorts
            document.querySelectorAll('a[href^="/@"]').forEach(el => {
                if (!el || el.dataset.sanndex) return;
                el.dataset.sanndex = "true";

                const handle = el.getAttribute("href")
                    .replace("/@", "")
                    .split("/")[0];
                if (!handle || handle.length == 0) return;

                results.push({
                    element: el,
                    name: handle,
                    domain: "youtube",
                    size: 20
                });
            });
        }
        break;

        case "x.com": 
        case "twitter.com": {

            // Homepage
            document.querySelectorAll('[data-testid="User-Name"]').forEach(el => {
                if (!el || el.dataset.sanndex) return;
                el.dataset.sanndex = "true";

                const handleLink = el.querySelector('a[href^="/"]');
                if (!handleLink) return;

                const handle = handleLink
                    .getAttribute("href")
                    .replace("/", "")
                    .trim();

                results.push({
                    element: el,
                    name: handle,
                    domain: "x",
                    size: 20
                });
            });
        }
        break;

        // Unsupported website
        default: {
            console.log("Website is not supported by sanndex");
            return [];
        }
    }

    return results;
}

// Watch for dynamic content
const observer = new MutationObserver(() => {
    const results = findNameElements();

    results.forEach(result => {
        if (result) {

            fetch(`https://sanndex.org/source?domain=${result.domain.toLowerCase()}/${result.name.toLowerCase()}`)
            .then(res => res.json())
            .then(data => {
                insertBadge(result.element, result.size, data.review, data.source.name, data.score);
            })
            .catch(err => {
                insertBadge(result.element, result.size, null, result.name, 0);
                console.error(`Sanndex fetch error for ${result.name}:`, err);
            });
        }
    })
    
});

observer.observe(document.body, { childList: true, subtree: true });