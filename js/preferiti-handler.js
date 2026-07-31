document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-preferito-overlay');
    if (!btn) return;

    // Prende l'ID dell'evento dall'attributo data-id
    const eventoId = btn.getAttribute('data-id');
    if (!eventoId) return;

    // Recupera i preferiti attuali dal localStorage
    let preferiti = JSON.parse(localStorage.getItem('festmap_preferiti') || '[]');

    const index = preferiti.indexOf(eventoId);

    if (index > -1) {
        // Rimuovi dai preferiti
        preferiti.splice(index, 1);
        btn.classList.remove('preferito-attivo');
        btn.setAttribute('title', 'Aggiungi ai preferiti');
    } else {
        // Aggiungi ai preferiti
        preferiti.push(eventoId);
        btn.classList.add('preferito-attivo');
        btn.setAttribute('title', 'Rimuovi dai preferiti');
    }

    // Salva la nuova lista nel localStorage
    localStorage.setItem('festmap_preferiti', JSON.stringify(preferiti));

    // Se ci troviamo nella pagina dei preferiti, aggiorna la lista in tempo reale!
    if (window.location.pathname.includes('preferiti.html')) {
        if (typeof caricaPreferiti === 'function') {
            caricaPreferiti();
        } else {
            location.reload();
        }
    }
});