/**
 * LINKEDOUT AUTH LOGIC v5.8 - FIXED
 */

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const loginForm    = document.getElementById('loginForm');

    // REGISTRATION
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name         = document.getElementById('regFullName').value.trim();
            const email        = document.getElementById('regEmail').value.trim();
            const pass         = document.getElementById('regPass').value;
            const confirmPass  = document.getElementById('regConfirmPass').value;

            if (pass !== confirmPass) {
                window.showModal("Error", "Passwords do not match", false);
                return;
            }

            if (pass.length < 6) {
                window.showModal("Error", "Password must be at least 6 characters", false);
                return;
            }

            const { data, error } = await window.supabase.auth.signUp({
                email,
                password: pass,
                options: {
                    data: { full_name: name }  // store name in user metadata as fallback
                }
            });

            if (error) {
                window.showModal("Error", error.message, false);
                console.error(error);
                return;
            }

            // If we get here → signup worked
            // Try to create profile row
            if (data.user) {
                const { error: profileError } = await window.supabase
                    .from('profiles')
                    .insert([{ 
                        id: data.user.id, 
                        full_name: name 
                    }]);

                if (profileError) {
                    console.error("Profile insert failed:", profileError);
                    // Don't block user - still let them proceed
                }
            }

            // Most important: let global.js onAuthStateChange or checkSession handle redirect
            // But for better UX, show success and wait a moment
            window.showModal(
                "Account Created!",
                "Redirecting you to the bench...",
                true
            );

            setTimeout(() => {
                window.location.href = '/PAGES/dashboard.html';
            }, 1800);
        });
    }

    // LOGIN - almost unchanged, just safer email selector
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('loginEmail')?.value?.trim();
            const pass  = document.getElementById('loginPass').value;

            if (!email || !pass) {
                window.showModal("Error", "Please fill in all fields", false);
                return;
            }

            const { data, error } = await window.supabase.auth.signInWithPassword({
                email,
                password: pass
            });

            if (error) {
                window.showModal("Error", error.message, false);
                console.error(error);
                return;
            }

            if (data.session) {
                window.showModal("Welcome back!", "Entering the loaf...", true);
                setTimeout(() => {
                    window.location.href = '/PAGES/dashboard.html';
                }, 1200);
            }
        });
    }
});
