// Global State
let allPhotosCache = [];
let currentSort = 'desc';
let currentMonth = 0; 
let isRunning = false;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const API_KEY = '3p0t5s6b5g4g0e8k3c1j3w7y5c3m4t8i'; 

// Whimsical messages
const LOADING_MESSAGES = [
    "🐢 Pacing ourselves so Big Brother doesn't get mad...",
    "🕵️‍♂️ Sneaking past the rate limiters...",
    "🧊 Staying frosty to avoid the ban hammer...",
    "🤖 acting_totally_human.exe...",
    "⏳ This is as fast as we can go without angering the server gods...",
    "🚙 shifting_into_4lo.exe..." // Added a 4Runner easter egg for you
];

// --- LISTENERS ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "start_scrape") {
        if (isRunning) return;
        init();
        sendResponse({status: "started"});
    }
    return true; 
});

if (sessionStorage.getItem('atm_autostart')) {
    sessionStorage.removeItem('atm_autostart'); 
    console.log("⏰ Time Machine Auto-Start triggered.");
    setTimeout(init, 1000); 
}

// --- UTILS ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms + Math.random() * 300));

async function getApiKey() {
    try {
        const scriptTag = document.getElementById('__NEXT_DATA__');
        if (scriptTag) {
            const json = JSON.parse(scriptTag.innerText);
            const key = json?.runtimeConfig?.ALLTRAILS_API_KEY || json?.query?.api_key;
            if (key) return key;
        }
    } catch(e) {}
    return API_KEY; 
}

async function getTrailId() {
    // Strategy 1: React Props
    try {
        const reactContainer = document.querySelector('div[data-react-class="PhotoPage"]');
        if (reactContainer) {
            const rawProps = reactContainer.getAttribute('data-react-props');
            if (rawProps) {
                const props = JSON.parse(rawProps);
                if (props?.context?.locationServerData?.loc_id) return props.context.locationServerData.loc_id;
            }
        }
    } catch (e) {}

    // Strategy 2: Meta Tags
    try {
        const meta = document.querySelector('meta[property="al:ios:url"]') || document.querySelector('meta[property="al:android:url"]');
        if (meta) {
            const match = meta.getAttribute('content').match(/trail\/(\d+)/);
            if (match && match[1]) return match[1];
        }
    } catch(e) {}

    // Strategy 3: Next.js Data
    try {
        const scriptTag = document.getElementById('__NEXT_DATA__');
        if (scriptTag) {
            const nextData = JSON.parse(scriptTag.innerText);
            const id = nextData?.props?.pageProps?.trail?.id 
                    || nextData?.props?.pageProps?.dehydratedState?.queries?.[0]?.state?.data?.id;
            if (id) return id;
        }
    } catch(e) {}

    // Strategy 4: Nuclear Text Search
    try {
        const pageSource = document.documentElement.innerHTML;
        const locMatch = pageSource.match(/"loc_id":\s*(\d+)/);
        if (locMatch && locMatch[1]) return locMatch[1];
        const apiMatch = pageSource.match(/\/api\/alltrails\/v2\/trails\/(\d+)/);
        if (apiMatch && apiMatch[1]) return apiMatch[1];
    } catch (e) {}

    return null;
}

function buildProxyUrl(id, hash, size) {
    if (!id || !hash) return null;
    const req = {
        bucket: "assets.alltrails.com",
        key: `uploads/photo/image/${id}/${hash}.jpg`,
        edits: { resize: { width: size, height: size, fit: "inside" } }
    };
    return `https://images.alltrails.com/${btoa(JSON.stringify(req))}`;
}

// --- MAIN LOGIC ---

async function init() {
    if (!window.location.href.includes('/photos')) {
        const feedback = document.createElement('div');
        feedback.className = 'jan-loading';
        feedback.innerText = "🚀 Redirecting to Photos Page...";
        document.body.appendChild(feedback);
        sessionStorage.setItem('atm_autostart', 'true');
        const cleanUrl = window.location.href.split('?')[0].replace(/\/$/, '');
        window.location.href = `${cleanUrl}/photos`;
        return; 
    }

    isRunning = true;
    
    // Pick ONE message for the entire session
    const randomMessage = LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];

    const feedback = document.createElement('div');
    feedback.className = 'jan-loading';
    feedback.innerText = "🔍 Pre-flight checks...";
    document.body.appendChild(feedback);

    const trailId = await getTrailId();
    const apiKey = await getApiKey();
    
    if (!trailId) {
        feedback.innerText = "❌ Error: Could not detect Trail ID.";
        feedback.style.background = "#c0392b";
        setTimeout(() => feedback.remove(), 4000);
        isRunning = false;
        return;
    }

    feedback.innerText = "⛰️ Warming up Time Machine...";

    let page = 1;
    let keepFetching = true;
    
    // BATCH CONFIGURATION
    const BATCH_SIZE = 3; 
    
    while (keepFetching) {
        // Display the selected message continuously + progress
        feedback.innerText = `Scanning Page ${page}... (${allPhotosCache.length} photos)\n${randomMessage}`;

        const promises = [];
        for (let i = 0; i < BATCH_SIZE; i++) {
            const p = page + i;
            const url = `https://www.alltrails.com/api/alltrails/v2/trails/${trailId}/photos?page=${p}&per_page=100&sort_option=atSort`;
            promises.push(fetch(url, { headers: { "x-at-key": apiKey } }));
        }

        try {
            const responses = await Promise.all(promises);
            
            for (const res of responses) {
                if (!res.ok) {
                    if (res.status === 429) throw new Error("429");
                    continue; 
                }
                
                const data = await res.json();
                const photos = data.photos || [];

                if (photos.length === 0) {
                    keepFetching = false; 
                }

                photos.forEach(photo => {
                    const createdStr = photo.metadata?.created;
                    if (createdStr) {
                        const date = new Date(createdStr);
                        allPhotosCache.push({
                            dateStr: date.toLocaleDateString(),
                            year: date.getFullYear(),
                            month: date.getMonth(),
                            timestamp: date.getTime(),
                            user: photo.user?.username || 'Unknown',
                            thumbUrl: buildProxyUrl(photo.id, photo.photoHash, 500),
                            fullUrl: buildProxyUrl(photo.id, photo.photoHash, 2048)
                        });
                    }
                });
            }

            page += BATCH_SIZE;
            if (page > 100) keepFetching = false; 

        } catch (err) {
            if (err.message === "429") {
                feedback.innerText = "🔥 Whoops, too fast! Cooling down for 5s...";
                feedback.style.background = "#e67e22";
                await sleep(5000);
                feedback.style.background = "#2c3e50";
                continue; 
            }
            console.error(err);
        }
        
        await sleep(1200);
    }

    feedback.remove();
    setupUI();
    renderGallery();
}

function setupUI() {
    const originalSort = document.querySelector('[data-testid="sort"]');
    if (originalSort) {
        const container = originalSort.closest('div[class*="styles-module__container"]');
        if (container) {
            container.innerHTML = '';
            
            const controls = document.createElement('div');
            controls.className = 'jan-controls-container';

            const monthSel = document.createElement('select');
            monthSel.className = 'jan-custom-select';
            MONTHS.forEach((m, i) => {
                monthSel.innerHTML += `<option value="${i}" ${i === 0 ? 'selected' : ''}>${m}</option>`;
            });
            monthSel.onchange = (e) => { currentMonth = parseInt(e.target.value); renderGallery(); };

            const sortSel = document.createElement('select');
            sortSel.className = 'jan-custom-select';
            sortSel.innerHTML = `<option value="desc">Newest First</option><option value="asc">Oldest First</option>`;
            sortSel.onchange = (e) => { currentSort = e.target.value; renderGallery(); };

            controls.append(monthSel, sortSel);
            container.appendChild(controls);
        }
    }

    const target = document.querySelector('div[class*="styles-module__photosGallery"]');
    if (target) {
        target.style.display = 'block';
        target.style.width = '100%';
    }
}

function renderGallery() {
    const target = document.querySelector('div[class*="styles-module__photosGallery"]') || document.body;
    
    let filtered = allPhotosCache.filter(p => p.month === currentMonth);
    filtered.sort((a, b) => currentSort === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);
    
    const byYear = filtered.reduce((acc, p) => {
        if (!acc[p.year]) acc[p.year] = [];
        acc[p.year].push(p);
        return acc;
    }, {});

    const years = Object.keys(byYear).sort((a, b) => currentSort === 'desc' ? b - a : a - b);
    const monthName = MONTHS[currentMonth];

    let html = `<h2 style="padding:0 0 20px; color:#333; font-family:sans-serif;">❄️ ${monthName} Conditions (${filtered.length} photos)</h2>`;
    
    if (filtered.length === 0) {
        html += `<div style="text-align:center; padding:40px; color:#666;">No photos found for ${monthName}.</div>`;
    } else {
        years.forEach(year => {
            html += `<div class="jan-year-header">${year}</div><div class="jan-gallery-grid">`;
            byYear[year].forEach((p, idx) => {
                p.filteredIndex = filtered.indexOf(p); 
                html += `
                    <div class="jan-thumb-card" data-idx="${p.filteredIndex}">
                        <img src="${p.thumbUrl}" class="jan-thumb-img" loading="lazy" />
                        <div class="jan-meta">${p.dateStr}</div>
                    </div>`;
            });
            html += `</div>`;
        });
    }

    if (!document.getElementById('janModal')) {
        const modalHTML = `
            <div class="jan-modal-overlay" id="janModal">
                <button class="jan-close" id="janClose">&times;</button>
                <button class="jan-nav-btn jan-prev" id="janPrev">&#10094;</button>
                <button class="jan-nav-btn jan-next" id="janNext">&#10095;</button>
                <img class="jan-modal-img" id="janModalImg" src="" />
                <div class="jan-modal-info" id="janModalInfo"></div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        setupModal(filtered);
    } else {
        setupModal(filtered);
    }

    target.innerHTML = html;

    document.querySelectorAll('.jan-thumb-card').forEach(card => {
        card.addEventListener('click', () => window.openJanModal(parseInt(card.dataset.idx)));
    });
}

function setupModal(currentDataset) {
    const modal = document.getElementById('janModal');
    const img = document.getElementById('janModalImg');
    const info = document.getElementById('janModalInfo');
    let currentIndex = 0;

    window.openJanModal = (idx) => {
        currentIndex = idx;
        update();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const update = () => {
        const p = currentDataset[currentIndex];
        img.src = p.fullUrl;
        info.innerHTML = `${p.dateStr} <span>@${p.user}</span>`;
    };

    const close = () => {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    };

    document.getElementById('janClose').onclick = close;
    modal.onclick = (e) => { if(e.target === modal) close(); };
    
    document.getElementById('janNext').onclick = (e) => {
        e.stopPropagation();
        currentIndex = (currentIndex + 1) % currentDataset.length;
        update();
    };
    document.getElementById('janPrev').onclick = (e) => {
        e.stopPropagation();
        currentIndex = (currentIndex - 1 + currentDataset.length) % currentDataset.length;
        update();
    };
    
    document.onkeydown = null;
    const newKeyHandler = (e) => {
        if (!modal.classList.contains('active')) return;
        if (e.key === 'ArrowRight') document.getElementById('janNext').click();
        if (e.key === 'ArrowLeft') document.getElementById('janPrev').click();
        if (e.key === 'Escape') close();
    };
    
    document.onkeydown = newKeyHandler; 
}