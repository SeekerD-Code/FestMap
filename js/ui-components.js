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

    // --- LOGICA PULIZIA E FORMATTAZIONE DATE ---
    const pulisciDataIso = (dataStr) => {
        if (!dataStr) return '';
        return dataStr.split('T')[0];
    };

    const formattaInItaliano = (dataIso) => {
        const soloData = pulisciDataIso(dataIso);
        if (!soloData) return '';
        const [anno, mese, giorno] = soloData.split('-');
        if (!anno || !mese || !giorno) return soloData;

        const dataObj = new Date(anno, mese - 1, giorno);
        return dataObj.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const dataInizioFormatted = formattaInItaliano(evento.data_inizio_grezza || evento.data_inizio || evento.data);
    const dataFineFormatted = formattaInItaliano(evento.data_fine_grezza);

    // Mette la data di fine a capo con un trattino o un separatore pulito
    const stringaDate = (!dataFineFormatted || dataInizioFormatted === dataFineFormatted)
        ? dataInizioFormatted
        : `${dataInizioFormatted}<br><span class="date-separator">➔ </span> ${dataFineFormatted}`;

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
                    <div class="card-actions">
                        <button type="button" class="btn btn-secondary btn-apri-dettaglio" data-evento-b64='${btoa(encodeURIComponent(JSON.stringify(evento)))}'>
                            🔍 Dettagli
                        </button>
                        <button class="btn-map" onclick="window.location.href='map.html?lat=${evento.latitudine}&lng=${evento.longitudine}'" title="Mostra sulla mappa">
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