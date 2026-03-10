console.log("[Sanndex] content script injected");

// Get the current domain
const domain = window.location.hostname.replace(/^www\./, '')

function normalizeDomain(url) {
  return window.location.hostname.replace(/^www\./, '');
}

function getTotalScore(data) {
    return (data.accuracy_score + 
        data.transparency_score + 
        data.integrity_score +
        data.manipulation_score +
        data.authenticity_score +
        data.credibility_score) / 6
}

// Get proper icon
function chooseIcon(data) {
    if (!data || data.error) return "unrated.svg";

    if (data.score_type == "gold_star") return "gold_star.svg";
    if (data.score_type == "na") {
        if (data.status == "ai_generated") return "na_ai.svg";
        else return "na.svg";
    }

    switch (data.status) {
        case "pending": return "under_review.svg";
        case "ai_generated": {
            const totalScore = getTotalScore(data);
            if (totalScore >= 80) return "good_ai.svg";
            if (totalScore >= 60) return "questionable_ai.svg";
            if (totalScore >= 40) return "unreliable_ai.svg";
            return "misleading_ai.svg";
        }
        case "verified": {
            const totalScore = getTotalScore(data);
            if (totalScore >= 80) return "good_verified.svg";
            if (totalScore >= 60) return "questionable_verified.svg";
            if (totalScore >= 40) return "unreliable_verified.svg";
            return "misleading_verified.svg";
        }
        default: {
            const totalScore = getTotalScore(data);
            if (totalScore >= 80) return "good.svg";
            if (totalScore >= 60) return "questionable.svg";
            if (totalScore >= 40) return "unreliable.svg";
            return "misleading.svg";
        }
    }
}

function chooseTitle(data) {
    if (!data || data.error) return "No Sanndex rating";
    if (data.status == "verified") return "Sanndex rating is pending";
    if (data.score_type == "gold_star") return "Sanndex rating: Exemplary";
    if (data.score_type == "na") return "Sanndex rating is not needed";
    const totalScore = getTotalScore(data);
    if (totalScore >= 80) return "Sanndex rating: Good";
    if (totalScore >= 60) return "Sanndex rating: Questionable";
    if (totalScore >= 40) return "Sanndex rating: Unreliable";
    return "Sanndex rating: Misleading";
}

// Create and insert badge
function insertBadge(targetElement, size, data, name) {

  const iconName = chooseIcon(data);

  const icon = document.createElement("img");
  const size_px = `${size}px`

  icon.title = chooseTitle(data);

  icon.src = chrome.runtime.getURL(`icons/sanndex_${iconName}`);
  icon.style.width = size_px;
  icon.style.height = size_px;
  icon.style.marginLeft = `${size/8}px`;
  icon.style.verticalAlign = "middle";
  icon.style.cursor = "pointer";

  icon.onclick = () => {
    window.open(`https://sanndex.org/review/${name}`, "_blank");
  };

  targetElement.appendChild(icon);
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
                insertBadge(result.element, result.size, data.review, data.source.name);
            })
            .catch(err => {
                insertBadge(result.element, result.size, null, result.name);
                console.error(`Sanndex fetch error for ${result.name}:`, err);
            });
        }
    })
    
});

observer.observe(document.body, { childList: true, subtree: true });