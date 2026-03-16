// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    await fetchCommunities();
    await loadMyCircles();
});

// --- 1. FETCH ALL COMMUNITIES ---
async function fetchCommunities() {
    const container = document.getElementById('communityContainer');
    container.innerHTML = `<div class="p-20 text-center animate-pulse uppercase font-black text-slate-300">Scanning for signals...</div>`;

    const { data: communities, error } = await supabase
        .from('communities')
        .select(`*, community_members(count)`);

    if (error) return console.error(error);

    if (communities.length === 0) {
        container.innerHTML = `<div class="bg-white border p-20 text-center rounded-[40px]">
            <h2 class="text-sm font-black uppercase">No Colonies Found</h2>
        </div>`;
        return;
    }

    // Get current user to check if already joined
    const { data: { user } } = await supabase.auth.getUser();

    container.innerHTML = communities.map(comm => {
        const memberCount = comm.community_members?.[0]?.count || 0;
        return `
            <div class="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm hover:shadow-xl transition-all">
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
                        <span class="text-[9px] font-black text-slate-400 uppercase">
                            ${memberCount} / ${comm.max_users} Loafers
                        </span>
                        <button onclick="handleJoin('${comm.id}', '${comm.name}')" 
                            class="bg-slate-50 border border-slate-200 text-slate-800 hover:bg-cyan-500 hover:text-white px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                            Join Circle
                        </button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// --- 2. CREATE COLONY (Save to Supabase) ---
async function handleCreateColony() {
    const name = document.getElementById('commName').value;
    const desc = document.getElementById('commDesc').value;
    const pin = document.getElementById('adminPin').value;
    const file = document.getElementById('commFile').files[0];

    if (!name || !desc) return triggerAlert('Entry Denied', 'Missing name or vibe.', '⚠️');

    const { data: { user } } = await supabase.auth.getUser();
    
    let imageUrl = null;
    if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { data: uploadData } = await supabase.storage
            .from('community-images')
            .upload(fileName, file);
        if (uploadData) imageUrl = supabase.storage.from('community-images').getPublicUrl(fileName).data.publicUrl;
    }

    const { data, error } = await supabase.from('communities').insert([{
        name,
        description: desc,
        admin_pin: pin,
        image_url: imageUrl,
        founder_id: user.id
    }]).select().single();

    if (!error) {
        // Automatically add founder as an admin member
        await supabase.from('community_members').insert([
            { community_id: data.id, user_id: user.id, role: 'admin' }
        ]);
        window.location.href = '/PAGES/dashboard.html';
    }
}

// --- 3. JOIN LOGIC ---
async function handleJoin(commId, commName) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return triggerAlert('Access Denied', 'Log in to join colonies.', '🔒');

    const { error } = await supabase.from('community_members').insert([
        { community_id: commId, user_id: user.id }
    ]);

    if (error) {
        if (error.code === '23505') triggerAlert('Existing Member', 'You are already in this circle.', '🤝');
    } else {
        triggerAlert('Joined!', `Welcome to ${commName}. Check your dashboard.`, '🤝');
        fetchCommunities();
        loadMyCircles();
    }
}

// --- 4. LOAD SIDEBAR CIRCLES ---
async function loadMyCircles() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: myCircles } = await supabase
        .from('community_members')
        .select(`communities(id, name, image_url)`)
        .eq('user_id', user.id);

    const list = document.getElementById('myCirclesList');
    if (myCircles && myCircles.length > 0) {
        list.innerHTML = myCircles.map(c => `
            <div class="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition" onclick="window.location.href='open_comm.html?id=${c.communities.id}'">
                <img src="${c.communities.image_url || '/IMG/Logo.jpeg'}" class="w-8 h-8 rounded-lg object-cover">
                <span class="text-[10px] font-black uppercase text-slate-700">${c.communities.name}</span>
            </div>
        `).join('');
    }
}
