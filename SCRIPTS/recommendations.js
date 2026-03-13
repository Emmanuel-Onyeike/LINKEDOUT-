// recommendations.js - LinkedOut Discovery Logic

document.addEventListener('DOMContentLoaded', () => {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('userSearch');

    // 1. FILTER SELECTION LOGIC
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add to clicked
            btn.classList.add('active');
            
            const filterType = btn.getAttribute('data-filter');
            console.log(`📡 Scanning for: ${filterType}`);
            // Logic to fetch/filter will go here
        });
    });

    // 2. SEARCH INPUT LOGIC
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        if(query.length > 0) {
            console.log(`🔍 Searching Grid for: ${query}`);
        }
    });
});

async function loadRecommendations() {
    const listContainer = document.getElementById('recommendationList');
    if (!listContainer) return;

    // 1. Fetch profiles (limiting to 5 for the sidebar)
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .limit(5);

    if (error) {
        console.error("Recs Error:", error);
        return;
    }

    // 2. Clear loading state
    listContainer.innerHTML = '';

    // 3. Render each user
    profiles.forEach(profile => {
        const userCard = document.createElement('div');
        userCard.className = "flex items-center justify-between group cursor-pointer";
        
        userCard.innerHTML = `
            <div class="flex items-center gap-4" onclick="window.location.href='/PAGES/view-profile.html?id=${profile.id}'">
                <div class="relative">
                    <img src="${profile.avatar_url || '/IMG/Logo.jpeg'}" 
                         class="w-12 h-12 rounded-2xl object-cover border-2 border-transparent group-hover:border-cyan-500 transition-all">
                </div>
                <div>
                    <h4 class="text-xs font-black text-slate-800 uppercase tracking-tighter">${profile.full_name || 'Anonymous'}</h4>
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${profile.role || 'Loafer'}</p>
                </div>
            </div>
            <button onclick="followUser('${profile.id}')" 
                class="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all">
                <i class="fa-solid fa-plus text-[10px]"></i>
            </button>
        `;
        listContainer.appendChild(userCard);
    });
}

// Run on load
document.addEventListener('DOMContentLoaded', loadRecommendations);
document.addEventListener('DOMContentLoaded', () => {
    loadUsers('tier1'); 
    setupFilters();
    setupSearch();
});

async function loadUsers(tier) {
    const container = document.getElementById('recommendationContainer');
    container.innerHTML = `<div class="col-span-full py-20 text-center animate-pulse text-slate-400 font-black uppercase text-[10px]">Scanning Frequencies...</div>`;

    const { data: users, error } = await supabase
        .from('user_tiers')
        .select('*')
        .eq('current_tier', tier);

    if (error || !users?.length) {
        container.innerHTML = `<div class="col-span-full py-20 text-center text-slate-400 font-black uppercase text-[10px]">No Loafers Detected in ${tier}</div>`;
        return;
    }

    container.innerHTML = users.map(user => `
        <div class="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[30px] flex items-center justify-between group transition-all hover:border-cyan-500">
            <div class="flex items-center gap-4">
                <img src="${user.avatar_url || '/IMG/Logo.jpeg'}" class="w-12 h-12 rounded-2xl object-cover">
                <div>
                    <h4 class="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase">${user.full_name}</h4>
                    <p class="text-[9px] font-bold text-slate-400 uppercase">${user.role || 'Loafer'}</p>
                </div>
            </div>
            <button class="w-8 h-8 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:bg-cyan-500 hover:text-white transition-all">
                <i class="fa-solid fa-plus text-[10px]"></i>
            </button>
        </div>
    `).join('');
}

function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('bg-cyan-500', 'text-white'));
            btn.classList.add('bg-cyan-500', 'text-white');
            loadUsers(btn.dataset.filter);
        };
    });
}

function setupSearch() {
    document.getElementById('userSearch').oninput = async (e) => {
        const query = e.target.value.toLowerCase();
        if(query.length < 2) return;
        
        const { data } = await supabase.from('user_tiers').select('*').ilike('full_name', `%${query}%`);
        // ... Render results similar to loadUsers
    };
}
function renderGrid(users) {
    const container = document.getElementById('recommendationContainer');
    
    container.innerHTML = users.map(user => `
        <div onclick="window.location.href='/PAGES/users.html?id=${user.id}'" 
             class="bg-white border border-slate-100 p-5 rounded-[30px] flex items-center justify-between group hover:border-cyan-500 transition-all cursor-pointer shadow-sm hover:shadow-md">
            
            <div class="flex items-center gap-4">
                <img src="${user.avatar_url || '/IMG/Logo.jpeg'}" 
                     class="w-12 h-12 rounded-2xl object-cover border-2 border-white">
                <div>
                    <h4 class="text-[11px] font-black uppercase text-slate-800 tracking-tight">${user.full_name}</h4>
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${user.role || 'Professional Loafer'}</p>
                </div>
            </div>

            <div class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-cyan-500 group-hover:text-white transition-all">
                <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </div>
        </div>
    `).join('');
}
