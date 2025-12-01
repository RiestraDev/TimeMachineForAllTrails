document.getElementById('startBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    
    if (tab.url.includes("alltrails.com/trail/")) {
        chrome.tabs.sendMessage(tab.id, {action: "start_scrape"});
        window.close(); // Close popup so user can watch the page
    } else {
        alert("Please navigate to a specific Trail page first.");
    }
});