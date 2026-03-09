// Toggle password visibility
function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector('svg');

    if (input.type === "password") {
        input.type = "text";
        button.classList.add('text-blue-500'); // Turn the eye blue when active
    } else {
        input.type = "password";
        button.classList.remove('text-blue-500'); // Back to grey
    }
}

// Your existing handleRegister function
function handleRegister(e) {
    e.preventDefault();
    const fullName = document.getElementById('regFullName').value;
    const pass = document.getElementById('regPass').value;
    const confirm = document.getElementById('regConfirmPass').value;

    if (!fullName || !pass) {
        triggerAlert('Error', 'Please fill in all the details.');
        return;
    }

    if (pass !== confirm) {
        triggerAlert('Mismatch', 'Your passwords do not match. Try again.');
        return;
    }

    triggerAlert('Success', `Welcome to the bench, ${fullName}!`);
    // Redirect logic here...
}