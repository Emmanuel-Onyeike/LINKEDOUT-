// open_comms.js - FINAL FIXED VERSION (March 2025)
// Relationships fixed, 400 errors gone, safe fallbacks

let currentColony = null;
let userRole = 'member';

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const colonyId = urlParams.get('id');

    if (!colonyId) {
        triggerAlert("No Colony", "Missing colony ID – redirecting...", "⚠️");
        setTimeout(() => window.location.href = '/PAGES/dashboard.html', 1800);
        return;
    }

    if (typeof supabase === 'undefined') {
        console.error("Supabase not loaded – check script order");
        triggerAlert("System Error", "Supabase client missing.", "💥");
        return;
    }

    await loadColonyData(colonyId);
    await loadColonyMembers(colonyId);
    await renderColonyPosts(colonyId);
});

// ────────────────────────────────────────────────
// 1. Load colony basic info + user role
// ────────────────────────────────────────────────
async function loadColonyData(id) {
    const { data: colony, error } = await supabase
        .from('communities')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !colony) {
        console.error("Colony load failed:", error?.message);
        triggerAlert("Colony Not Found", "This colony doesn't exist or you lack access.", "🏜️");
        setTimeout(() => window.location.href = '/PAGES/dashboard.html', 2500);
        return;
    }

    currentColony = colony;

    // Get current user's role in this colony
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: memberData, error: memberErr } = await supabase
            .from('community_members')
            .select('role')
            .eq('community_id', id)
            .eq('user_id', user.id)
            .maybeSingle();

        if (memberErr) console.warn("Role check failed:", memberErr.message);
        userRole = memberData?.role || 'member';
    }

    // Update UI
    safeSetText('commTitle', colony.name || 'Unnamed Colony');
    safeSetText('commVibe', colony.description ? `Vibe: ${colony.description.substring(0, 40)}...` : 'Vibe: Chill');
    safeSetText('commFullDesc', colony.description || 'No description provided.');
    safeSetText('maxLimit', colony.max_users || 100);

    const displayImg = colony.image_url || '/IMG/Logo.jpeg';
    safeSetSrc('commCover', displayImg);
    safeSetSrc('commIcon', displayImg);

    if (userRole === 'admin' || userRole === 'founder') {
        const badge = document.getElementById('roleBadge');
        if (badge) badge.classList.remove('hidden');
        renderAdminInterface();
    }
}

// ────────────────────────────────────────────────
// 2. Load members with correct relationship syntax
// ────────────────────────────────────────────────
async function loadColonyMembers(id) {
    const { data: members, error } = await supabase
        .from('community_members')
        .select(`
            role,
            profiles!user_id (   // <-- this tells Supabase which FK to use
                username,
                avatar_url
            )
        `)
        .eq('community_id', id);

    if (error) {
        console.error("Member Load Error:", error.message, error.details, error.hint);
        triggerAlert("Members Error", "Could not load colony members right now.", "👥");
        return;
    }

    const list = document.getElementById('membersList');
    const countEl = document.getElementById('occupantCount') || document.getElementById('memberCount');

    if (countEl) {
        countEl.innerText = members?.length || 0;
    }

    if (list) {
        if (!members?.length) {
            list.innerHTML = `<p class="text-center py-8 text-slate-400 text-[10px] font-bold">No members yet...</p>`;
            return;
        }

        list.innerHTML = members.map(m => `
            <div class="flex items-center gap-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-100/50 mb-2">
                <img src="${m.profiles?.avatar_url || '/IMG/Logo.jpeg'}" 
                     class="w-8 h-8 rounded-full object-cover border border-white"
                     onerror="this.src='/IMG/Logo.jpeg'">
                <div class="flex flex-col">
                    <span class="text-[10px] font-black text-slate-700 uppercase">
                        ${m.profiles?.username || 'Loafer'}
                    </span>
                    <span class="text-[7px] font-bold uppercase ${m.role === 'admin' || m.role === 'founder' ? 'text-cyan-600' : 'text-slate-500'}">
                        ${m.role}
                    </span>
                </div>
            </div>
        `).join('');
    }
}

// ────────────────────────────────────────────────
// 3. Render posts – same fix
// ────────────────────────────────────────────────
async function renderColonyPosts(id) {
    const feed = document.getElementById('colonyFeed');
    if (!feed) return;

    const { data: posts, error } = await supabase
        .from('community_posts')
        .select(`
            *,
            profiles!user_id (
                username,
                avatar_url
            )
        `)
        .eq('community_id', id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Posts Load Error:", error.message, error.details);
        feed.innerHTML = `<div class="text-center py-24 bg-white rounded-[40px] border-2 border-dashed border-slate-100">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Failed to load transmissions</p>
        </div>`;
        return;
    }

    if (!posts?.length) {
        feed.innerHTML = `<div class="text-center py-24 bg-white rounded-[40px] border-2 border-dashed border-slate-50">
            <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">No transmissions active yet.</p>
        </div>`;
        return;
    }

    feed.innerHTML = posts.map(post => `
        <div class="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm mb-6 animate-slide">
            <div class="flex items-center gap-3 mb-6">
                <img src="${post.profiles?.avatar_url || '/IMG/Logo.jpeg'}" 
                     class="w-10 h-10 rounded-2xl object-cover ring-4 ring-slate-50"
                     onerror="this.src='/IMG/Logo.jpeg'">
                <div>
                    <div class="flex items-center gap-2">
                        <h4 class="text-xs font-black text-slate-800 uppercase">
                            ${post.profiles?.username || 'Founder'}
                        </h4>
                        ${post.is_announcement ? '<span class="px-2 py-0.5 bg-cyan-500 text-white text-[7px] font-black uppercase rounded-md shadow-sm shadow-cyan-200">Founder</span>' : ''}
                    </div>
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        ${new Date(post.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                </div>
            </div>
            <p class="text-sm text-slate-600 leading-relaxed font-medium">${post.content}</p>
        </div>
    `).join('');
}

// ────────────────────────────────────────────────
// Admin broadcast interface (unchanged but safer)
// ────────────────────────────────────────────────
function renderAdminInterface() {
    const adminBox = document.getElementById('adminPostBox');
    if (!adminBox) return;

    adminBox.innerHTML = `
        <div id="pinLock" class="text-center py-6 animate-slide">
            <div class="w-12 h-12 bg-cyan-50 text-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fa-solid fa-lock text-xl"></i>
            </div>
            <h3 class="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1">Founder Access</h3>
            <p class="text-[9px] text-slate-400 font-bold uppercase mb-6">Enter Colony PIN</p>
            <div class="flex justify-center gap-3">
                <input type="password" id="unlockPin" maxlength="4" placeholder="••••"
                       class="w-28 bg-slate-100 border-none rounded-2xl p-4 text-center text-lg font-black tracking-[0.5em] focus:ring-2 focus:ring-cyan-500 outline-none">
                <button onclick="unlockAdminTools()" class="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase hover:bg-cyan-600 transition shadow-lg active:scale-95">
                    Verify
                </button>
            </div>
        </div>
        <div id="actualPostBox" class="hidden animate-slide">
            <textarea id="adminPostInput" placeholder="Broadcast a signal to the colony..."
                      class="w-full bg-slate-50 border-none rounded-[30px] p-6 text-sm font-medium focus:ring-2 focus:ring-cyan-500 h-32 resize-none outline-none"></textarea>
            <div class="flex justify-end mt-4">
                <button onclick="publishAdminPost()" class="bg-slate-900 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase hover:bg-cyan-600 transition shadow-lg active:scale-95">
                    Send Signal
                </button>
            </div>
        </div>
    `;
    adminBox.classList.remove('hidden');
}

window.unlockAdminTools = function() {
    const enteredPin = document.getElementById('unlockPin')?.value;
    if (!enteredPin) return;

    if (enteredPin === String(currentColony?.pin || '')) {
        document.getElementById('pinLock')?.classList.add('hidden');
        document.getElementById('actualPostBox')?.classList.remove('hidden');
    } else {
        document.getElementById('unlockPin').value = '';
        triggerAlert('Access Denied', 'Incorrect Colony PIN.', '🚫');
    }
};

window.publishAdminPost = async function() {
    const input = document.getElementById('adminPostInput');
    if (!input) return;

    const content = input.value.trim();
    if (!content) {
        triggerAlert('Empty', 'Write a message first.', '✍️');
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        triggerAlert('Auth Required', 'Please log in to broadcast.', '🔒');
        return;
    }

    const { error } = await supabase
        .from('community_posts')
        .insert([{
            community_id: currentColony.id,
            user_id: user.id,
            content: content,
            is_announcement: true
        }]);

    if (error) {
        console.error("Broadcast failed:", error);
        triggerAlert("Broadcast Failed", error.message || "Unknown error", "⚠️");
    } else {
        input.value = '';
        renderColonyPosts(currentColony.id);
        triggerAlert("Signal Sent", "Colony has been notified.", "📢");
    }
};

// ────────────────────────────────────────────────
// Leave colony
// ────────────────────────────────────────────────
async function leaveCommunity() {
    if (!currentColony || !confirm("Are you sure you want to abandon this colony?")) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        triggerAlert("Auth Required", "Please log in first.", "🔒");
        return;
    }

    const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', currentColony.id)
        .eq('user_id', user.id);

    if (error) {
        console.error("Leave failed:", error);
        triggerAlert("Error", "Could not leave colony.", "⚠️");
    } else {
        let list = JSON.parse(localStorage.getItem('userCommunities')) || [];
        list = list.map(c => {
            if (c.id === currentColony.id) c.joined = false;
            return c;
        });
        localStorage.setItem('userCommunities', JSON.stringify(list));

        triggerAlert("Left Colony", `You have abandoned ${currentColony.name}.`, "👋");
        setTimeout(() => window.location.href = "/PAGES/communities.html", 1800);
    }
}

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────
function safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

function safeSetSrc(id, src) {
    const el = document.getElementById(id);
    if (el) {
        el.src = src;
        el.onerror = () => el.src = '/IMG/Logo.jpeg';
    }
}
