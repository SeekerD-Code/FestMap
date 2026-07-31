import { fetchEventi } from './data-fetcher.js';
import { creaCardEvento, popolaMesiSelect } from './ui-components.js';
import { normalizzaDataPerFiltri, filtraEventi } from './filters-utils.js';
import { apriModaleDettagli } from './app.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js');
    }

    // Nota: La gestione del Menu a Scomparsa (Drawer) è ora gestita globalmente in app.js!

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
        data_inizio_grezza: normalizzaDataPerFiltri(e.data_inizio_grezza),
        data_fine_grezza: normalizzaDataPerFiltri(e.data_fine_grezza || e.data_inizio_grezza)
    })) : [];

    // Popola i Mesi nel Select (tramite ui-components o logica diretta di fallback)
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

    // Funzione principale di rendering (Aggiorna anche il Contatore in alto a destra)
    function renderizzaEventi(listaEventi) {
        const containerPrimi = document.getElementById('primi-eventi-container');
        const containerEventi = document.getElementById('anteprima-eventi');
        const sezionePreferitiTitolo = document.getElementById('titolo-sezione-preferiti');
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

        const preferitiIds = JSON.parse(localStorage.getItem('festmap_preferiti') || '[]');
        const eventiPreferiti = validi.filter(e => preferitiIds.includes(e.id || e.nome_rilevato));

        if (containerPrimi) {
            if (eventiPreferiti.length > 0) {
                if (sezionePreferitiTitolo) sezionePreferitiTitolo.style.display = 'block';
                containerPrimi.style.display = 'grid';
                containerPrimi.innerHTML = eventiPreferiti.map(e => creaCardEvento(e, false)).join('');
            } else {
                if (sezionePreferitiTitolo) sezionePreferitiTitolo.style.display = 'none';
                containerPrimi.style.display = 'none';
                containerPrimi.innerHTML = '';
            }
        }

        const successivi10 = validi;
        if (containerEventi) {
            containerEventi.innerHTML = successivi10.length > 0
                ? successivi10.map(e => creaCardEvento(e, false)).join('')
                : '<p>Nessun evento disponibile al momento.</p>';
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
    window.festmapDatiPronti = true;
    window.dispatchEvent(new Event('festmap-pronta'));

    // Ascoltatori eventi UI (Ricerca, Filtri, Ordinamento)
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
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


    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            // 1. Svuota tutti i campi di input e select del pannello
            const searchInput = document.getElementById('search-input');
            const filterTipo = document.getElementById('filter-tipo');
            const filterMese = document.getElementById('filter-mese');
            const filterData = document.getElementById('filter-data');
            const filterDa = document.getElementById('filter-da');
            const filterA = document.getElementById('filter-a');
            const filterCitta = document.getElementById('filter-citta');
            const filterProvincia = document.getElementById('filter-provincia');
            const filterRegione = document.getElementById('filter-regione');

            if (searchInput) searchInput.value = '';
            if (filterTipo) filterTipo.value = '';
            if (filterMese) filterMese.value = '';
            if (filterData) filterData.value = '';
            if (filterDa) filterDa.value = '';
            if (filterA) filterA.value = '';
            if (filterCitta) filterCitta.value = '';
            if (filterProvincia) filterProvincia.value = '';
            if (filterRegione) filterRegione.value = '';

            // 2. Riesegui il rendering con tutti gli eventi originali
            renderizzaEventi(eventiTotali);

            // 3. (Opzionale) Chiude il pannello dopo il reset
            if (filtersPanel) filtersPanel.classList.add('hidden');
        });
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