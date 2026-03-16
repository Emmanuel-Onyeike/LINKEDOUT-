// open_comms.js - FINAL FIXED VERSION (March 16, 2026)
// All 400 errors resolved — uses exact relationship names from Supabase error

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
        safeAlert("System Error", "Supabase client missing.", "💥");
        return;
    }

    await loadColonyData(colonyId);
    await loadColonyMembers(colonyId);
    await renderColonyPosts(colonyId);
});

async function loadColonyData(id) {
    const { data: colony } = await supabase
        .from('communities')
        .select('*')
        .eq('id', id)
        .single();

    if (!colony) {
        safeAlert("Not Found", "Colony doesn't exist.", "🏜️");
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

// FIXED MEMBERS QUERY - uses Supabase-recommended relationship
async function loadColonyMembers(id) {
    const { data: members, error } = await supabase
        .from('community_members')
        .select(`
            role,
            profiles!user_id (username, avatar_url)
        `)
        .eq('community_id', id);

    if (error) {
        console.error("Members failed:", error.message, error.details, error.hint);
        safeAlert("Members Error", "Could not load members (check column name in profiles table).", "👥");
        return;
    }

    const countEl = document.getElementById('occupantCount') || document.getElementById('memberCount');
    if (countEl) countEl.innerText = members?.length || 0;

    const list = document.getElementById('membersList');
    if (list) {
        if (!members?.length) {
            list.innerHTML = `<p class="text-center py-8 text-slate-400 text-[10px]">No members yet</p>`;
            return;
        }

        list.innerHTML = members.map(m => `
            <div class="flex items-center gap-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-100/50 mb-2">
                <img src="${m.profiles?.avatar_url || '/IMG/Logo.jpeg'}" class="w-8 h-8 rounded-full object-cover border border-white" onerror="this.src='/IMG/Logo.jpeg'">
                <div>
                    <span class="text-[10px] font-black text-slate-700 uppercase">${m.profiles?.username || 'Loafer'}</span>
                    <span class="text-[7px] font-bold uppercase">${m.role}</span>
                </div>
            </div>
        `).join('');
    }
}

// FIXED POSTS QUERY - uses exact relationship name from your error message
async function renderColonyPosts(id) {
    const feed = document.getElementById('colonyFeed');
    if (!feed) return;

    const { data: posts, error } = await supabase
        .from('community_posts')
        .select(`
            *,
            profiles!fk_community_posts_profile (username, avatar_url)
        `)
        .eq('community_id', id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Posts failed:", error.message, error.details, error.hint);
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
                    <h4 class="text-sm font-bold">${post.profiles?.username || 'Founder'}</h4>
                    <p class="text-xs text-slate-500">${new Date(post.created_at).toLocaleString()}</p>
                </div>
            </div>
            <p class="text-sm text-slate-700">${post.content}</p>
        </div>
    `).join('');
}

// Your existing functions (leaveCommunity, unlockAdminTools, publishAdminPost, renderAdminInterface) remain unchanged

// Safe helpers
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
