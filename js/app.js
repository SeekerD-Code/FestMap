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
    window.location.href = 'dati-evento.html';
}