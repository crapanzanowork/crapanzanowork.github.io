/* ==========================================================================
   "Blocca la data": calendario (anche più giorni), scelte e invio su WhatsApp.
   Il sito è statico, quindi non salva nulla: prepara il messaggio e lo apre
   in WhatsApp di chi scrive.
   ========================================================================== */
(() => {
  const WHATSAPP = '393514658810';

  const form = document.getElementById('booking');
  if (!form) return;
  const $ = (id) => document.getElementById(id);
  const labels = { aziendali: 'Aziendale', wedding: 'Wedding & Luxury', nightlife: 'Nightlife', privati: 'Privato', pubblici: 'Pubblico', formativi: 'Formativo', altro: 'Altro' };
  const state = { dates: new Set(), tipo: null, durata: null }; // date come timestamp (mezzanotte)
  let lastClicked = null;

  /* ---------- Formattazione date ---------- */
  const DAY = 86400000;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  const fmtMonth = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' });
  const fmtDay = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtDM = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' });
  const sameDay = (a, b) => Math.round((b - a) / DAY) === 1; // b è il giorno dopo a (anche col cambio d'ora)

  // raggruppa i giorni consecutivi: [[inizio, fine], ...]
  function ranges() {
    const list = [...state.dates].sort((a, b) => a - b);
    const out = [];
    for (const t of list) {
      const last = out[out.length - 1];
      if (last && sameDay(last[1], t)) last[1] = t; else out.push([t, t]);
    }
    return out;
  }
  function rangeText([a, b]) {
    const A = new Date(a), B = new Date(b);
    if (a === b) return fmtDay.format(A);
    const n = Math.round((b - a) / DAY) + 1;
    const left = A.getMonth() === B.getMonth() ? A.getDate() : fmtDM.format(A) + (A.getFullYear() !== B.getFullYear() ? ` ${A.getFullYear()}` : '');
    return `${left}-${fmtDM.format(B)} ${B.getFullYear()} (${n} giorni)`;
  }

  /* ---------- Calendario ---------- */
  function render() {
    $('calTitle').textContent = fmtMonth.format(view);
    const grid = $('calGrid');
    grid.innerHTML = '';
    ['L', 'M', 'M', 'G', 'V', 'S', 'D'].forEach((d) => { const el = document.createElement('div'); el.className = 'cal__dow'; el.textContent = d; grid.append(el); });
    const offset = (view.getDay() + 6) % 7; // settimana che inizia di lunedì
    for (let i = 0; i < offset; i++) grid.append(document.createElement('div'));
    const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const date = new Date(view.getFullYear(), view.getMonth(), d), t = +date;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'cal__day'; b.innerHTML = `<span class="n">${d}</span>`;
      b.setAttribute('aria-label', fmtDay.format(date));
      if (date < today) b.disabled = true;
      if (t === +today) b.classList.add('is-today');
      if (state.dates.has(t)) {
        b.classList.add('is-sel'); b.setAttribute('aria-pressed', 'true');
        const col = (offset + d - 1) % 7;
        const prev = new Date(view.getFullYear(), view.getMonth(), d - 1), next = new Date(view.getFullYear(), view.getMonth(), d + 1);
        if (col > 0 && d > 1 && state.dates.has(+prev)) b.classList.add('join-l');
        if (col < 6 && d < days && state.dates.has(+next)) b.classList.add('join-r');
      } else b.setAttribute('aria-pressed', 'false');
      if (t !== lastClicked) b.classList.add('no-anim');
      b.addEventListener('click', () => { lastClicked = t; state.dates.has(t) ? state.dates.delete(t) : state.dates.add(t); render(); summary(); });
      grid.append(b);
    }
    document.querySelector('[data-cal="-1"]').disabled = view <= new Date(today.getFullYear(), today.getMonth(), 1);
    $('calClear').hidden = state.dates.size === 0;
  }
  document.querySelectorAll('[data-cal]').forEach((b) => b.addEventListener('click', () => {
    view = new Date(view.getFullYear(), view.getMonth() + +b.dataset.cal, 1); render();
  }));
  $('calClear').addEventListener('click', () => { state.dates.clear(); render(); summary(); });

  /* ---------- Chips ---------- */
  document.querySelectorAll('.chips[data-group]').forEach((group) => {
    group.addEventListener('click', (e) => {
      const c = e.target.closest('.chip'); if (!c) return;
      group.querySelectorAll('.chip').forEach((x) => { x.classList.toggle('is-on', x === c); x.setAttribute('aria-pressed', x === c); });
      state[group.dataset.group] = c.dataset.v; summary();
    });
  });
  const pre = new URLSearchParams(location.search).get('tipo');
  if (pre) document.querySelector(`.chips[data-group="tipo"] [data-v="${CSS.escape(pre)}"]`)?.click();

  $('luogo').addEventListener('input', summary);

  function summary() {
    const r = ranges();
    $('sDateLabel').textContent = state.dates.size > 1 ? 'Date' : 'Data';
    $('sDate').innerHTML = r.length ? r.map((x) => `<span>${rangeText(x)}</span>`).join('') : '—';
    $('sTipo').textContent = state.tipo ? labels[state.tipo] : '—';
    $('sDurata').textContent = state.durata || '—';
    $('sLuogo').textContent = $('luogo').value.trim() || '—';
  }

  /* ---------- Invio su WhatsApp ----------
     Niente emoji: in alcune versioni di WhatsApp arrivano come "�".
     Uso il grassetto di WhatsApp (*testo*), che si vede ovunque. */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = $('formMsg');
    const nome = $('nome').value.trim(), email = $('email').value.trim(), tel = $('tel').value.trim(), note = $('msg').value.trim();
    const missing = [];
    if (!state.dates.size) missing.push('almeno una data');
    if (!nome) missing.push('il nome');
    if (!/^\S+@\S+\.\S+$/.test(email)) missing.push('un’email valida');
    if (!$('privacy').checked) missing.push('il consenso privacy');
    if (missing.length) { msg.textContent = `Manca ${missing.join(', ')}.`; msg.style.color = '#ff6961'; return; }
    msg.style.color = ''; msg.textContent = 'Si sta aprendo WhatsApp con il messaggio pronto…';

    const r = ranges();
    const lines = [
      `Ciao Mattia! Vorrei bloccare ${state.dates.size > 1 ? 'queste date' : 'una data'}.`,
      '',
      r.length === 1 ? `*Data:* ${rangeText(r[0])}` : `*Date:*\n${r.map((x) => `- ${rangeText(x)}`).join('\n')}`,
      `*Evento:* ${state.tipo ? labels[state.tipo] : 'da definire'}`,
      `*Durata:* ${state.durata || 'da definire'}`,
      `*Luogo:* ${$('luogo').value.trim() || 'da definire'}`,
      '',
      `*Nome:* ${nome}`,
      `*Email:* ${email}`,
      tel ? `*Telefono:* ${tel}` : null,
      note ? `\n*Messaggio:*\n${note}` : null,
    ].filter((l) => l !== null);

    const url = `https://api.whatsapp.com/send?phone=${WHATSAPP}&text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank', 'noopener');
  });

  render(); summary();
})();
