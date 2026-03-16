// open_comms.js - FINAL VERSION with "Founder = No PIN" logic
// Broadcast box shows immediately for founders, PIN only for other admins

let currentColony = null;
let userRole = 'member';
let isFounder = false;  // NEW: track if current user is the creator

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const colonyId = urlParams.get('id');

    if (!colonyId) {
        safeAlert("No Colony", "Missing ID – redirecting...", "⚠️");
        setTimeout(() => window.location.href = '/PAGES/dashboard.html', 1800);
        return;
    }

    if (typeof supabase === 'undefined') {
        safeAlert("System Error", "Supabase client missing.", "💥");
        return;
    }

    await loadColonyData(colonyId);
    await loadColonyMembers(colonyId);
    await renderColonyPosts(colonyId);
});

// ────────────────────────────────────────────────
// 1. Load colony details + check if current user is founder
// ────────────────────────────────────────────────
async function loadColonyData(id) {
    const { data: colony, error } = await supabase
        .from('communities')
        .select('*, founder_id')  // Make sure to select founder_id
        .eq('id', id)
        .single();

    if (error || !colony) {
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

        // NEW: Check if current user is the founder
        isFounder = (user.id === colony.founder_id);
    }

    safeSetText('commTitle', colony.name || 'Unnamed Colony');
    safeSetText('commVibe', colony.description ? `Vibe: ${colony.description.substring(0, 40)}...` : 'Vibe: Chill');
    safeSetText('commFullDesc', colony.description || 'No description provided.');
    safeSetText('maxLimit', colony.max_users || 100);

    const displayImg = colony.image_url || '/IMG/Logo.jpeg';
    safeSetSrc('commCover', displayImg);
    safeSetSrc('commIcon', displayImg);

    if (userRole === 'admin' || userRole === 'founder' || isFounder) {
        document.getElementById('roleBadge')?.classList.remove('hidden');
        renderAdminInterface();
    }
}
// After setting isFounder
showFounderControls();
// After setting isFounder in loadColonyData()
if (isFounder) {
    document.getElementById('deleteColonyBtn')?.classList.remove('hidden');
}
// ────────────────────────────────────────────────
// 2. Load members (unchanged)
// ────────────────────────────────────────────────
async function loadColonyMembers(id) {
    const { data: members, error } = await supabase
        .from('community_members')
        .select('role, profiles!user_id (full_name, avatar_url)')
        .eq('community_id', id);

    if (error) {
        console.error("Members failed:", error);
        safeAlert("Members Error", "Could not load colony members.", "👥");
        return;
    }

    const countEl = document.getElementById('occupantCount') || document.getElementById('memberCount');
    if (countEl) countEl.innerText = members?.length || 0;

    const list = document.getElementById('membersList');
    if (list) {
        list.innerHTML = (members || []).map(m => `
            <div class="flex items-center gap-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-100/50 mb-2">
                <img src="${m.profiles?.avatar_url || '/IMG/Logo.jpeg'}" class="w-8 h-8 rounded-full object-cover border border-white" onerror="this.src='/IMG/Logo.jpeg'">
                <div>
                    <span class="text-[10px] font-black text-slate-700 uppercase">${m.profiles?.full_name || 'Loafer'}</span>
                    <span class="text-[7px] font-bold uppercase">${m.role}</span>
                </div>
            </div>
        `).join('');
    }
}

// ────────────────────────────────────────────────
// 3. Load posts (unchanged)
// ────────────────────────────────────────────────
async function renderColonyPosts(id) {
    const feed = document.getElementById('colonyFeed');
    if (!feed) return;

    const { data: posts, error } = await supabase
        .from('community_posts')
        .select('*, profiles!fk_community_posts_profile (full_name, avatar_url)')
        .eq('community_id', id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Posts failed:", error);
        feed.innerHTML = `<div class="text-center py-24 bg-white rounded-[40px] border-2 border-dashed"><p class="text-[10px] font-black text-slate-400">Failed to load posts</p></div>`;
        return;
    }

    if (!posts?.length) {
        feed.innerHTML = `<div class="text-center py-24 bg-white rounded-[40px] border-2 border-dashed"><p class="text-[10px] font-black text-slate-300">No posts yet...</p></div>`;
        return;
    }

    feed.innerHTML = posts.map(post => `
        <div class="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm mb-6">
            <div class="flex items-start gap-4 mb-4">
                <img src="${post.profiles?.avatar_url || '/IMG/Logo.jpeg'}" class="w-10 h-10 rounded-full object-cover ring-4 ring-slate-50" onerror="this.src='/IMG/Logo.jpeg'">
                <div>
                    <h4 class="text-sm font-bold">${post.profiles?.full_name || 'Founder'}</h4>
                    <p class="text-xs text-slate-500">${new Date(post.created_at).toLocaleString()}</p>
                </div>
            </div>
            <p class="text-sm text-slate-700">${post.content}</p>
        </div>
    `).join('');
}

// ────────────────────────────────────────────────
// Admin interface – UPDATED: Founders skip PIN
// ────────────────────────────────────────────────
function renderAdminInterface() {
    const adminBox = document.getElementById('adminPostBox');
    if (!adminBox) return;

    // If current user is the founder, skip PIN screen completely
    if (isFounder) {
        adminBox.innerHTML = `
            <div class="p-8">
                <h3 class="text-lg font-black text-cyan-600 uppercase tracking-wider mb-4">Broadcast Center</h3>
                <p class="text-sm text-slate-600 mb-6">As founder, you can post directly.</p>
                <textarea id="adminPostInput" placeholder="Write your colony announcement..."
                          class="w-full bg-slate-50 border border-slate-200 rounded-3xl p-6 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none resize-none h-36"></textarea>
                <div class="flex justify-end mt-5">
                    <button onclick="publishAdminPost()" class="bg-cyan-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-wider hover:bg-cyan-700 transition shadow-lg active:scale-95">
                        Broadcast
                    </button>
                </div>
            </div>
        `;
        adminBox.classList.remove('hidden');
        return;
    }

    // For other admins → show PIN screen
    adminBox.innerHTML = `
        <div id="pinLock" class="text-center py-6 animate-slide">
            <div class="w-12 h-12 bg-cyan-50 text-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fa-solid fa-lock text-xl"></i>
            </div>
            <h3 class="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1">Admin Access</h3>
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

// ────────────────────────────────────────────────
// Verify PIN (only used for non-founder admins)
// ────────────────────────────────────────────────
window.unlockAdminTools = function() {
    const enteredPin = document.getElementById('unlockPin')?.value?.trim();
    if (!enteredPin) return;

    // Founder already skipped this screen — so this only runs for other admins
    if (enteredPin === String(currentColony?.pin || '')) {
        document.getElementById('pinLock')?.classList.add('hidden');
        document.getElementById('actualPostBox')?.classList.remove('hidden');
    } else {
        document.getElementById('unlockPin').value = '';
        safeAlert('Access Denied', 'Incorrect Colony PIN.', '🚫');
    }
};

// ────────────────────────────────────────────────
// Publish broadcast (unchanged)
// ────────────────────────────────────────────────
window.publishAdminPost = async function() {
    const input = document.getElementById('adminPostInput');
    const content = input?.value.trim();
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
        console.error("Broadcast Error:", error);
        safeAlert("Failed", "Could not send broadcast.", "⚠️");
        return;
    }

    input.value = '';
    renderColonyPosts(currentColony.id);
    safeAlert("Sent", "Your announcement has been broadcast.", "📢");
};

// ────────────────────────────────────────────────
// Leave colony (unchanged)
// ────────────────────────────────────────────────
async function leaveCommunity() {
    if (!currentColony || !confirm("Are you sure you want to abandon this colony?")) {
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        safeAlert("Auth Required", "Please log in first.", "🔒");
        return;
    }

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
        list = list.map(c => {
            if (c.id === currentColony.id) c.joined = false;
            return c;
        });
        localStorage.setItem('userCommunities', JSON.stringify(list));

        safeAlert("Left Colony", `You have abandoned ${currentColony.name}.`, "👋");
        setTimeout(() => window.location.href = "/PAGES/community.html", 1800);
    }
}

// ────────────────────────────────────────────────
// Safe helpers (unchanged)
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

function safeAlert(title, message, icon = '🔔') {
    if (typeof window.triggerAlert === 'function') {
        window.triggerAlert(title, message, icon);
    } else {
        alert(`${title}\n\n${message}`);
    }
}
// ────────────────────────────────────────────────
// NEW: Delete Colony (only for founder)
// ────────────────────────────────────────────────
async function confirmDeleteColony() {
    if (!currentColony) return;

    // Extra safety: only founder can delete
    if (!isFounder) {
        safeAlert("Permission Denied", "Only the colony founder can delete it.", "🚫");
        return;
    }

    const confirmed = confirm(`Are you ABSOLUTELY sure you want to permanently delete "${currentColony.name}"?\n\nThis will erase the colony, all members, posts, and cannot be undone.`);
    if (!confirmed) return;

    safeAlert("Deleting Colony", "Wiping out the colony... This may take a moment.", "🗑️");

    try {
        // 1. Delete all related posts (optional - if no cascade)
        await supabase.from('community_posts').delete().eq('community_id', currentColony.id);

        // 2. Delete all members
        await supabase.from('community_members').delete().eq('community_id', currentColony.id);

        // 3. Delete the colony itself
        const { error } = await supabase
            .from('communities')
            .delete()
            .eq('id', currentColony.id);

        if (error) throw error;

        // 4. Clean localStorage sidebar
        let list = JSON.parse(localStorage.getItem('userCommunities')) || [];
        list = list.filter(c => c.id !== currentColony.id);
        localStorage.setItem('userCommunities', JSON.stringify(list));

        safeAlert("Colony Deleted", `${currentColony.name} has been permanently removed.`, "✅");
        setTimeout(() => window.location.href = "/PAGES/communities.html", 2000);

    } catch (err) {
        console.error("Delete colony failed:", err);
        safeAlert("Delete Failed", err.message || "Something went wrong.", "⚠️");
    }
}

// Show delete button only to founder (call this in loadColonyData after setting isFounder)
function showFounderControls() {
    if (isFounder) {
        document.getElementById('deleteColonyBtn')?.classList.remove('hidden');
    }
}
