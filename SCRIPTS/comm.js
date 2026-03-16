// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    // Safety check for the Supabase engine
    if (typeof supabase === 'undefined') {
        console.error("Terminal: Supabase not found. Check script order.");
        return;
    }
    await fetchCommunities();
    await loadMyCircles();
});

// --- 1. FETCH ALL COMMUNITIES ---
async function fetchCommunities() {
    const container = document.getElementById('communityContainer');
    container.innerHTML = `
        <div class="p-20 text-center animate-pulse">
            <i class="fa-solid fa-satellite-dish text-4xl text-slate-200 mb-4 block"></i>
            <span class="uppercase font-black text-slate-300 tracking-widest">Scanning for signals...</span>
        </div>`;

    // Fetch communities and their member counts
    const { data: communities, error } = await supabase
        .from('communities')
        .select(`*, community_members(count)`);

    if (error) {
        triggerAlert('System Error', 'Failed to retrieve colony data.', '📡');
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    // Fetch user's current memberships to "disable" joined buttons
    let myJoinedIds = [];
    if (user) {
        const { data: memberships } = await supabase
            .from('community_members')
            .select('community_id')
            .eq('user_id', user.id);
        myJoinedIds = memberships?.map(m => m.community_id) || [];
    }

    if (communities.length === 0) {
        container.innerHTML = `
            <div class="bg-white border border-slate-200 p-20 text-center rounded-[40px] shadow-sm">
                <h2 class="text-sm font-black uppercase text-slate-400">The Wasteland is Empty</h2>
            </div>`;
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
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            ${memberCount} / ${comm.max_users} Loafers
                        </span>
                        <button onclick="handleJoin('${comm.id}', '${comm.name}')" 
                            ${isJoined ? 'disabled' : ''}
                            class="${isJoined ? 'bg-cyan-500 text-white' : 'bg-slate-50 border border-slate-200 text-slate-800 hover:bg-cyan-600 hover:text-white'} px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                            ${isJoined ? '<i class="fa-solid fa-check mr-2"></i>Joined' : 'Join Circle'}
                        </button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// --- 2. CREATE COLONY (Storage + Database) ---
async function handleCreateColony() {
    const name = document.getElementById('commName')?.value;
    const desc = document.getElementById('commDesc')?.value;
    const pin = document.getElementById('adminPin')?.value;
    const file = document.getElementById('commFile')?.files[0];

    if (!name || !desc) {
        triggerAlert('Entry Denied', 'A name and a vibe are mandatory for new colonies.', '⚠️');
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Show a "Processing" modal state
    triggerAlert('Establishing Colony', 'Surveying the area and claiming territory...', '🏗️');

    let imageUrl = null;
    if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
            .from('community-images')
            .upload(fileName, file);
        
        if (!uploadError) {
            imageUrl = supabase.storage.from('community-images').getPublicUrl(fileName).data.publicUrl;
        }
    }

    const { data: colony, error: createError } = await supabase
        .from('communities')
        .insert([{
            name: name,
            description: desc,
            admin_pin: pin,
            image_url: imageUrl,
            founder_id: user.id
        }])
        .select()
        .single();

    if (createError) {
        triggerAlert('Creation Failed', createError.message, '❌');
    } else {
        // Automatically add founder as an admin member
        await supabase.from('community_members').insert([
            { community_id: colony.id, user_id: user.id, role: 'admin' }
        ]);
        
        // Success redirect
        setTimeout(() => { window.location.href = '/PAGES/dashboard.html'; }, 1500);
    }
}

// --- 3. JOIN LOGIC ---
async function handleJoin(commId, commName) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        triggerAlert('Access Denied', 'You must be logged in to join circles.', '🔒');
        return;
    }

    const { error } = await supabase.from('community_members').insert([
        { community_id: commId, user_id: user.id }
    ]);

    if (error) {
        if (error.code === '23505') {
            triggerAlert('Status: Active', 'You are already a member of this colony.', '🤝');
        } else {
            triggerAlert('Join Failed', error.message, '❌');
        }
    } else {
        triggerAlert('Colony Joined', `Welcome to ${commName}. Synchronizing your dashboard...`, '🤝');
        // Refresh UI
        await fetchCommunities();
        await loadMyCircles();
    }
}

// --- 4. LOAD SIDEBAR CIRCLES ---
async function loadMyCircles() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: myCircles, error } = await supabase
        .from('community_members')
        .select(`communities(id, name, image_url)`)
        .eq('user_id', user.id);

    if (error) return;

    const list = document.getElementById('myCirclesList');
    if (!list) return;

    if (myCircles && myCircles.length > 0) {
        list.innerHTML = myCircles.map(c => {
            if (!c.communities) return '';
            return `
                <div class="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-2xl transition-all group" 
                     onclick="window.location.href='open_comm.html?id=${c.communities.id}'">
                    <img src="${c.communities.image_url || '/IMG/Logo.jpeg'}" class="w-8 h-8 rounded-xl object-cover group-hover:rotate-6 transition-transform">
                    <span class="text-[10px] font-black uppercase text-slate-700 tracking-tighter">${c.communities.name}</span>
                </div>
            `;
        }).join('');
    }
}
