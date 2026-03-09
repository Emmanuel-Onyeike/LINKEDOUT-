// trending.js

document.addEventListener('DOMContentLoaded', () => {
    initTrendingPipeline();
});

async function initTrendingPipeline() {
    const loader = document.getElementById('trendingLoader');
    const loaderText = loader.querySelector('p');

    // BUILDER MODE TIMEOUT
    setTimeout(() => {
        // Update to your P404 builder message
        loaderText.innerHTML = "P404 NOT FOUND. BUILDERS ARE SYNCHRONIZING NODES...";
        loaderText.classList.add('text-cyan-500', 'animate-pulse');
    }, 4000);

    // This is the future home for the Twitter / X Trending API fetch
}

function triggerAlert(title, content) {
    const modal = document.getElementById('globalModal');
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalBody').innerHTML = content;
    modal.classList.replace('hidden', 'flex');
}

function closeGlobalModal() {
    document.getElementById('globalModal').classList.replace('flex', 'hidden');
}