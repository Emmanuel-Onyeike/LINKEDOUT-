// foryou.js - Discovery System (Twitter/X Prep)

document.addEventListener('DOMContentLoaded', () => {
    // Start the loading sequence
    initDiscoveryPipeline();
});

async function initDiscoveryPipeline() {
    const loader = document.getElementById('foryouLoader');
    const loaderText = loader.querySelector('p');
    const emptyState = document.getElementById('emptyState');

    // 1. SET INITIAL STATE
    loader.classList.remove('hidden');
    emptyState.classList.add('hidden');

    // 2. BUILDER MODE TIMEOUT
    // If we don't get data, we update the status to let users know the "Builders are Building"
    setTimeout(() => {
        if (!document.querySelector('.discovery-card')) {
            loaderText.innerHTML = "P404 NOT FOUND. BUILDERS ARE BUILDING...";
            loaderText.classList.add('text-cyan-500', 'animate-pulse');
        }
    }, 5000);

    try {
        /**
         * X (TWITTER) API SLOT
         * We keep apiData as null to stay in the Loading phase.
         */
        const apiData = null; 

        if (apiData) {
            loader.classList.add('hidden');
            renderXCards(apiData);
        }

    } catch (error) {
        console.error("📡 Signal Interrupted:", error);
        // On actual error, show the Satellite Dish Empty State
        loader.classList.add('hidden');
        emptyState.classList.remove('hidden');
    }
}

/**
 * RENDER ENGINE
 * Prepared for X (Twitter) Data Structure
 */
function renderXCards(tweets) {
    const feed = document.getElementById('discoveryFeed');
    
    const cardsHTML = tweets.map((tweet, i) => `
        <div class="discovery-card bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm animate-slide-up" style="animation-delay: ${i * 0.1}s">
            <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-cyan-400">
                    <i class="fa-brands fa-x-twitter text-xs"></i>
                </div>
                <div>
                    <h4 class="text-xs font-black text-slate-800 uppercase tracking-tight">X_Broadcast</h4>
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">REAL-TIME SIGNAL</p>
                </div>
            </div>
            <p class="text-sm text-slate-600 leading-relaxed font-medium mb-6">${tweet.text}</p>
            <div class="pt-6 border-t border-slate-50 flex items-center gap-6">
                <button onclick="triggerAlert('Replying', 'Connecting to X-Grid...')" class="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase hover:text-cyan-500 transition">
                    <i class="fa-solid fa-comment text-xs"></i> Signal Back
                </button>
            </div>
        </div>
    `).join('');
    
    feed.insertAdjacentHTML('beforeend', cardsHTML);
}

/**
 * GLOBAL UI CONTROLS
 * Alerts appear in a modal at the center of the page.
 */
function triggerAlert(title, content) {
    const modal = document.getElementById('globalModal');
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalBody').innerHTML = content;
    modal.classList.replace('hidden', 'flex');
}

function closeGlobalModal() {
    document.getElementById('globalModal').classList.replace('flex', 'hidden');
}