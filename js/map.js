import { fetchEventi } from './data-fetcher.js';
import { apriModaleDettagli } from './app.js';

let tuttiGliEventiCache = [];
let markerLayerGroup = L.layerGroup();

// Inizializzazione Mappa Leaflet
const map = L.map('map', { zoomControl: false }).setView([41.8719, 12.5674], 6);
L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer('images/osm-tiles/{z}/{x}/{y}.png', { // Se usi tile locali o standard OpenStreetMap lascio la standard sotto
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Tile layer standard OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

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

// Allineato alle estensioni .webp usate in ui-components.js
function getPngCategoria(categoria) {
    const cat = (categoria || '').toLowerCase().trim();
    if (cat.includes('folk') || cat.includes('tradizione')) return "images/folk.webp";
    if (cat.includes('comic') || cat.includes('cosplay') || cat.includes('fumetto')) return "images/comics.webp";
    if (cat.includes('wild') || cat.includes('natura')) return "images/wild.webp";
    if (cat.includes('food') || cat.includes('sagra') || cat.includes('cibo')) return "images/food.webp";
    return "images/food.webp"; // Fallback predefinito
}

document.addEventListener('DOMContentLoaded', async () => {
    const eventiGrezzi = await fetchEventi();

    const mappaEventiAccorpati = {};
    eventiGrezzi.forEach(e => {
        const nome = (e.nome_rilevato || e.nome || 'Evento').trim();
        const inizioNorm = normalizzaData(e.data_inizio_grezza || e.data_inizio || e.data);
        const fineNorm = normalizzaData(e.data_fine_grezza || e.data_fine) || inizioNorm;

        if (!mappaEventiAccorpati[nome]) {
            mappaEventiAccorpati[nome] = { ...e, intervalliDate: [] };
        }
        if (inizioNorm) {
            mappaEventiAccorpati[nome].intervalliDate.push({ inizio: inizioNorm, fine: fineNorm });
        }
    });

    tuttiGliEventiCache = Object.values(mappaEventiAccorpati).map(e => {
        e.intervalliDate.sort((a, b) => a.inizio.localeCompare(b.inizio));
        const primoIntervallo = e.intervalliDate[0] || { inizio: '', fine: '' };
        const ultimoIntervallo = e.intervalliDate[e.intervalliDate.length - 1] || primoIntervallo;

        return {
            ...e,
            data_inizio_grezza: primoIntervallo.inizio,
            data_fine_grezza: ultimoIntervallo.fine
        };
    });

    popolaDropdownCategorie();
    applicaFiltriMappa();

    const idsFiltri = ['filter-testo', 'filter-categoria', 'filter-citta', 'filter-provincia', 'filter-regione'];
    idsFiltri.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const eventoAscolto = el.tagName === 'SELECT' ? 'change' : 'input';
            el.addEventListener(eventoAscolto, applicaFiltriMappa);
        }
    });
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
    const testoFiltro = document.getElementById('filter-testo')?.value.toLowerCase().trim() || '';
    const catFiltro = document.getElementById('filter-categoria')?.value.toLowerCase() || '';
    const cittaFiltro = document.getElementById('filter-citta')?.value.toLowerCase().trim() || '';
    const provFiltro = document.getElementById('filter-provincia')?.value.toLowerCase().trim() || '';
    const regFiltro = document.getElementById('filter-regione')?.value.toLowerCase().trim() || '';

    const oggiStr = new Date().toISOString().split('T')[0];

    const eventiFiltrati = tuttiGliEventiCache.filter(e => {
        const nomeEv = (e.nome_rilevato || e.nome || '').toLowerCase();
        const catEv = (e.categoria || e.tipo || '').toLowerCase();
        const cittaEv = (e.citta || e.luogo || '').toLowerCase();
        const provEv = (e.provincia || '').toLowerCase();
        const regEv = (e.regione || '').toLowerCase();

        const fineEvento = e.data_fine_grezza || e.data_inizio_grezza;
        if (!fineEvento || fineEvento < oggiStr) {
            return false;
        }

        if (testoFiltro && !nomeEv.includes(testoFiltro) && !cittaEv.includes(testoFiltro)) return false;
        if (catFiltro && !catEv.includes(catFiltro)) return false;
        if (cittaFiltro && !cittaEv.includes(cittaFiltro)) return false;
        if (provFiltro && !provEv.includes(provFiltro)) return false;
        if (regFiltro && !regEv.includes(regFiltro)) return false;

        return true;
    });

    mostraMarkerFiltrati(eventiFiltrati);
}

function mostraMarkerFiltrati(eventi) {
    markerLayerGroup.clearLayers();

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

        const customIcon = L.divIcon({
            className: 'marker-png-container',
            html: `<div class="pin-inner">
                        <img src="${percorsoPng}" alt="${primoEvento.categoria || 'evento'}">
                   </div>`,
            iconSize: [56, 56],
            iconAnchor: [28, 28],
            popupAnchor: [0, -28]
        });

        const urlItinerario = `https://www.google.com/maps/dir/?api=1&destination=${primoEvento.latitudineParsed},${primoEvento.longitudineParsed}&travelmode=driving`;

        let dateHtml = eventiSulLuogo.map(ev => {
            const inizio = ev.data_inizio_grezza ? ev.data_inizio_grezza.split('-').reverse().join('/') : '';
            const fine = ev.data_fine_grezza ? ev.data_fine_grezza.split('-').reverse().join('/') : '';
            return `<div style="font-size: 0.85rem; color: #333; margin-top: 2px;">📅 <b>${inizio === fine ? inizio : `Dal ${inizio} al ${fine}`}</b></div>`;
        }).join('<hr style="border:0; border-top:1px solid #eee; margin:5px 0;">');

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