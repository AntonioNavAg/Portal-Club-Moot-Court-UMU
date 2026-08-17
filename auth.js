document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.querySelector('.login-form');
    const logoutButton = document.getElementById('logout-button');

    if (loginForm) {
        loginForm.addEventListener('submit', signIn);
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', signOut);
    }

    if (window.location.pathname.endsWith('areaprivada.html')) {
        await protectPrivateArea();
    }
});

async function signIn(event) {
    event.preventDefault();

    const email = document.getElementById('email-acceso').value.trim();
    const password = document.getElementById('password-acceso').value;
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');

    submitButton.disabled = true;
    submitButton.textContent = 'Accediendo…';

    const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        alert('No se ha podido iniciar sesión: ' + error.message);
        submitButton.disabled = false;
        submitButton.innerHTML =
            '<i class="fa-solid fa-right-to-bracket"></i> Iniciar sesión';
        return;
    }

    window.location.href = 'areaprivada.html';
}

async function protectPrivateArea() {
    const { data } = await supabaseClient.auth.getSession();

    if (!data.session) {
        window.location.href = 'index.html';
        return;
    }

    const emailElement = document.querySelector('.user-info span');

    if (emailElement) {
        emailElement.textContent = data.session.user.email;
    }
}

async function signOut(event) {
    event.preventDefault();

    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}