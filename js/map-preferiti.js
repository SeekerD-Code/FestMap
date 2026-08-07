import { fetchEventi } from './data-fetcher.js';
import { aggiornaContatoreEventi } from './header-component.js';
import { apriModaleDettagli } from './app.js';

// Funzione di supporto per le immagini PNG in base alla categoria
function getPngCategoria(categoria) {
    const cat = (categoria || '').toLowerCase();
    if (cat.includes('food') || cat.includes('sagra') || cat.includes('gastronomia')) {
        return "images/food.png";
    }
    if (cat.includes('comic') || cat.includes('nerd') || cat.includes('cosplay') || cat.includes('fumetto')) {
        return "images/comics.png";
    }
    if (cat.includes('folk') || cat.includes('tradizion') || cat.includes('rievocazion') || cat.includes('storica')) {
        return "images/folk.png";
    }
    return "images/wild.png";
}

function formattaDataItaliana(dataStr) {
    if (!dataStr) return '';
    if (typeof dataStr === 'string' && dataStr.includes('T')) {
        dataStr = dataStr.split('T')[0];
    }
    const parti = dataStr.split('-');
    if (parti.length === 3 && parti[0].length === 4) {
        return `${parti[2]}/${parti[1]}/${parti[0]}`;
    }
    if (dataStr.includes('/')) return dataStr;
    return dataStr;
}

let map;
let markerLayerGroup;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inizializzazione Mappa (centrata sull'Italia)
    map = L.map('map', { zoomControl: false }).setView([41.8719, 12.5674], 6);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // 2. Configurazione Tile Server (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    markerLayerGroup = L.layerGroup().addTo(map);

    // Avvio caricamento marker preferiti
    await caricaMarkerPreferiti();

    // Forza il ricalcolo delle dimensioni della mappa a schermo intero
    setTimeout(() => {
        if (map) map.invalidateSize();
    }, 100);
});

// 3. Funzione per caricare i marker solo dei preferiti
async function caricaMarkerPreferiti() {
    const eventi = await fetchEventi();
    const preferitiIds = JSON.parse(localStorage.getItem('festmap_preferiti') || '[]');

    const eventiPreferiti = eventi.filter(evento => {
        const eventoId = evento.id || evento.nome_rilevato;
        return preferitiIds.includes(eventoId);
    });

    aggiornaContatoreEventi(eventiPreferiti.length);

    if (eventiPreferiti.length === 0) {
        markerLayerGroup.clearLayers();
        return;
    }

    markerLayerGroup.clearLayers();

    eventiPreferiti.forEach(evento => {
        let lat = typeof evento.latitudine === 'string' ? parseFloat(evento.latitudine.replace(',', '.')) : evento.latitudine;
        let lng = typeof evento.longitudine === 'string' ? parseFloat(evento.longitudine.replace(',', '.')) : evento.longitudine;

        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {

            evento.latitudineParsed = lat;
            evento.longitudineParsed = lng;

            const percorsoPng = getPngCategoria(evento.categoria || evento.tipo);

            const customIcon = L.divIcon({
                className: 'marker-png-container',
                html: `<div class="pin-inner">
                        <img src="${percorsoPng}" alt="${evento.categoria || 'evento'}">
                       </div>`,
                iconSize: [56, 56],
                iconAnchor: [28, 28],
                popupAnchor: [0, -28]
            });

            const urlItinerario = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

            const inizio = formattaDataItaliana(evento.data_inizio_grezza || evento.data_inizio || '');
            const fine = formattaDataItaliana(evento.data_fine_grezza || evento.data_fine || '');

            let dataHtml = '';
            if (inizio && fine && inizio !== fine) {
                dataHtml = `<div style="font-size: 0.85rem; color: #333; margin-top: 2px;">📅 Dal <b>${inizio}</b> al <b>${fine}</b></div>`;
            } else {
                dataHtml = `<div style="font-size: 0.85rem; color: #333; margin-top: 2px;">📅 <b>${inizio || 'Data non specificata'}</b></div>`;
            }

            const eventoB64 = btoa(encodeURIComponent(JSON.stringify(evento)));

            const popupContent = `
                <div style="text-align: center; min-width: 180px;">
                    <b style="font-size: 1rem; color: #2c3e50;">${evento.nome_rilevato}</b><br>
                    <span style="font-size: 0.8rem; color: #666;">${evento.luogo || ''}</span>
                    <div style="margin: 8px 0; text-align: left; background: #f8f9fa; padding: 6px; border-radius: 4px;">
                        ${dataHtml}
                    </div>
                    <div style="display: flex; gap: 6px; justify-content: center; margin-top: 5px; flex-wrap: wrap;">
                        <a href="${urlItinerario}" target="_blank" class="btn-itinerario" style="display: inline-block; padding: 5px 10px; background: #007bff; color: white; border-radius: 4px; text-decoration: none; font-size: 0.85rem;">
                            🚗 Itinerario
                        </a>
                        <button type="button" class="btn-apri-dettaglio-mappa" data-evento-b64="${eventoB64}" style="padding: 5px 10px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: bold;">
                            🔍 Dettagli
                        </button>
                    </div>
                </div>
            `;

            const marker = L.marker([lat, lng], { icon: customIcon })
                .bindPopup(popupContent);

            markerLayerGroup.addLayer(marker);
        }
    });
}

// Gestione click sul pulsante "Dettagli" dentro i popup della mappa
document.addEventListener('click', (e) => {
    const btnDettaglioMappa = e.target.closest('.btn-apri-dettaglio-mappa');
    if (!btnDettaglioMappa) return;

    const eventoB64 = btnDettaglioMappa.getAttribute('data-evento-b64');
    try {
        const eventoJson = decodeURIComponent(atob(eventoB64));
        const evento = JSON.parse(eventoJson);
        apriModaleDettagli(evento);
    } catch (err) {
        console.error("Errore nel parsing dei dati dell'evento per i dettagli dalla mappa preferiti:", err);
    }
});