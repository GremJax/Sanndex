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

function openReportPopup(data, name, event) {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.5)";
    overlay.style.zIndex = "999999";

    const x = Math.min(event.clientX, window.innerWidth - 340);
    const y = Math.min(event.clientY, window.innerHeight - 220);

    const popup = document.createElement("div");
    popup.style.position = "fixed";
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    popup.style.transform = "translate(-50%, -50%)";
    popup.style.background = "white";
    popup.style.padding = "20px";
    popup.style.borderRadius = "10px";
    popup.style.width = "320px";
    popup.style.fontFamily = "Arial";
    popup.style.boxShadow = "0 5px 20px rgba(0,0,0,0.3)";

    const title = document.createElement("h2");
    title.textContent = `Report ${name}`;

    const reportButton = document.createElement("button");
    reportButton.textContent = "Send Report";
    reportButton.style.marginLeft = "10px";

    const descriptionLabel = document.createElement("div");
    descriptionLabel.textContent = "Description";

    const descriptionBox = document.createElement("textarea");
    descriptionBox.style.width = "100%";
    descriptionBox.style.height = "70px";
    descriptionBox.placeholder = "Describe the issue...";

    // Accuracy
    const accuracyLabel = document.createElement("div");
    accuracyLabel.textContent = "Accuracy";
    const accuracySlider = document.createElement("input");
    accuracySlider.type = "range";
    accuracySlider.min = 0;
    accuracySlider.max = 100;
    accuracySlider.value = 50;
    accuracySlider.style.width = "100%";

    // Transparency
    const transparencyLabel = document.createElement("div");
    transparencyLabel.textContent = "Transparency";
    const transparencySlider = document.createElement("input");
    transparencySlider.type = "range";
    transparencySlider.min = 0;
    transparencySlider.max = 100;
    transparencySlider.value = 50;
    transparencySlider.style.width = "100%";

    // Integrity
    const integrityLabel = document.createElement("div");
    integrityLabel.textContent = "Integrity";
    const integritySlider = document.createElement("input");
    integritySlider.type = "range";
    integritySlider.min = 0;
    integritySlider.max = 100;
    integritySlider.value = 50;
    integritySlider.style.width = "100%";

    // Manipulation
    const manipulationLabel = document.createElement("div");
    manipulationLabel.textContent = "Manipulation";
    const manipulationSlider = document.createElement("input");
    manipulationSlider.type = "range";
    manipulationSlider.min = 0;
    manipulationSlider.max = 100;
    manipulationSlider.value = 50;
    manipulationSlider.style.width = "100%";

    // Authenticity
    const authenticityLabel = document.createElement("div");
    authenticityLabel.textContent = "Authenticity";
    const authenticitySlider = document.createElement("input");
    authenticitySlider.type = "range";
    authenticitySlider.min = 0;
    authenticitySlider.max = 100;
    authenticitySlider.value = 50;
    authenticitySlider.style.width = "100%";

    // Credibility
    const credibilityLabel = document.createElement("div");
    credibilityLabel.textContent = "Credibility";
    const credibilitySlider = document.createElement("input");
    credibilitySlider.type = "range";
    credibilitySlider.min = 0;
    credibilitySlider.max = 100;
    credibilitySlider.value = 50;
    credibilitySlider.style.width = "100%";

    // Fetch report info
    const url = domain;

    let currentUserId = null;
    fetch("https://sanndex.org/me", {
        credentials: "include"
    })
    .then(res => res.json())
    .then(data => {
        currentUserId = data.userId;
    });

    const sourceId = data.source_id;

    // Send report
    reportButton.onclick = () => {
        const description = descriptionBox.value;
        const accuracy = accuracySlider.value;
        const transparency = transparencySlider.value;
        const integrity = integritySlider.value;
        const manipulation = manipulationSlider.value;
        const authenticity = authenticitySlider.value;
        const credibility = credibilitySlider.value;

        fetch("https://sanndex.org/report", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                sourceId,
                userId: currentUserId,
                url,
                description,
                accuracy,
                transparency,
                integrity,
                manipulation,
                authenticity,
                credibility
            })
        });
    };

    // Back button
    const back = document.createElement("button");
    back.textContent = "back";
    back.style.float = "right";
    back.onclick = () => {
        overlay.remove();
        openSanndexPopup(data,name,event)
    }

    popup.appendChild(back);
    popup.appendChild(title);

    popup.appendChild(accuracyLabel);
    popup.appendChild(accuracyLabel);

    popup.appendChild(transparencyLabel);
    popup.appendChild(transparencySlider);

    popup.appendChild(integrityLabel);
    popup.appendChild(integritySlider);

    popup.appendChild(manipulationLabel);
    popup.appendChild(manipulationSlider);

    popup.appendChild(authenticityLabel);
    popup.appendChild(authenticitySlider);
    
    popup.appendChild(credibilityLabel);
    popup.appendChild(credibilitySlider);

    popup.appendChild(descriptionBox);
    popup.appendChild(reportButton);

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
}

function openSanndexPopup(data, name, event) {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.5)";
    overlay.style.zIndex = "999999";

    const x = Math.min(event.clientX, window.innerWidth - 340);
    const y = Math.min(event.clientY, window.innerHeight - 220);

    const popup = document.createElement("div");
    popup.style.position = "fixed";
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
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
    score.textContent = data ? `Score: ${data.accuracy_score}` : "No rating yet";

    const siteButton = document.createElement("button");
    siteButton.textContent = "View Full Review";
    siteButton.onclick = () => {
        window.open(`https://sanndex.org/review/${name}`, "_blank");
    };

    const reportButton = document.createElement("button");
    reportButton.textContent = "Report Source";
    reportButton.style.marginLeft = "10px";
    reportButton.onclick = () => {
        overlay.remove();
        openReportPopup(data,name,event)
    }

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