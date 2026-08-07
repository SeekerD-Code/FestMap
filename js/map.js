import { fetchEventi } from './data-fetcher.js';
import { apriModaleDettagli } from './app.js';

let tuttiGliEventiCache = [];
//let markerLayerGroup = L.layerGroup();
let markerLayerGroup = L.markerClusterGroup({
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false
});

// Inizializzazione Mappa Leaflet
const map = L.map('map', { zoomControl: false }).setView([41.8719, 12.5674], 6);
L.control.zoom({ position: 'bottomright' }).addTo(map);

// Tile layer pulito e minimale (mette in risalto i pin e l'Italia)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

// --- AGGIUNGI QUI IL TRACCIAMENTO DEI CONFINI ITALIANI ---
fetch('https://raw.githubusercontent.com/opengeohub/spatial-tiler/main/data/italy_boundary.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            style: {
                color: '#4A148C',      // Colore del bordo (usa il tuo viola tematico)
                weight: 2,             // Spessore del bordo
                opacity: 0.8,
                fillColor: '#000000',
                fillOpacity: 0.02      // Un velo leggerissimo all'interno
            }
        }).addTo(map);
    })
    .catch(err => console.log("Confini caricati offline o errore di rete", err));

markerLayerGroup.addTo(map);

function normalizzaData(dataStr) {
    if (!dataStr) return '';
    if (typeof dataStr === 'string' && dataStr.includes('T')) {
        dataStr = dataStr.split('T')[0];
    }
    if (dataStr.includes('/')) {
        const parti = dataStr.split('/');
        if (parti.length === 3) {
            return `${parti[2]}-${parti[1]}-${parti[0]}`;
        }
    }
    return dataStr;
}

function getPngCategoria(categoria) {
    const cat = (categoria || '').toLowerCase().trim();
    if (cat.includes('folk') || cat.includes('tradizione')) return "images/folk.webp";
    if (cat.includes('comic') || cat.includes('cosplay') || cat.includes('fumetto')) return "images/comics.webp";
    if (cat.includes('wild') || cat.includes('natura')) return "images/wild.webp";
    if (cat.includes('food') || cat.includes('sagra') || cat.includes('cibo')) return "images/food.webp";
    return "images/food.webp";
}

document.addEventListener('DOMContentLoaded', async () => {
    const eventiGrezzi = await fetchEventi();

    const mappaEventiAccorpati = {};
    if (eventiGrezzi) {
        eventiGrezzi.forEach(e => {
            const nome = (e.nome_rilevato || e.nome || 'Evento').trim();
            // Usiamo anche le coordinate o il luogo come chiave per raggruppare eventi nello stesso posto ma con date multiple
            const luogoKey = (e.citta || e.luogo || '').trim().toLowerCase();
            const latKey = e.latitudine ? parseFloat(e.latitudine).toFixed(3) : '0';
            const lngKey = e.longitudine ? parseFloat(e.longitudine).toFixed(3) : '0';
            const chiaveUnica = `${nome}_${latKey}_${lngKey}`;

            const inizioNorm = normalizzaData(e.data_inizio_grezza || e.data_inizio || e.data);
            const fineNorm = normalizzaData(e.data_fine_grezza || e.data_fine) || inizioNorm;

            if (!mappaEventiAccorpati[chiaveUnica]) {
                mappaEventiAccorpati[chiaveUnica] = { ...e, intervalliDate: [] };
            }
            if (inizioNorm) {
                mappaEventiAccorpati[chiaveUnica].intervalliDate.push({ inizio: inizioNorm, fine: fineNorm });
            }
        });
    }

    tuttiGliEventiCache = Object.values(mappaEventiAccorpati).map(e => {
        // Ordina gli intervalli cronologicamente
        e.intervalliDate.sort((a, b) => a.inizio.localeCompare(b.inizio));

        // Unifichiamo o filtriamo gli intervalli se sono troppo distanti (es. max 2 mesi / 60 giorni)
        const intervalliFiltratiUniti = [];
        e.intervalliDate.forEach(curr => {
            if (intervalliFiltratiUniti.length === 0) {
                intervalliFiltratiUniti.push({ ...curr });
            } else {
                const ultimo = intervalliFiltratiUniti[intervalliFiltratiUniti.length - 1];

                // Calcola la differenza in giorni tra la fine dell'ultimo intervallo e l'inizio del corrente
                const dataFineUltimo = new Date(ultimo.fine);
                const dataInizioCurr = new Date(curr.inizio);
                const diffTime = dataInizioCurr - dataFineUltimo;
                const diffDays = diffTime / (1000 * 60 * 60 * 24);

                // Se la distanza è minore o uguale a 60 giorni (circa 2 mesi), fondiamo o teniamo separati?
                // Visto che vuoi vederli separati (es. 28-30 ago e 4-6 set), li teniamo come elementi distinti
                // ma evitiamo duplicati esatti. Se invece vuoi unirli solo se vicinissimi, gestiamo qui.
                // Li inseriamo direttamente nell'array se non sono un duplicato esatto.
                const esisteGia = intervalliFiltratiUniti.some(item => item.inizio === curr.inizio && item.fine === curr.fine);
                if (!esisteGia) {
                    intervalliFiltratiUniti.push({ ...curr });
                }
            }
        });

        e.intervalliDate = intervalliFiltratiUniti;

        const primoIntervallo = e.intervalliDate[0] || { inizio: '', fine: '' };
        const ultimoIntervallo = e.intervalliDate[e.intervalliDate.length - 1] || primoIntervallo;

        return {
            ...e,
            data_inizio_grezza: primoIntervallo.inizio,
            data_fine_grezza: ultimoIntervallo.fine
        };
    });

    applicaFiltriMappa();

    // Sincronizzazione delle checkbox delle categorie
    const categoryCheckboxes = document.querySelectorAll('input[name="categoria"]');
    categoryCheckboxes.forEach(chk => {
        chk.addEventListener('change', () => {
            applicaFiltriMappa();
        });
    });

    // Ascoltatori automatici per tutti i filtri permanenti (inclusi testo, luoghi e date)
    const idsFiltri = ['search-input', 'filter-citta', 'filter-provincia', 'filter-regione', 'filter-da', 'filter-a'];
    idsFiltri.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const eventoAscolto = el.tagName === 'SELECT' || el.type === 'date' ? 'change' : 'input';
            el.addEventListener(eventoAscolto, () => applicaFiltriMappa());
        }
    });

    // Pulsante Reset Completo
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            const testoEl = document.getElementById('search-input') || document.getElementById('filter-testo');
            const cittaEl = document.getElementById('filter-citta');
            const provEl = document.getElementById('filter-provincia');
            const regEl = document.getElementById('filter-regione');
            const daEl = document.getElementById('filter-da');
            const aEl = document.getElementById('filter-a');

            if (testoEl) testoEl.value = '';
            if (cittaEl) cittaEl.value = '';
            if (provEl) provEl.value = '';
            if (regEl) regEl.value = '';
            if (daEl) daEl.value = '';
            if (aEl) aEl.value = '';

            categoryCheckboxes.forEach(chk => chk.checked = true);

            applicaFiltriMappa();
        });
    }

    // --- GESTIONE APERTURA / CHIUSURA TENDINA FILTRI MOBILE ---
    const mobileFilterToggle = document.getElementById('mobile-filter-toggle');
    const filtersContainer = document.getElementById('filters-container');

    if (mobileFilterToggle && filtersContainer) {
        mobileFilterToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            filtersContainer.classList.toggle('mobile-filters-open');
            const isOpen = filtersContainer.classList.contains('mobile-filters-open');
            mobileFilterToggle.setAttribute('aria-expanded', isOpen);
        });

        // Chiude la tendina se si clicca fuori
        document.addEventListener('click', (e) => {
            if (!filtersContainer.contains(e.target) && e.target !== mobileFilterToggle) {
                filtersContainer.classList.remove('mobile-filters-open');
                mobileFilterToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }
});

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

function applicaFiltriMappa() {
    const searchInput = document.getElementById('search-input');
    const testoFiltro = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const cittaFiltro = document.getElementById('filter-citta')?.value.toLowerCase().trim() || '';
    const provFiltro = document.getElementById('filter-provincia')?.value.toLowerCase().trim() || '';
    const regFiltro = document.getElementById('filter-regione')?.value.toLowerCase().trim() || '';

    // Acquisizione date dal range (Da - A)
    const daFiltro = document.getElementById('filter-da')?.value || '';
    const aFiltro = document.getElementById('filter-a')?.value || '';

    // Acquisizione categorie spuntate dalle checkbox
    const categoryCheckboxes = document.querySelectorAll('input[name="categoria"]');
    const categorieSelezionate = Array.from(categoryCheckboxes)
        .filter(c => c.checked)
        .map(c => c.value.toLowerCase());

    const oggiStr = new Date().toISOString().split('T')[0];

    const eventiFiltrati = tuttiGliEventiCache.filter(e => {
        const nomeEv = (e.nome_rilevato || e.nome || '').toLowerCase().trim();
        const catEv = (e.categoria || e.tipo || '').toLowerCase().trim();
        const cittaEv = (e.citta || e.luogo || '').toLowerCase().trim();
        const provEv = (e.provincia || '').toLowerCase().trim();
        const regEv = (e.regione || '').toLowerCase().trim();

        const inizioEvento = e.data_inizio_grezza || '';
        const fineEvento = e.data_fine_grezza || inizioEvento;

        // Escludi eventi passati
        if (!fineEvento || fineEvento < oggiStr) {
            return false;
        }

        // 1. Filtro Testuale (controlla nome, città e provincia)
        if (testoFiltro) {
            const matchNome = nomeEv.includes(testoFiltro);
            const matchCitta = cittaEv.includes(testoFiltro);
            const matchProv = provEv.includes(testoFiltro);
            if (!matchNome && !matchCitta && !matchProv) {
                return false;
            }
        }

        // 2. Filtro Categorie Multiple
        if (categoryCheckboxes.length > 0 && categorieSelezionate.length < categoryCheckboxes.length) {
            const matchCat = categorieSelezionate.some(cat => catEv.includes(cat));
            if (!matchCat) return false;
        }

        // 3. Filtro Date (Intervallo Da - A)
        if (daFiltro && fineEvento < daFiltro) return false;
        if (aFiltro && inizioEvento > aFiltro) return false;

        // 4. Filtri Geografici
        if (cittaFiltro && !cittaEv.includes(cittaFiltro)) return false;
        if (provFiltro && !provEv.includes(provFiltro)) return false;
        if (regFiltro && !regEv.includes(regFiltro)) return false;

        return true;
    });

    mostraMarkerFiltrati(eventiFiltrati);
}

function mostraMarkerFiltrati(eventi) {
    markerLayerGroup.clearLayers();

    // Aggiorna il contatore degli eventi visibili sulla mappa
    const counterEl = document.getElementById('counter-value');
    if (counterEl) {
        counterEl.textContent = eventi.length;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const latRichiesta = urlParams.get('lat');
    const lngRichiesta = urlParams.get('lng');

    let eventiDaMostrare = eventi;
    if (latRichiesta && lngRichiesta) {
        const latReq = parseFloat(latRichiesta).toFixed(4);
        const lngReq = parseFloat(lngRichiesta).toFixed(4);

        eventiDaMostrare = eventi.filter(e => {
            const lat = parseFloat(e.latitudine);
            const lng = parseFloat(e.longitudine);
            return !isNaN(lat) && !isNaN(lng) &&
                   lat.toFixed(4) === latReq &&
                   lng.toFixed(4) === lngReq;
        });
    }

    const coordinateMappa = {};
    eventiDaMostrare.forEach(evento => {
        let lat = typeof evento.latitudine === 'string' ? parseFloat(evento.latitudine.replace(',', '.')) : evento.latitudine;
        let lng = typeof evento.longitudine === 'string' ? parseFloat(evento.longitudine.replace(',', '.')) : evento.longitudine;

        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            const chiaveCoord = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
            if (!coordinateMappa[chiaveCoord]) {
                coordinateMappa[chiaveCoord] = [];
            }
            evento.latitudineParsed = lat;
            evento.longitudineParsed = lng;
            coordinateMappa[chiaveCoord].push(evento);
        }
    });

    Object.keys(coordinateMappa).forEach(chiave => {
        const eventiSulLuogo = coordinateMappa[chiave];
        const primoEvento = eventiSulLuogo[0];
        const percorsoPng = getPngCategoria(primoEvento.categoria || primoEvento.tipo);

        const catText = (primoEvento.categoria || primoEvento.tipo || '').toLowerCase();
        const isFood = catText.includes('food') || catText.includes('sagra') || catText.includes('cibo');

        const classNameContainer = isFood ? 'marker-png-container marker-food' : 'marker-png-container';
        const size = isFood ? 70 : 56; // Più grande per il food (es. 70px invece di 56px)
        const anchor = size / 2;

        const customIcon = L.divIcon({
            className: classNameContainer,
            html: `<div class="pin-inner">
                        <img src="${percorsoPng}" alt="${primoEvento.categoria || 'evento'}">
                   </div>`,
            iconSize: [size, size],
            iconAnchor: [anchor, anchor],
            popupAnchor: [0, -anchor]
        });
        // --------------------

        const urlItinerario = `https://www.google.com/maps/dir/?api=1&destination=${primoEvento.latitudineParsed},${primoEvento.longitudineParsed}&travelmode=driving`;

        // Genera l'elenco di tutti gli intervalli di date distinti per questo evento
        let dateHtml = '';
        if (primoEvento.intervalliDate && primoEvento.intervalliDate.length > 0) {
            dateHtml = primoEvento.intervalliDate.map(intervallo => {
                const inizio = intervallo.inizio ? intervallo.inizio.split('-').reverse().join('/') : '';
                const fine = intervallo.fine ? intervallo.fine.split('-').reverse().join('/') : '';
                return `<div style="font-size: 0.85rem; color: #333; margin-top: 2px;">📅 <b>${inizio === fine ? inizio : `Dal ${inizio} al ${fine}`}</b></div>`;
            }).join('<hr style="border:0; border-top:1px solid #eee; margin:5px 0;">');
        } else {
            const inizio = primoEvento.data_inizio_grezza ? primoEvento.data_inizio_grezza.split('-').reverse().join('/') : '';
            const fine = primoEvento.data_fine_grezza ? primoEvento.data_fine_grezza.split('-').reverse().join('/') : '';
            dateHtml = `<div style="font-size: 0.85rem; color: #333; margin-top: 2px;">📅 <b>${inizio === fine ? inizio : `Dal ${inizio} al ${fine}`}</b></div>`;
        }

        const popupContent = `
            <div style="text-align: center; min-width: 180px;">
                <b style="font-size: 1rem; color: #2c3e50;">${primoEvento.nome_rilevato || primoEvento.nome}</b><br>
                <span style="font-size: 0.8rem; color: #666;">${primoEvento.luogo || primoEvento.citta || ''}</span>
                <div style="margin: 8px 0; text-align: left; background: #f8f9fa; padding: 6px; border-radius: 4px;">
                    ${dateHtml}
                </div>
                <div style="display: flex; gap: 6px; justify-content: center; margin-top: 5px; flex-wrap: wrap;">
                    <a href="${urlItinerario}" target="_blank" style="padding: 5px 10px; background: #007bff; color: white; border-radius: 4px; text-decoration: none; font-size: 0.85rem;">
                        🚗 Itinerario
                    </a>
                    <button type="button" class="btn-apri-dettaglio" data-evento-b64='${btoa(encodeURIComponent(JSON.stringify(primoEvento)))}' style="padding: 5px 10px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: bold;">
                        🔍 Dettagli
                    </button>
                </div>
            </div>
        `;

        const marker = L.marker([primoEvento.latitudineParsed, primoEvento.longitudineParsed], { icon: customIcon })
            .bindPopup(popupContent);

        markerLayerGroup.addLayer(marker);

        if (latRichiesta && lngRichiesta) {
            marker.openPopup();
        }
    });
}

// --- GESTIONE CLICK SPECIFICA DELLA MAPPA (Dettagli) ---
document.addEventListener('click', (event) => {
    const btnDettaglio = event.target.closest('.btn-apri-dettaglio');
    if (btnDettaglio) {
        const eventoB64 = btnDettaglio.getAttribute('data-evento-b64');
        try {
            const eventoJson = decodeURIComponent(atob(eventoB64));
            const evento = JSON.parse(eventoJson);
            apriModaleDettagli(evento);
        } catch (err) {
            console.error("Errore nel parsing dei dati evento:", err);
        }
    }
});

// --- GESTIONE CALENDARI SU RICRCA DATE ---
let currentCalendarDate = new Date();
let selectedStartDate = null;
let selectedEndDate = null;

function initCustomCalendar() {
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

// Controlli navigazione mesi
document.addEventListener('click', (e) => {
    if (e.target.id === 'prev-month') {
        e.preventDefault();
        e.stopPropagation();
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        initCustomCalendar();
    }
    if (e.target.id === 'next-month') {
        e.preventDefault();
        e.stopPropagation();
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        initCustomCalendar();
    }
    if (e.target.id === 'clear-dates-btn') {
        e.preventDefault();
        e.stopPropagation();
        selectedStartDate = null;
        selectedEndDate = null;
        document.getElementById('filter-da').value = '';
        document.getElementById('filter-a').value = '';
        document.getElementById('date-summary-text').textContent = '📅 Date';
        initCustomCalendar();
        applicaFiltriMappa();
    }
});

// Avvia il calendario al caricamento della pagina
document.addEventListener('DOMContentLoaded', () => {
    initCustomCalendar();
});