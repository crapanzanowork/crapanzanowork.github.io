/* ==========================================================================
   Interazioni comuni a tutte le pagine
   ========================================================================== */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Menu mobile ---------- */
  const nav = $('.nav');
  $('.nav__burger')?.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    $('.nav__burger').setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('.nav__links a').forEach((a) => a.addEventListener('click', () => { nav.classList.remove('is-open'); document.body.style.overflow = ''; }));

  // Nav chiara/scura in base alla sezione sotto di essa
  const themed = $$('[data-nav]');
  if (nav && themed.length) {
    const setNav = () => {
      const y = 26;
      let theme = 'dark';
      for (const s of themed) { const r = s.getBoundingClientRect(); if (r.top <= y && r.bottom > y) { theme = s.dataset.nav; break; } }
      nav.classList.toggle('nav--light', theme === 'light');
    };
    addEventListener('scroll', setNav, { passive: true }); setNav();
  }

  /* ---------- Parole che compaiono una a una ---------- */
  $$('.reveal-words').forEach((el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.append(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
    $$('.w', el).forEach((w, i) => { w.style.transitionDelay = `${i * 0.06}s`; });
  });

  /* ---------- Reveal allo scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal, .reveal-words').forEach((el) => io.observe(el));

  /* ---------- Tilt 3D + luce che segue il mouse ---------- */
  if (fine && !reduced) {
    $$('[data-tilt]').forEach((el) => {
      const max = +el.dataset.tilt || 6;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.transform = `perspective(1000px) rotateX(${(0.5 - y) * max}deg) rotateY(${(x - 0.5) * max}deg) translateZ(0)`;
        el.style.setProperty('--mx', `${x * 100}%`); el.style.setProperty('--my', `${y * 100}%`);
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
    $$('.spot:not([data-tilt])').forEach((el) => el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`); el.style.setProperty('--my', `${e.clientY - r.top}px`);
    }));

    /* Pulsanti magnetici */
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    /* Cursore */
    const cur = document.createElement('div'); cur.className = 'cursor'; document.body.append(cur);
    let cx = 0, cy = 0, tx = 0, ty = 0;
    addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; cur.classList.add('is-on'); }, { passive: true });
    document.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
    const loop = () => { cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22; cur.style.transform = `translate(${cx}px, ${cy}px)`; requestAnimationFrame(loop); };
    loop();
    document.addEventListener('pointerover', (e) => cur.classList.toggle('is-hover', !!e.target.closest('a, button, [data-tilt], .wm, .shot, .chip, .cal__day')));
  }

  /* ---------- Caroselli orizzontali ---------- */
  $$('[data-rail]').forEach((rail) => {
    const navEl = $(`[data-rail-nav="${rail.dataset.rail}"]`);
    const prev = navEl && $('[data-dir="-1"]', navEl), next = navEl && $('[data-dir="1"]', navEl);
    const step = () => (rail.firstElementChild?.getBoundingClientRect().width || 300) + 20;
    const upd = () => { if (!prev) return; prev.disabled = rail.scrollLeft < 4; next.disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 4; };
    prev?.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
    next?.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));
    rail.addEventListener('scroll', upd, { passive: true }); upd();
    if (fine) { // trascina con il mouse
      let down = false, sx = 0, sl = 0, moved = false;
      rail.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = rail.scrollLeft; });
      addEventListener('pointermove', (e) => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) { moved = true; rail.classList.add('is-dragging'); } rail.scrollLeft = sl - dx; });
      addEventListener('pointerup', () => { if (!down) return; down = false; rail.classList.remove('is-dragging'); });
      rail.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    }
  });

  /* ---------- Sezione "formato giusto": la cornice cambia proporzione ---------- */
  const formats = $('.formats');
  if (formats) {
    const box = $('.formats__box', formats), frame = $('.formats__frame', formats), ratio = $('.formats__ratio', formats), use = $('.formats__use p', formats);
    const chips = $$('.formats__chips button', formats);
    const phs = $$('.ph', frame);
    const list = [
      { r: '9:16', w: 9, h: 16, t: 'Stories e Reels: verticale, immediato, pronto da pubblicare.' },
      { r: '4:5', w: 4, h: 5, t: 'Il feed di Instagram: più spazio, più attenzione.' },
      { r: '1:1', w: 1, h: 1, t: 'Post, profili, cataloghi: il quadrato che funziona ovunque.' },
      { r: '16:9', w: 16, h: 9, t: 'Sito web, LinkedIn, presentazioni e maxischermi.' },
    ];
    let cur = -1;
    const set = (i, force) => {
      if (i === cur && !force) return; cur = i; const f = list[i];
      const W = box.clientWidth, H = box.clientHeight;
      let h = H, w = h * f.w / f.h; if (w > W) { w = W; h = w * f.h / f.w; }
      frame.style.setProperty('--ct', `${(H - h) / 2}px`); frame.style.setProperty('--cl', `${(W - w) / 2}px`);
      ratio.style.setProperty('--rs', `${Math.min(w * 0.3, h * 0.45, 150)}px`);
      ratio.textContent = f.r; use.textContent = f.t;
      chips.forEach((c, j) => { c.classList.toggle('is-on', j === i); c.setAttribute('aria-pressed', j === i); });
      phs.forEach((p, j) => { p.style.opacity = j === i ? 1 : 0; p.style.transform = j === i ? 'scale(1)' : 'scale(1.15)'; });
    };
    const range = () => formats.offsetHeight - innerHeight;
    const onScroll = () => {
      const p = Math.min(0.999, Math.max(0, -formats.getBoundingClientRect().top / range()));
      set(Math.floor(p * list.length));
    };
    // cliccando un formato si scorre al punto giusto della sezione
    chips.forEach((c, j) => c.addEventListener('click', () => {
      scrollTo({ top: formats.getBoundingClientRect().top + scrollY + range() * (j + 0.5) / list.length, behavior: 'smooth' });
    }));
    addEventListener('scroll', onScroll, { passive: true });
    new ResizeObserver(() => set(Math.max(0, cur), true)).observe(box);
    onScroll();
  }

  /* ---------- Equazione che si accende riga per riga ---------- */
  $$('.equation').forEach((eq) => {
    const rows = $$(':scope > span', eq);
    const upd = () => {
      const r = eq.getBoundingClientRect();
      const p = (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.25);
      rows.forEach((s, i) => s.classList.toggle('is-on', p > i / rows.length));
    };
    addEventListener('scroll', upd, { passive: true }); upd();
  });

  /* ---------- Demo foto brandizzate: scorre da sola finché non la tocchi ---------- */
  $$('[data-brandlab]').forEach((lab) => {
    const stage = $('.brandlab__stage', lab), btns = $$('.brandlab__opts button', lab);
    let i = 0, timer = null, visible = false, paused = false;
    const show = (k) => {
      i = k; stage.dataset.v = btns[k].dataset.v;
      btns.forEach((b, j) => { b.classList.toggle('is-on', j === k); b.setAttribute('aria-pressed', j === k); });
      // riavvia la barra di avanzamento
      const on = btns[k]; on.classList.remove('is-on'); void on.offsetWidth; on.classList.add('is-on');
    };
    const loop = () => { clearTimeout(timer); if (visible && !paused && !reduced) timer = setTimeout(() => { show((i + 1) % btns.length); loop(); }, 3200); };
    btns.forEach((b, k) => b.addEventListener('click', () => { paused = true; lab.classList.add('is-paused'); clearTimeout(timer); show(k); }));
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; loop(); }, { threshold: 0.4 }).observe(lab);
    if (reduced) lab.classList.add('is-paused');
  });

  /* ---------- Watermark: tocca per mostrarlo (touch) ---------- */
  $$('.wm').forEach((el) => el.addEventListener('click', () => el.classList.toggle('is-on')));

  /* ---------- Parallax leggero ---------- */
  const para = $$('[data-parallax]');
  if (para.length && !reduced) {
    const upd = () => para.forEach((el) => {
      const r = el.getBoundingClientRect(); const k = +el.dataset.parallax || 0.1;
      el.style.transform = `translate3d(0, ${(r.top + r.height / 2 - innerHeight / 2) * -k}px, 0)`;
    });
    addEventListener('scroll', upd, { passive: true }); upd();
  }

  /* ---------- Video (YouTube o Vimeo): si caricano solo al clic ---------- */
  const embedUrl = ({ p, v, h }) => p === 'vimeo'
    ? `https://player.vimeo.com/video/${v}?h=${h}&autoplay=1&title=0&byline=0&portrait=0&dnt=1`
    : `https://www.youtube-nocookie.com/embed/${v}?autoplay=1&rel=0&modestbranding=1`;
  $$('.video[data-v]').forEach((box) => box.addEventListener('click', () => {
    if (box.querySelector('iframe')) return;
    const f = document.createElement('iframe');
    f.src = embedUrl(box.dataset);
    f.title = box.querySelector('img')?.alt || 'Video';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    box.style.transform = ''; box.removeAttribute('data-tilt');
    box.replaceChildren(f);
  }));

  /* ---------- Showreel: cambia il video principale dall'elenco ---------- */
  $$('.reel').forEach((reel) => {
    const box = $('.video', reel);
    const fitList = () => reel.style.setProperty('--reel-h', `${box.offsetHeight + 40}px`);
    addEventListener('resize', fitList); fitList();
    reel.addEventListener('click', (e) => {
      const it = e.target.closest('.reel__item'); if (!it) return;
      $$('.reel__item', reel).forEach((x) => x.classList.toggle('is-on', x === it));
      const { p, v, h, thumb } = it.dataset;
      Object.assign(box.dataset, { p, v, h });
      const img = document.createElement('img');
      img.src = thumb;
      img.onerror = () => { img.onerror = null; img.src = `https://i.ytimg.com/vi/${v}/hqdefault.jpg`; };
      img.alt = `Anteprima del video: ${it.dataset.client}`;
      const play = document.createElement('button'); play.className = 'video__play'; play.setAttribute('aria-label', 'Guarda il video'); play.textContent = '▶';
      box.replaceChildren(img, play);
      $('[data-cap-client]', reel).textContent = it.dataset.client;
      $('[data-cap-desc]', reel).textContent = it.dataset.desc;
      box.click(); // parte subito
      if (innerWidth < 900) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  /* ---------- Instagram dentro l'iPhone: il feed scorre con la pagina ---------- */
  const igSec = $('.igphone');
  if (igSec) {
    const dev = $('.iphone', igSec), feed = $('.iphone__feed', igSec), screen = $('.iphone__screen', igSec);
    const upd = () => {
      const r = igSec.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, igSec.offsetHeight - innerHeight)));
      // ingresso: il telefono si raddrizza; poi il feed scorre dall'alto in basso
      const enter = Math.min(1, Math.max(0, (innerHeight - r.top) / innerHeight));
      const e = 1 - Math.pow(1 - enter, 3);
      if (!reduced) dev.style.transform = `perspective(1600px) rotateX(${(1 - e) * 18}deg) rotateY(${(1 - e) * -22}deg) rotateZ(${(1 - e) * 4}deg) translateY(${(1 - e) * 60}px)`;
      const max = Math.max(0, feed.scrollHeight - screen.clientHeight);
      const k = Math.min(1, Math.max(0, (p - 0.08) / 0.84));
      feed.style.transform = `translate3d(0, ${-k * max}px, 0)`;
    };
    addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
  }

  /* ---------- Foto del sito: compaiono da sole quando esistono ----------
     _strumenti/prepara-foto.py scrive assets/img/foto/manifest.json con l'elenco
     delle foto pronte; qui le carico al posto dei segnaposto colorati. */
  const fotos = $$('img[data-foto]');
  if (fotos.length) {
    fetch('assets/img/foto/manifest.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : {})).catch(() => ({}))
      .then((m) => fotos.forEach((img) => {
        const v = m[img.dataset.foto];
        if (v) {
          img.src = `assets/img/foto/${img.dataset.foto}.jpg?v=${v}`;
          img.closest('.ph')?.classList.add('has-foto');
          img.closest('.wm')?.classList.add('has-foto');
        } else if (!img.getAttribute('src')) img.remove();
      }));
  }

  /* ---------- Anno nel footer ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
