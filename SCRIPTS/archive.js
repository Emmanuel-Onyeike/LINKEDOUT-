document.addEventListener('DOMContentLoaded', () => {
    loadArchives();
    
    // Simulate engineering completion or manual toggle
    console.log("Archive System: Awaiting Engineering Clearance...");
});

/**
 * LOAD ARCHIVES
 * Fetches data from a hypothetical 'archive_storage' in localStorage
 */
function loadArchives() {
    const grid = document.getElementById('archiveGrid');
    const archives = JSON.parse(localStorage.getItem('nxxt_archives')) || [];

    if (archives.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full border border-dashed border-slate-800 rounded-[40px] py-20 text-center">
                <p class="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600 italic">No Encrypted Data Found</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = archives.map(item => `
        <div class="archive-card group">
            <div class="flex justify-between items-start mb-6">
                <div class="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800 text-blue-500">
                    <i class="fa-solid fa-box-archive text-xs"></i>
                </div>
                <span class="text-[8px] font-black text-slate-600 uppercase tracking-widest">${item.date}</span>
            </div>
            <h3 class="text-white text-sm font-black uppercase tracking-tight mb-2">${item.title}</h3>
            <p class="text-[10px] text-slate-500 leading-relaxed mb-6">${item.description}</p>
            <div class="flex gap-4">
                <button class="text-[8px] font-black uppercase text-blue-500 tracking-widest hover:text-white transition-all">Restore</button>
                <button class="text-[8px] font-black uppercase text-red-500/50 tracking-widest hover:text-red-500 transition-all">Purge</button>
            </div>
        </div>
    `).join('');
}

/**
 * TOGGLE ENGINEERING MODE
 * Use this in the console to see the page behind the blur
 */
function bypassEngineering() {
    document.getElementById('engineerOverlay').style.display = 'none';
    document.querySelector('main').classList.remove('opacity-20', 'pointer-events-none');
    document.body.style.overflow = 'auto';
}