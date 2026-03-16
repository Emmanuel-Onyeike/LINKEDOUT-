// open_comms.js - Live Database Integrated Version
let currentColony = null;
let userRole = 'member';

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const colonyId = urlParams.get('id');
    
    if (!colonyId) {
        window.location.href = '/PAGES/dashboard.html';
        return;
    }
    
    await loadColonyData(colonyId);
    await loadColonyMembers(colonyId);
});

async function loadColonyData(id) {
    // 1. Fetch Colony Details from Supabase
    const { data: colony, error } = await supabase
        .from('communities')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !colony) {
        console.error("Colony not found:", id);
        window.location.href = '/PAGES/dashboard.html';
        return;
    }

    currentColony = colony;

    // 2. Check Current User Role in this Colony
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: memberData } = await supabase
            .from('community_members')
            .select('role')
            .eq('community_id', id)
            .eq('user_id', user.id)
            .single();
        
        userRole = memberData?.role || 'member';
    }

    // 3. Update UI Branding
    document.getElementById('commTitle').innerText = colony.name;
    document.getElementById('commVibe').innerText = colony.description ? `Vibe: ${colony.description.substring(0, 40)}...` : 'Vibe: Chill';
    document.getElementById('commFullDesc').innerText = colony.description || 'No description provided.';
    document.getElementById('maxLimit').innerText = colony.max_users || 100;
    
    const displayImg = colony.image_url || '/IMG/Logo.jpeg';
    document.getElementById('commCover').src = displayImg;
    document.getElementById('commIcon').src = displayImg;

    // 4. Admin Interface Logic
    if (userRole === 'admin') {
        const badge = document.getElementById('roleBadge');
        if (badge) badge.classList.remove('hidden');
        renderAdminInterface(); 
    }

    renderColonyPosts(id);
}

async function loadColonyMembers(id) {
    const { data: members, error } = await supabase
        .from('community_members')
        .select(`
            role,
            profiles:user_id ( username, avatar_url )
        `)
        .eq('community_id', id);

    if (error) return;

    const list = document.getElementById('membersList');
    const countLabel = document.getElementById('occupantCount');
    const totalLabel = document.getElementById('memberCount');

    if (list) {
        countLabel.innerText = members.length;
        totalLabel.innerText = members.length;
        
        list.innerHTML = members.map(m => `
            <div class="flex items-center gap-3 p-2">
                <img src="${m.profiles?.avatar_url || '/IMG/Logo.jpeg'}" class="w-8 h-8 rounded-full object-cover border border-slate-100">
                <div class="flex flex-col">
                    <span class="text-[10px] font-black text-slate-700 uppercase">${m.profiles?.username || 'Loafer'}</span>
                    <span class="text-[7px] font-bold text-slate-400 uppercase">${m.role}</span>
                </div>
            </div>
        `).join('');
    }
}

function renderAdminInterface() {
    const adminBox = document.getElementById('adminPostBox');
    if (!adminBox) return;

    adminBox.innerHTML = `
        <div id="pinLock" class="text-center py-4 animate-slide">
            <div class="w-12 h-12 bg-cyan-50 text-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fa-solid fa-shield-halved text-xl"></i>
            </div>
            <h3 class="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1">Founder Verification</h3>
            <p class="text-[9px] text-slate-400 font-bold uppercase mb-6">Enter Admin PIN to broadcast</p>
            <div class="flex justify-center gap-3">
                <input type="password" id="unlockPin" maxlength="4" placeholder="••••" 
                    class="w-28 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-center text-lg font-black tracking-[0.5em] focus:border-cyan-500 outline-none transition-all">
                <button onclick="unlockAdminTools()" class="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase hover:bg-cyan-600 transition shadow-lg">Verify</button>
            </div>
        </div>
        <div id="actualPostBox" class="hidden animate-slide">
            <textarea id="adminPostInput" placeholder="What's the word, Founder?" 
                class="w-full bg-slate-50 border-none rounded-[30px] p-6 text-sm font-medium focus:ring-2 focus:ring-cyan-500 h-32 resize-none outline-none"></textarea>
            <div class="flex justify-end mt-4">
                <button onclick="publishAdminPost()" class="bg-slate-900 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase hover:bg-cyan-600 transition-all shadow-lg">Send Broadcast</button>
            </div>
        </div>
    `;
    adminBox.classList.remove('hidden');
}

function unlockAdminTools() {
    const enteredPin = document.getElementById('unlockPin').value;
    // Assuming 'pin' is a column in your 'communities' table
    if (enteredPin === String(currentColony.pin)) {
        document.getElementById('pinLock').classList.add('hidden');
        document.getElementById('actualPostBox').classList.remove('hidden');
        if (window.triggerAlert) triggerAlert('Access Granted', 'Broadcast systems online.', '🔓');
    } else {
        document.getElementById('unlockPin').value = '';
        if (window.triggerAlert) triggerAlert('Access Denied', 'Invalid PIN code.', '🚫');
    }
}

async function publishAdminPost() {
    const input = document.getElementById('adminPostInput');
    const content = input.value.trim();
    if (!content) return;

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
        .from('community_posts')
        .insert([{
            community_id: currentColony.id,
            user_id: user.id,
            content: content,
            is_announcement: true
        }]);

    if (error) {
        if (window.triggerAlert) triggerAlert('Error', 'Failed to send signal.', '📡');
        return;
    }

    input.value = '';
    renderColonyPosts(currentColony.id);
}

async function renderColonyPosts(id) {
    const feed = document.getElementById('colonyFeed');
    
    const { data: posts, error } = await supabase
        .from('community_posts')
        .select(`
            *,
            profiles:user_id ( username, avatar_url )
        `)
        .eq('community_id', id)
        .order('created_at', { ascending: false });

    if (error || !posts || posts.length === 0) {
        feed.innerHTML = `<div class="text-center py-24 bg-white rounded-[40px] border-2 border-dashed border-slate-50"><p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">Awaiting founder signals...</p></div>`;
        return;
    }

    feed.innerHTML = posts.map(post => `
        <div class="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm mb-6 animate-slide">
            <div class="flex items-center gap-3 mb-6">
                <img src="${post.profiles?.avatar_url || '/IMG/Logo.jpeg'}" class="w-10 h-10 rounded-2xl object-cover ring-4 ring-slate-50">
                <div>
                    <div class="flex items-center gap-2">
                        <h4 class="text-xs font-black text-slate-800 uppercase">${post.profiles?.username || 'Founder'}</h4>
                        ${post.is_announcement ? '<span class="px-2 py-0.5 bg-cyan-500 text-white text-[7px] font-black uppercase rounded-md">Founder</span>' : ''}
                    </div>
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">${new Date(post.created_at).toLocaleDateString()}</p>
                </div>
            </div>
            <p class="text-sm text-slate-600 leading-relaxed font-medium">${post.content}</p>
        </div>
    `).join('');
}
