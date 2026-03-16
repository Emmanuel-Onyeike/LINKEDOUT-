// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof supabase === 'undefined') {
        const modal = document.getElementById('globalModal');
        if(modal) {
            document.getElementById('modalTitle').innerText = "⚠️ System Failure";
            document.getElementById('modalBody').innerText = "Supabase Engine Offline.";
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
        return;
    }
    
    // Run these if the elements exist on the current page
    if (document.getElementById('communityContainer')) await fetchCommunities();
    if (document.getElementById('sidebarCommList')) await loadMyCircles();
});

// --- 1. FETCH ALL COMMUNITIES (For Discovery Page) ---
async function fetchCommunities() {
    const container = document.getElementById('communityContainer');
    if (!container) return;

    container.innerHTML = `<div class="p-20 text-center animate-pulse uppercase font-black text-slate-300">Scanning for signals...</div>`;

    const { data: communities, error } = await supabase
        .from('communities')
        .select(`*, community_members(count)`);

    if (error) return triggerAlert('System Error', 'Failed to retrieve colony data.', '📡');

    const { data: { user } } = await supabase.auth.getUser();
    let myJoinedIds = [];
    if (user) {
        const { data: memberships } = await supabase.from('community_members').select('community_id').eq('user_id', user.id);
        myJoinedIds = memberships?.map(m => m.community_id) || [];
    }

    if (!communities || communities.length === 0) {
        container.innerHTML = `<div class="bg-white border p-20 text-center rounded-[40px] uppercase font-black text-slate-400">No Colonies Found</div>`;
        return;
    }

    container.innerHTML = communities.map(comm => {
        const memberCount = comm.community_members?.[0]?.count || 0;
        const isJoined = myJoinedIds.includes(comm.id);
        return `
            <div class="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500">
                <div class="h-32 bg-slate-100">
                    <img src="${comm.image_url || '/IMG/Default_Cover.jpeg'}" class="w-full h-full object-cover">
                </div>
                <div class="px-8 pb-8">
                    <div class="relative -mt-10 mb-4">
                        <div class="w-20 h-20 bg-white rounded-3xl p-1 shadow-md">
                            <img src="${comm.image_url || '/IMG/Logo.jpeg'}" class="w-full h-full object-cover rounded-2xl">
                        </div>
                    </div>
                    <h2 class="text-lg font-black text-slate-800 uppercase tracking-tight">${comm.name}</h2>
                    <p class="text-xs text-slate-500 font-medium mt-2 line-clamp-2">${comm.description}</p>
                    <div class="flex items-center justify-between mt-8">
                        <span class="text-[9px] font-black text-slate-400 uppercase">${memberCount} / ${comm.max_users || 100} Loafers</span>
                        <button onclick="handleJoin('${comm.id}', '${comm.name}')" ${isJoined ? 'disabled' : ''}
                            class="${isJoined ? 'bg-cyan-500 text-white' : 'bg-slate-50 border border-slate-200 text-slate-800 hover:bg-cyan-600 hover:text-white'} px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all">
                            ${isJoined ? 'Joined' : 'Join Circle'}
                        </button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// --- 2. LOAD DASHBOARD SIDEBAR (Created & Joined) ---
async function loadMyCircles() {
    const list = document.getElementById('sidebarCommList');
    const emptyState = document.getElementById('emptyCommState');
    const skeleton = document.getElementById('commSkeleton');
    const cardContainer = document.getElementById('myCommunitiesCard');

    if (!list) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        if (skeleton) skeleton.classList.add('hidden');
        return;
    }

    // Unhide the card container if it was hidden via CSS
    if (cardContainer) cardContainer.classList.remove('hidden');

    const { data: memberships, error } = await supabase
        .from('community_members')
        .select(`role, communities (id, name, image_url)`)
        .eq('user_id', user.id);

    if (skeleton) skeleton.classList.add('hidden');

    if (error || !memberships || memberships.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    list.innerHTML = memberships.map(m => {
        const comm = m.communities;
        if (!comm) return '';
        const badge = m.role === 'admin' ? '<i class="fa-solid fa-crown text-[8px] text-amber-400 ml-1"></i>' : '';

        return `
            <div class="group flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-all cursor-pointer" 
                 onclick="window.location.href='/PAGES/open_comm.html?id=${comm.id}'">
                <div class="flex items-center gap-3">
                    <img src="${comm.image_url || '/IMG/Logo.jpeg'}" class="w-8 h-8 rounded-lg object-cover shadow-sm group-hover:rotate-3 transition-transform">
                    <div class="flex flex-col">
                        <span class="text-[10px] font-black uppercase text-slate-700 tracking-tighter flex items-center">
                            ${comm.name} ${badge}
                        </span>
                        <span class="text-[8px] text-slate-400 font-medium uppercase tracking-widest">
                            ${m.role === 'admin' ? 'Founder' : 'Member'}
                        </span>
                    </div>
                </div>
                <i class="fa-solid fa-chevron-right text-[8px] text-slate-300 opacity-0 group-hover:opacity-100 transition-all mr-1"></i>
            </div>`;
    }).join('');
}

// --- 3. CREATE COLONY ---
async function handleCreateColony() {
    const name = document.getElementById('commName')?.value;
    const desc = document.getElementById('commDesc')?.value;
    const file = document.getElementById('commFile')?.files[0];

    if (!name || !desc) return triggerAlert('Entry Denied', 'Name and vibe required.', '⚠️');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return triggerAlert('Auth Error', 'Login required.', '🔒');
    
    triggerAlert('Establishing Colony', 'Securing the perimeter...', '🏗️');

    let imageUrl = null;
    if (file) {
        const fileName = `${user.id}-${Date.now()}.${file.name.split('.').pop()}`;
        const { error: upErr } = await supabase.storage.from('community-images').upload(fileName, file);
        if (!upErr) imageUrl = supabase.storage.from('community-images').getPublicUrl(fileName).data.publicUrl;
    }

    const { data: colony, error: createError } = await supabase
        .from('communities')
        .insert([{ name, description: desc, image_url: imageUrl, founder_id: user.id }])
        .select().single();

    if (!createError) {
        // This is what ensures it appears in the sidebar!
        await supabase.from('community_members').insert([{ community_id: colony.id, user_id: user.id, role: 'admin' }]);
        setTimeout(() => { window.location.href = '/PAGES/dashboard.html'; }, 1500);
    } else {
        triggerAlert('Error', createError.message, '❌');
    }
}

// --- 4. JOIN LOGIC ---
async function handleJoin(commId, commName) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return triggerAlert('Access Denied', 'Login to join.', '🔒');

    const { error } = await supabase.from('community_members').insert([{ community_id: commId, user_id: user.id }]);

    if (error) {
        triggerAlert('Join Failed', error.code === '23505' ? 'Already in circle.' : error.message, '❌');
    } else {
        triggerAlert('Joined!', `Welcome to ${commName}.`, '🤝');
        await fetchCommunities();
        await loadMyCircles(); // Refresh sidebar immediately
    }
}

// --- 5. GLOBAL HELPERS ---
function triggerAlert(title, content, emoji = '🔔') {
    const modal = document.getElementById('globalModal');
    if (modal) {
        document.getElementById('modalTitle').innerText = `${emoji} ${title}`;
        document.getElementById('modalBody').innerHTML = content;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeGlobalModal() {
    const modal = document.getElementById('globalModal');
    if (modal) modal.classList.replace('flex', 'hidden');
}

function openCreatorModal() {
    const m = document.getElementById('creatorModal');
    if (m) { m.classList.remove('hidden'); m.classList.add('flex'); }
}

function closeCreatorModal() {
    const m = document.getElementById('creatorModal');
    if (m) m.classList.replace('flex', 'hidden');
}
