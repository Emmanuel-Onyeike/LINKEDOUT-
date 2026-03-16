// comm.js - Comprehensive Colony Management

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof supabase === 'undefined') {
        triggerAlert("⚠️ System Failure", "Supabase Engine Offline. Check your scripts.", "🚫");
        return;
    }
    
    // Auto-load based on current page elements
    if (document.getElementById('communityContainer')) await fetchCommunities();
    if (document.getElementById('sidebarCommList')) await loadMyCircles();
});

// --- 1. FETCH ALL COMMUNITIES (Discovery Page) ---
async function fetchCommunities() {
    const container = document.getElementById('communityContainer');
    if (!container) return;

    container.innerHTML = `<div class="p-20 text-center animate-pulse uppercase font-black text-slate-300">Scanning for signals...</div>`;

    // Fetch communities and join the member count
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
            <div class="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 animate-slide">
                <div class="h-32 bg-slate-100 overflow-hidden">
                    <img src="${comm.image_url || '/IMG/Default_Cover.jpeg'}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800'">
                </div>
                <div class="px-8 pb-8">
                    <div class="relative -mt-10 mb-4">
                        <div class="w-20 h-20 bg-white rounded-3xl p-1 shadow-md">
                            <img src="${comm.image_url || '/IMG/Logo.jpeg'}" class="w-full h-full object-cover rounded-2xl" onerror="this.src='/IMG/Logo.jpeg'">
                        </div>
                    </div>
                    <h2 class="text-lg font-black text-slate-800 uppercase tracking-tight">${comm.name}</h2>
                    <p class="text-xs text-slate-500 font-medium mt-2 line-clamp-2">${comm.description || 'No description provided.'}</p>
                    <div class="flex items-center justify-between mt-8">
                        <span class="text-[9px] font-black text-slate-400 uppercase">${memberCount} / ${comm.max_users || 100} Loafers</span>
                        <button onclick="handleJoin('${comm.id}', '${comm.name}')" ${isJoined ? 'disabled' : ''}
                            class="${isJoined ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-200' : 'bg-slate-50 border border-slate-200 text-slate-800 hover:bg-cyan-600 hover:text-white'} px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all">
                            ${isJoined ? 'Joined' : 'Join Circle'}
                        </button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// --- 2. LOAD DASHBOARD SIDEBAR ---
async function loadMyCircles() {
    const list = document.getElementById('sidebarCommList');
    if (!list) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Use standard join syntax
    const { data: memberships, error } = await supabase
        .from('community_members')
        .select(`
            role,
            communities ( id, name, image_url )
        `)
        .eq('user_id', user.id);

    if (error) {
        console.error("Sidebar Sync Error:", error.message);
        return;
    }

    if (!memberships || memberships.length === 0) {
        list.innerHTML = `<p class="text-[8px] text-slate-300 uppercase p-4 text-center">No Circles Joined</p>`;
        return;
    }

    list.innerHTML = memberships.map(m => {
        const comm = m.communities;
        if (!comm) return '';
        const isFounder = m.role === 'admin';
        
        return `
            <div class="group flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-all cursor-pointer" 
                 onclick="window.location.href='/PAGES/open_comm.html?id=${comm.id}'">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 shrink-0 overflow-hidden rounded-lg shadow-sm bg-slate-100">
                        <img src="${comm.image_url || '/IMG/Logo.jpeg'}" class="w-full h-full object-cover group-hover:scale-110 transition-transform" onerror="this.src='/IMG/Logo.jpeg'">
                    </div>
                    <div class="flex flex-col">
                        <span class="text-[10px] font-black uppercase text-slate-700 tracking-tighter flex items-center">
                            ${comm.name} ${isFounder ? '<i class="fa-solid fa-crown text-[8px] text-amber-400 ml-1"></i>' : ''}
                        </span>
                        <span class="text-[8px] text-slate-400 font-bold uppercase tracking-widest">${m.role}</span>
                    </div>
                </div>
                <i class="fa-solid fa-chevron-right text-[8px] text-slate-300 opacity-0 group-hover:opacity-100 transition-all mr-1"></i>
            </div>`;
    }).join('');
}

// --- 3. CREATE COLONY (Founder Logic) ---
async function createNewCommunity() {
    const name = document.getElementById('commName')?.value.trim();
    const desc = document.getElementById('commDesc')?.value.trim();
    const role = document.getElementById('roleSelect')?.value;
    const pin = document.getElementById('adminPin')?.value;
    const max = document.getElementById('maxUsers')?.value || 100;
    const file = document.getElementById('commFile')?.files[0];

    if (!name || !desc) return triggerAlert('Entry Denied', 'Name and vibe required.', '⚠️');
    if (role === 'admin' && (!pin || pin.length < 4)) return triggerAlert('Security Error', '4-digit PIN required for Founders.', '🔐');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return triggerAlert('Auth Error', 'Sign in to found a colony.', '🔒');
    
    triggerAlert('Establishing Colony', 'Uploading assets and securing perimeter...', '🏗️');

    let imageUrl = null;
    if (file) {
        const fileName = `colony-${Date.now()}.${file.name.split('.').pop()}`;
        const { error: upErr } = await supabase.storage.from('community-images').upload(fileName, file);
        if (!upErr) {
            imageUrl = supabase.storage.from('community-images').getPublicUrl(fileName).data.publicUrl;
        }
    }

    // 1. Create the community
    const { data: colony, error: createError } = await supabase
        .from('communities')
        .insert([{ 
            name, 
            description: desc, 
            image_url: imageUrl, 
            founder_id: user.id,
            pin: pin ? parseInt(pin) : null,
            max_users: parseInt(max)
        }])
        .select().single();

    if (createError) return triggerAlert('Error', createError.message, '❌');

    // 2. Add creator as a member (Admin/Founder role)
    const { error: memberError } = await supabase.from('community_members').insert([{ 
        community_id: colony.id, 
        user_id: user.id, 
        role: role === 'admin' ? 'admin' : 'member' 
    }]);

    if (!memberError) {
        triggerAlert('Success', 'Colony established. Redirecting...', '🚀');
        setTimeout(() => { window.location.href = `/PAGES/open_comm.html?id=${colony.id}`; }, 1500);
    }
}

// --- 4. JOIN LOGIC ---
async function handleJoin(commId, commName) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return triggerAlert('Access Denied', 'Login to join.', '🔒');

    const { error } = await supabase.from('community_members').insert([{ community_id: commId, user_id: user.id, role: 'member' }]);

    if (error) {
        triggerAlert('Join Failed', error.code === '23505' ? 'You are already in this circle.' : error.message, '❌');
    } else {
        triggerAlert('Joined!', `Welcome to ${commName}. Data synced.`, '🤝');
        fetchCommunities();
        loadMyCircles();
    }
}

// --- 5. INTERFACE HELPERS ---
function triggerAlert(title, content, emoji = '🔔') {
    const container = document.getElementById('modal-container');
    if (!container) {
        alert(`${title}: ${content}`); // Final fallback
        return;
    }

    const modal = document.createElement('div');
    modal.className = "pointer-events-auto bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-2xl animate-slide max-w-xs w-full text-center border-b-4 border-b-cyan-500 mb-4";
    modal.innerHTML = `
        <div class="text-4xl mb-4">${emoji}</div>
        <h2 class="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2">${title}</h2>
        <p class="text-[9px] font-bold text-slate-400 uppercase leading-relaxed mb-6">${content}</p>
        <button onclick="this.parentElement.remove()" class="w-full py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-cyan-600 transition-colors">Acknowledge</button>
    `;

    container.appendChild(modal);
    setTimeout(() => { if(modal.parentNode) modal.remove(); }, 6000);
}

function openCreatorModal() {
    const m = document.getElementById('creatorModal');
    if (m) { m.classList.remove('hidden'); m.classList.add('flex'); }
}

function closeCreatorModal() {
    const m = document.getElementById('creatorModal');
    if (m) m.classList.replace('flex', 'hidden');
}

function previewCommImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewBox = document.getElementById('imagePreviewContainer');
            previewBox.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover rounded-3xl">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function togglePinField(value) {
    const pinField = document.getElementById('pinField');
    if (pinField) pinField.classList.toggle('hidden', value !== 'admin');
}
