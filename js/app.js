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

let deferredPrompt;

// 1. Ascolta l'evento che permette l'installazione
window.addEventListener('beforeinstallprompt', (e) => {
    // Impedisce al browser di mostrare il prompt nativo automaticamente
    e.preventDefault();
    // Salva l'evento per usarlo quando clicchiamo il pulsante
    deferredPrompt = e;

    // Rendi visibili i pulsanti (sia quello PC che quello Mobile)
    const pcBtn = document.getElementById('pwa-install-pc-btn');
    const mobileBtn = document.getElementById('pwa-install-mobile-float');

    if (pcBtn) pcBtn.style.display = 'flex';
    if (mobileBtn) mobileBtn.style.display = 'flex';
});

// 2. Funzione per gestire il click sui pulsanti
function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('Utente ha accettato l\'installazione');
            }
            deferredPrompt = null;
        });
    }
}

// 3. Collega l'evento ai pulsanti
document.getElementById('pwa-install-pc-btn')?.addEventListener('click', installApp);
document.getElementById('pwa-install-mobile-float')?.addEventListener('click', installApp);

// Nascondi i bottoni se l'app è già installata
window.addEventListener('appinstalled', (evt) => {
    document.getElementById('pwa-install-pc-btn').style.display = 'none';
    document.getElementById('pwa-install-mobile-float').style.display = 'none';
});
window.addEventListener('appinstalled', () => {
    console.log('PWA installata correttamente!');
    hideAllInstallButtons();
    deferredPrompt = null;
});
