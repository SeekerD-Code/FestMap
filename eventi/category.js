import { fetchEventi } from '../js/data-fetcher.js';
import { creaCardEvento, popolaMesiSelect, initCustomCalendar } from '../js/ui-components.js';
import { normalizzaDataPerFiltri } from '../js/filters-utils.js';
import { apriModaleDettagli } from '../js/app.js';

// Ricava la categoria dal nome della pagina in modo sicuro
const pathName = window.location.pathname;
const CATEGORIA_CORRENTE = pathName.includes('comics') ? 'comics' :
                           pathName.includes('folk') ? 'folk' :
                           pathName.includes('food') ? 'food' :
                           pathName.includes('wild') ? 'wild' : 'comics';

document.addEventListener('DOMContentLoaded', async () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('../sw.js');
    }

    function processaValori(rawEventi) {
        const eventiFiltratiNormalizzati = rawEventi ? rawEventi
            .filter(e => {
                const tipo = (e.tipo || '').toLowerCase();
                const cat = (e.categoria || '').toLowerCase();
                // CORRETTO: Usa CATEGORIA_CORRENTE (maiuscolo come definita sopra)
                return tipo.includes(CATEGORIA_CORRENTE) || cat.includes(CATEGORIA_CORRENTE);
            })
            .map(e => ({
                ...e,
                data_inizio_grezza: normalizzaDataPerFiltri(e.data_inizio_grezza),
                data_fine_grezza: normalizzaDataPerFiltri(e.data_fine_grezza || e.data_inizio_grezza)
            })) : [];

        return raggruppaEventiVicini(eventiFiltratiNormalizzati);
    }

    function raggruppaEventiVicini(eventi) {
        const mappa = new Map();
        eventi.forEach(ev => {
            const nomeKey = (ev.nome_rilevato || ev.nome || '').toLowerCase().trim();
            const luogoKey = (ev.citta || ev.luogo || '').toLowerCase().trim();
            const chiaveUnica = `${nomeKey}_${luogoKey}`;
            const inizioNorm = ev.data_inizio_grezza;
            const fineNorm = ev.data_fine_grezza || inizioNorm;

            if (!mappa.has(chiaveUnica)) {
                mappa.set(chiaveUnica, { ...ev, intervalliDate: [{ inizio: inizioNorm, fine: fineNorm }] });
            } else {
                const esistente = mappa.get(chiaveUnica);
                const esisteGia = esistente.intervalliDate.some(item => item.inizio === inizioNorm && item.fine === fineNorm);
                if (!esisteGia) esistente.intervalliDate.push({ inizio: inizioNorm, fine: fineNorm });
            }
        });

        return Array.from(mappa.values()).map(ev => {
            ev.intervalliDate.sort((a, b) => new Date(a.inizio) - new Date(b.inizio));
            ev.data_inizio_grezza = ev.intervalliDate[0].inizio;
            ev.data_fine_grezza = ev.intervalliDate[ev.intervalliDate.length - 1].fine;
            return ev;
        });
    }

    let eventiTotali = [];

    window.aggiornaDatiInBackground = (rawEventiFreschi) => {
        eventiTotali = processaValori(rawEventiFreschi);
        popolaMesiInSelect(eventiTotali);
        eseguiFiltroERender();
    };

    const rawEventi = await fetchEventi();
    eventiTotali = processaValori(rawEventi);

    function popolaMesiInSelect(listaEventi) {
        const selectMese = document.getElementById('filter-mese');
        if (!selectMese) return;
        const mesiDisponibili = [...new Set(listaEventi.map(e => e.data_inizio_grezza ? e.data_inizio_grezza.substring(0, 7) : null))].filter(Boolean).sort();
        let optionsHtml = '<option value="">Tutti i mesi</option>';
        mesiDisponibili.forEach(meseStr => {
            const [anno, mese] = meseStr.split('-');
            const dataFormattata = new Date(anno, mese - 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
            const meseLabel = dataFormattata.charAt(0).toUpperCase() + dataFormattata.slice(1);
            optionsHtml += `<option value="${meseStr}">${meseLabel}</option>`;
        });
        selectMese.innerHTML = optionsHtml;
    }

    const selectMese = document.getElementById('filter-mese');
    if (selectMese) {
        popolaMesiInSelect(eventiTotali);
        selectMese.addEventListener('change', () => eseguiFiltroERender());
    }

    initCustomCalendar();

    function filtraEventiCategoria(eventi) {
        const searchInput = document.getElementById('search-input');
        const testoQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const meseFiltro = document.getElementById('filter-mese')?.value || '';
        const daFiltro = document.getElementById('filter-da')?.value || '';
        const aFiltro = document.getElementById('filter-a')?.value || '';
        const cittaFiltro = document.getElementById('filter-citta')?.value.toLowerCase().trim() || '';
        const provFiltro = document.getElementById('filter-provincia')?.value.toLowerCase().trim() || '';
        const regFiltro = document.getElementById('filter-regione')?.value.toLowerCase().trim() || '';

        return eventi.filter(evento => {
            const nomeEv = (evento.nome_rilevato || evento.nome || '').toLowerCase().trim();
            const cittaEv = (evento.citta || '').toLowerCase().trim();
            const provEv = (evento.provincia || '').toLowerCase().trim();
            const regEv = (evento.regione || '').toLowerCase().trim();
            const inizioStd = evento.data_inizio_grezza;
            const fineStd = evento.data_fine_grezza || inizioStd;

            if (testoQuery && !nomeEv.includes(testoQuery) && !cittaEv.includes(testoQuery) && !provEv.includes(testoQuery)) return false;
            if (meseFiltro && !evento.intervalliDate.some(i => i.inizio.startsWith(meseFiltro) || i.fine.startsWith(meseFiltro))) return false;
            if (daFiltro && fineStd < daFiltro) return false;
            if (aFiltro && inizioStd > aFiltro) return false;
            if (cittaFiltro && !cittaEv.includes(cittaFiltro)) return false;
            if (provFiltro && !provEv.includes(provFiltro)) return false;
            if (regFiltro && !regEv.includes(regFiltro)) return false;

            return true;
        });
    }

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
        if (counterSpan) counterSpan.textContent = validi.length;

        if (containerEventi) {
            containerEventi.innerHTML = validi.length > 0
                ? validi.map(e => creaCardEvento(e, false)).join('')
                : '<p style="padding: 20px; text-align: center; color: #666;">Nessun evento disponibile con i filtri selezionati.</p>';
        }
    }

    function eseguiFiltroERender() {
        renderizzaEventi(filtraEventiCategoria(eventiTotali));
    }

    if (eventiTotali.length > 0) renderizzaEventi(eventiTotali);

    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-order-select');
    if (searchInput) searchInput.addEventListener('input', eseguiFiltroERender);
    if (sortSelect) sortSelect.addEventListener('change', eseguiFiltroERender);

    ['filter-citta', 'filter-provincia', 'filter-regione', 'filter-da', 'filter-a'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(el.type === 'date' ? 'change' : 'input', eseguiFiltroERender);
    });

    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (selectMese) selectMese.value = '';
            ['filter-citta', 'filter-provincia', 'filter-regione', 'filter-da', 'filter-a'].forEach(id => document.getElementById(id).value = '');
            const summaryEl = document.getElementById('date-summary-text');
            if (summaryEl) summaryEl.textContent = '📅 Date';
            initCustomCalendar();
            renderizzaEventi(eventiTotali);
        });
    }

    document.addEventListener('click', (e) => {
        const btnPreferito = e.target.closest('.btn-preferito-overlay');
        if (btnPreferito) {
            const idEvento = btnPreferito.getAttribute('data-id');
            if (idEvento) {
                let preferiti = JSON.parse(localStorage.getItem('festmap_preferiti') || '[]');
                preferiti = preferiti.includes(idEvento) ? preferiti.filter(id => id !== idEvento) : [...preferiti, idEvento];
                localStorage.setItem('festmap_preferiti', JSON.stringify(preferiti));
                eseguiFiltroERender();
            }
            return;
        }

        const btnDettaglio = e.target.closest('.btn-apri-dettaglio');
        if (btnDettaglio) {
            try {
                apriModaleDettagli(JSON.parse(decodeURIComponent(atob(btnDettaglio.getAttribute('data-evento-b64')))));
            } catch (err) {
                console.error("Errore nel parsing:", err);
            }
        }
    });
});