// open_comms.js - FINAL SOLID VERSION (all 400 errors & crashes fixed)
// Last fixes: March 16, 2026

let currentColony = null;
let userRole = 'member';

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const colonyId = urlParams.get('id');

    if (!colonyId) {
        safeAlert("No Colony", "Missing ID – redirecting...", "⚠️");
        setTimeout(() => window.location.href = '/PAGES/dashboard.html', 1800);
        return;
    }

    if (typeof supabase === 'undefined') {
        console.error("Supabase client not loaded");
        safeAlert("System Error", "Supabase missing – contact support.", "💥");
        return;
    }

    await loadColonyData(colonyId);
    await loadColonyMembers(colonyId);
    await renderColonyPosts(colonyId);
});

// 1. Load colony + user role
async function loadColonyData(id) {
    const { data: colony, error } = await supabase
        .from('communities')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !colony) {
        console.error("Colony load failed:", error?.message);
        safeAlert("Not Found", "Colony doesn't exist or access denied.", "🏜️");
        setTimeout(() => window.location.href = '/PAGES/dashboard.html', 2500);
        return;
    }

    currentColony = colony;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: memberData } = await supabase
            .from('community_members')
            .select('role')
            .eq('community_id', id)
            .eq('user_id', user.id)
            .maybeSingle();

        userRole = memberData?.role || 'member';
    }

    safeSetText('commTitle', colony.name || 'Unnamed Colony');
    safeSetText('commVibe', colony.description ? `Vibe: ${colony.description.substring(0, 40)}...` : 'Vibe: Chill');
    safeSetText('commFullDesc', colony.description || 'No description provided.');
    safeSetText('maxLimit', colony.max_users || 100);

    const displayImg = colony.image_url || '/IMG/Logo.jpeg';
    safeSetSrc('commCover', displayImg);
    safeSetSrc('commIcon', displayImg);

    if (userRole === 'admin' || userRole === 'founder') {
        document.getElementById('roleBadge')?.classList.remove('hidden');
        renderAdminInterface();
    }
}

// 2. Load members – clean syntax, no comments
async function loadColonyMembers(id) {
    const { data: members, error } = await supabase
        .from('community_members')
        .select('role, profiles!user_id (username, avatar_url)')
        .eq('community_id', id);

    if (error) {
        console.error("Members failed:", error.code, error.message, error.details, error.hint);
        safeAlert("Members Error", "Could not load colony members.", "👥");
        return;
    }

    const countEl = document.getElementById('occupantCount') || document.getElementById('memberCount');
    if (countEl) countEl.innerText = members?.length || 0;

    const list = document.getElementById('membersList');
    if (list) {
        if (!members?.length) {
            list.innerHTML = `<p class="text-center py-8 text-slate-400 text-[10px] uppercase tracking-wider">No members yet</p>`;
            return;
        }

        list.innerHTML = members.map(m => `
            <div class="flex items-center gap-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-100/50 mb-2 transition hover:bg-slate-100">
                <img src="${m.profiles?.avatar_url || '/IMG/Logo.jpeg'}" 
                     class="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                     onerror="this.src='/IMG/Logo.jpeg'; this.onerror=null;">
                <div class="flex flex-col min-w-0">
                    <span class="text-[10px] font-black text-slate-800 uppercase truncate">
                        ${m.profiles?.username || 'Loafer'}
                    </span>
                    <span class="text-[7px] font-bold uppercase ${m.role === 'admin' || m.role === 'founder' ? 'text-cyan-600' : 'text-slate-500'}">
                        ${m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                    </span>
                </div>
            </div>
        `).join('');
    }
}

// 3. Load posts – same clean syntax
async function renderColonyPosts(id) {
    const feed = document.getElementById('colonyFeed');
    if (!feed) return;

    const { data: posts, error } = await supabase
        .from('community_posts')
        .select('*, profiles!user_id (username, avatar_url)')
        .eq('community_id', id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Posts failed:", error.code, error.message, error.details, error.hint);
        feed.innerHTML = `
            <div class="text-center py-24 bg-white rounded-[40px] border-2 border-dashed border-slate-100">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Failed to load posts – try again later
                </p>
            </div>`;
        return;
    }

    if (!posts?.length) {
        feed.innerHTML = `
            <div class="text-center py-24 bg-white rounded-[40px] border-2 border-dashed border-slate-50">
                <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    No posts yet...
                </p>
            </div>`;
        return;
    }

    feed.innerHTML = posts.map(post => `
        <div class="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm mb-6 transition hover:shadow-md">
            <div class="flex items-start gap-4 mb-4">
                <img src="${post.profiles?.avatar_url || '/IMG/Logo.jpeg'}" 
                     class="w-10 h-10 rounded-full object-cover ring-4 ring-slate-50 flex-shrink-0"
                     onerror="this.src='/IMG/Logo.jpeg'; this.onerror=null;">
                <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-2 mb-1">
                        <h4 class="text-sm font-bold text-slate-900 truncate">
                            ${post.profiles?.username || 'Founder'}
                        </h4>
                        ${post.is_announcement ? `
                            <span class="px-2 py-0.5 bg-cyan-500 text-white text-xs font-bold rounded-full">
                                Signal
                            </span>
                        ` : ''}
                    </div>
                    <p class="text-xs text-slate-500">
                        ${new Date(post.created_at).toLocaleString('en-GB', {dateStyle: 'medium', timeStyle: 'short'})}
                    </p>
                </div>
            </div>
            <p class="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                ${post.content}
            </p>
        </div>
    `).join('');
}

// ────────────────────────────────────────────────
// Admin interface + broadcast (your existing logic, kept safe)
// ────────────────────────────────────────────────
function renderAdminInterface() {
    const adminBox = document.getElementById('adminPostBox');
    if (!adminBox) return;

    adminBox.innerHTML = `
        <div id="pinLock" class="text-center py-8">
            <div class="w-14 h-14 bg-cyan-50 text-cyan-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
                <i class="fa-solid fa-lock text-2xl"></i>
            </div>
            <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">Founder Access</h3>
            <p class="text-xs text-slate-500 mb-6">Enter colony PIN to broadcast</p>
            <div class="flex justify-center gap-3 max-w-xs mx-auto">
                <input type="password" id="unlockPin" maxlength="4" placeholder="••••"
                       class="w-28 bg-white border border-slate-200 rounded-xl p-4 text-center text-xl font-black tracking-widest focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none">
                <button onclick="unlockAdminTools()" class="bg-slate-900 text-white px-8 rounded-xl font-bold uppercase hover:bg-cyan-700 transition shadow-md active:scale-95">
                    Verify
                </button>
            </div>
        </div>
        <div id="actualPostBox" class="hidden">
            <textarea id="adminPostInput" placeholder="Colony-wide announcement..."
                      class="w-full bg-white border border-slate-200 rounded-3xl p-6 text-sm leading-relaxed focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none resize-none h-36"></textarea>
            <div class="flex justify-end mt-5">
                <button onclick="publishAdminPost()" class="bg-cyan-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-wider hover:bg-cyan-700 transition shadow-lg active:scale-95">
                    Broadcast
                </button>
            </div>
        </div>
    `;
    adminBox.classList.remove('hidden');
}

window.unlockAdminTools = function() {
    const pinInput = document.getElementById('unlockPin');
    if (!pinInput) return;

    const entered = pinInput.value.trim();
    if (!entered) return;

    if (entered === String(currentColony?.pin || '')) {
        document.getElementById('pinLock')?.classList.add('hidden');
        document.getElementById('actualPostBox')?.classList.remove('hidden');
        pinInput.value = '';
    } else {
        pinInput.value = '';
        safeAlert('Access Denied', 'Wrong PIN.', '🚫');
    }
};

window.publishAdminPost = async function() {
    const input = document.getElementById('adminPostInput');
    if (!input) return;

    const content = input.value.trim();
    if (!content) return safeAlert('Empty', 'Write something first.', '✍️');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return safeAlert('Login Required', 'Sign in to broadcast.', '🔒');

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
        safeAlert("Failed", "Could not send broadcast.", "⚠️");
    } else {
        input.value = '';
        await renderColonyPosts(currentColony.id);
        safeAlert("Sent", "Broadcast delivered to colony.", "📢");
    }
};

// ────────────────────────────────────────────────
// Leave colony
// ────────────────────────────────────────────────
async function leaveCommunity() {
    if (!currentColony || !confirm(`Leave ${currentColony.name}?`)) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return safeAlert("Login Required", "Sign in first.", "🔒");

    const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', currentColony.id)
        .eq('user_id', user.id);

    if (error) {
        console.error("Leave failed:", error);
        safeAlert("Error", "Could not leave colony.", "⚠️");
    } else {
        let list = JSON.parse(localStorage.getItem('userCommunities')) || [];
        list = list.map(c => { if (c.id === currentColony.id) c.joined = false; return c; });
        localStorage.setItem('userCommunities', JSON.stringify(list));

        safeAlert("Left", `You left ${currentColony.name}.`, "👋");
        setTimeout(() => window.location.href = "/PAGES/communities.html", 1800);
    }
}

// ────────────────────────────────────────────────
// Safe utilities
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

function safeAlert(title, msg, icon = '🔔') {
    if (typeof window.triggerAlert === 'function') {
        window.triggerAlert(title, msg, icon);
    } else {
        alert(`${title}\n\n${msg}`);
    }
}
