// 1. Funzione per mostrare i pin in sequenza a cascata con effetto CSS
function caricaAnimazioniInSequenza(classe, ritardoMs = 250) {
  const elementi = document.querySelectorAll(classe);

  elementi.forEach((elemento, indice) => {
    setTimeout(() => {
      // Rende visibile il pin con un effetto a comparsa CSS
      elemento.classList.add("pin-visibile");
    }, indice * ritardoMs);
  });
}
// 2. Definizione della sequenza temporizzata delle fasi
const fasiCaricamento = [
    { time: 0,    text: "Ricerca eventi in Italia...", png: null },
    { time: 2500, text: "Trovati eventi food...", png: "images/food.png", classeAnim: ".anim-food" },
    { time: 5000, text: "Trovati eventi Comics...", png: "images/comics.png", classeAnim: ".anim-comics" },
    { time: 7500, text: "Trovati eventi Folk...", png: "images/folk.png", classeAnim: ".anim-folk" },
    { time: 10000, text: "Trovati eventi Wild...", png: "images/wild.png", classeAnim: ".anim-wild" }
];

// 3. Avvio della sequenza all'evento di caricamento della pagina
window.addEventListener('load', () => {
    const splash = document.getElementById('splash-screen');

    if (sessionStorage.getItem('festmap_splash_visto')) {
        if (splash) splash.remove();
        return;
    }

    sessionStorage.setItem('festmap_splash_visto', 'true');

    let datiPronti = false;
    let animazioneMinimaCompletata = false;

    const chiudiSplashSePronto = () => {
        // Chiude lo splash solo se i dati sono arrivati E l'animazione minima è finita
        if (datiPronti && animazioneMinimaCompletata) {
            if (splash && !splash.classList.contains('splash-hidden')) {
                splash.classList.add('splash-hidden');
                setTimeout(() => splash.remove(), 800);
            }
        }
    };

    // 1. Ascoltiamo quando i dati sono effettivamente pronti da app.js
    window.addEventListener('festmap-pronta', () => {
        datiPronti = true;
        chiudiSplashSePronto();
    });

    // 2. Facciamo partire la sequenza visiva delle fasi
    const statusText = document.getElementById("loader-status-text");
    const loaderIconContainer = document.getElementById("loader-icon-container");

    fasiCaricamento.forEach(fase => {
        setTimeout(() => {
            if (statusText) {
                statusText.style.opacity = 0;
                setTimeout(() => {
                    statusText.textContent = fase.text;
                    statusText.style.opacity = 1;
                }, 200);
            }

            // Aggiornamo l'icona centrale del loader con il nuovo PNG statico
            if (loaderIconContainer) {
                loaderIconContainer.innerHTML = "";
                loaderIconContainer.className = "";

                if (fase.png) {
                    // Inseriamo direttamente il tag <img> con l'PNG
                    loaderIconContainer.innerHTML = `<img src="${fase.png}" class="png-loader-icon" alt="icon">`;
                }
            }

            // Attiviamo la comparsa dei pin corrispondenti sulla mappa/schermata
            if (fase.classeAnim) {
                caricaAnimazioniInSequenza(fase.classeAnim, 250);
            }

        }, fase.time);
    });


    // 3. Fissiamo un tempo minimo garantito per l'animazione grafica (es. dopo 10 secondi sblocchiamo la parte visiva)
    setTimeout(() => {
        animazioneMinimaCompletata = true;
        chiudiSplashSePronto();
    }, 10000);

    // 4. Timeout di emergenza estremo (es. 25 secondi) se la connessione è morta, per evitare il blocco eterno
    setTimeout(() => {
        if (splash) splash.remove();
    }, 25000);
});
