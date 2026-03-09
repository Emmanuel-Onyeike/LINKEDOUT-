/**
 * LINKEDOUT APPLICATIONS ENGINE v2.0
 * Features: Central Modal System, Professional Status Tracking, Logic Deletion
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI
    renderMyApplications();
    // Inject the Modal Shell into the DOM if it doesn't exist
    createModalShell();
});

/** * UI RENDERING 
 */
function renderMyApplications() {
    const container = document.getElementById('appsContainer');
    if (!container) return;

    const myApps = JSON.parse(localStorage.getItem('my_applications')) || [];
    
    // EMPTY STATE
    if (myApps.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-24 bg-white border border-dashed border-slate-200 rounded-[40px]">
                <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <i class="fa-solid fa-box-open text-slate-200 text-2xl"></i>
                </div>
                <h3 class="text-[10px] font-black uppercase tracking-[0.4em] text-slate-800 mb-2">No Active Transmissions</h3>
                <p class="text-[10px] font-medium text-slate-400 max-w-[220px] text-center leading-relaxed">
                    Explore the job board to begin tracking your professional signals.
                </p>
            </div>
        `;
        return;
    }

    // LIST VIEW
    container.innerHTML = myApps.map((app, index) => {
        const isAccepted = app.status === 'Accepted';
        
        return `
            <div class="bg-white border border-slate-100 p-8 rounded-[32px] flex flex-col md:flex-row md:items-center justify-between hover:border-blue-600 transition-all duration-500 group animate-central-pop" style="animation-delay: ${index * 0.05}s">
                <div class="flex items-center gap-6">
                    <div class="w-16 h-16 ${isAccepted ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-50 text-slate-400'} rounded-[20px] flex items-center justify-center transition-all duration-500 group-hover:scale-105">
                        <i class="fa-solid ${isAccepted ? 'fa-trophy' : 'fa-paper-plane'} text-sm"></i>
                    </div>
                    
                    <div>
                        <h3 class="text-xs font-black uppercase tracking-tight text-slate-900">${app.jobTitle}</h3>
                        <div class="flex items-center gap-3 mt-2">
                            <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sent: ${new Date(app.date).toLocaleDateString()}</p>
                            <span class="w-1 h-1 bg-slate-200 rounded-full"></span>
                            <span class="text-[8px] font-black text-blue-600 uppercase tracking-widest">ID: LNKD-${index + 101}</span>
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-5 mt-6 md:mt-0">
                    <span class="px-5 py-2 ${isAccepted ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100'} rounded-full text-[8px] font-black uppercase tracking-[0.25em] border transition-all">
                        ${isAccepted ? 'Offer Received' : 'Under Review'}
                    </span>

                    <button onclick="triggerActionModal('${app.jobTitle}')" class="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/** * MODAL SYSTEM CONTROLLER 
 */
function createModalShell() {
    if (document.getElementById('central-modal-overlay')) return;

    const modalHTML = `
        <div id="central-modal-overlay" class="fixed inset-0 z-[9999] hidden items-center justify-center p-6 modal-backdrop">
            <div id="modal-container" class="bg-white w-full max-w-sm rounded-[44px] shadow-2xl overflow-hidden animate-central-pop border border-slate-100">
                <div id="modal-inner-content" class="p-10 text-center">
                    </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function triggerActionModal(jobTitle) {
    const overlay = document.getElementById('central-modal-overlay');
    const inner = document.getElementById('modal-inner-content');

    overlay.classList.add('active');
    
    inner.innerHTML = `
        <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <i class="fa-solid fa-circle-exclamation text-xl"></i>
        </div>
        <h2 class="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Retract Signal?</h2>
        <p class="text-[11px] text-slate-400 mt-4 leading-relaxed px-4">Are you sure you want to delete the application for <br><span class="text-slate-900 font-bold">${jobTitle}</span>?</p>
        
        <div class="flex flex-col gap-2 mt-10">
            <button onclick="executeDeletion('${jobTitle}')" class="w-full py-4 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-2xl hover:bg-red-700 transition-all">
                Confirm Deletion
            </button>
            <button onclick="closeCentralModal()" class="w-full py-4 bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all">
                Keep Transmission
            </button>
        </div>
    `;
}

function executeDeletion(jobTitle) {
    let myApps = JSON.parse(localStorage.getItem('my_applications')) || [];
    myApps = myApps.filter(app => app.jobTitle !== jobTitle);
    localStorage.setItem('my_applications', JSON.stringify(myApps));
    
    closeCentralModal();
    renderMyApplications();
    
    // Optional: Sync Dashboard
    if (window.updateDashboardStats) window.updateDashboardStats();
}

function closeCentralModal() {
    const overlay = document.getElementById('central-modal-overlay');
    overlay.classList.remove('active');
}