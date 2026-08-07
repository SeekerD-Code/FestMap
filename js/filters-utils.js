// filters-utils.js

export function normalizzaDataPerFiltri(dataStr) {
    if (!dataStr) return '';
    if (dataStr.includes('/')) {
        const parti = dataStr.split('/');
        if (parti.length === 3) {
            return `${parti[2]}-${parti[1]}-${parti[0]}`;
        }
    }
    return dataStr;
}

export function filtraEventi(eventiTotali) {
    const searchInput = document.getElementById('search-input');
    const testoQuery = searchInput ? searchInput.value.toLowerCase() : '';
    const tipoFiltro = document.getElementById('filter-tipo')?.value.toLowerCase() || '';
    const meseFiltro = document.getElementById('filter-mese')?.value || ''; // Formato "YYYY-MM"
    const dataFiltro = document.getElementById('filter-data')?.value || ''; // Formato "YYYY-MM-DD"
    const daFiltro = document.getElementById('filter-da')?.value || '';     // Formato "YYYY-MM-DD"
    const aFiltro = document.getElementById('filter-a')?.value || '';        // Formato "YYYY-MM-DD"

    const cittaFiltro = document.getElementById('filter-citta')?.value.toLowerCase().trim() || '';
    const provFiltro = document.getElementById('filter-provincia')?.value.toLowerCase().trim() || '';
    const regFiltro = document.getElementById('filter-regione')?.value.toLowerCase().trim() || '';

    return eventiTotali.filter(evento => {
        const matchTesto = !testoQuery ||
            (evento.nome_rilevato && evento.nome_rilevato.toLowerCase().includes(testoQuery));

        const matchTipo = !tipoFiltro ||
            (evento.tipo && evento.tipo.toLowerCase() === tipoFiltro) ||
            (evento.categoria && evento.categoria.toLowerCase() === tipoFiltro) ||
            (evento.genere && evento.genere.toLowerCase() === tipoFiltro);

        // --- USIAMO LE DATE STANDARD PER I FILTRI TEMPORALI ---
        const inizioStd = evento.data_inizio_standard || normalizzaDataPerFiltri(evento.data_inizio_grezza);
        const fineStd = evento.data_fine_standard || normalizzaDataPerFiltri(evento.data_fine_grezza) || inizioStd;

        // 1. Filtro per Mese (es. "2026-07")
        const matchMese = !meseFiltro ||
            (inizioStd && inizioStd.startsWith(meseFiltro)) ||
            (fineStd && fineStd.startsWith(meseFiltro));

        // 2. Filtro per Data Specifica (es. "2026-07-29")
        const matchDataSpecifica = !dataFiltro ||
            ((!inizioStd || inizioStd <= dataFiltro) && (!fineStd || fineStd >= dataFiltro));

        // 3. Filtro per Intervallo (Da / A)
        const matchPeriodo = (!daFiltro || (fineStd && fineStd >= daFiltro)) &&
                             (!aFiltro || (inizioStd && inizioStd <= aFiltro));

        // --- FILTRI GEOGRAFICI RIGOROSI ---

        // Isoliamo la città presa esclusivamente dalla colonna/proprietà dedicata (es. evento.citta)
        const cittaEvento = evento.citta ? evento.citta.toLowerCase().trim() : '';

        // Verifica rigorosa: la città deve corrispondere esattamente o iniziare con la parola cercata
        // seguita da uno spazio o fine stringa (es. "Roma" trova "Roma" ma NON "Romagna")
        let matchCitta = true;
        if (cittaFiltro) {
            matchCitta = cittaEvento === cittaFiltro; // Controllo di uguaglianza perfetta (Roma !== Romagna)
        }

        // Trasformiamo provincia e regione in minuscolo e rimuoviamo spazi per un confronto pulito
        const provEvento = evento.provincia ? evento.provincia.toLowerCase().trim() : '';
        const matchProv = !provFiltro || provEvento === provFiltro;

        const regEvento = evento.regione ? evento.regione.toLowerCase().trim() : '';
        const matchReg = !regFiltro || regEvento === regFiltro;

        return matchTesto && matchTipo && matchMese && matchDataSpecifica && matchPeriodo && matchCitta && matchProv && matchReg;
    });
}