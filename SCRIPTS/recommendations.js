// recommendations.js - LinkedOut Discovery Logic

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Load
    loadUsers('tier1'); 
    
    // 2. Set up Event Listeners
    setupFilters();
    setupSearch();
});

// MAIN GRID FETCHING
async function loadUsers(tier) {
    const container = document.getElementById('recommendationContainer');
    if (!container) return;

    container.innerHTML = `<div class="col-span-full py-20 text-center animate-pulse text-slate-400 font-black uppercase text-[10px]">Scanning Frequencies...</div>`;

    try {
        const { data: users, error } = await supabase
            .from('user_tiers')
            .select('*')
            .eq('current_tier', tier);

        if (error || !users?.length) {
            container.innerHTML = `<div class="col-span-full py-20 text-center text-slate-400 font-black uppercase text-[10px]">No Loafers Detected in ${tier}</div>`;
            return;
        }

        renderGrid(users); // Call the unified render function
    } catch (err) {
        console.error("Fetch Error:", err);
        container.innerHTML = `<div class="col-span-full py-20 text-center text-red-400 font-black uppercase text-[10px]">Signal Lost: Check Connection</div>`;
    }
}

// UNIFIED RENDER FUNCTION (Handles the Navigation)
function renderGrid(users) {
    const container = document.getElementById('recommendationContainer');
    
    container.innerHTML = users.map(user => `
        <div onclick="window.location.href='/PAGES/users.html?id=${user.id}'" 
             class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[30px] flex items-center justify-between group transition-all hover:border-cyan-500 cursor-pointer shadow-sm">
            
            <div class="flex items-center gap-4">
                <img src="${user.avatar_url || '/IMG/Logo.jpeg'}" class="w-12 h-12 rounded-2xl object-cover border-2 border-transparent group-hover:border-cyan-500 transition-all">
                <div>
                    <h4 class="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">${user.full_name}</h4>
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${user.role || 'Professional Loafer'}</p>
                </div>
            </div>

            <div class="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-cyan-500 group-hover:text-white transition-all">
                <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </div>
        </div>
    `).join('');
}

function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('bg-cyan-500', 'text-white', 'active');
                b.classList.add('border-slate-200');
            });
            btn.classList.add('bg-cyan-500', 'text-white', 'active');
            loadUsers(btn.dataset.filter);
        };
    });
}

function setupSearch() {
    const searchInput = document.getElementById('userSearch');
    if (!searchInput) return;

    searchInput.oninput = async (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (query.length < 2) return;
        
        const { data: users, error } = await supabase
            .from('user_tiers')
            .select('*')
            .ilike('full_name', `%${query}%`);

        if (users) renderGrid(users);
    };
}
async function toggleFollow(targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return showModalAlert("Please sign in to follow others.");
    if (user.id === targetUserId) return showModalAlert("You cannot follow yourself!");

    // 1. Check if already following
    const { data: existingFollow } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .single();

    if (existingFollow) {
        // --- UNFOLLOW LOGIC ---
        const { error } = await supabase
            .from('follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', targetUserId);

        if (!error) {
            showModalAlert("Unfollowed successfully.");
            // Refresh counts if on dashboard/profile
            if (typeof loadFollowerCount === 'function') loadFollowerCount(targetUserId);
        }
    } else {
        // --- FOLLOW LOGIC ---
        const { error } = await supabase
            .from('follows')
            .insert([{ follower_id: user.id, following_id: targetUserId }]);

        if (!error) {
            // 2. CREATE NOTIFICATION
            await createFollowNotification(user.id, targetUserId);
            showModalAlert("Followed successfully!");
            if (typeof loadFollowerCount === 'function') loadFollowerCount(targetUserId);
        }
    }
}
