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

  icon.title = chooseTitle(data, totalScore);

  icon.src = chrome.runtime.getURL(`icons/sanndex_${iconName}`);
  icon.style.width = `${size}px`;
  icon.style.height = `${size}px`;
  icon.style.marginLeft = `${size/8}px`;
  icon.style.verticalAlign = "middle";
  icon.style.cursor = "pointer";

  icon.onclick = (event) => {
    event.stopPropagation();
    event.preventDefault();
    openSanndexPopup(data, name, event);
  };

  targetElement.appendChild(icon);
}

async function fetchTemplate(name) {
    const html = await fetch(chrome.runtime.getURL(`popups/${name}.html`))
        .then(res => res.text());
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    return wrapper.firstElementChild; // overlay div
}

async function openReportPopup(data, name, event) {
    const overlay = await fetchTemplate("reportPopup");

    const x = Math.min(event.clientX, window.innerWidth - 340);
    const y = Math.min(event.clientY, window.innerHeight - 220);

    const popup = overlay.querySelector(".sanndex-popup");
    popup.style.position = "fixed";
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    popup.style.transform = "translate(-50%, -50%)";

    // Inject title
    overlay.querySelector(".title").textContent = `Report ${name}`;

    overlay.querySelector(".back").onclick = () => {
        overlay.remove();
        openSanndexPopup(data, name, event);
    };

    // User info
    let currentUserId = null;
    let username = "anon";

    fetch("https://sanndex.org/me", { credentials: "include" })
    .then(res => res.json())
    .then(data => {
        currentUserId = data.user.id;
        username = data.user.username;
    });

    overlay.querySelector(".userLabel").textContent = currentUserId ? 
        `You are logged in as ${username}` : "You are not logged in";
        
    let domain = window.location.hostname.replace(/^www\./,'');

    overlay.querySelector(".sendReport").onclick = async () => {
        const payload = {
            sourceId: data.source_id,
            url: domain,
            description: overlay.querySelector(".description").value,
            accuracy_score: overlay.querySelector(".accuracy").value,
            transparency_score: overlay.querySelector(".transparency").value,
            integrity_score: overlay.querySelector(".integrity").value,
            manipulation_score: overlay.querySelector(".manipulation").value,
            authenticity_score: overlay.querySelector(".authenticity").value,
            credibility_score: overlay.querySelector(".credibility").value,
        };
        await fetch("https://sanndex.org/report", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        overlay.remove();
    };

    document.body.appendChild(overlay);
}

async function openSanndexPopup(data, name, event) {
    const overlay = await fetchTemplate("reviewPopup");

    // Position near mouse
    const x = Math.min(event.clientX, window.innerWidth - 340);
    const y = Math.min(event.clientY, window.innerHeight - 220);

    const popup = overlay.querySelector(".sanndex-popup");
    popup.style.position = "fixed";
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    popup.style.transform = "translate(-50%, -50%)";

    // Inject data
    overlay.querySelector(".title").textContent = `${name}'s Sanndex Review`;
    overlay.querySelector(".score").textContent = data ? `Score: ${data.accuracy_score}` : "No rating yet";

    // Event handlers
    overlay.querySelector(".close").onclick = () => overlay.remove();
    overlay.querySelector(".viewFull").onclick = () => window.open(`https://sanndex.org/review/${name}`, "_blank");
    overlay.querySelector(".reportSource").onclick = () => {
        overlay.remove();
        openReportPopup(data, name, event);
    };

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
                
                const handle = document.querySelector(".yt-content-metadata-view-model__metadata-text").innerText
                    .replace("@", "")
                if (!handle || handle.length == 0) return;
                
                results.push({
                    element: channelHeader,
                    name: handle,
                    domain: "youtube",
                    size: 32
                });
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
            
            // Homepage
            document.querySelectorAll('.yt-content-metadata-view-model__metadata-row').forEach(el => {
                if (!el || el.dataset.sanndex) return;
                el.dataset.sanndex = "true";

                const handleLink = el.querySelector('a[href^="/"]');
                if (!handleLink) return;

                const handle = handleLink.getAttribute("href")
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
            
            // Shorts
            document.querySelectorAll('.ytReelChannelBarViewModelChannelName').forEach(el => {
                if (!el || el.dataset.sanndex) return;
                el.dataset.sanndex = "true";

                const handleLink = el.querySelector('a[href^="/"]');
                if (!handleLink) return;

                const handle = handleLink.getAttribute("href")
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
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json()
            })
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