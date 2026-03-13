// --- UTILS: GLOBAL ALERT ---
function showModalAlert(message) {
    const modal = document.getElementById('alertModal');
    const messageEl = document.getElementById('alertMessage');
    
    if (modal && messageEl) {
        messageEl.innerText = message;
        modal.classList.remove('hidden');
        modal.classList.add('flex'); 
    } else {
        alert(message);
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    const nameDisplay = document.getElementById('userFullName');
    if (!nameDisplay) return; 

    const params = new URLSearchParams(window.location.search);
    const userId = params.get('id');

    if (!userId) {
        window.location.href = '/PAGES/recommendations.html';
        return;
    }

    // Load everything for the profile
    await loadUserProfile(userId);
    checkInitialFollowStatus(userId);
    loadUserLoafs(userId); // Fetches the user's posts
});

// --- BACKGROUND NOTIFICATION ---
async function createFollowNotification(myId, theirId) {
    try {
        const { data: myProfile } = await supabase.from('profiles').select('full_name').eq('id', myId).single();
        const followerName = myProfile?.full_name || "A Loafer";

        await supabase.from('notifications').insert([{
            user_id: theirId,
            actor_id: myId,
            type: 'follow',
            content: `${followerName} started following your loafs!`,
            is_read: false
        }]);
    } catch (err) {
        console.warn("Notification failed in background:", err);
    }
}

// --- PROFILE DATA ---
async function loadUserProfile(userId) {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !profile) {
            document.getElementById('userFullName').innerText = "User Not Found";
            return;
        }

        document.getElementById('navUserName').innerText = profile.full_name;
        document.getElementById('userFullName').innerText = profile.full_name;
        document.getElementById('userRole').innerText = profile.role || 'Professional Loafer';
        document.getElementById('userAvatar').src = profile.avatar_url || '/IMG/Logo.jpeg';

        await loadProfileStats(userId);
    } catch (err) {
        console.error("Profile Load Error:", err.message);
    }
}

// --- STATS REFRESH ---
async function loadProfileStats(userId) {
    const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

    const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);

    const followerEl = document.getElementById('statFollowers');
    const followingEl = document.getElementById('statFollowing');

    if (followerEl) followerEl.innerText = followers || 0;
    if (followingEl) followingEl.innerText = following || 0;
}

// --- LOAD USER LOAFS (POSTS) ---
async function loadUserLoafs(userId) {
    const streamContainer = document.getElementById('userLoafStream');
    
    try {
        const { data: posts, error } = await supabase
            .from('posts')
            .select(`*, profiles (full_name, avatar_url)`)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Update counts in UI
        const statLoafs = document.getElementById('statLoafs');
        const badge = document.getElementById('loafCountBadge');
        if (statLoafs) statLoafs.innerText = posts.length;
        if (badge) badge.innerText = `${posts.length} POSTS`;

        streamContainer.innerHTML = ''; // Clear loading spinner

        if (posts.length === 0) {
            streamContainer.innerHTML = `
                <div class="py-12 text-center opacity-50">
                    <p class="text-[10px] font-black uppercase tracking-widest">Zero transmissions found.</p>
                </div>`;
            return;
        }

        posts.forEach(post => {
            const postDate = new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            streamContainer.innerHTML += `
                <div class="bg-white border border-slate-100 p-6 rounded-[2rem] transition-all hover:shadow-xl hover:shadow-blue-500/5">
                    <div class="flex items-center gap-3 mb-4">
                        <img src="${post.profiles.avatar_url || '/IMG/Logo.jpeg'}" class="w-8 h-8 rounded-full object-cover">
                        <div>
                            <h4 class="text-[10px] font-black uppercase">${post.profiles.full_name}</h4>
                            <p class="text-[8px] font-bold text-slate-400">${postDate}</p>
                        </div>
                    </div>
                    <p class="text-sm text-slate-600 leading-relaxed pl-2 border-l-2 border-slate-50">${post.content}</p>
                    <div class="mt-6 flex gap-4 text-slate-400">
                         <i class="fa-regular fa-heart text-xs"></i>
                         <i class="fa-regular fa-comment text-xs"></i>
                    </div>
                </div>`;
        });
    } catch (err) {
        console.error("Loaf Stream Error:", err);
    }
}

// --- FOLLOW ACTION ---
async function handleFollowAction() {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const params = new URLSearchParams(window.location.search);
    const targetUserId = params.get('id');

    if (!currentUser) return showModalAlert("LOG IN TO FOLLOW THIS LOAFER");
    if (currentUser.id === targetUserId) return showModalAlert("YOU CANNOT FOLLOW YOURSELF");

    const { data: existingFollow } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetUserId)
        .single();

    if (existingFollow) {
        updateFollowButtonUI(false);
        const { error } = await supabase
            .from('follows')
            .delete()
            .eq('follower_id', currentUser.id)
            .eq('following_id', targetUserId);

        if (error) {
            updateFollowButtonUI(true);
            showModalAlert("ACTION FAILED");
        } else {
            showModalAlert("UNFOLLOWED");
            loadProfileStats(targetUserId); 
        }
    } else {
        updateFollowButtonUI(true);
        const { error } = await supabase
            .from('follows')
            .insert([{ follower_id: currentUser.id, following_id: targetUserId }]);

        if (error) {
            updateFollowButtonUI(false);
            showModalAlert("FOLLOW FAILED");
        } else {
            showModalAlert("FOLLOWED SUCCESSFULLY");
            loadProfileStats(targetUserId);
            createFollowNotification(currentUser.id, targetUserId);
        }
    }
}

async function checkInitialFollowStatus(targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .single();

    updateFollowButtonUI(!!data);
}

function updateFollowButtonUI(isFollowing) {
    const btn = document.getElementById('followBtn');
    if (!btn) return;
    
    if (isFollowing) {
        btn.innerHTML = '<i class="fa-solid fa-user-check mr-2"></i> FOLLOWING';
        btn.className = "px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all bg-slate-100 text-slate-600";
    } else {
        btn.innerHTML = '<i class="fa-solid fa-user-plus mr-2"></i> FOLLOW';
        btn.className = "px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all bg-cyan-500 text-white";
    }
}
