chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.type === "fetchSource") {

        fetch(`https://sanndex.org/source?domain=${message.domain}`, {
            credentials: "include"
        })
        .then(res => res.json())
        .then(data => sendResponse(data))
        .catch(err => sendResponse({ error: err.toString() }));

        return true;
    }

});