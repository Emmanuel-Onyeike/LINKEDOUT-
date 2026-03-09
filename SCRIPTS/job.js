// job.js - LinkedOut Job Board Logic

document.addEventListener('DOMContentLoaded', () => {
    fetchJobs();
});

// Load jobs from localStorage so they don't disappear on refresh
let mockJobs = JSON.parse(localStorage.getItem('linkedOut_jobs')) || []; 

/**
 * FETCH JOBS
 */
async function fetchJobs() {
    const feed = document.getElementById('jobFeed');
    const loader = document.getElementById('jobLoader');

    // Network Scan Simulation
    setTimeout(() => {
        if (loader) loader.classList.add('hidden');
        renderJobs(mockJobs);
    }, 1500);
}

/**
 * RENDER JOBS
 */
function renderJobs(jobs) {
    const feed = document.getElementById('jobFeed');
    if (!feed) return;

    // EMPTY STATE
    if (jobs.length === 0) {
        feed.innerHTML = `
            <div id="emptyJobState" class="flex flex-col items-center justify-center py-24 px-10 bg-white border border-dashed border-slate-300 rounded-[40px] text-center animate-fade-in">
                <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <i class="fa-solid fa-briefcase-slash text-slate-300 text-3xl"></i>
                </div>
                <h3 class="text-xs font-black uppercase tracking-widest text-slate-800 mb-2">No Jobs Available</h3>
                <p class="text-[11px] font-medium text-slate-500 leading-relaxed max-w-xs">
                    Post a new job or wait for remote opportunities to sync.
                </p>
            </div>
        `;
        return;
    }

    // LISTING GENERATION
    feed.innerHTML = jobs.map((job, index) => `
        <div class="job-card group animate-slide-up">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <span class="${job.source === 'upwork' ? 'upwork-tag' : 'local-tag'} mb-3 inline-block">
                        ${job.source.toUpperCase()}
                    </span>
                    <h3 class="text-lg font-black uppercase italic tracking-tighter">${job.title}</h3>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">${job.company}</p>
                </div>
                <div class="text-right">
                    <p class="text-xs font-black text-slate-900">${job.budget}</p>
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">${job.type}</p>
                </div>
            </div>
            <button onclick="viewJobDetails(${index})" class="w-full py-3 mt-4 border border-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest group-hover:bg-slate-900 group-hover:text-white transition">
                View Details
            </button>
        </div>
    `).join('');
}

/**
 * DETAIL VIEW & PERSISTENCE
 */
function viewJobDetails(index) {
    const selectedJob = mockJobs[index];
    localStorage.setItem('selectedJob', JSON.stringify(selectedJob));
    window.location.href = 'job-details.html';
}

/**
 * MODAL CONTROLS
 */
function openPostModal() {
    const modal = document.getElementById('postJobModal');
    if (modal) modal.classList.replace('hidden', 'flex');
}

function closePostModal() {
    const modal = document.getElementById('postJobModal');
    if (modal) modal.classList.replace('flex', 'hidden');
}

/**
 * SUBMIT JOB (Linked to Alert Engine)
 */
function submitJob() {
    const titleInput = document.getElementById('jobTitle');
    const budgetInput = document.getElementById('jobBudget');
    const descInput = document.getElementById('jobDesc');
    const typeInput = document.getElementById('jobType');

    if (!titleInput.value || !budgetInput.value) {
        alert("Enter Title and Budget.");
        return;
    }

    const newJob = {
        title: titleInput.value,
        company: "LOCAL POST",
        budget: titleInput.value.includes('₦') ? budgetInput.value : `₦${budgetInput.value}`,
        type: typeInput.value || "Remote",
        desc: descInput.value || "No additional description provided.",
        source: "local"
    };

    // 1. Update Array & Sync to LocalStorage
    mockJobs.unshift(newJob);
    localStorage.setItem('linkedOut_jobs', JSON.stringify(mockJobs));
    
    // 2. Refresh UI
    renderJobs(mockJobs);
    
    // 3. SEND ALERT (Global Engine)
    if (window.pushNotification) {
        window.pushNotification(
            "New Job Posted",
            `Published: ${newJob.title}`,
            "Jobs"
        );
    }
    
    // 4. Reset & Close
    titleInput.value = ""; budgetInput.value = ""; descInput.value = ""; typeInput.value = "";
    closePostModal();
}