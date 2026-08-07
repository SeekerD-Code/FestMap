// ui-components.js

import { apriModaleDettagli } from './app.js';

// Funzione di supporto per la grafica (da YYYY-MM-DD a DD/MM/YYYY)
function formattaDataGrafica(dataStr) {
    if (!dataStr) return '';
    if (dataStr.includes('/')) return dataStr;
    const parti = dataStr.trim().split(/[-./\s]/);
    if (parti.length === 3 && parti[0].length === 4) {
        return `${parti[2]}/${parti[1]}/${parti[0]}`;
    }
    return dataStr;
}

export function creaCardEvento(evento, isPassato = false) {
    const classePassato = isPassato ? 'evento-passato' : '';
    const etichettaPassato = isPassato ? '<span class="badge-passato">Evento Passato</span>' : '';

    const preferiti = JSON.parse(localStorage.getItem('festmap_preferiti') || '[]');
    const eventoId = evento.id || evento.nome_rilevato;
    const isPreferito = preferiti.includes(eventoId);

    const cuoreClass = isPreferito ? 'preferito-attivo' : '';

    // Mappatura delle icone
    const categoriaEvento = (evento.categoria || '').toLowerCase().trim();

    let iconaCategoriaSrc = 'images/food.webp';

    if (categoriaEvento.includes('folk') || categoriaEvento.includes('tradizione')) {
        iconaCategoriaSrc = 'images/folk.webp';
    } else if (categoriaEvento.includes('comic') || categoriaEvento.includes('cosplay') || categoriaEvento.includes('fumetto')) {
        iconaCategoriaSrc = 'images/comics.webp';
    } else if (categoriaEvento.includes('wild') || categoriaEvento.includes('natura')) {
        iconaCategoriaSrc = 'images/wild.webp';
    } else if (categoriaEvento.includes('food') || categoriaEvento.includes('sagra') || categoriaEvento.includes('cibo')) {
        iconaCategoriaSrc = 'images/food.webp';
    }

    const iconaCategoriaHtml = `<img src="${iconaCategoriaSrc}" alt="categoria" class="card-category-badge-icon">`;

    // --- LOGICA PULIZIA E FORMATTAZIONE DATE NUMERICHE (GG/MM/AAAA) ---
    const pulisciDataIso = (dataStr) => {
        if (!dataStr) return '';
        return dataStr.split('T')[0];
    };

    const formattaInNumerico = (dataIso) => {
        const soloData = pulisciDataIso(dataIso);
        if (!soloData) return '';
        const [anno, mese, giorno] = soloData.split('-');
        if (!anno || !mese || !giorno) return soloData;
        return `${giorno}/${mese}/${anno}`;
    };

    let stringaDate = '';
    if (evento.intervalliDate && evento.intervalliDate.length > 0) {
        stringaDate = evento.intervalliDate.map(intervallo => {
            const inizioNum = formattaInNumerico(intervallo.inizio);
            const fineNum = formattaInNumerico(intervallo.fine);
            return (!fineNum || inizioNum === fineNum)
                ? inizioNum
                : `dal ${inizioNum} al ${fineNum}`;
        }).join('<br>');
    } else {
        const dataInizioFormatted = formattaInNumerico(evento.data_inizio_grezza || evento.data_inizio || evento.data);
        const dataFineFormatted = formattaInNumerico(evento.data_fine_grezza);

        stringaDate = (!dataFineFormatted || dataInizioFormatted === dataFineFormatted)
            ? dataInizioFormatted
            : `dal ${dataInizioFormatted} al ${dataFineFormatted}`;
    }

    const webpCuore = `
        <svg class="cuore-icon" viewBox="0 0 24 24" width="20" height="20">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
    `;

    return `
        <div class="card card-evento ${classePassato}" style="position: relative;">
            ${etichettaPassato}
            ${iconaCategoriaHtml}
            <div class="card-content-wrapper">
                <div class="card-img-container">
                    ${evento.locandina ? `<img src="${evento.locandina}" alt="${evento.nome_rilevato}" class="card-img">` : ''}
                </div>
                <button class="btn-preferito-overlay ${cuoreClass}" data-id="${eventoId}" title="Aggiungi ai preferiti">
                    ${webpCuore}
                </button>
                <div class="card-info-container">
                    <h5 class="card-title">${evento.nome_rilevato}</h5>
                    <p class="card-date">${stringaDate}</p>

                    ${evento.telefoni ? `<p class="card-phone" style="font-size: 0.85rem; color: #555; margin: 4px 0;">📞 ${evento.telefoni}</p>` : ''}

                    <div class="card-actions">
                        <button type="button" class="btn btn-secondary btn-apri-dettaglio" data-evento-b64='${btoa(encodeURIComponent(JSON.stringify(evento)))}'>
                            🔍 Dettagli
                        </button>
                        <button class="btn-map" onclick="
                            const isInEventi = window.location.pathname.includes('/eventi/');
                            const basePath = isInEventi ? '../index.html' : 'index.html';
                            window.location.href = basePath + '?lat=${evento.latitudine}&lng=${evento.longitudine}';
                        " title="Mostra sulla mappa">
                            🚩 Mappa
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function popolaMesiSelect(eventi) {
    const selectMese = document.getElementById('filter-mese');
    if (!selectMese) return;

    // Svuota le opzioni esistenti tenendo solo la prima di default
    selectMese.innerHTML = '<option value="">Tutti i mesi</option>';

    const mesiSet = new Set();

    eventi.forEach(ev => {
        // Sfrutta la data standard (YYYY-MM-DD) se presente, altrimenti ripiega sulla grezza o altre varianti
        const dataStandard = ev.data_inizio_standard || ev.data_inizio_grezza || ev.data_inizio || ev.data || '';

        if (dataStandard) {
            let annoMese = '';

            // Se è già nel formato YYYY-MM-DD (grazie al data-fetcher)
            if (/^\d{4}-\d{2}-\d{2}$/.test(dataStandard)) {
                annoMese = dataStandard.slice(0, 7);
            } else {
                // Tentativo di parsing se passa per il formato DD/MM/YYYY
                const parti = dataStandard.trim().split(/[-./\s]/);
                if (parti.length === 3 && parti[2].length === 4) {
                    annoMese = `${parti[2]}-${parti[1]}`;
                } else {
                    const dataObj = new Date(dataStandard);
                    if (!isNaN(dataObj.getTime())) {
                        annoMese = dataObj.toISOString().slice(0, 7);
                    }
                }
            }

            if (annoMese) {
                mesiSet.add(annoMese);
            }
        }
    });

    // Ordina i mesi cronologicamente
    const mesiOrdinati = Array.from(mesiSet).sort();

    mesiOrdinati.forEach(ym => {
        const [anno, meseNum] = ym.split('-');
        const dataObj = new Date(parseInt(anno), parseInt(meseNum) - 1, 1);
        const nomeMese = dataObj.toLocaleString('it-IT', { month: 'long', year: 'numeric' });
        // Capitalizza la prima lettera del mese
        const nomeMeseFormattato = nomeMese.charAt(0).toUpperCase() + nomeMese.slice(1);

        const option = document.createElement('option');
        option.value = ym;
        option.textContent = nomeMeseFormattato;
        selectMese.appendChild(option);
    });
}
let currentCalendarDate = new Date();
let selectedStartDate = null;
let selectedEndDate = null;

export function initCustomCalendar() {
    const gridEl = document.getElementById('calendar-days-grid');
    const titleEl = document.getElementById('calendar-month-title');
    const summaryEl = document.getElementById('date-summary-text');
    const inputDa = document.getElementById('filter-da');
    const inputA = document.getElementById('filter-a');

    if (!gridEl) return;

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    // Titolo Mese Anno
    const nomiMesi = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    titleEl.textContent = `${nomiMesi[month]} ${year}`;

    gridEl.innerHTML = '';

    // Primo giorno del mese e totale giorni
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Lunedì = 0
    const totalDays = new Date(year, month + 1, 0).getDate();
    const oggiStr = new Date().toISOString().split('T')[0];

    // Spazi vuoti per i giorni del mese precedente
    for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement('div');
        gridEl.appendChild(emptyCell);
    }

    // Riempimento giorni del mese
    for (let day = 1; day <= totalDays; day++) {
        const dayCell = document.createElement('div');
        const formattedMonth = String(month + 1).padStart(2, '0');
        const formattedDay = String(day).padStart(2, '0');
        const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

        dayCell.textContent = day;
        dayCell.style.padding = '6px 0';
        dayCell.style.cursor = 'pointer';
        dayCell.style.borderRadius = '4px';
        dayCell.style.fontSize = '0.85rem';

        // Evidenziazione selezioni
        if (dateStr === selectedStartDate || dateStr === selectedEndDate) {
            dayCell.style.backgroundColor = '#007bff';
            dayCell.style.color = '#fff';
            dayCell.style.fontWeight = 'bold';
        } else if (selectedStartDate && selectedEndDate && dateStr > selectedStartDate && dateStr < selectedEndDate) {
            dayCell.style.backgroundColor = '#e7f1ff';
            dayCell.style.color = '#007bff';
        } else {
            dayCell.style.color = '#333';
            dayCell.addEventListener('mouseenter', () => dayCell.style.backgroundColor = '#f1f2f6');
            dayCell.addEventListener('mouseleave', () => dayCell.style.backgroundColor = 'transparent');
        }

        // Click sul giorno
        dayCell.addEventListener('click', (e) => {
            e.stopPropagation(); // Evita la chiusura del details se non desiderata

            if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
                selectedStartDate = dateStr;
                selectedEndDate = null;
            } else if (selectedStartDate && !selectedEndDate) {
                if (dateStr < selectedStartDate) {
                    selectedStartDate = dateStr;
                } else {
                    selectedEndDate = dateStr;
                }
            }

            // Aggiorna gli input nascosti
            inputDa.value = selectedStartDate || '';
            inputA.value = selectedEndDate || selectedStartDate || '';

            // Aggiorna etichetta sul bottone principale
            if (selectedStartDate && selectedEndDate) {
                summaryEl.textContent = `📅 ${selectedStartDate.split('-').reverse().join('/')} ➔ ${selectedEndDate.split('-').reverse().join('/')}`;
            } else if (selectedStartDate) {
                summaryEl.textContent = `📅 Dal ${selectedStartDate.split('-').reverse().join('/')}`;
            } else {
                summaryEl.textContent = `📅 Date`;
            }

            initCustomCalendar();
            applicaFiltriMappa();
        });

        gridEl.appendChild(dayCell);
    }
}