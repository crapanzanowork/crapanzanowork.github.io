# Crapanzano Mattia: sito personale

Sito statico (HTML, CSS, JavaScript) pubblicato con GitHub Pages. Non serve installare niente.

## Pagine
| File | Pagina |
|---|---|
| `index.html` | Home: fotocamera 3D che esplode, Instagram, formati, video, stories |
| `servizi.html` | Servizi (foto + video per aziende), cosa ricevi, watermark, FAQ |
| `chi-sono.html` | Presentazione |
| `prenota.html` | "Blocca la data": calendario (anche più date) e invio su WhatsApp |
| `privacy.html` | Privacy Policy (da completare) |

## Struttura delle cartelle
```
crapanzanowork.github.io/
├── index.html, servizi.html, …   le pagine
├── 404.html                      pagina "non trovata"
├── assets/
│   ├── css/  js/                 stile e animazioni
│   └── img/
│       ├── foto/                 foto del sito (versioni leggere, generate)
│       ├── instagram/            griglia Instagram + immagine profilo
│       └── brand/                logo originali
├── _foto-originali/              ← METTI QUI LE TUE FOTO (non viene pubblicata)
└── _strumenti/prepara-foto.sh    crea le versioni leggere delle foto
```

## Caricare le foto
1. Trascina le foto nelle sottocartelle di `_foto-originali/` (leggi il LEGGIMI.txt lì dentro).
2. Dimmelo in chat: le preparo e le inserisco io nelle pagine giuste.
   In alternativa, dal Terminale nella cartella del sito: `zsh _strumenti/prepara-foto.sh`

## Logo
In `assets/img/`: `logo-mark.svg` (pittogramma pieno), `logo-outline.svg` (solo contorno), `favicon.svg`.
Gli originali che mi hai mandato sono in `assets/img/brand/`.

## Mettere le tue foto
1. Copia le foto in `assets/img/` (JPG, lato lungo circa 2000 px, meno di 500 KB).
2. Nel file HTML sostituisci un segnaposto come `<div class="ph ph--4" ...></div>`
   con `<img src="assets/img/nome-foto.jpg" alt="Descrizione" loading="lazy">`.
3. **Chi sono:** salva la tua foto come `assets/img/mattia.jpg`, comparirà da sola.
4. **Instagram:** la griglia usa le 12 foto in `assets/img/instagram/` (prese da @crapanzano.work): sostituiscile quando vuoi.
   Per un feed che si aggiorna da solo: crea un feed gratuito su behold.so, collega l'account
   @crapanzano.work e incolla il suo *Feed ID* in `index.html` dentro `data-behold-id=""`.

## Pubblicare con GitHub Desktop
1. **File → Add Local Repository…** → scegli questa cartella → clicca **create a repository** → **Create repository**.
2. **Publish repository** in alto → togli la spunta a *Keep this code private* → **Publish**.
3. Su github.com apri il repository → **Settings → Pages** → Source: *Deploy from a branch*, Branch: **main** / **(root)** → **Save**.
4. Dopo 1-2 minuti il sito è online su **https://crapanzanowork.github.io**

Per gli aggiornamenti: modifica i file → GitHub Desktop → scrivi un messaggio → **Commit to main** → **Push origin**.
