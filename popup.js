document.addEventListener('DOMContentLoaded', async () => {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    const btn = document.getElementById('startBtn');
    const status = document.getElementById('statusMsg');

    // 1. Check if we are on a valid AllTrails Trail URL
    if (tab.url && tab.url.includes("alltrails.com/trail/")) {
        btn.disabled = false;
        
        btn.addEventListener('click', () => {
            // UI Feedback
            btn.innerHTML = "<span>⏳</span> Working...";
            status.textContent = "Injecting script...";
            
            // Send Message
            chrome.tabs.sendMessage(tab.id, {action: "start_scrape"}, (response) => {
                // If we get a response, close the window smoothly
                if (response && response.status === "started") {
                    btn.innerHTML = "<span>✅</span> Started!";
                    setTimeout(() => window.close(), 800);
                } else {
                    // Handle case where content script isn't loaded (e.g. fresh install before refresh)
                    if (chrome.runtime.lastError) {
                        status.textContent = "Error: Please refresh the page first.";
                        status.style.color = "#e74c3c";
                    }
                }
            });
        });

    } else {
        // Invalid URL State
        btn.disabled = true;
        btn.style.backgroundColor = "#95a5a6"; // Grey out
        status.textContent = "⚠️ Go to a specific Trail page first.";
        status.style.color = "#e67e22"; // Orange warning
    }
});