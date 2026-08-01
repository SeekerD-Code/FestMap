// app.js - Funzioni globali e gestione comune a tutto il sito

document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/APP/sw.js')
            .catch(err => console.log("Service Worker non registrato:", err));
    }

    // Gestione globale del menu laterale (Drawer) per tutte le pagine
    document.addEventListener('click', (event) => {
        const menuBtn = event.target.closest('#menu-toggle-btn');
        if (menuBtn) {
            event.preventDefault();
            event.stopPropagation();

            const drawer = document.getElementById('side-drawer');
            const backdrop = document.getElementById('drawer-backdrop');

            if (drawer) {
                drawer.classList.toggle('open');
                drawer.style.transform = drawer.classList.contains('open') ? 'translateX(0)' : 'translateX(-100%)';
            }
            if (backdrop) {
                backdrop.classList.toggle('active');
                backdrop.style.opacity = backdrop.classList.contains('active') ? '1' : '0';
                backdrop.style.visibility = backdrop.classList.contains('active') ? 'visible' : 'hidden';
            }
            return;
        }

        // Chiusura menu laterale (tramite la 'X' o cliccando sullo sfondo scuro)
        if (event.target.closest('#drawer-close-btn') || event.target.id === 'drawer-backdrop') {
            const drawer = document.getElementById('side-drawer');
            const backdrop = document.getElementById('drawer-backdrop');

            if (drawer) {
                drawer.classList.remove('open');
                drawer.style.transform = 'translateX(-100%)';
            }
            if (backdrop) {
                backdrop.classList.remove('active');
                backdrop.style.opacity = '0';
                backdrop.style.visibility = 'hidden';
            }
            return;
        }
    });
});

export function apriModaleDettagli(ev) {
    localStorage.setItem('eventoSelezionatoDettaglio', JSON.stringify(ev));

    // Controlla se la pagina corrente è dentro la cartella 'eventi'
    const isInEventi = window.location.pathname.includes('/eventi/');
    const targetUrl = isInEventi ? '../dati-evento.html' : 'dati-evento.html';

    window.location.href = targetUrl;
}

// --- Gestione Unificata Installazione PWA (Desktop & Mobile) ---
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    // Impedisce al browser di mostrare il banner automatico
    e.preventDefault();
    deferredPrompt = e;

    // Mostra il pulsante PC se siamo su desktop
    const pcBtn = document.getElementById('pwa-install-pc-btn');
    if (pcBtn) {
        pcBtn.style.display = 'flex';
    }

    // Mostra il quadratino mobile se siamo su smartphone
    const mobileFloatBtn = document.getElementById('pwa-install-mobile-float');
    if (mobileFloatBtn) {
        mobileFloatBtn.style.display = 'flex';
    }
});

// Funzione comune per attivare il prompt
async function triggerPwaInstall() {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
        console.log('Utente ha installato la PWA');
    }

    deferredPrompt = null;
    hideAllInstallButtons();
}

function hideAllInstallButtons() {
    const pcBtn = document.getElementById('pwa-install-pc-btn');
    if (pcBtn) pcBtn.style.display = 'none';

    const mobileFloatBtn = document.getElementById('pwa-install-mobile-float');
    if (mobileFloatBtn) mobileFloatBtn.style.display = 'none';
}

// Associa i click ai rispettivi pulsanti
document.addEventListener('click', (e) => {
    if (e.target.closest('#pwa-install-pc-btn') || e.target.closest('#pwa-install-mobile-float')) {
        triggerPwaInstall();
    }
});

window.addEventListener('appinstalled', () => {
    console.log('PWA installata correttamente!');
    hideAllInstallButtons();
    deferredPrompt = null;
});