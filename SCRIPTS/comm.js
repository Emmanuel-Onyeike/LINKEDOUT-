// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Safety check for the Supabase engine
    if (typeof supabase === 'undefined') {
        console.error("Terminal: Supabase not found. Check script order in HTML.");
        // We manually trigger alert here because triggerAlert depends on the script being healthy
        const modal = document.getElementById('globalModal');
        if(modal) {
            document.getElementById('modalTitle').innerText = "⚠️ System Failure";
            document.getElementById('modalBody').innerText = "Supabase Engine Offline. Please check script load order.";
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
        return;
    }
    
    await fetchCommunities();
    await loadMyCircles();
});

// --- 1. FETCH ALL COMMUNITIES ---
async function fetchCommunities() {
    const container = document.getElementById('communityContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="p-20 text-center animate-pulse">
            <i class="fa-solid fa-satellite-dish text-4xl text-slate-200 mb-4 block"></i>
            <span class="uppercase font-black text-slate-300 tracking-widest">Scanning for signals...</span>
        </div>`;

    const { data: communities, error } = await supabase
        .from('communities')
        .select(`*, community_members(count)`);

    if (error) {
        triggerAlert('System Error', 'Failed to retrieve colony data.', '📡');
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();

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

// --- 2. CREATE COLONY ---
async function handleCreateColony() {
    const name = document.getElementById('commName')?.value;
    const desc = document.getElementById('commDesc')?.value;
    const pin = document.getElementById('adminPin')?.value;
    const file = document.getElementById('commFile')?.files[0];

    if (!name || !desc) {
        triggerAlert('Entry Denied', 'A name and a vibe are mandatory.', '⚠️');
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        triggerAlert('Auth Error', 'You must be logged in to create communities.', '🔒');
        return;
    }
    
    triggerAlert('Establishing Colony', 'Claiming territory and securing the perimeter...', '🏗️');

    let imageUrl = null;
    if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
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
        .select().single();

    if (createError) {
        triggerAlert('Creation Failed', createError.message, '❌');
    } else {
        await supabase.from('community_members').insert([
            { community_id: colony.id, user_id: user.id, role: 'admin' }
        ]);
        setTimeout(() => { window.location.href = '/PAGES/dashboard.html'; }, 1500);
    }
}

// --- 3. JOIN LOGIC ---
async function handleJoin(commId, commName) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        triggerAlert('Access Denied', 'Log in to join circles.', '🔒');
        return;
    }

    const { error } = await supabase.from('community_members').insert([
        { community_id: commId, user_id: user.id }
    ]);

    if (error) {
        triggerAlert('Join Failed', error.code === '23505' ? 'Already a member.' : error.message, '❌');
    } else {
        triggerAlert('Colony Joined', `Welcome to ${commName}.`, '🤝');
        await fetchCommunities();
        await loadMyCircles();
    }
}

// --- 4. SIDEBAR CIRCLES ---
async function loadMyCircles() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: myCircles } = await supabase
        .from('community_members')
        .select(`communities(id, name, image_url)`)
        .eq('user_id', user.id);

    const list = document.getElementById('myCirclesList');
    if (list && myCircles) {
        list.innerHTML = myCircles.map(c => {
            if (!c.communities) return '';
            return `
                <div class="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-2xl transition-all group" 
                     onclick="window.location.href='open_comm.html?id=${c.communities.id}'">
                    <img src="${c.communities.image_url || '/IMG/Logo.jpeg'}" class="w-8 h-8 rounded-xl object-cover group-hover:rotate-6 transition-transform">
                    <span class="text-[10px] font-black uppercase text-slate-700 tracking-tighter">${c.communities.name}</span>
                </div>`;
        }).join('');
    }
}

// --- 5. REFRESH LOGIC ---
async function handleRefresh() {
    const icon = document.getElementById('refreshIcon');
    const text = document.getElementById('refreshText');
    const container = document.getElementById('communityContainer');
    
    if (!icon || !text) return;

    icon.classList.add('fa-spin');
    text.innerText = "Scanning...";
    container.style.opacity = "0.5";

    await fetchCommunities();
    await loadMyCircles();
    
    setTimeout(() => {
        icon.classList.remove('fa-spin');
        text.innerText = "Refresh";
        container.style.opacity = "1";
        triggerAlert('Signals Locked', 'List updated.', '🔄');
    }, 1000);
}

// --- 6. MODAL & PREVIEW CONTROLS ---
function openCreatorModal() {
    const modal = document.getElementById('creatorModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeCreatorModal() {
    const modal = document.getElementById('creatorModal');
    if (modal) modal.classList.replace('flex', 'hidden');
}

function togglePinField(role) {
    const pinField = document.getElementById('pinField');
    if (pinField) role === 'admin' ? pinField.classList.remove('hidden') : pinField.classList.add('hidden');
}

function previewCommImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewBox = document.getElementById('imagePreviewContainer');
            if (previewBox) {
                previewBox.innerHTML = `
                    <img src="${e.target.result}" class="w-full h-full object-cover rounded-3xl">
                    <div class="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition rounded-3xl cursor-pointer" onclick="document.getElementById('commFile').click()">
                        <span class="text-[10px] text-white font-black uppercase">Change Image</span>
                    </div>
                    <input type="file" id="commFile" class="hidden" onchange="previewCommImage(this)">`;
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// --- 7. GLOBAL ALERT (Centered Modal) ---
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
async function loadMyCircles() {
    const list = document.getElementById('sidebarCommList');
    const emptyState = document.getElementById('emptyCommState');
    const skeleton = document.getElementById('commSkeleton');

    if (!list) return;

    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        if (skeleton) skeleton.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    // 2. Fetch all memberships (This includes colonies they created because they are added as 'admin' on creation)
    const { data: memberships, error } = await supabase
        .from('community_members')
        .select(`
            role,
            communities (
                id,
                name,
                image_url
            )
        `)
        .eq('user_id', user.id);

    // 3. UI Handling
    if (skeleton) skeleton.classList.add('hidden');

    if (error || !memberships || memberships.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        list.innerHTML = ''; // Keep it clean
        if (emptyState) list.appendChild(emptyState); 
        return;
    }

    // Hide empty state if data exists
    if (emptyState) emptyState.classList.add('hidden');

    // 4. Render the list
    list.innerHTML = memberships.map(m => {
        const comm = m.communities;
        if (!comm) return '';
        
        // Add a small "Crown" icon if they are the admin/founder
        const badge = m.role === 'admin' ? '<i class="fa-solid fa-crown text-[8px] text-amber-400 ml-1"></i>' : '';

        return `
            <div class="group flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-all cursor-pointer" 
                 onclick="window.location.href='/PAGES/open_comm.html?id=${comm.id}'">
                <div class="flex items-center gap-3">
                    <div class="relative w-8 h-8 shrink-0">
                        <img src="${comm.image_url || '/IMG/Logo.jpeg'}" 
                             class="w-full h-full object-cover rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    </div>
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
            </div>
        `;
    }).join('');
}
