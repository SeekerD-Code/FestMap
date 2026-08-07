// data-fetcher.js

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxLTUI31KJU2AeZk-h0g5yGOan-plbYLnmggl1AP3XgQczLCZEGVH7_22UkGCuTHXtP/exec';

function convertiDataPerFiltri(dataStr) {
    if (!dataStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) return dataStr;
    const parti = dataStr.split('/');
    if (parti.length === 3) {
        const [giorno, mese, anno] = parti;
        if (anno.length === 4) {
            return `${anno}-${mese}-${giorno}`;
        }
    }
    const d = new Date(dataStr);
    if (!isNaN(d.getTime())) {
        const anno = d.getFullYear();
        const mese = String(d.getMonth() + 1).padStart(2, '0');
        const giorno = String(d.getDate()).padStart(2, '0');
        return `${anno}-${mese}-${giorno}`;
    }
    return '';
}

export async function fetchEventi() {
    const rawCached = JSON.parse(localStorage.getItem('eventiCache') || '[]');
    const cachedData = rawCached.map(evento => {
        const cittaVal = evento.citta || evento.Citta || evento.CITTA || '';
        const provVal = evento.provincia || evento.Provincia || evento.PROVINCIA || evento.sigla_provincia || '';
        const regVal = evento.regione || evento.Regione || evento.REGIONE || '';

        return {
            ...evento,
            data_inizio_standard: evento.data_inizio_standard || convertiDataPerFiltri(evento.data_inizio_grezza),
            data_fine_standard: evento.data_fine_standard || convertiDataPerFiltri(evento.data_fine_grezza),
            citta: cittaVal.trim(),
            provincia: provVal.trim(),
            regione: regVal.trim()
        };
    });

    // Chiamata di rete in background (non blocca il ritorno della cache)
    const fetchPromise = fetch(SCRIPT_URL)
        .then(res => {
            if (!res.ok) throw new Error('Errore nel recupero dati di rete');
            return res.json();
        })
        .then(data => {
            const processedData = data.map(evento => {
                const cittaVal = evento.citta || evento.Citta || evento.CITTA || '';
                const provVal = evento.provincia || evento.Provincia || evento.PROVINCIA || evento.sigla_provincia || '';
                const regVal = evento.regione || evento.Regione || evento.REGIONE || '';

                return {
                    ...evento,
                    data_inizio_grezza: evento.data_inizio_grezza,
                    data_fine_grezza: evento.data_fine_grezza,
                    data_inizio_standard: convertiDataPerFiltri(evento.data_inizio_grezza),
                    data_fine_standard: convertiDataPerFiltri(evento.data_fine_grezza),
                    citta: cittaVal.trim(),
                    provincia: provVal.trim(),
                    regione: regVal.trim()
                };
            });
            localStorage.setItem('eventiCache', JSON.stringify(processedData));
            return processedData;
        })
        .catch(err => {
            console.error('Aggiornamento in background non riuscito:', err);
            return null;
        });

    // Se abbiamo la cache, la restituiamo immediatamente e gestiamo l'aggiornamento di rete in modo asincrono
    if (cachedData.length > 0) {
        // Aggiorna in background senza bloccare il caricamento iniziale
        fetchPromise.then(freshData => {
            if (freshData && window.aggiornaDatiInBackground) {
                window.aggiornaDatiInBackground(freshData);
            }
        });
        return cachedData;
    }

    const freshData = await fetchPromise;
    return freshData || [];
}