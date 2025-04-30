/**
 * THWS Scheduler - Main Application JavaScript
 * Manages UI interactions and API communication for the scheduler functionality
 */

// Constants - diese werden im globalen Namespace deklariert und von login.js genutzt
const API_BASE_URL = 'https://thws-scheduler.azurewebsites.net/api';
const AUTH_TOKEN_KEY = 'thws_scheduler_auth_token';
const AUTH_USERNAME_KEY = 'thws_scheduler_username';

// Global State
let currentData = null;
let calendar = null;
let metadataCache = null;

// DOM Elements
const navLinks = document.querySelectorAll('.nav-link');
const contentSections = document.querySelectorAll('.content-section');
const themeToggle = document.getElementById('theme-toggle');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('App initialized');

    // Check if user is authenticated - note: initial auth check happens in login.js
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
        console.log('No auth token found, redirecting to login...');
        return; // Login-Handling wird in login.js erledigt
    }

    // Initialize UI components
    initNavigation();
    initThemeToggle();
    initAccountSidebar();
    initAboutModal();
    initScheduleSection();
    initCalendarSection();

    // Initialize calendar view immediately for placeholder
    setTimeout(() => {
        if (!calendar && document.getElementById('calendar-container')) {
            initCalendarView();
        }
    }, 500);

    // Load initial data
    loadMetadata();
});

// =========================================================
// Navigation and Theme Management
// =========================================================

// Initialize navigation links
function initNavigation() {
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = link.getAttribute('data-section');

            // Update active states
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Show target section, hide others
            contentSections.forEach(section => {
                if (section.id === `${targetSection}-section`) {
                    section.classList.add('active');
                    // Initialize calendar if calendar section becomes active
                    if (targetSection === 'calendar' && !calendar) {
                        initCalendarView();
                    }
                } else {
                    section.classList.remove('active');
                }
            });
        });
    });
}

// Initialisiere Account-Sidebar
function initAccountSidebar() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const accountSidebar = document.getElementById('account-sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const sidebarUsername = document.getElementById('sidebar-username');
    const loggedInUsername = localStorage.getItem(AUTH_USERNAME_KEY) || 'Benutzer';

    // Setze Benutzernamen
    sidebarUsername.textContent = loggedInUsername;
    const loggedInUser = document.getElementById('logged-in-user');
    if (loggedInUser) {
        loggedInUser.textContent = loggedInUsername;
    }

    // Aktualisiere Theme-Toggle-Text
    updateThemeToggleText();

    // Toggle Sidebar
    sidebarToggle.addEventListener('click', (e) => {
        e.preventDefault(); // Verhindere Standardverhalten
        console.log('Sidebar toggle clicked');
        console.log('Sidebar Element:', accountSidebar); // Überprüfe, ob das Element existiert

        // Füge einen kleinen Timeout hinzu
        setTimeout(() => {
            accountSidebar.classList.add('open');
            console.log('Open class added:', accountSidebar.classList.contains('open'));
        }, 10);
    });

    // Schließe Sidebar
    closeSidebarBtn.addEventListener('click', () => {
        accountSidebar.classList.remove('open');
    });

    // Schließe Sidebar beim Klick außerhalb
    document.addEventListener('click', (e) => {
        if (accountSidebar.classList.contains('open') &&
            !accountSidebar.contains(e.target) &&
            e.target !== sidebarToggle) {
            accountSidebar.classList.remove('open');
        }
    });
}

// Theme-Toggle-Text aktualisieren - neue Funktion
function updateThemeToggleText() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        if (document.body.classList.contains('dark-theme')) {
            themeToggle.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
        } else {
            themeToggle.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
        }
    }
}

// Initialisiere About-Modal
function initAboutModal() {
    const aboutBtn = document.getElementById('about-btn');
    const aboutModal = document.getElementById('about-modal');
    const closeAboutBtn = document.getElementById('close-about');

    // Öffne Modal
    aboutBtn.addEventListener('click', () => {
        aboutModal.classList.add('open');
    });

    // Schließe Modal
    closeAboutBtn.addEventListener('click', () => {
        aboutModal.classList.remove('open');
    });

    // Schließe Modal beim Klick außerhalb
    aboutModal.addEventListener('click', (e) => {
        if (e.target === aboutModal) {
            aboutModal.classList.remove('open');
        }
    });
}

// Initialize theme toggle
function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('thws-theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        updateThemeToggleText();
    }

    // Toggle theme on button click
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');

        if (document.body.classList.contains('dark-theme')) {
            localStorage.setItem('thws-theme', 'dark');
        } else {
            localStorage.setItem('thws-theme', 'light');
        }

        updateThemeToggleText();

        // Update calendar theme if initialized
        if (calendar) {
            calendar.render();
        }
    });
}

// Zeige Semester-Informationen
function showSemesterInfo(metadata) {
    const semesterInfoCard = document.getElementById('semester-info-card');
    const currentSemester = document.getElementById('current-semester');
    const semesterTimespan = document.getElementById('semester-timespan');
    const lastUpdated = document.getElementById('last-updated');

    if (!metadata) return;

    // Fülle Daten
    currentSemester.textContent = metadata.semester_info.aktuelles_semester || 'Nicht verfügbar';
    semesterTimespan.textContent = metadata.semester_info.zeitraum || 'Nicht verfügbar';
    lastUpdated.textContent = metadata.abgerufen || 'Nicht verfügbar';

    // Zeige Karte
    semesterInfoCard.style.display = 'block';
}

// =========================================================
// Schedule Section Functionality
// =========================================================

// Initialize schedule section components
function initScheduleSection() {
    console.log('Initializing schedule section');

    const addConfigBtn = document.getElementById('add-config-btn');
    const resetConfigsBtn = document.getElementById('reset-configs-btn');
    const executeBtn = document.getElementById('execute-btn');
    const newSearchBtn = document.getElementById('new-search-btn');
    const downloadJson = document.getElementById('download-json');
    const downloadCsv = document.getElementById('download-csv');
    const downloadIcs = document.getElementById('download-ics');
    const errorRetryBtn = document.getElementById('error-retry-btn');
    const refreshMetadataBtn = document.getElementById('refresh-metadata');

    // Set up event listeners
    if (addConfigBtn) addConfigBtn.addEventListener('click', addPlanConfiguration);
    if (resetConfigsBtn) resetConfigsBtn.addEventListener('click', resetConfigurations);
    if (executeBtn) executeBtn.addEventListener('click', executeScheduleScraper);
    if (newSearchBtn) newSearchBtn.addEventListener('click', showPlanConfiguration);
    if (downloadJson) {
        downloadJson.addEventListener('click', e => {
            e.preventDefault();
            downloadData('json', e)
        });
    }
    if (downloadCsv) {
        downloadCsv.addEventListener('click', e => {
            e.preventDefault();
            downloadData('csv', e);
        });
    }
    if (downloadIcs) {
        downloadIcs.addEventListener('click', e => {
            e.preventDefault();
            downloadData('ics', e);
        });
    }
    if (errorRetryBtn) errorRetryBtn.addEventListener('click', loadMetadata);
    if (refreshMetadataBtn) refreshMetadataBtn.addEventListener('click', loadMetadata);

    // Initialisiere die Modul-Buttons für alle bestehenden Konfigurationen
    const configItems = document.querySelectorAll('.plan-config-item');
    configItems.forEach(item => {
        const configId = item.dataset.configId;
        initModuleControls(configId);
    });
}


// Load metadata from course_scraper API
function loadMetadata() {
    console.log('Loading metadata');

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const metadataLoading = document.getElementById('metadata-loading');
    const planConfiguration = document.getElementById('plan-configuration');
    const errorDisplay = document.getElementById('error-display');
    const semesterInfoCard = document.getElementById('semester-info-card');

    // Show loading indicator
    if (metadataLoading) metadataLoading.style.display = 'flex';
    if (planConfiguration) planConfiguration.style.display = 'none';
    if (errorDisplay) errorDisplay.style.display = 'none';
    if (semesterInfoCard) semesterInfoCard.style.display = 'none';

    // Fetch metadata from API
    fetch(`${API_BASE_URL}/course_scraper`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Metadata loaded:', data);

            // Cache metadata for later use
            metadataCache = data;

            // Zeige Semester-Informationen
            showSemesterInfo(data);

            // Populate dropdowns with the data
            populateStudiengangDropdowns();

            // Hide loading indicator, show configuration
            if (metadataLoading) metadataLoading.style.display = 'none';
            if (planConfiguration) planConfiguration.style.display = 'block';
        })
        .catch(error => {
            console.error('Error loading metadata:', error);

            // Show error display
            if (metadataLoading) metadataLoading.style.display = 'none';
            if (errorDisplay) {
                errorDisplay.style.display = 'flex';
                const errorMessage = document.getElementById('error-message');
                if (errorMessage) {
                    errorMessage.textContent = 'Ungültiges oder abgelaufenes Token. Bitte melde dich erneut an.';
                }
            }
        });
}

// Populate Studiengang dropdowns from metadata
function populateStudiengangDropdowns() {
    const studiengangSelects = document.querySelectorAll('.studiengang-select');

    if (!metadataCache || !metadataCache.studiengaenge) {
        console.error('No metadata available');
        return;
    }

    studiengangSelects.forEach(select => {
        // Clear existing options (except placeholder)
        while (select.options.length > 1) {
            select.remove(1);
        }

        // Add options for each Studiengang
        metadataCache.studiengaenge.forEach(studiengang => {
            const option = document.createElement('option');
            option.value = studiengang.name;
            option.textContent = `${studiengang.name} - ${studiengang.vollername}`;
            select.appendChild(option);
        });

        // Set up change event to update semester dropdown
        select.addEventListener('change', (e) => {
            const configId = e.target.id.split('-')[1];
            populateSemesterDropdown(configId, e.target.value);
        });
    });
}

// Populate semester dropdown based on selected Studiengang
function populateSemesterDropdown(configId, studiengangName) {
    console.log(`populateSemesterDropdown aufgerufen: configId=${configId}, studiengangName=${studiengangName}`);

    const semesterSelect = document.getElementById(`semester-${configId}`);
    const moduleContainer = document.getElementById(`module-checkboxes-${configId}`);
    const groupSelect = document.getElementById(`group-${configId}`);

    if (!semesterSelect) {
        console.error(`Semester-Dropdown mit ID 'semester-${configId}' nicht gefunden!`);
        return;
    }

    // Clear existing options (behalte nur den Platzhalter)
    while (semesterSelect.options.length > 0) {
        semesterSelect.remove(0);
    }

    // Füge neuen Platzhalter hinzu
    const placeholderOption = document.createElement('option');
    placeholderOption.value = "";
    placeholderOption.textContent = "Bitte wählen...";
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    placeholderOption.hidden = true;
    semesterSelect.appendChild(placeholderOption);

    // Setze den Container zurück
    if (moduleContainer) {
        moduleContainer.innerHTML = '<div class="module-placeholder">Bitte wählen Sie zuerst Studiengang und Semester aus.</div>';
    }

    // Leere Gruppen-Dropdown
    if (groupSelect) {
        while (groupSelect.options.length > 0) {
            groupSelect.remove(0);
        }

        // Füge Platzhalter zum Gruppen-Dropdown hinzu
        const groupPlaceholder = document.createElement('option');
        groupPlaceholder.value = "";
        groupPlaceholder.textContent = "Bitte wählen...";
        groupPlaceholder.disabled = true;
        groupPlaceholder.selected = true;
        groupPlaceholder.hidden = true;
        groupSelect.appendChild(groupPlaceholder);

        groupSelect.disabled = true;
    }

    // Deaktiviere Module-Buttons
    try {
        const selectAllBtn = document.querySelector(`.select-all-btn[data-checkbox-container="module-checkboxes-${configId}"]`);
        const deselectAllBtn = document.querySelector(`.deselect-all-btn[data-checkbox-container="module-checkboxes-${configId}"]`);

        if (selectAllBtn) selectAllBtn.disabled = true;
        if (deselectAllBtn) deselectAllBtn.disabled = true;
    } catch (error) {
        console.error("Fehler beim Deaktivieren der Modul-Buttons:", error);
    }

    // Wenn kein Studiengang ausgewählt ist, Semester-Dropdown deaktiviert lassen
    if (!studiengangName) {
        semesterSelect.disabled = true;
        return;
    }

    // Suche den ausgewählten Studiengang in den Metadaten
    if (!metadataCache || !metadataCache.studiengaenge) {
        console.error("Metadaten nicht verfügbar!");
        return;
    }

    const studiengang = metadataCache.studiengaenge.find(sg => sg.name === studiengangName);

    if (!studiengang || !studiengang.semester) {
        console.error('Keine Semesterdaten gefunden für:', studiengangName);
        return;
    }

    // WICHTIG: Aktivieren des Semester-Dropdowns
    semesterSelect.disabled = false;

    // Semester-Optionen hinzufügen
    studiengang.semester.forEach(semester => {
        const option = document.createElement('option');
        option.value = semester.zahl;
        option.textContent = semester.name;
        semesterSelect.appendChild(option);
    });

    // Event-Listener für Semesteränderung hinzufügen
    // Alten Event-Listener entfernen um Duplikate zu vermeiden
    const newSemesterSelect = semesterSelect.cloneNode(true);
    if (semesterSelect.parentNode) {
        semesterSelect.parentNode.replaceChild(newSemesterSelect, semesterSelect);

        // Event-Listener zum neuen Element hinzufügen
        newSemesterSelect.addEventListener('change', (e) => {
            populateGroupAndModuleDropdowns(configId, studiengangName, e.target.value);
        });
    }
}

// Initialisiert die "Alle" und "Keine" Buttons für die Modulauswahl einer Konfiguration
function initModuleControls(configId) {
    const selectAllBtn = document.querySelector(`.select-all-btn[data-checkbox-container="module-checkboxes-${configId}"]`);
    const deselectAllBtn = document.querySelector(`.deselect-all-btn[data-checkbox-container="module-checkboxes-${configId}"]`);

    if (selectAllBtn) {
        // Vorhandene Event-Listener entfernen, um Duplikate zu vermeiden
        selectAllBtn.replaceWith(selectAllBtn.cloneNode(true));
        const newSelectAllBtn = document.querySelector(`.select-all-btn[data-checkbox-container="module-checkboxes-${configId}"]`);
        // Neuen Event-Listener hinzufügen
        newSelectAllBtn.addEventListener('click', () => {
            selectAllCheckboxes(`module-checkboxes-${configId}`);
        });
    }

    if (deselectAllBtn) {
        // Vorhandene Event-Listener entfernen, um Duplikate zu vermeiden
        deselectAllBtn.replaceWith(deselectAllBtn.cloneNode(true));
        const newDeselectAllBtn = document.querySelector(`.deselect-all-btn[data-checkbox-container="module-checkboxes-${configId}"]`);
        // Neuen Event-Listener hinzufügen
        newDeselectAllBtn.addEventListener('click', () => {
            deselectAllCheckboxes(`module-checkboxes-${configId}`);
        });
    }
}

// Populate group and module dropdowns based on selected Studiengang and semester
function populateGroupAndModuleDropdowns(configId, studiengangName, semesterZahl) {
    console.log(`populateGroupAndModuleDropdowns aufgerufen: configId=${configId}, studiengangName=${studiengangName}, semesterZahl=${semesterZahl}`);

    const groupSelect = document.getElementById(`group-${configId}`);
    const groupFormGroup = groupSelect ? groupSelect.parentElement : null; // Der übergeordnete form-group Container
    const moduleContainer = document.getElementById(`module-checkboxes-${configId}`);

    // Debug-Logging
    console.log("groupSelect:", groupSelect);
    console.log("moduleContainer:", moduleContainer);

    if (!moduleContainer) {
        console.error(`Module-Container mit ID 'module-checkboxes-${configId}' nicht gefunden!`);
        return;
    }

    const selectAllBtn = document.querySelector(`.select-all-btn[data-checkbox-container="module-checkboxes-${configId}"]`);
    const deselectAllBtn = document.querySelector(`.deselect-all-btn[data-checkbox-container="module-checkboxes-${configId}"]`);

    // Clear existing options
    if (groupSelect) {
        while (groupSelect.options.length > 0) {
            groupSelect.remove(0);
        }

        // Platzhalter-Option hinzufügen
        const placeholderOption = document.createElement('option');
        placeholderOption.value = "";
        placeholderOption.textContent = "Bitte wählen...";
        placeholderOption.disabled = true;
        placeholderOption.selected = true;
        placeholderOption.hidden = true;
        groupSelect.appendChild(placeholderOption);
    }

    // Modul-Container zurücksetzen
    moduleContainer.innerHTML = '';

    // Prüfen, ob erforderliche Daten vorhanden sind
    if (!studiengangName || !semesterZahl) {
        console.log("Studiengang oder Semester fehlt, Module werden nicht angezeigt");

        if (groupFormGroup) groupFormGroup.style.display = 'none';
        moduleContainer.innerHTML = '<div class="module-placeholder">Bitte wählen Sie zuerst Studiengang und Semester aus.</div>';

        if (selectAllBtn) selectAllBtn.disabled = true;
        if (deselectAllBtn) deselectAllBtn.disabled = true;
        return;
    }

    // Metadaten überprüfen
    if (!metadataCache || !metadataCache.studiengaenge) {
        console.error("Metadaten nicht verfügbar!");
        moduleContainer.innerHTML = '<div class="module-placeholder">Fehler: Metadaten nicht verfügbar</div>';
        return;
    }

    // Find the selected Studiengang and semester in metadata
    const studiengang = metadataCache.studiengaenge.find(sg => sg.name === studiengangName);
    if (!studiengang) {
        console.error(`Studiengang '${studiengangName}' nicht in Metadaten gefunden!`);
        moduleContainer.innerHTML = '<div class="module-placeholder">Studiengang nicht gefunden</div>';
        return;
    }

    const semester = studiengang.semester.find(sem => sem.zahl.toString() === semesterZahl.toString());
    if (!semester) {
        console.error(`Semester '${semesterZahl}' für Studiengang '${studiengangName}' nicht gefunden!`);
        moduleContainer.innerHTML = '<div class="module-placeholder">Semester nicht gefunden</div>';
        return;
    }

    console.log("Gefundenes Semester:", semester);

    // Check if there are groups available
    const hasGroups = semester.urls && semester.urls.some(url => url.gruppe);
    console.log("Gruppen vorhanden:", hasGroups);

    if (hasGroups && groupSelect && groupFormGroup) {
        groupFormGroup.style.display = 'block';
        groupSelect.disabled = false;

        // Add default "all groups" option
        const allOption = document.createElement('option');
        allOption.value = "";
        // allOption.textContent = "Alle Gruppen";
        groupSelect.appendChild(allOption);

        // Add group options
        const groups = semester.urls
            .filter(url => url.gruppe)
            .map(url => url.gruppe);

        // Remove duplicates
        [...new Set(groups)].forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            option.textContent = `Gruppe ${group}`;
            groupSelect.appendChild(option);
        });
    } else if (groupFormGroup) {
        groupFormGroup.style.display = 'none';
    }

    // Enable module buttons
    if (selectAllBtn) selectAllBtn.disabled = false;
    if (deselectAllBtn) deselectAllBtn.disabled = false;

    // Add module checkboxes
    if (semester.module && semester.module.length > 0) {
        console.log(`${semester.module.length} Module gefunden, werden angezeigt`);

        // Modul-Checkboxen hinzufügen
        populateModuleCheckboxes(`module-checkboxes-${configId}`, semester.module);
    } else {
        console.log("Keine Module im Semester gefunden");
        moduleContainer.innerHTML = '<div class="module-placeholder">Keine Module verfügbar</div>';
    }

    // Check if execute button should be enabled
    checkExecuteButtonState();
}

// Function to select all checkboxes in a container
function selectAllCheckboxes(containerId) {
    console.log(`selectAllCheckboxes für ${containerId}`);

    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container mit ID '${containerId}' nicht gefunden!`);
        return;
    }

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    console.log(`${checkboxes.length} Checkboxen gefunden`);

    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });

    checkExecuteButtonState();
}

// Function to deselect all checkboxes in a container
function deselectAllCheckboxes(containerId) {
    console.log(`deselectAllCheckboxes für ${containerId}`);

    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container mit ID '${containerId}' nicht gefunden!`);
        return;
    }

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    console.log(`${checkboxes.length} Checkboxen gefunden`);

    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });

    checkExecuteButtonState();
}

// Get selected modules from checkboxes
function getSelectedModulesFromCheckboxes(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container mit ID '${containerId}' nicht gefunden!`);
        return [];
    }

    const checkedCheckboxes = container.querySelectorAll('input[type="checkbox"]:checked');

    return Array.from(checkedCheckboxes).map(checkbox => checkbox.value);
}

// Initialisiert die "Alle" und "Keine" Buttons für die Modulauswahl einer Konfiguration
function initModuleControls(configId) {
    console.log(`initModuleControls für Konfiguration ${configId}`);

    const selectAllBtn = document.querySelector(`.select-all-btn[data-checkbox-container="module-checkboxes-${configId}"]`);
    const deselectAllBtn = document.querySelector(`.deselect-all-btn[data-checkbox-container="module-checkboxes-${configId}"]`);

    if (selectAllBtn) {
        console.log("Initialisiere 'Alle'-Button");
        // Vorhandene Event-Listener entfernen, um Duplikate zu vermeiden
        const newSelectAllBtn = selectAllBtn.cloneNode(true);
        selectAllBtn.parentNode.replaceChild(newSelectAllBtn, selectAllBtn);

        // Neuen Event-Listener hinzufügen
        newSelectAllBtn.addEventListener('click', () => {
            console.log("'Alle'-Button geklickt");
            selectAllCheckboxes(`module-checkboxes-${configId}`);
        });
    } else {
        console.warn(`'Alle'-Button für Konfiguration ${configId} nicht gefunden`);
    }

    if (deselectAllBtn) {
        console.log("Initialisiere 'Keine'-Button");
        // Vorhandene Event-Listener entfernen, um Duplikate zu vermeiden
        const newDeselectAllBtn = deselectAllBtn.cloneNode(true);
        deselectAllBtn.parentNode.replaceChild(newDeselectAllBtn, deselectAllBtn);

        // Neuen Event-Listener hinzufügen
        newDeselectAllBtn.addEventListener('click', () => {
            console.log("'Keine'-Button geklickt");
            deselectAllCheckboxes(`module-checkboxes-${configId}`);
        });
    } else {
        console.warn(`'Keine'-Button für Konfiguration ${configId} nicht gefunden`);
    }
}

// Check if the execute button should be enabled
function checkExecuteButtonState() {
    const executeBtn = document.getElementById('execute-btn');
    if (!executeBtn) {
        console.error("Execute-Button nicht gefunden!");
        return;
    }

    const configItems = document.querySelectorAll('.plan-config-item');
    let hasValidConfig = false;

    configItems.forEach(item => {
        const configId = item.dataset.configId;
        const studiengangSelect = document.getElementById(`studiengang-${configId}`);
        const semesterSelect = document.getElementById(`semester-${configId}`);
        const moduleContainer = document.getElementById(`module-checkboxes-${configId}`);

        if (!studiengangSelect || !semesterSelect || !moduleContainer) {
            console.warn(`Formularelemente für Konfiguration ${configId} nicht vollständig gefunden`);
            return;
        }

        // Check if at least one module checkbox is checked
        let hasSelectedModules = false;
        const checkedCheckboxes = moduleContainer.querySelectorAll('input[type="checkbox"]:checked');
        hasSelectedModules = checkedCheckboxes.length > 0;

        console.log(`Konfiguration ${configId}: Studiengang=${studiengangSelect.value}, Semester=${semesterSelect.value}, Ausgewählte Module=${checkedCheckboxes.length}`);

        // Configuration is valid if studiengang, semester, and at least one module are selected
        if (studiengangSelect.value && semesterSelect.value && hasSelectedModules) {
            hasValidConfig = true;
        }
    });

    console.log(`Execute-Button ${hasValidConfig ? 'aktiviert' : 'deaktiviert'}`);
    executeBtn.disabled = !hasValidConfig;
}

// Add a new plan configuration
function addPlanConfiguration() {
    const planConfigs = document.getElementById('plan-configs');
    const configItems = planConfigs.querySelectorAll('.plan-config-item');

    // Get the next config ID
    const nextId = configItems.length;

    // Create a new config item
    const configItem = document.createElement('div');
    configItem.className = 'plan-config-item';
    configItem.dataset.configId = nextId;

    // HTML template for a new config item
    configItem.innerHTML = `
        <div class="config-header">
            <h3>Konfiguration #${nextId + 1}</h3>
            <button class="remove-config-btn" data-config-id="${nextId}">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div class="form-grid">
            <div class="form-group">
                <label for="studiengang-${nextId}">Studiengang:</label>
                <select id="studiengang-${nextId}" class="studiengang-select">
                    <option value="" disabled selected hidden>Bitte wählen...</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="semester-${nextId}">Semester:</label>
                <select id="semester-${nextId}" class="semester-select" disabled>
                    <option value="" disabled selected hidden>Bitte wählen...</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="group-${nextId}">Gruppe:</label>
                <select id="group-${nextId}" class="group-select" disabled>
                    <option value="" disabled selected hidden>Bitte wählen...</option>
                </select>
            </div>
            
            <div class="form-group module-group">
                <label>Module:</label>
                <div class="module-checkboxes-container" id="module-checkboxes-${nextId}">
                    <!-- Checkboxen werden dynamisch eingefügt -->
                    <div class="module-placeholder">Bitte wählen Sie zuerst Studiengang und Semester aus.</div>
                </div>
                <div class="module-controls">
                    <button class="select-all-btn" data-checkbox-container="module-checkboxes-${nextId}" disabled>Alle</button>
                    <button class="deselect-all-btn" data-checkbox-container="module-checkboxes-${nextId}" disabled>Keine</button>
                </div>
            </div>
        </div>
    `;

    // Add the new config item to the container
    planConfigs.appendChild(configItem);

    // Initialize dropdowns
    populateStudiengangDropdowns();

    // Set up remove button
    const removeBtn = configItem.querySelector('.remove-config-btn');
    removeBtn.addEventListener('click', () => removeConfiguration(nextId));

    // Initialisiere die Modul-Buttons
    initModuleControls(nextId);

    // Show remove buttons if there's more than one config item
    updateRemoveButtonsVisibility();
}

// Function to populate module checkboxes
function populateModuleCheckboxes(containerId, modules) {
    console.log(`populateModuleCheckboxes aufgerufen für ${containerId} mit ${modules ? modules.length : 0} Modulen`);

    const container = document.getElementById(containerId);

    if (!container) {
        console.error(`Container mit ID '${containerId}' nicht gefunden!`);
        return;
    }

    // Container leeren
    container.innerHTML = '';

    if (!modules || modules.length === 0) {
        console.log("Keine Module vorhanden, zeige Platzhalter");
        container.innerHTML = '<div class="module-placeholder">Keine Module verfügbar</div>';
        return;
    }

    // Create a module list container
    const moduleList = document.createElement('div');
    moduleList.className = 'module-checkbox-list';
    container.appendChild(moduleList);

    console.log(`Erstelle ${modules.length} Checkboxen`);

    // Checkboxen für jedes Modul erstellen
    modules.forEach((modul, index) => {
        if (!modul.abk || !modul.name) {
            console.warn(`Modul #${index} hat ungültige Daten:`, modul);
            return; // Überspringe ungültige Module
        }

        const checkboxWrapper = document.createElement('div');
        checkboxWrapper.className = 'checkbox-wrapper';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `${containerId}-${modul.abk}`;
        checkbox.name = `module-${containerId}`;
        checkbox.value = modul.abk;
        checkbox.className = 'module-checkbox';

        // Explizit nicht disabled setzen
        checkbox.disabled = false;

        checkbox.addEventListener('change', () => {
            console.log(`Checkbox für Modul ${modul.abk} geändert:`, checkbox.checked);
            checkExecuteButtonState();
        });

        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = `${modul.abk} - ${modul.name}`;

        checkboxWrapper.appendChild(checkbox);
        checkboxWrapper.appendChild(label);
        moduleList.appendChild(checkboxWrapper);

        console.log(`Checkbox für Modul '${modul.abk}' erstellt`);
    });

    console.log(`${moduleList.childElementCount} Checkboxen erstellt und eingefügt`);
}

// Function to select all checkboxes in a container
function selectAllCheckboxes(containerId) {
    const container = document.getElementById(containerId);
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');

    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });

    checkExecuteButtonState();
}

// Function to deselect all checkboxes in a container
function deselectAllCheckboxes(containerId) {
    const container = document.getElementById(containerId);
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');

    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });

    checkExecuteButtonState();
}

// Get selected modules from checkboxes
function getSelectedModulesFromCheckboxes(containerId) {
    const container = document.getElementById(containerId);
    const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');

    return Array.from(checkboxes).map(checkbox => checkbox.value);
}

// Remove a configuration
function removeConfiguration(configId) {
    const planConfigs = document.getElementById('plan-configs');
    const configItem = planConfigs.querySelector(`.plan-config-item[data-config-id="${configId}"]`);

    if (configItem) {
        planConfigs.removeChild(configItem);
        renumberConfigurations();
        updateRemoveButtonsVisibility();
        checkExecuteButtonState();
    }
}

// Reset all configurations to initial state
function resetConfigurations() {
    const planConfigs = document.getElementById('plan-configs');

    // Remove all but the first configuration
    const configItems = planConfigs.querySelectorAll('.plan-config-item');
    for (let i = 1; i < configItems.length; i++) {
        planConfigs.removeChild(configItems[i]);
    }

    // Reset first configuration
    const firstConfig = planConfigs.querySelector('.plan-config-item');
    if (firstConfig) {
        const studiengangSelect = firstConfig.querySelector('.studiengang-select');
        const semesterSelect = firstConfig.querySelector('.semester-select');
        const groupSelect = firstConfig.querySelector('.group-select');
        const moduleSelect = firstConfig.querySelector('.modules-select');

        studiengangSelect.value = '';
        clearDropdown(semesterSelect);
        clearDropdown(groupSelect);
        clearDropdown(moduleSelect);

        semesterSelect.disabled = true;
        groupSelect.disabled = true;
        moduleSelect.disabled = true;

        const selectAllBtn = firstConfig.querySelector('.select-all-btn');
        const deselectAllBtn = firstConfig.querySelector('.deselect-all-btn');
        selectAllBtn.disabled = true;
        deselectAllBtn.disabled = true;
    }

    // Update UI
    updateRemoveButtonsVisibility();
    checkExecuteButtonState();
}

// Update remove buttons visibility
function updateRemoveButtonsVisibility() {
    const configItems = document.querySelectorAll('.plan-config-item');
    const removeBtns = document.querySelectorAll('.remove-config-btn');

    // Show remove buttons only if there's more than one config
    removeBtns.forEach(btn => {
        btn.style.display = configItems.length > 1 ? 'block' : 'none';
    });
}

// Renumber configurations after removal
function renumberConfigurations() {
    const configItems = document.querySelectorAll('.plan-config-item');

    configItems.forEach((item, index) => {
        item.dataset.configId = index;
        item.querySelector('h3').textContent = `Konfiguration #${index + 1}`;
        item.querySelector('.remove-config-btn').dataset.configId = index;
    });
}

// Select all modules in a select element
function selectAllModules(selectElement) {
    if (!selectElement) return;

    for (let i = 0; i < selectElement.options.length; i++) {
        selectElement.options[i].selected = true;
    }

    checkExecuteButtonState();
}

// Deselect all modules in a select element
function deselectAllModules(selectElement) {
    if (!selectElement) return;

    for (let i = 0; i < selectElement.options.length; i++) {
        selectElement.options[i].selected = false;
    }

    checkExecuteButtonState();
}

// Clear a dropdown (except the first option)
function clearDropdown(selectElement) {
    if (!selectElement) return;

    while (selectElement.options.length > 1) {
        selectElement.remove(1);
    }
}

// Execute schedule scraper with selected configurations
function executeScheduleScraper() {
    console.log("executeScheduleScraper aufgerufen");

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const planConfig = document.getElementById('plan-configuration');
    const loadingIndicator = document.getElementById('loading-indicator');
    const resultsSection = document.getElementById('results-section');
    const errorDisplay = document.getElementById('error-display');

    // Prepare plans array for API request
    const plans = [];
    const configItems = document.querySelectorAll('.plan-config-item');
    console.log(`${configItems.length} Konfigurationen verarbeiten`);

    configItems.forEach((item, index) => {
        const configId = item.dataset.configId;
        console.log(`Verarbeite Konfiguration #${index+1} (ID: ${configId})`);

        // Sichere Element-Zugriffe mit Null-Checks
        const studiengangSelect = document.getElementById(`studiengang-${configId}`);
        const semesterSelect = document.getElementById(`semester-${configId}`);
        const groupSelect = document.getElementById(`group-${configId}`);
        const moduleContainer = document.getElementById(`module-checkboxes-${configId}`);

        // Überprüfe jedes Element auf null, bevor auf seine Eigenschaften zugegriffen wird
        if (!studiengangSelect) {
            console.error(`Element studiengang-${configId} nicht gefunden!`);
            return;
        }

        if (!semesterSelect) {
            console.error(`Element semester-${configId} nicht gefunden!`);
            return;
        }

        if (!moduleContainer) {
            console.error(`Element module-checkboxes-${configId} nicht gefunden!`);
            return;
        }

        // Überprüfe, ob tatsächlich ein Wert ausgewählt wurde
        const studiengangValue = studiengangSelect.value;
        const semesterValue = semesterSelect.value;

        // Skip invalid configurations
        if (!studiengangValue) {
            console.warn(`Konfiguration ${configId}: Kein Studiengang ausgewählt`);
            return;
        }

        if (!semesterValue) {
            console.warn(`Konfiguration ${configId}: Kein Semester ausgewählt`);
            return;
        }

        // Get selected modules from checkboxes
        const selectedModules = [];
        const checkedCheckboxes = moduleContainer.querySelectorAll('input[type="checkbox"]:checked');

        console.log(`${checkedCheckboxes.length} ausgewählte Module gefunden`);

        checkedCheckboxes.forEach(checkbox => {
            if (checkbox.value) {
                selectedModules.push(checkbox.value);
                console.log(`Gewähltes Modul: ${checkbox.value}`);
            }
        });

        if (selectedModules.length === 0) {
            console.warn(`Konfiguration ${configId}: Keine Module ausgewählt`);
            return;
        }

        // Find the URLs for this configuration
        if (!metadataCache || !metadataCache.studiengaenge) {
            console.error("Metadaten nicht verfügbar!");
            return;
        }

        const studiengang = metadataCache.studiengaenge.find(sg => sg.name === studiengangValue);
        if (!studiengang) {
            console.error(`Studiengang '${studiengangValue}' nicht gefunden!`);
            return;
        }

        const semester = studiengang.semester.find(sem => sem.zahl.toString() === semesterValue.toString());
        if (!semester) {
            console.error(`Semester '${semesterValue}' für Studiengang '${studiengangValue}' nicht gefunden!`);
            return;
        }

        // Filter URLs by group if specified
        let urls = semester.urls || [];
        const groupValue = groupSelect ? groupSelect.value : null;

        if (groupValue) {
            console.log(`Filtere URLs nach Gruppe: ${groupValue}`);
            urls = urls.filter(url => url.gruppe === groupValue);
        }

        // Add a plan for each URL
        urls.forEach(url => {
            const plan = {
                url: url.url,
                label: `${studiengang.name} ${semester.name}${groupValue ? ` Gr. ${groupValue}` : ''}`,
                filter: selectedModules
            };

            plans.push(plan);
            console.log(`Plan hinzugefügt:`, plan);
        });
    });

    // Check if any valid plans were created
    if (plans.length === 0) {
        console.error("Keine gültigen Pläne erstellt!");
        showError('Keine gültigen Konfigurationen zum Abrufen vorhanden.');
        return;
    }

    // Show loading indicator
    console.log(`${plans.length} Pläne werden abgerufen...`);
    if (planConfig) planConfig.style.display = 'none';
    if (loadingIndicator) loadingIndicator.style.display = 'flex';
    if (resultsSection) resultsSection.style.display = 'none';
    if (errorDisplay) errorDisplay.style.display = 'none';

    // CORS-angepasster API-Aufruf
    console.log("API-Aufruf mit Plänen:", plans);

    // Erstelle den Request mit den richtigen CORS-Headern
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        },
        body: JSON.stringify({ plans }),
        mode: 'cors' // Explizit CORS-Modus setzen
    };

    fetch(`${API_BASE_URL}/schedule_scraper`, requestOptions)
        .then(response => {
            console.log(`API-Antwort erhalten: ${response.status}`);

            if (!response.ok) {
                if (response.status === 204) {
                    // Bei No Content (204) trotzdem fortfahren mit leeren Daten
                    console.warn("204 No Content erhalten, verwende leere Daten");
                    return { tage: [] };
                }
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            // Prüfen, ob Response-Body leer ist
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                return response.json();
            } else {
                console.warn("Keine JSON-Daten erhalten, verwende leere Daten");
                return { tage: [] };
            }
        })
        .then(data => {
            console.log("Daten empfangen:", data);

            // Falls keine Daten vorhanden sind, zeige eine Fehlermeldung
            if (!data || !data.tage || data.tage.length === 0) {
                console.warn("Keine Vorlesungsdaten erhalten");
                showError('Keine Daten gefunden.');
                if (loadingIndicator) loadingIndicator.style.display = 'none';
                return;
            }

            // Store the data for later use
            currentData = data;

            // Display results
            displayResults(data);

            // Hide loading indicator, show results section
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (resultsSection) resultsSection.style.display = 'block';
        })
        .catch(error => {
            console.error('Error executing schedule scraper:', error);

            // Show error display
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (errorDisplay) {
                errorDisplay.style.display = 'flex';
                const errorMessage = document.getElementById('error-message');
                if (errorMessage) {
                    errorMessage.textContent =
                        'Fehler beim Abrufen der Vorlesungsdaten. Bitte versuche es später erneut.';
                }
            }
        });
}

// Display results in the table
function displayResults(data) {
    if (!data || !data.tage || data.tage.length === 0) {
        showError('Keine Daten gefunden.');
        return;
    }

    const resultsBody = document.getElementById('results-body');
    const eventCount = document.getElementById('event-count');
    const dayCount = document.getElementById('day-count');
    const moduleCount = document.getElementById('module-count');

    // Clear existing results
    resultsBody.innerHTML = '';

    // Count unique modules
    const uniqueModules = new Set();

    // Add each lecture to the table
    data.tage.forEach(day => {
        day.vorlesungen.forEach(lecture => {
            // Add module to unique set
            uniqueModules.add(lecture.fach);

            // Create table row
            const row = document.createElement('tr');

            // Format date and time
            const date = new Date(lecture.start);
            const formattedDate = date.toLocaleDateString('de-DE', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            const startTime = date.toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const endTime = new Date(lecture.ende).toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit'
            });

            // Add cells to row
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${startTime} - ${endTime}</td>
                <td>${lecture.fach}</td>
                <td>${lecture.titel}</td>
                <td>${lecture.dozent}</td>
                <td>${lecture.raum}</td>
            `;

            resultsBody.appendChild(row);
        });
    });

    // Update statistics
    let totalEvents = 0;
    data.tage.forEach(day => {
        totalEvents += day.vorlesungen.length;
    });

    eventCount.textContent = totalEvents;
    dayCount.textContent = data.tage.length;
    moduleCount.textContent = uniqueModules.size;
}

// Show the plan configuration panel (hide results)
function showPlanConfiguration() {
    const planConfig = document.getElementById('plan-configuration');
    const resultsSection = document.getElementById('results-section');

    planConfig.style.display = 'block';
    resultsSection.style.display = 'none';
}

// Show error message
function showError(message) {
    const errorDisplay = document.getElementById('error-display');
    const errorMessage = document.getElementById('error-message');

    errorMessage.textContent = message;
    errorDisplay.style.display = 'flex';
}

// Download data in the specified format
// Download data in the specified format - angepasste Funktion
function downloadData(format, event) {
    event.preventDefault();

    if (!currentData) {
        showError('Keine Daten zum Herunterladen vorhanden.');
        return;
    }

    let content, fileName, mimeType;

    switch (format) {
        case 'json':
            content = JSON.stringify(currentData, null, 2);
            fileName = 'vorlesungsplan.json';
            mimeType = 'application/json';
            break;

        case 'csv':
            content = convertToCSV(currentData);
            fileName = 'vorlesungsplan.csv';
            mimeType = 'text/csv;charset=utf-8';
            break;

        case 'ics':
            content = convertToICS(currentData);
            fileName = 'vorlesungsplan.ics';
            mimeType = 'text/calendar';
            break;

        default:
            showError('Unbekanntes Dateiformat.');
            return;
    }

    // Create download link with UTF-8 BOM for CSV
    let blob;
    if (format === 'csv') {
        // Add UTF-8 BOM für korrekte Darstellung von Umlauten in Excel
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        blob = new Blob([bom, content], { type: mimeType });
    } else {
        blob = new Blob([content], { type: mimeType });
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();

    // Clean up
    URL.revokeObjectURL(url);
}

// Convert data to CSV format
function convertToCSV(data) {
    if (!data || !data.tage) return '';

    // CSV header
    let csv = 'Datum,Wochentag,Start,Ende,Fach,Titel,Typ,Dozent,Raum,Quelle\n';

    // Add each lecture as a row
    data.tage.forEach(day => {
        day.vorlesungen.forEach(lecture => {
            const startDate = new Date(lecture.start);
            const endDate = new Date(lecture.ende);

            const formattedDate = startDate.toISOString().split('T')[0];
            const weekday = day.wochentag;
            const startTime = startDate.toTimeString().substring(0, 5);
            const endTime = endDate.toTimeString().substring(0, 5);

            // Escape CSV values
            const escapeCsv = (value) => {
                if (!value) return '';
                value = value.toString();
                // Escape quotes and add quotes if value contains comma or newline
                if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            };

            // Create CSV row
            csv += [
                formattedDate,
                weekday,
                startTime,
                endTime,
                escapeCsv(lecture.fach),
                escapeCsv(lecture.titel),
                escapeCsv(lecture.typ),
                escapeCsv(lecture.dozent),
                escapeCsv(lecture.raum),
                escapeCsv(lecture.quelle)
            ].join(',') + '\n';
        });
    });

    return csv;
}

// Convert data to ICS format
function convertToICS(data) {
    if (!data || !data.tage) return '';

    // ICS header
    let ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//THWS Scheduler//DE',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ].join('\r\n') + '\r\n';

    // Add each lecture as an event
    data.tage.forEach(day => {
        day.vorlesungen.forEach(lecture => {
            // Format start and end times
            const startDate = new Date(lecture.start);
            const endDate = new Date(lecture.ende);

            const formatDate = (date) => {
                return date.toISOString().replace(/-|:|\.\d+/g, '');
            };

            // Create event UID
            const uid = `${lecture.id || 'event'}-${startDate.getTime()}@thws-scheduler`;

            // Format description
            let description = [
                `Fach: ${lecture.fach}`,
                `Titel: ${lecture.titel}`,
                `Dozent: ${lecture.dozent}`,
                `Typ: ${lecture.typ || ''}`,
                `Quelle: ${lecture.quelle || ''}`
            ].join('\\n');

            if (lecture.hinweis) {
                description += `\\n\\nHinweis: ${lecture.hinweis}`;
            }

            // Format location
            const location = lecture.raum || '';

            // Create event
            ics += [
                'BEGIN:VEVENT',
                `UID:${uid}`,
                `DTSTAMP:${formatDate(new Date())}`,
                `DTSTART:${formatDate(startDate)}`,
                `DTEND:${formatDate(endDate)}`,
                `SUMMARY:${lecture.fach} - ${lecture.titel}`,
                `DESCRIPTION:${description}`,
                `LOCATION:${location}`,
                'END:VEVENT'
            ].join('\r\n') + '\r\n';
        });
    });

    // ICS footer
    ics += 'END:VCALENDAR';

    return ics;
}

// =========================================================
// Calendar Section Functionality
// =========================================================

// Initialize calendar section components
function initCalendarSection() {
    console.log('Initializing calendar section');

    const fileUpload = document.getElementById('calendar-file-upload');
    const fileName = document.getElementById('file-name');
    const clearCalendarBtn = document.getElementById('clear-calendar-btn');
    const calendarViewMonth = document.getElementById('calendar-view-month');
    const calendarViewWeek = document.getElementById('calendar-view-week');
    const calendarViewDay = document.getElementById('calendar-view-day');
    const calendarRetryBtn = document.getElementById('calendar-retry-btn');

    // Set up event listeners
    if (fileUpload) fileUpload.addEventListener('change', handleFileUpload);
    if (clearCalendarBtn) clearCalendarBtn.addEventListener('click', clearCalendar);
    if (calendarRetryBtn) {
        calendarRetryBtn.addEventListener('click', () => {
            document.getElementById('calendar-error').style.display = 'none';
            document.getElementById('calendar-no-data').style.display = 'flex';
        });
    }

    // Calendar view buttons
    if (calendarViewMonth) {
        calendarViewMonth.addEventListener('click', () => {
            if (calendar) {
                calendar.changeView('dayGridMonth');
                updateViewButtons('month');
            }
        });
    }

    if (calendarViewWeek) {
        calendarViewWeek.addEventListener('click', () => {
            if (calendar) {
                calendar.changeView('timeGridWeek');
                updateViewButtons('week');
            }
        });
    }

    if (calendarViewDay) {
        calendarViewDay.addEventListener('click', () => {
            if (calendar) {
                calendar.changeView('timeGridDay');
                updateViewButtons('day');
            }
        });
    }

    // Show filename when file is selected
    if (fileUpload && fileName) {
        fileUpload.addEventListener('change', () => {
            if (fileUpload.files.length > 0) {
                fileName.textContent = fileUpload.files[0].name;
            } else {
                fileName.textContent = 'Keine Datei ausgewählt';
            }
        });
    }
}

// Initialize FullCalendar
function initCalendarView() {
    console.log('Initializing calendar view');
    const calendarEl = document.getElementById('calendar-container');

    if (!calendarEl) {
        console.error('Calendar container not found');
        return;
    }

    if (calendar) {
        console.log('Calendar already initialized');
        return;
    }

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: ''
        },
        locale: 'de',
        firstDay: 1, // Monday
        height: 'auto',
        allDaySlot: false,
        slotMinTime: '08:00:00',
        slotMaxTime: '20:00:00',
        nowIndicator: true,
        eventTimeFormat: {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        },
        eventClick: function(info) {
            // Show event details
            alert(`Veranstaltung: ${info.event.title}\nDozent: ${info.event.extendedProps.dozent || 'N/A'}\nRaum: ${info.event.extendedProps.raum || 'N/A'}`);
        }
    });

    calendar.render();

    // Make sure the no-data display is shown
    const calendarNoData = document.getElementById('calendar-no-data');
    if (calendarNoData) {
        calendarNoData.style.display = 'flex';
    }
}

// Update view buttons active state
function updateViewButtons(activeView) {
    const viewButtons = document.querySelectorAll('.view-btn');

    viewButtons.forEach(btn => {
        btn.classList.remove('active');
    });

    if (activeView === 'month') {
        document.getElementById('calendar-view-month').classList.add('active');
    } else if (activeView === 'week') {
        document.getElementById('calendar-view-week').classList.add('active');
    } else if (activeView === 'day') {
        document.getElementById('calendar-view-day').classList.add('active');
    }
}

// Handle file upload for calendar
// Handle file upload for calendar - angepasste Funktion
function handleFileUpload(event) {
    const file = event.target.files[0];
    const calendarNoData = document.getElementById('calendar-no-data');
    const calendarLoading = document.getElementById('calendar-loading');
    const calendarError = document.getElementById('calendar-error');
    const clearCalendarBtn = document.getElementById('clear-calendar-btn');

    if (!file) return;

    // Check file type
    const fileType = file.name.split('.').pop().toLowerCase();
    if (fileType !== 'csv') {
        showCalendarError('Nicht unterstütztes Dateiformat. Bitte verwenden Sie CSV Dateien.');
        return;
    }

    // Show loading indicator
    calendarNoData.style.display = 'none';
    calendarLoading.style.display = 'flex';
    calendarError.style.display = 'none';

    // Read file
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            // Parse CSV file
            const events = parseCsvToEvents(e.target.result);

            // Update calendar with events
            if (events.length > 0) {
                if (!calendar) {
                    initCalendarView();
                }

                // Clear existing events
                calendar.removeAllEvents();

                // Add new events
                calendar.addEventSource(events);

                // Enable clear button
                clearCalendarBtn.disabled = false;

                // Hide loading and error displays
                calendarLoading.style.display = 'none';
                calendarNoData.style.display = 'none';
            } else {
                throw new Error('Keine Veranstaltungen in der Datei gefunden.');
            }
        } catch (error) {
            console.error('Error parsing file:', error);
            showCalendarError(`Fehler beim Verarbeiten der Datei: ${error.message}`);
        }
    };

    reader.onerror = function() {
        showCalendarError('Fehler beim Lesen der Datei.');
    };

    // Read the file
    reader.readAsText(file);
}

// Parse JSON data to calendar events
function parseJsonToEvents(jsonData) {
    try {
        const data = JSON.parse(jsonData);

        if (!data || !data.tage) {
            throw new Error('Ungültiges JSON-Format.');
        }

        const events = [];

        // Create a color map for modules
        const moduleColorMap = {};
        let colorIndex = 0;
        const colors = [
            '#ff6a00', '#3498db', '#2ecc71', '#9b59b6', '#e74c3c',
            '#1abc9c', '#f39c12', '#d35400', '#34495e', '#27ae60'
        ];

        // Process each day and its lectures
        data.tage.forEach(day => {
            day.vorlesungen.forEach(lecture => {
                // Assign color to module if not already assigned
                if (!moduleColorMap[lecture.fach]) {
                    moduleColorMap[lecture.fach] = colors[colorIndex % colors.length];
                    colorIndex++;
                }

                // Create event object
                const event = {
                    id: lecture.id || `event-${Math.random().toString(36).substring(2, 9)}`,
                    title: `${lecture.fach} - ${lecture.titel}`,
                    start: lecture.start,
                    end: lecture.ende,
                    backgroundColor: moduleColorMap[lecture.fach],
                    borderColor: moduleColorMap[lecture.fach],
                    extendedProps: {
                        dozent: lecture.dozent,
                        raum: lecture.raum,
                        typ: lecture.typ,
                        fach: lecture.fach,
                        quelle: lecture.quelle
                    }
                };

                events.push(event);
            });
        });

        return events;
    } catch (error) {
        console.error('Error parsing JSON:', error);
        throw new Error('Fehler beim Parsen der JSON-Datei: ' + error.message);
    }
}

// Parse CSV data to calendar events
function parseCsvToEvents(csvData) {
    try {
        // Use PapaParse to parse CSV
        const result = Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true
        });

        if (!result.data || result.data.length === 0) {
            throw new Error('Keine Daten in der CSV-Datei gefunden.');
        }

        const events = [];

        // Create a color map for modules
        const moduleColorMap = {};
        let colorIndex = 0;
        const colors = [
            '#ff6a00', '#3498db', '#2ecc71', '#9b59b6', '#e74c3c',
            '#1abc9c', '#f39c12', '#d35400', '#34495e', '#27ae60'
        ];

        // Process each row
        result.data.forEach((row, index) => {
            // Check if row has required fields
            if (!row.Datum || !row.Start || !row.Ende || !row.Fach || !row.Titel) {
                console.warn('Skipping row', index, 'due to missing required fields:', row);
                return;
            }

            // Parse date and time
            const date = row.Datum;
            const startTime = row.Start;
            const endTime = row.Ende;

            const startDateTime = new Date(`${date}T${startTime}`);
            const endDateTime = new Date(`${date}T${endTime}`);

            // Skip if date parsing failed
            if (isNaN(startDateTime) || isNaN(endDateTime)) {
                console.warn('Skipping row', index, 'due to invalid date or time:', row);
                return;
            }

            // Assign color to module if not already assigned
            if (!moduleColorMap[row.Fach]) {
                moduleColorMap[row.Fach] = colors[colorIndex % colors.length];
                colorIndex++;
            }

            // Create event object
            const event = {
                id: `csv-event-${index}`,
                title: `${row.Fach} - ${row.Titel}`,
                start: startDateTime,
                end: endDateTime,
                backgroundColor: moduleColorMap[row.Fach],
                borderColor: moduleColorMap[row.Fach],
                extendedProps: {
                    dozent: row.Dozent,
                    raum: row.Raum,
                    typ: row.Typ,
                    fach: row.Fach,
                    quelle: row.Quelle
                }
            };

            events.push(event);
        });

        return events;
    } catch (error) {
        console.error('Error parsing CSV:', error);
        throw new Error('Fehler beim Parsen der CSV-Datei: ' + error.message);
    }
}

// Clear calendar
function clearCalendar() {
    if (calendar) {
        calendar.removeAllEvents();
        document.getElementById('calendar-no-data').style.display = 'flex';
        document.getElementById('clear-calendar-btn').disabled = true;
        document.getElementById('file-name').textContent = 'Keine Datei ausgewählt';
        document.getElementById('calendar-file-upload').value = '';
    }
}

// Show calendar error
function showCalendarError(message) {
    const calendarError = document.getElementById('calendar-error');
    const calendarErrorMessage = document.getElementById('calendar-error-message');
    const calendarLoading = document.getElementById('calendar-loading');

    calendarErrorMessage.textContent = message;
    calendarError.style.display = 'flex';
    calendarLoading.style.display = 'none';
}