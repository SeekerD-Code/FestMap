import { fetchEventi } from '../js/data-fetcher.js';
import { creaCardEvento, popolaMesiSelect } from '../js/ui-components.js';
import { normalizzaDataPerFiltri, filtraEventi } from '../js/filters-utils.js';
import { apriModaleDettagli } from '../js/app.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Service Worker (risalendo di livello)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('../sw.js');
    }

    // Gestione Pannello Filtri Avanzati
    const advancedToggleBtn = document.getElementById('advanced-search-toggle');
    const filtersPanel = document.getElementById('advanced-filters-panel');

    if (advancedToggleBtn && filtersPanel) {
        advancedToggleBtn.addEventListener('click', () => {
            filtersPanel.classList.toggle('hidden');
        });
    }

    // Caricamento Dati
    const rawEventi = await fetchEventi();

    // Filtriamo rigorosamente in partenza solo per la categoria "comics"
    const categoriaCorrente = 'comics';
    const eventiTotali = rawEventi ? rawEventi
        .map(e => ({
            ...e,
            data_inizio_grezza: normalizzaDataPerFiltri(e.data_inizio_grezza),
            data_fine_grezza: normalizzaDataPerFiltri(e.data_fine_grezza || e.data_inizio_grezza)
        }))
        .filter(e => {
            const tipo = (e.tipo || e.categoria || '').toLowerCase();
            return tipo.includes(categoriaCorrente);
        }) : [];

    // Popola i Mesi nel Select
    const selectMese = document.getElementById('filter-mese');
    if (selectMese && eventiTotali) {
        if (typeof popolaMesiSelect === 'function') {
            popolaMesiSelect(eventiTotali);
        } else {
            const mesiDisponibili = [...new Set(eventiTotali.map(e => e.data_inizio_grezza ? e.data_inizio_grezza.substring(0, 7) : null))].filter(Boolean).sort();

            let optionsHtml = '<option value="">Tutti i mesi</option>';
            mesiDisponibili.forEach(meseStr => {
                const [anno, mese] = meseStr.split('-');
                const dataFormattata = new Date(anno, mese - 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
                const meseLabel = dataFormattata.charAt(0).toUpperCase() + dataFormattata.slice(1);
                optionsHtml += `<option value="${meseStr}">${meseLabel}</option>`;
            });
            selectMese.innerHTML = optionsHtml;
        }

        selectMese.addEventListener('change', () => eseguiFiltroERender());
    }

    // Funzione principale di rendering della categoria
    function renderizzaEventi(listaEventi) {
        const containerEventi = document.getElementById('categoria-eventi-container');
        const sortSelect = document.getElementById('sort-order-select');
        const counterSpan = document.getElementById('counter-value');

        const oggi = new Date().toISOString().split('T')[0];

        const ordinamentoScelto = sortSelect ? sortSelect.value : 'asc';
        const ordinati = [...listaEventi].sort((a, b) => {
            const dataA = new Date(a.data_inizio_grezza);
            const dataB = new Date(b.data_inizio_grezza);
            return ordinamentoScelto === 'asc' ? dataA - dataB : dataB - dataA;
        });

        const validi = ordinati.filter(e => e.data_fine_grezza >= oggi);

        // --- AGGIORNA IL CONTATORE ---
        if (counterSpan) {
            counterSpan.textContent = validi.length;
        }

        if (containerEventi) {
            containerEventi.innerHTML = validi.length > 0
                ? validi.map(e => creaCardEvento(e, false)).join('')
                : '<p style="text-align:center; padding: 20px; color: #666;">Nessun evento disponibile per questa categoria al momento.</p>';
        }
    }

    function eseguiFiltroERender() {
        const filtrati = filtraEventi(eventiTotali);
        renderizzaEventi(filtrati);
    }

    // Primo avvio
    if (eventiTotali && eventiTotali.length > 0) {
        renderizzaEventi(eventiTotali);
    }

    // Ascoltatori eventi UI (Ricerca, Filtri, Ordinamento)
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-order-select');

    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            eseguiFiltroERender();
            if (filtersPanel) filtersPanel.classList.add('hidden');
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => eseguiFiltroERender());
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', () => eseguiFiltroERender());
    }

    // Gestione globale dei click sulle card (Preferiti e Dettagli)
    document.addEventListener('click', (e) => {
        // 1. Gestione click sul cuoricino dei preferiti
        const btnPreferito = e.target.closest('.btn-preferito-overlay');
        if (btnPreferito) {
            const idEvento = btnPreferito.getAttribute('data-id');
            if (idEvento) {
                let preferiti = JSON.parse(localStorage.getItem('festmap_preferiti') || '[]');

                if (preferiti.includes(idEvento)) {
                    preferiti = preferiti.filter(id => id !== idEvento);
                    btnPreferito.classList.remove('preferito-attivo');
                    btnPreferito.setAttribute('title', 'Aggiungi ai preferiti');
                } else {
                    preferiti.push(idEvento);
                    btnPreferito.classList.add('preferito-attivo');
                    btnPreferito.setAttribute('title', 'Rimuovi dai preferiti');
                }

                localStorage.setItem('festmap_preferiti', JSON.stringify(preferiti));
                eseguiFiltroERender();
            }
            return;
        }

        // 2. Gestione click sul pulsante "Dettagli"
        const btnDettaglio = e.target.closest('.btn-apri-dettaglio');
        if (btnDettaglio) {
            const eventoB64 = btnDettaglio.getAttribute('data-evento-b64');
            try {
                const eventoJson = decodeURIComponent(atob(eventoB64));
                const evento = JSON.parse(eventoJson);
                apriModaleDettagli(evento);
            } catch (err) {
                console.error("Errore nel parsing dei dati dell'evento per i dettagli:", err);
            }
        }
    });
});