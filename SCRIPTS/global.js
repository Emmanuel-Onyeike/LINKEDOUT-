/**
 * LINKEDOUT GLOBAL ENGINE v5.8 - VERCEL EDITION
 * FIXED Supabase initialization
 */

const _url = 'https://wfhpypkuwhssjnvcsapo.supabase.co';
const _key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmaHB5cGt1d2hzc2pudmNzYXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODM1OTEsImV4cCI6MjA4ODc1OTU5MX0.DdAJ-N7EWysvAiuLCGhknZaU8AgMXr4EgylBnAEp6nI';

// Use the global supabase from CDN directly
window.supabase = supabase.createClient(_url, _key, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: localStorage
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    if (window.supabase) {
        await checkSession();
        await syncAllIdentityElements();
    }
});

async function checkSession() {
    const { data: { session } } = await window.supabase.auth.getSession();
    const path = window.location.pathname.toLowerCase();
    
    // Vercel path logic
    const isAuthPage = path.includes('login') || path.includes('register');
    
    if (!session && !isAuthPage) {
        window.location.href = '/PAGES/login.html';
    } 
    else if (session && isAuthPage) {
        window.location.href = '/PAGES/dashboard.html';
    }
}

async function syncAllIdentityElements() {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) return;
    
    const { data: profile } = await window.supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
    if (profile) {
        const name = profile.full_name || "New Loafer";
        document.querySelectorAll('#dashName, #navName').forEach(el => {
            el.innerText = (el.id === 'dashName') ? name.split(' ')[0] : name;
        });
    }
}

// Centered Modal - unchanged
window.showModal = function(title, message, isSuccess = true) {
    const modalHtml = `
        <div id="systemModal" class="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md"></div>
            <div class="relative bg-white w-full max-w-sm rounded-[44px] p-12 text-center shadow-2xl">
                <h2 class="text-xl font-black mb-2">${title}</h2>
                <p class="text-[10px] font-bold text-slate-400 uppercase mb-8">${message}</p>
                <button onclick="document.getElementById('systemModal').remove()" class="w-full py-5 bg-slate-900 text-white rounded-2xl">Acknowledge</button>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};
