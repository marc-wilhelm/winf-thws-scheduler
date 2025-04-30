// Konstanten für die Authentifizierung werden aus dem globalen Namespace (app.js) verwendet

// Beim Laden der Seite prüfen, ob bereits ein Token vorhanden ist
document.addEventListener('DOMContentLoaded', function() {
    // Initialisiere die Login-Komponenten
    initLoginComponents();

    // Token aus dem lokalen Speicher abrufen
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const username = localStorage.getItem(AUTH_USERNAME_KEY);

    if (token) {
        // Token existiert, zur App wechseln
        showApp(token, username);
    } else {
        // Kein Token, Login-Formular anzeigen
        showLogin();
    }
});

// Initialisiere alle Event-Listener für die Login-Komponenten
function initLoginComponents() {
    // Login-Button-Listener
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
    }

    // Logout-Button-Listener
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    // Enter-Taste zum Anmelden verwenden
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                handleLogin();
            }
        });
    }
}

// Login anzeigen
function showLogin() {
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const loginError = document.getElementById('login-error');

    if (loginContainer) loginContainer.style.display = 'block';
    if (appContainer) appContainer.style.display = 'none';
    if (loginError) loginError.style.display = 'none';
}

function showApp(token, username) {
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const loggedInUser = document.getElementById('logged-in-user');
    const sidebarUsername = document.getElementById('sidebar-username');

    if (loginContainer) loginContainer.style.display = 'none';
    if (appContainer) appContainer.style.display = 'block';
    if (loggedInUser) loggedInUser.textContent = username || 'Benutzer';
    if (sidebarUsername) sidebarUsername.textContent = username || 'Benutzer';

    // Token für zukünftige API-Aufrufe speichern
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    if (username) {
        localStorage.setItem(AUTH_USERNAME_KEY, username);
    }

    // HIER NEU: Initialisiere die App nach erfolgreicher Anmeldung
    initializeApp();
}

// Neue Funktion, die alle notwendigen Initialisierungen ausführt
function initializeApp() {
    // Initialisiere UI-Komponenten
    initNavigation();
    initThemeToggle();
    initAccountSidebar();
    initAboutModal();
    initScheduleSection();
    initCalendarSection();

    // Initialisiere Kalenderansicht
    setTimeout(() => {
        if (!calendar && document.getElementById('calendar-container')) {
            initCalendarView();
        }
    }, 500);

    // Lade Metadaten
    loadMetadata();
}

// Login-Funktion
async function handleLogin() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('login-button');

    if (!usernameInput || !passwordInput) {
        console.error('Formularelemente nicht gefunden');
        return;
    }

    const username = usernameInput.value;
    const password = passwordInput.value;

    if (!username || !password) {
        showLoginError('Bitte Benutzername und Passwort eingeben.');
        return;
    }

    // Login-Button deaktivieren und Ladeindikator anzeigen
    loginButton.disabled = true;
    loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Anmelden...';

    try {
        // API-Aufruf ausführen
        const response = await fetch(`${API_BASE_URL}/auth`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok && data.token) {
            showApp(data.token, data.username);
        } else {
            showLoginError(data.error || 'Fehler bei der Anmeldung.');
        }
    } catch (error) {
        showLoginError('Verbindungsfehler. Bitte versuche es später erneut.');
        console.error('Login error:', error);
    } finally {
        // Login-Button zurücksetzen
        loginButton.disabled = false;
        loginButton.innerHTML = 'Anmelden';
    }
}

// Logout-Funktion
function handleLogout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USERNAME_KEY);
    window.location.reload(); // Seite neu laden, um zum Login zurückzukehren
}

// Fehlermeldung im Login anzeigen
function showLoginError(message) {
    const errorElement = document.getElementById('login-error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}