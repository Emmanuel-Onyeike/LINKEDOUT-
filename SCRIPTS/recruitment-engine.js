// recruitment-engine.js - Simulates Recruiter Review Logic

document.addEventListener('DOMContentLoaded', () => {
    // Check for pending applications every time the dashboard loads
    simulateReviewProcess();
});

function simulateReviewProcess() {
    let myApps = JSON.parse(localStorage.getItem('my_applications')) || [];
    
    // Find applications that haven't been "Accepted" yet
    const pendingApps = myApps.filter(app => !app.status || app.status === 'Pending');

    if (pendingApps.length > 0) {
        // Simulate a delay (e.g., 30 seconds after application)
        // In a real app, this would be an API response
        setTimeout(() => {
            approveApplication(pendingApps[0].jobTitle);
        }, 15000); // 15 Seconds for demo purposes
    }
}

function approveApplication(jobTitle) {
    let myApps = JSON.parse(localStorage.getItem('my_applications')) || [];
    
    // Update the status in Storage
    const updatedApps = myApps.map(app => {
        if (app.jobTitle === jobTitle && app.status !== 'Accepted') {
            app.status = 'Accepted';
            
            // TRIGGER THE NOTIFICATION
            if (window.pushNotification) {
                window.pushNotification(
                    "Offer Received",
                    `Your application for ${jobTitle} has been ACCEPTED. Review the contract.`,
                    "Jobs"
                );
            }
            // Optional: Alert the user if they are currently on the page
            showLiveToast(jobTitle);
        }
        return app;
    });

    localStorage.setItem('my_applications', JSON.stringify(updatedApps));
}

function showLiveToast(jobTitle) {
    // 1. Create the toast element
    const toast = document.createElement('div');
    
    // 2. Apply classes for positioning and style
    toast.className = "fixed top-6 right-6 z-[9999] w-80 glass-toast p-5 rounded-2xl shadow-2xl animate-toast-in flex items-start gap-4";
    
    // 3. Set the content
    toast.innerHTML = `
        <div class="w-10 h-10 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center shrink-0">
            <i class="fa-solid fa-check-double text-sm"></i>
        </div>
        <div class="flex-1">
            <div class="flex justify-between items-start">
                <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-green-500">Decision Received</h4>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-slate-500 hover:text-white">
                    <i class="fa-solid fa-xmark text-[10px]"></i>
                </button>
            </div>
            <h2 class="text-white text-xs font-bold mt-1 uppercase tracking-tight">Application Accepted</h2>
            <p class="text-[10px] text-slate-400 mt-2 leading-relaxed">Great news, Emmanuel! Your transmission to <span class="text-white font-bold">${jobTitle}</span> was successful. An offer is waiting.</p>
            
            <button onclick="window.location.href='/PAGES/applications.html'" class="mt-4 text-[9px] font-black uppercase tracking-widest text-blue-400 hover:text-white transition-colors">
                Review Offer <i class="fa-solid fa-arrow-right ml-1"></i>
            </button>
        </div>
    `;

    // 4. Add to the page
    document.body.appendChild(toast);

    // 5. Auto-remove after 8 seconds if the user doesn't click it
    setTimeout(() => {
        if (toast) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            toast.style.transition = 'all 0.5s ease';
            setTimeout(() => toast.remove(), 500);
        }
    }, 8000);
}