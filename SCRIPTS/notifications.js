// notifications.js - Final Persistent Filter Fix

document.addEventListener('DOMContentLoaded', () => {
    // Initial Load: Show everything
    renderNotifications('All');

    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 1. UI Toggle
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 2. Get the filter text and clean it
            const filterValue = btn.innerText.trim(); 
            
            // 3. Re-render based on selection
            renderNotifications(filterValue);
        });
    });
});

function renderNotifications(filter = 'All') {
    const feed = document.getElementById('notifFeed');
    // Always pull fresh data from storage on every render call
    const alerts = JSON.parse(localStorage.getItem('linkedOut_alerts')) || [];

    // FILTER LOGIC
    let filteredAlerts = alerts;
    if (filter !== 'All') {
        // Use toLowerCase() to ensure "Jobs" matches "jobs" or "JOBS"
        filteredAlerts = alerts.filter(alert => 
            alert.category.toLowerCase() === filter.toLowerCase()
        );
    }

    // EMPTY STATE VIEW
    if (filteredAlerts.length === 0) {
        feed.className = "flex flex-col items-center justify-center py-32 px-10 bg-white border border-dashed border-slate-300 rounded-[40px] text-center animate-fade-in";
        feed.innerHTML = `
            <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <i class="fa-solid fa-bell-slash text-slate-200 text-3xl"></i>
            </div>
            <h3 class="text-xs font-black uppercase tracking-widest text-slate-800 mb-2">No ${filter} Notifications</h3>
            <p class="text-[11px] font-medium text-slate-500 leading-relaxed max-w-xs">
                We couldn't find any active alerts in the ${filter} category.
            </p>
        `;
        return;
    }

    // LIST VIEW
    feed.className = "space-y-4"; 
    feed.innerHTML = filteredAlerts.map(alert => `
        <div class="bg-white border border-slate-100 p-6 rounded-[24px] flex items-start gap-4 animate-fade-in hover:border-slate-300 transition-all text-left">
            <div class="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center shrink-0">
                <i class="fa-solid ${getIcon(alert.category)} text-slate-400"></i>
            </div>
            <div class="flex-1">
                <div class="flex justify-between items-start">
                    <h4 class="text-[10px] font-black uppercase tracking-widest text-slate-800">${alert.title}</h4>
                    <span class="text-[8px] font-bold text-slate-300 uppercase">${alert.timestamp}</span>
                </div>
                <p class="text-[11px] text-slate-500 mt-1 font-medium">${alert.message}</p>
                <span class="inline-block mt-3 px-2 py-1 bg-slate-50 rounded-md text-[7px] font-black uppercase tracking-tighter text-slate-400 border border-slate-100">
                    Category: ${alert.category}
                </span>
            </div>
        </div>
    `).join('');
}

function getIcon(category) {
    const cat = category.toLowerCase();
    if(cat === "jobs") return "fa-briefcase";
    if(cat === "community") return "fa-users";
    if(cat === "messages") return "fa-comment-dots";
    return "fa-bell";
}

function clearAll() {
    if(confirm("Confirm: Wipe all activity logs?")) {
        localStorage.removeItem('linkedOut_alerts');
        location.reload();
    }
}

async function createFollowNotification(actorId, targetUserId) {
    // Get the name of the person who is following
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', actorId)
        .single();

    const { error } = await supabase
        .from('notifications')
        .insert([{
            user_id: targetUserId, // The person receiving the alert
            actor_id: actorId,      // The person who clicked follow
            type: 'follow',
            content: `${profile.full_name} started following you.`,
            is_read: false
        }]);
    
    if (error) console.error("Notification Error:", error.message);
}
