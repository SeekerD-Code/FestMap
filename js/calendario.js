import { fetchEventi } from './data-fetcher.js';
import { aggiornaContatoreEventi } from './header-component.js';
import { apriModaleDettagli } from './app.js';

let tuttiGliEventiCache = [];
let dataCorrenteVisualizzata = new Date();

document.addEventListener('DOMContentLoaded', async () => {
    const eventiGrezzi = await fetchEventi();

    // Raggruppiamo gli eventi con lo stesso nome per unire le date multiple (es. weekend separati)
    const mappaEventiAccorpati = {};

    eventiGrezzi.forEach(e => {
        const nome = (e.nome_rilevato || e.nome || 'Evento').trim();
        const inizioNorm = normalizzaData(e.data_inizio_grezza || e.data_inizio || e.data);
        const fineNorm = normalizzaData(e.data_fine_grezza || e.data_fine) || inizioNorm;

        if (!mappaEventiAccorpati[nome]) {
            mappaEventiAccorpati[nome] = {
                ...e,
                intervalliDate: []
            };
        }
        if (inizioNorm) {
            mappaEventiAccorpati[nome].intervalliDate.push({ inizio: inizioNorm, fine: fineNorm });
        }
    });

    // Trasformiamo la mappa in array e ordiniamo/rimuoviamo i duplicati degli intervalli
    tuttiGliEventiCache = Object.values(mappaEventiAccorpati).map(e => {
        // Ordina gli intervalli cronologicamente
        e.intervalliDate.sort((a, b) => a.inizio.localeCompare(b.inizio));

        // Data di inizio e fine principale (la prima e l'ultima globale)
        const primoIntervallo = e.intervalliDate[0] || { inizio: '', fine: '' };
        const ultimoIntervallo = e.intervalliDate[e.intervalliDate.length - 1] || primoIntervallo;

        return {
            ...e,
            data_inizio_grezza: primoIntervallo.inizio,
            data_fine_grezza: ultimoIntervallo.fine,
            locandina: (e.locandina && e.locandina.trim() !== '') ? e.locandina : 'images/cosplayersitaliani.webp'
        };
    });

    popolaDropdownCategorie();
    renderizzaCalendario();

    document.getElementById('filter-testo').addEventListener('input', renderizzaCalendario);
    document.getElementById('filter-categoria').addEventListener('change', renderizzaCalendario);
    document.getElementById('filter-citta').addEventListener('input', renderizzaCalendario);
    document.getElementById('filter-provincia').addEventListener('input', renderizzaCalendario);
    document.getElementById('filter-regione').addEventListener('input', renderizzaCalendario);

    // Gestione navigazione Anni (i pulsanti nel tuo HTML mantengono gli ID originali)
    document.getElementById('prev-month-btn').addEventListener('click', () => {
        dataCorrenteVisualizzata.setFullYear(dataCorrenteVisualizzata.getFullYear() - 1);
        renderizzaCalendario();
    });

    document.getElementById('next-month-btn').addEventListener('click', () => {
        dataCorrenteVisualizzata.setFullYear(dataCorrenteVisualizzata.getFullYear() + 1);
        renderizzaCalendario();
    });
});

function normalizzaData(dataStr) {
    if (!dataStr) return '';

    // Se è un oggetto Date o una stringa ISO con orario (es. 2026-10-01T22:00:00.000Z o simile)
    if (typeof dataStr === 'string' && dataStr.includes('T')) {
        dataStr = dataStr.split('T')[0]; // Prende solo la parte YYYY-MM-DD
    }

    // Se è nel formato italiano DD/MM/YYYY
    if (dataStr.includes('/')) {
        const parti = dataStr.split('/');
        if (parti.length === 3) {
            return `${parti[2]}-${parti[1]}-${parti[0]}`;
        }
    }

    // Se è già nel formato YYYY-MM-DD
    return dataStr;
}

// Funzione sicura per creare oggetti Date locali da stringhe YYYY-MM-DD evitando lo shift UTC
function creaDataLocale(dataStr) {
    const [y, m, d] = dataStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function popolaDropdownCategorie() {
    const selectCat = document.getElementById('filter-categoria');
    if (!selectCat) return;

    const categorieUniche = new Set();
    tuttiGliEventiCache.forEach(e => {
        const cat = (e.categoria || e.tipo || '').trim();
        if (cat) categorieUniche.add(cat);
    });

    categorieUniche.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        selectCat.appendChild(opt);
    });
}

function renderizzaCalendario() {
    const gridBody = document.getElementById('calendar-grid-body');
    const titleEl = document.getElementById('current-month-title');
    if (!gridBody) return;

    gridBody.innerHTML = '';

    const annoCorrente = dataCorrenteVisualizzata.getFullYear();
    if (titleEl) {
        titleEl.textContent = `${annoCorrente}`;
    }

    const container = document.createElement('div');
    container.className = 'matrix-container';

    const grid = document.createElement('div');
    grid.className = 'matrix-grid';

    const nomiMesi = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    const oggiStr = new Date().toISOString().split('T')[0];

    const eventiPerData = {};

    const testoFiltro = document.getElementById('filter-testo').value.toLowerCase().trim();
    const catFiltro = document.getElementById('filter-categoria').value.toLowerCase();
    const cittaFiltro = document.getElementById('filter-citta').value.toLowerCase().trim();
    const provFiltro = document.getElementById('filter-provincia').value.toLowerCase().trim();
    const regFiltro = document.getElementById('filter-regione').value.toLowerCase().trim();

    const eventiFiltrati = tuttiGliEventiCache.filter(e => {
        const nomeEv = (e.nome_rilevato || e.nome || '').toLowerCase();
        const catEv = (e.categoria || e.tipo || '').toLowerCase();
        const cittaEv = (e.citta || e.luogo || '').toLowerCase();
        const provEv = (e.provincia || '').toLowerCase();
        const regEv = (e.regione || '').toLowerCase();

        if (testoFiltro && !nomeEv.includes(testoFiltro)) return false;
        if (catFiltro && !catEv.includes(catFiltro)) return false;
        if (cittaFiltro && !cittaEv.includes(cittaFiltro)) return false;
        if (provFiltro && !provEv.includes(provFiltro)) return false;
        if (regFiltro && !regEv.includes(regFiltro.toLowerCase())) return false;
        return true;
    });

    if (typeof aggiornaContatoreEventi === 'function') {
        aggiornaContatoreEventi(eventiFiltrati.length);
    }

    eventiFiltrati.forEach(ev => {
        if (ev.intervalliDate && ev.intervalliDate.length > 0) {
            ev.intervalliDate.forEach(int => {
                let curr = creaDataLocale(int.inizio);
                let end = creaDataLocale(int.fine);

                while (curr <= end) {
                    const y = curr.getFullYear();
                    if (y === annoCorrente) {
                        const m = String(curr.getMonth() + 1).padStart(2, '0');
                        const d = String(curr.getDate()).padStart(2, '0');
                        const dataKey = `${y}-${m}-${d}`;
                        if (!eventiPerData[dataKey]) eventiPerData[dataKey] = [];
                        eventiPerData[dataKey].push(ev);
                    }
                    curr.setDate(curr.getDate() + 1);
                }
            });
        }
    });

    const mappaColoriCat = {
        'food': '#de0606ba',
        'comics': '#4a67fa',
        'folk': '#2b9348',
        'wild': '#9b2af1'
    };
    const coloreDefault = '#4361ee';

    const isMobile = window.innerWidth <= 767;

    if (isMobile) {
        // --- STRUTTURA MOBILE: Mesi in alto (colonne) e Giorni a sinistra (righe) ---
        const corner = document.createElement('div');
        corner.className = 'matrix-header-cell matrix-corner-empty';
        corner.textContent = '';
        grid.appendChild(corner);

        nomiMesi.forEach(nomeMese => {
            const mHeader = document.createElement('div');
            mHeader.className = 'matrix-month-label';
            mHeader.textContent = nomeMese;
            grid.appendChild(mHeader);
        });

        for (let d = 1; d <= 31; d++) {
            const dLabel = document.createElement('div');
            dLabel.className = 'matrix-header-cell';
            dLabel.textContent = d;
            grid.appendChild(dLabel);

            nomiMesi.forEach((nomeMese, meseIndex) => {
                const meseNum = meseIndex + 1;
                const ultimoGiorno = new Date(annoCorrente, meseNum, 0).getDate();
                const dayCell = document.createElement('div');
                dayCell.className = 'matrix-day-cell';

                if (d > ultimoGiorno) {
                    dayCell.classList.add('invalid');
                } else {
                    const mStr = String(meseNum).padStart(2, '0');
                    const dStr = String(d).padStart(2, '0');
                    const dataStr = `${annoCorrente}-${mStr}-${dStr}`;

                    if (dataStr === oggiStr) {
                        dayCell.classList.add('today');
                    }

                    const eventiNelGiorno = eventiPerData[dataStr];
                    if (eventiNelGiorno && eventiNelGiorno.length > 0) {
                        dayCell.classList.add('has-events');
                        dayCell.textContent = eventiNelGiorno.length;

                        const conteggioCat = {};
                        eventiNelGiorno.forEach(ev => {
                            const catKey = (ev.categoria || ev.tipo || 'altro').toLowerCase().trim();
                            let trovatoColore = coloreDefault;
                            for (const key in mappaColoriCat) {
                                if (catKey.includes(key)) {
                                    trovatoColore = mappaColoriCat[key];
                                    break;
                                }
                            }
                            conteggioCat[trovatoColore] = (conteggioCat[trovatoColore] || 0) + 1;
                        });

                        const totale = eventiNelGiorno.length;
                        let gradienteStops = [];
                        let percentualeAcculata = 0;

                        for (const [colore, quantita] of Object.entries(conteggioCat)) {
                            const percentuale = (quantita / totale) * 100;
                            const inizio = percentualeAcculata;
                            percentualeAcculata += percentuale;
                            gradienteStops.push(`${colore} ${inizio}%`, `${colore} ${percentualeAcculata}%`);
                        }

                        if (gradienteStops.length > 0) {
                            dayCell.style.background = `linear-gradient(135deg, ${gradienteStops.join(', ')})`;
                        }

                        dayCell.addEventListener('click', () => {
                            apriPopupGiorno(dataStr, eventiNelGiorno);
                        });
                    }
                }
                grid.appendChild(dayCell);
            });
        }
    } else {
        // --- STRUTTURA DESKTOP ORIGINALE: Giorni in alto (colonne) e Mesi a sinistra (righe) ---
        const corner = document.createElement('div');
        corner.className = 'matrix-header-cell matrix-corner-empty';
        corner.textContent = '';
        grid.appendChild(corner);

        for (let d = 1; d <= 31; d++) {
            const hCell = document.createElement('div');
            hCell.className = 'matrix-header-cell';
            hCell.textContent = d;
            grid.appendChild(hCell);
        }

        nomiMesi.forEach((nomeMese, meseIndex) => {
            const meseNum = meseIndex + 1;
            const ultimoGiorno = new Date(annoCorrente, meseNum, 0).getDate();

            const rowLabel = document.createElement('div');
            rowLabel.className = 'matrix-month-label';
            rowLabel.textContent = nomeMese;
            grid.appendChild(rowLabel);

            for (let d = 1; d <= 31; d++) {
                const dayCell = document.createElement('div');
                dayCell.className = 'matrix-day-cell';

                if (d > ultimoGiorno) {
                    dayCell.classList.add('invalid');
                } else {
                    const mStr = String(meseNum).padStart(2, '0');
                    const dStr = String(d).padStart(2, '0');
                    const dataStr = `${annoCorrente}-${mStr}-${dStr}`;

                    if (dataStr === oggiStr) {
                        dayCell.classList.add('today');
                    }

                    const eventiNelGiorno = eventiPerData[dataStr];
                    if (eventiNelGiorno && eventiNelGiorno.length > 0) {
                        dayCell.classList.add('has-events');
                        dayCell.textContent = eventiNelGiorno.length;

                        const conteggioCat = {};
                        eventiNelGiorno.forEach(ev => {
                            const catKey = (ev.categoria || ev.tipo || 'altro').toLowerCase().trim();
                            let trovatoColore = coloreDefault;
                            for (const key in mappaColoriCat) {
                                if (catKey.includes(key)) {
                                    trovatoColore = mappaColoriCat[key];
                                    break;
                                }
                            }
                            conteggioCat[trovatoColore] = (conteggioCat[trovatoColore] || 0) + 1;
                        });

                        const totale = eventiNelGiorno.length;
                        let gradienteStops = [];
                        let percentualeAcculata = 0;

                        for (const [colore, quantita] of Object.entries(conteggioCat)) {
                            const percentuale = (quantita / totale) * 100;
                            const inizio = percentualeAcculata;
                            percentualeAcculata += percentuale;
                            gradienteStops.push(`${colore} ${inizio}%`, `${colore} ${percentualeAcculata}%`);
                        }

                        if (gradienteStops.length > 0) {
                            dayCell.style.background = `linear-gradient(135deg, ${gradienteStops.join(', ')})`;
                        }

                        dayCell.addEventListener('click', () => {
                            apriPopupGiorno(dataStr, eventiNelGiorno);
                        });
                    }
                }
                grid.appendChild(dayCell);
            }
        });
    }

    container.appendChild(grid);
    gridBody.appendChild(container);
}

// Funzione per gestire il popup degli eventi giornalieri suddiviso a colonne per categoria
function apriPopupGiorno(dataStr, eventi) {
    let modalOverlay = document.getElementById('matrix-day-modal');
    if (!modalOverlay) {
        modalOverlay = document.createElement('div');
        modalOverlay.id = 'matrix-day-modal';
        modalOverlay.className = 'matrix-modal-overlay';
        modalOverlay.innerHTML = `
            <div class="matrix-modal-content">
                <div class="matrix-modal-header">
                    <h3 id="matrix-modal-title">Eventi del giorno</h3>
                    <button class="matrix-modal-close" onclick="chiudiPopupGiorno()">✕</button>
                </div>
                <div class="matrix-modal-body" id="matrix-modal-list"></div>
            </div>
        `;
        document.body.appendChild(modalOverlay);

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) chiudiPopupGiorno();
        });
    }

    const [y, m, d] = dataStr.split('-');
    const dataFormattata = `${d}/${m}/${y}`;
    document.getElementById('matrix-modal-title').textContent = `Eventi del ${dataFormattata} (${eventi.length})`;

    const listaContainer = document.getElementById('matrix-modal-list');
    listaContainer.innerHTML = '';

    // Definiamo le categorie supportate per le colonne
    const categorieDefinizioni = [
        { key: 'food', label: 'Food', icon: 'images/food.webp', cssClass: 'cat-food' },
        { key: 'comics', label: 'Comics', icon: 'images/comics.webp', cssClass: 'cat-comics' },
        { key: 'folk', label: 'Folk', icon: 'images/folk.webp', cssClass: 'cat-folk' },
        { key: 'wild', label: 'Wild', icon: 'images/wild.webp', cssClass: 'cat-wild' }
    ];

    // Contenitore principale a griglia per le colonne
    const columnsContainer = document.createElement('div');
    columnsContainer.className = 'matrix-modal-columns-container';

    categorieDefinizioni.forEach(cat => {
        // Filtriamo gli eventi del giorno appartenenti a questa categoria
        const eventiCategoria = eventi.filter(ev => {
            const catLower = (ev.categoria || ev.tipo || '').toLowerCase().trim();
            return catLower.includes(cat.key);
        });

        // Creiamo la colonna
        const column = document.createElement('div');
        column.className = 'matrix-category-column';

        // Intestazione colonna con icona e badge della categoria
        const header = document.createElement('div');
        header.className = `matrix-column-header ${cat.cssClass}`;
        header.style.padding = "6px 10px";
        header.style.borderRadius = "6px";
        header.innerHTML = `<img src="${cat.icon}" alt="${cat.label}"> ${cat.label} (${eventiCategoria.length})`;
        column.appendChild(header);

        if (eventiCategoria.length > 0) {
            eventiCategoria.forEach(ev => {
                const nome = ev.nome_rilevato || ev.nome || 'Evento';
                const luogo = ev.luogo || ev.citta || 'Luogo non specificato';

                let htmlDate = '';
                if (ev.intervalliDate && ev.intervalliDate.length > 0) {
                    const intervalliOrdinati = [...ev.intervalliDate].sort((a, b) => new Date(a.inizio) - new Date(b.inizio));

                    intervalliOrdinati.forEach(int => {
                        const iFormatted = int.inizio.split('-').reverse().join('/');
                        const fFormatted = int.fine.split('-').reverse().join('/');
                        const stringaIntervallo = (iFormatted === fFormatted) ? iFormatted : `Dal ${iFormatted} al ${fFormatted}`;
                        htmlDate += `<div style="font-size: 0.85rem; color: #1a202c; margin: 2px 0; font-weight: bold; background-color: #f8eeb9; padding: 2px 5px; border-radius: 4px; display: inline-block;">📅 ${stringaIntervallo}</div>`;
                    });
                }

                const card = document.createElement('div');
                card.className = 'matrix-event-card-item';
                card.innerHTML = `
                    <div class="matrix-event-title" style="font-size: 1.1rem;">${nome}</div>
                    <div style="margin: 2px 0;">${htmlDate}</div>
                    <div class="matrix-event-details" style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
                        <span>📍 ${luogo}</span>
                        <button class="btn-mappa-tooltip" title="mostra sulla mappa" onclick="event.stopPropagation(); window.location.href='map.html?lat=${ev.latitudine}&lng=${ev.longitudine}'">
                            🌍
                        </button>
                    </div>
                `;

                card.addEventListener('click', () => {
                    chiudiPopupGiorno();
                    if (typeof mostraModaleDettaglioEvento === 'function') {
                        mostraModaleDettaglioEvento(ev);
                    }
                });

                column.appendChild(card);
            });
        } else {
            const emptyMsg = document.createElement('div');
            emptyMsg.style.fontSize = '0.8rem';
            emptyMsg.style.color = 'rgba(255,255,255,0.3)';
            emptyMsg.style.fontStyle = 'italic';
            emptyMsg.style.padding = '6px';
            emptyMsg.textContent = 'Nessun evento';
            column.appendChild(emptyMsg);
        }

        columnsContainer.appendChild(column);
    });

    listaContainer.appendChild(columnsContainer);
    modalOverlay.style.display = 'flex';
}

function chiudiPopupGiorno() {
    const modalOverlay = document.getElementById('matrix-day-modal');
    if (modalOverlay) {
        modalOverlay.style.display = 'none';
    }
}
window.chiudiPopupGiorno = chiudiPopupGiorno;

function mostraModaleDettaglioEvento(ev) {
    const vecchioModale = document.getElementById('modal-dettaglio-evento');
    if (vecchioModale) vecchioModale.remove();

    const titolo = ev.nome_rilevato || ev.nome || 'Evento';
    const luogo = ev.luogo || 'Luogo non specificato';
    const locandina = ev.locandina || 'images/cosplayersitaliani.webp';
    const inizioFormatted = ev.data_inizio_grezza ? ev.data_inizio_grezza.replace(/-/g, '') : '';
    const fineFormatted = (ev.data_fine_grezza ? ev.data_fine_grezza : ev.data_inizio_grezza).replace(/-/g, '');

    const urlGCal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(titolo)}&dates=${inizioFormatted}/${fineFormatted}&location=${encodeURIComponent(luogo)}&details=${encodeURIComponent('Evento gestito tramite FestMap')}`;

    let dateFormattateTestoModal = '';
    if (ev.intervalliDate && ev.intervalliDate.length > 0) {
        dateFormattateTestoModal = ev.intervalliDate.map(int => {
            const iFormatted = int.inizio.split('-').reverse().join('/');
            const fFormatted = int.fine.split('-').reverse().join('/');
            return iFormatted === fFormatted ? iFormatted : `Dal ${iFormatted} al ${fFormatted}`;
        }).join(' <br> ');
    } else {
        dateFormattateTestoModal = `Dal ${ev.data_inizio_grezza} al ${ev.data_fine_grezza || ev.data_inizio_grezza}`;
    }

    const modalHTML = `
        <div id="modal-dettaglio-evento" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(5px);">
            <div style="background: rgba(20, 15, 35, 0.95); border: 1px solid rgba(255,255,255,0.15); padding: 25px; border-radius: 16px; max-width: 400px; width: 90%; text-align: center; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.5); color: #fff;">
                <button id="chiudi-modale" style="position: absolute; top: 12px; right: 12px; border: none; background: none; font-size: 1.2rem; cursor: pointer; color: #fff;">✕</button>
                <img src="${locandina}" alt="Locandina" style="width: 90px; height: 90px; object-fit: cover; border-radius: 50%; margin-bottom: 12px; border: 2px solid #ff416c;">
                <h3 style="margin: 10px 0; color: #fff; font-size: 1.2rem;">${titolo}</h3>
                <p style="font-size: 0.9rem; color: #bbb; margin-bottom: 15px;">📍 ${luogo}</p>
                <p style="font-size: 0.85rem; margin-bottom: 20px; color: #ddd;">📅 ${dateFormattateTestoModal}</p>

                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <a href="${urlGCal}" target="_blank" style="display: inline-block; padding: 10px 16px; background: linear-gradient(135deg, #4285F4, #34A853); color: white; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 0.9rem;">
                        📅 Google Calendar
                    </a>
                    <button id="btn-apri-dettagli-modale" style="padding: 10px 16px; background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 0.9rem;">
                        🔍 Dettagli
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('chiudi-modale').addEventListener('click', () => {
        document.getElementById('modal-dettaglio-evento').remove();
    });

    document.getElementById('btn-apri-dettagli-modale').addEventListener('click', () => {
        if (typeof apriModaleDettagli === 'function') {
            apriModaleDettagli(ev);
        } else {
            console.warn("La funzione globale dei dettagli (apriModaleDettagli) non è definita.");
        }
    });
}