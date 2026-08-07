import { fetchEventi } from './data-fetcher.js';
import { creaCardEvento } from './ui-components.js';
import { normalizzaDataPerFiltri, filtraEventi } from './filters-utils.js';
import { apriModaleDettagli } from './app.js';

console.log("preferiti.js caricato correttamente!");

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js');
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
    const eventiTotali = rawEventi ? rawEventi.map(e => ({
        ...e,
        data_inizio_grezza: normalizzaDataPerFiltri(e.data_inizio_grezza || e.data_inizio || e.data),
        data_fine_grezza: normalizzaDataPerFiltri(e.data_fine_grezza || e.data_inizio_grezza || e.data_inizio || e.data)
    })) : [];

    // Filtra subito solo quelli salvati nei preferiti dell'utente
    const preferitiIds = JSON.parse(localStorage.getItem('festmap_preferiti') || '[]');
    const eventiPreferitiBase = eventiTotali.filter(e => {
        const evId = e.id || e.nome_rilevato;
        return preferitiIds.includes(evId);
    });

    // Popola i Mesi nel Select in base ai preferiti disponibili
    const selectMese = document.getElementById('filter-mese');
    if (selectMese && eventiPreferitiBase.length > 0) {
        const mesiDisponibili = [...new Set(eventiPreferitiBase.map(e => e.data_inizio_grezza ? e.data_inizio_grezza.substring(0, 7) : null))].filter(Boolean).sort();

        let optionsHtml = '<option value="">Tutti i mesi</option>';
        mesiDisponibili.forEach(meseStr => {
            const [anno, mese] = meseStr.split('-');
            const dataFormattata = new Date(anno, mese - 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
            const meseLabel = dataFormattata.charAt(0).toUpperCase() + dataFormattata.slice(1);
            optionsHtml += `<option value="${meseStr}">${meseLabel}</option>`;
        });
        selectMese.innerHTML = optionsHtml;

        selectMese.addEventListener('change', () => eseguiFiltroERender());
    }

    // Funzione principale di rendering focalizzata sui preferiti
    function renderizzaEventi(listaEventi) {
        const containerPreferiti = document.getElementById('preferiti-container');
        const sortSelect = document.getElementById('sort-order-select');
        const counterSpan = document.getElementById('counter-value');

        const oggi = new Date().toISOString().split('T')[0];

        const ordinamentoScelto = sortSelect ? sortSelect.value : 'asc';
        const ordinati = [...listaEventi].sort((a, b) => {
            const dataA = new Date(a.data_inizio_grezza || 0);
            const dataB = new Date(b.data_inizio_grezza || 0);
            return ordinamentoScelto === 'asc' ? dataA - dataB : dataB - dataA;
        });

        const validi = ordinati.filter(e => !e.data_fine_grezza || e.data_fine_grezza >= oggi);

        // --- AGGIORNA IL CONTATORE ---
        if (counterSpan) {
            counterSpan.textContent = validi.length;
        }

        if (containerPreferiti) {
            if (validi.length > 0) {
                containerPreferiti.innerHTML = validi.map(e => creaCardEvento(e, false)).join('');
            } else {
                containerPreferiti.innerHTML = `<p style="text-align: center; color: #6c757d; grid-column: 1 / -1; padding: 40px;">Nessun evento nei preferiti.</p>`;
            }
        }
    }

    function eseguiFiltroERender() {
        // Ripartiamo sempre dai preferiti salvati per applicare i filtri di ricerca e form
        const currentPreferitiIds = JSON.parse(localStorage.getItem('festmap_preferiti') || '[]');
        const mieiPreferiti = eventiTotali.filter(e => currentPreferitiIds.includes(e.id || e.nome_rilevato));

        const filtrati = filtraEventi(mieiPreferiti);
        renderizzaEventi(filtrati);
    }

    // Primo avvio
    if (eventiPreferitiBase.length > 0) {
        renderizzaEventi(eventiPreferitiBase);
    } else {
        renderizzaEventi([]);
    }

    // Ascoltatori eventi UI (Ricerca, Filtri, Ordinamento)
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-order-select');

    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', (e) => {
            e.preventDefault();
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

    // Gestione filtri singoli al volo (come in index.js se presenti)
    const filterTipo = document.getElementById('filter-tipo');
    if (filterTipo) filterTipo.addEventListener('change', () => eseguiFiltroERender());

    const filterData = document.getElementById('filter-data');
    if (filterData) filterData.addEventListener('change', () => eseguiFiltroERender());

    const filterDa = document.getElementById('filter-da');
    const filterA = document.getElementById('filter-a');
    if (filterDa) filterDa.addEventListener('change', () => eseguiFiltroERender());
    if (filterA) filterA.addEventListener('change', () => eseguiFiltroERender());

    const filterCitta = document.getElementById('filter-citta');
    const filterProvincia = document.getElementById('filter-provincia');
    const filterRegione = document.getElementById('filter-regione');
    if (filterCitta) filterCitta.addEventListener('input', () => eseguiFiltroERender());
    if (filterProvincia) filterProvincia.addEventListener('input', () => eseguiFiltroERender());
    if (filterRegione) filterRegione.addEventListener('input', () => eseguiFiltroERender());

    // Gestione globale dei click sulle card (Preferiti e Dettagli)
    document.addEventListener('click', (e) => {
        // 1. Gestione click sul cuoricino dei preferiti (se rimuovi dai preferiti nella pagina preferiti, aggiorna la vista)
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