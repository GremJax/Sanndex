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

  const iconName = chooseIcon(data ? data.review : null, totalScore);

  const icon = document.createElement("img");

  icon.title = chooseTitle(data ? data.review : null, totalScore);

  icon.src = chrome.runtime.getURL(`icons/sanndex_${iconName}`);
  icon.style.width = `${size}px`;
  icon.style.height = `${size}px`;
  icon.style.marginLeft = `${size/8}px`;
  icon.style.verticalAlign = "middle";
  icon.style.cursor = "pointer";

  icon.onclick = (event) => {
    event.stopPropagation();
    event.preventDefault();
    openOverlay();
    openSanndexPopup(data, name, event);
  };

  targetElement.appendChild(icon);
}

async function fetchTemplate(name) {
    const html = await fetch(chrome.runtime.getURL(`popups/${name}.html`))
        .then(res => res.text());
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    return wrapper.firstElementChild;
}

const popupWidth = 340;
const popupHeight = 220;

async function reportPopupWaitForLogin(label) {

    const handler = async () => {
        fetch("https://sanndex.org/me", { credentials: "include" })
        .then(res => res.json())
        .then(me => {
            if (me.loggedIn) {
                label.innerHTML = `<p>You are logged in as ${me.user.username}</p>`;
                window.removeEventListener("focus", handler);
            }
        })
    }

    window.addEventListener("focus", handler);
}

async function openReportPopup(data, name, event) {
    const popup = await fetchTemplate("reportPopup");
    const overlay = document.querySelector(".sanndex-overlay");

    const x = Math.max(popupWidth, Math.min(event.clientX, window.innerWidth - popupWidth));
    const y = Math.max(popupHeight, Math.min(event.clientY, window.innerHeight - popupHeight));

    popup.style.position = "fixed";
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    popup.style.transform = "translate(-50%, -50%)";

    // Inject title
    popup.querySelector(".title").textContent = `Report ${name}`;

    popup.querySelector(".back").onclick = () => {
        popup.remove();
        openSanndexPopup(data, name, event);
    };

    // User info
    fetch("https://sanndex.org/me", { credentials: "include" })
    .then(res => res.json())
    .then(me => {
        if (!me.loggedIn) {
            const label = popup.querySelector(".userLabel");

            label.innerHTML = '<p>You are not logged in. </p><a class = login-link href="https://sanndex.org/login" target = "_blank" rel="noopener noreferrer">Log in</a>'
            popup.querySelector(".login-link").onclick = reportPopupWaitForLogin(label);
            return;
        }
        
        popup.querySelector(".userLabel").innerHTML = `<p>You are logged in as ${me.user.username}</p>`;
    });

    const naCheck = popup.querySelector(".na-check");
    const sliders = popup.querySelector(".report-sliders");
    naCheck.onclick = () => {
        if(naCheck.checked) {
            sliders.style.display = "none";
        } else {
            sliders.style.display = "block";
        }
    }

    popup.querySelector(".sendReport").onclick = async () => {
        let sourceId = null;
        if (data) sourceId = data.source.id;

        if (!sourceId) {
            // Add new source
            const source = {
                name: name, 
                domain: `${domain.toLowerCase()}/${name.toLowerCase()}`
            }

            await fetch("https://sanndex.org/new-source", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(source)
            });

            // Get id
            await fetch(`https://sanndex.org/source?domain=${name}`)
            .then(res => res.json())
            .then(data => {
                sourceId = data.source.id
            })
        }

        if (!sourceId) {
            console.error("Source id still not found after creation");
            return
        }

        const payload = {
            sourceId: sourceId,
            url: window.location.href,
            na: naCheck.checked,
            description: popup.querySelector(".description").value,
            accuracy_score: popup.querySelector(".accuracy").value,
            transparency_score: popup.querySelector(".transparency").value,
            integrity_score: popup.querySelector(".integrity").value,
            manipulation_score: popup.querySelector(".manipulation").value,
            authenticity_score: popup.querySelector(".authenticity").value,
            credibility_score: popup.querySelector(".credibility").value,
            captcha: document.querySelector('[name="cf-turnstile-response"]').value
        };
        await fetch("https://sanndex.org/report", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        overlay.remove();
    };

    overlay.appendChild(popup);
}

async function openSanndexPopup(data, name, event) {
    const popup = await fetchTemplate("reviewPopup");
    const overlay = document.querySelector(".sanndex-overlay");

    // Position near mouse
    const x = Math.max(popupWidth, Math.min(event.clientX, window.innerWidth - popupWidth));
    const y = Math.max(popupHeight, Math.min(event.clientY, window.innerHeight - popupHeight));

    popup.style.position = "fixed";
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    popup.style.transform = "translate(-50%, -50%)";

    // Inject data
    popup.querySelector(".title").textContent = `${name}'s Sanndex Review`;
    popup.querySelector(".score").textContent = data && data.review ? `Score: ${data.review}` : "No rating yet";

    // Event handlers
    popup.querySelector(".close").onclick = () => overlay.remove();
    popup.querySelector(".viewFull").onclick = () => window.open(`https://sanndex.org/review/${name}`, "_blank");
    popup.querySelector(".reportSource").onclick = () => {
        popup.remove();
        openReportPopup(data, name, event);
    };

    overlay.appendChild(popup);
}

async function openOverlay(){
    const overlay = await fetchTemplate("overlay")
    document.body.appendChild(overlay)
    return overlay
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
                    domain: "youtube.com",
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
                    domain: "youtube.com",
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
                    domain: "youtube.com",
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
                    domain: "youtube.com",
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
                    domain: "x.com",
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

async function getSource(result) {
    try {
        let res = await fetch(`https://sanndex.org/source?domain=${result.domain.toLowerCase()}/${result.name.toLowerCase()}`);

        if (!res.ok) {
            res = await fetch(`https://sanndex.org/source?domain=${result.name.toLowerCase()}`);
            if (!res.ok) return null;
        }

        return await res.json();
    } catch (err) {
        return null;
    }
}

// Watch for dynamic content
const observer = new MutationObserver(() => {
    const results = findNameElements();

    results.forEach(async result => {
        if (!result) return

        const data = await getSource(result);

        if (!data || data.error) {
            insertBadge(result.element, result.size, null, result.name, 0);
            console.log(`No review for ${result.name}`);
            return
        }
        insertBadge(result.element, result.size, data, data.source.name, data.score);
        
    })
    
});

observer.observe(document.body, { childList: true, subtree: true });