🏔️ AllTrails Time Machine

See what the trail really looks like before you go.

🚙 The Problem

The AllTrails website has thousands of photos, but they are dumped into an infinite scroll feed sorted only by "Newest". It is impossible to answer the critical question: "Does this trail get snow/ice in January?" without scrolling through 5 years of photos manually.

🛠️ The Solution

AllTrails Time Machine is a Chrome Extension that injects a "Power User" interface into the AllTrails photo gallery.

It scrapes thousands of photos in the background, bypasses the infinite scroll, and organizes every single photo by Month and Year. Now you can instantly filter to see only January photos from 2024, 2023, 2022, etc., to spot seasonal trends and decide if you need to pack tire chains or micro-spikes.

✨ Features

📅 Monthly Filtering: Dropdown selector to view photos from specific months (e.g., "January Only").

🗂️ Yearly Grouping: Automatically groups photos by year (2025, 2024, 2023...) to visualize historical conditions.

⚡ Smart Caching: Fetches data once and performs instant client-side filtering/sorting.

🛡️ Anti-Detection: Uses batching and random jitter ("human-like" delays) to avoid triggering WAF rate limits (HTTP 429).

☢️ "Nuclear" ID Detection: Uses robust Regex text search to find Trail IDs even if AllTrails changes their DOM structure or React props.

🎹 Pro Gallery: Custom full-screen lightbox with keyboard navigation (Left/Right/Esc).

🚀 How to Use

Navigate to any trail on AllTrails.com (e.g., Emory Peak).

Click the Time Machine extension icon in your toolbar.

Click Load Photos.

Note: If you are on the main overview page, the extension will automatically redirect you to the /photos sub-page and auto-start.

Wait for the scraper to finish (it mimics human speed, so give it a minute for popular trails).

Use the new dropdowns to filter by Month and Sort Order.

⚙️ Technical Details

Stack: Vanilla JavaScript, CSS Grid, Chrome Manifest V3.

API Strategy: Reverse-engineered the internal AllTrails V2 API.

Image Proxy: Generates signed Base64 URLs to access the AllTrails image CDN directly.

Resiliency: Implements a "Fall-through" strategy for finding Trail IDs:

React Props injection

Mobile App Link Meta Tags

Next.js Hydration Data

Raw HTML Regex Search (The "Nuclear Option")

⚠️ Disclaimer

This tool is for educational and personal research purposes only. It is not affiliated with, endorsed by, or supported by AllTrails. Use responsibly—excessive scraping may result in temporary IP blocks from their CDN.

The script includes built-in rate limiting ("jitter") to be a "good citizen" on their network