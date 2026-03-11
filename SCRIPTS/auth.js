/**
 * LINKEDOUT AUTHENTICATION LOGIC
 * Connects to register.html and login.html
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // --- 1. HANDLE LOGIN ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPass').value;

            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                showModal("Access Denied", error.message, false);
            } else {
                // global.js will handle the session check, but we force redirect for speed
                window.location.href = '/PAGES/dashboard.html';
            }
        });
    }

    // --- 2. HANDLE REGISTRATION ---
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fullName = document.getElementById('regFullName').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPass').value;
            const confirmPass = document.getElementById('regConfirmPass').value;

            // Simple Validation
            if (password !== confirmPass) {
                return showModal("Password Mismatch", "Passwords do not match. Please try again.", false);
            }

            // Supabase Sign Up
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
            });

            if (error) {
                return showModal("Registration Failed", error.message, false);
            }

            if (data.user) {
                // Immediately Create Profile in Database
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        { 
                            id: data.user.id, 
                            full_name: fullName, 
                            role: 'Professional Napper @ LinkedOut',
                            avatar_url: '/IMG/Logo.jpeg'
                        }
                    ]);

                if (profileError) console.error("Profile Error:", profileError);

                showModal("Signal Established", "Account created successfully. Welcome to the grid!", true);
                
                // Small delay to let them see the modal before jumping to dashboard
                setTimeout(() => {
                    window.location.href = '/PAGES/dashboard.html';
                }, 2000);
            }
        });
    }
});

/**
 * PASSWORD TOGGLE VISIBILITY
 */
function togglePassword(id, btn) {
    const input = document.getElementById(id);
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
    
    // Toggle Icon (assuming you are using HeroIcons/SVG as per your HTML)
    btn.classList.toggle('text-blue-500');
}