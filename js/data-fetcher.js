// data-fetcher.js

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxLTUI31KJU2AeZk-h0g5yGOan-plbYLnmggl1AP3XgQczLCZEGVH7_22UkGCuTHXtP/exec';

// Funzione di supporto per convertire "DD/MM/YYYY" o stringhe grezze in "YYYY-MM-DD" per i filtri
function convertiDataPerFiltri(dataStr) {
    if (!dataStr) return '';

    // Se è già nel formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) return dataStr;

    // Se è nel formato italiano DD/MM/YYYY
    const parti = dataStr.split('/');
    if (parti.length === 3) {
        const [giorno, mese, anno] = parti;
        if (anno.length === 4) {
            return `${anno}-${mese}-${giorno}`;
        }
    }

    // Tentativo di parsing generico con l'oggetto Date di JavaScript
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
    // 1. Leggiamo subito la cache esistente nel localStorage per renderizzare la pagina all'istante
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

    // 2. Facciamo la chiamata di rete in background per aggiornare i dati dal foglio Google
    const fetchPromise = fetch(SCRIPT_URL)
        .then(res => {
            if (!res.ok) throw new Error('Errore nel recupero dati di rete');
            return res.json();
        })
        .then(data => {
            // Mappiamo i dati freschi con i controlli flessibili
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

            // Aggiorniamo la cache in background
            localStorage.setItem('eventiCache', JSON.stringify(processedData));
            return processedData;
        })
        .catch(err => {
            console.error('Aggiornamento in background non riuscito, uso i dati in cache:', err);
            return null;
        });

    // 3. Se abbiamo dei dati in cache, li restituiamo SUBITO (0 secondi di attesa per l'utente)
    if (cachedData.length > 0) {
        return cachedData;
    }

    // 4. Se la cache è completamente vuota (es. primo accesso in assoluto), aspettiamo la rete
    const freshData = await fetchPromise;
    return freshData || [];
}