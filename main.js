/* =====================================================================
   TORTILLERÍA CHABELITA  |  main.js
   Dependencias locales: GSAP 3.12 + ScrollTrigger, Lenis 1.1.
   Principios
   - El CSS ya muestra el estado final. Aquí solo se parte del estado inicial
     y se anima hacia él, así que sin JS o con "reducir movimiento" todo se ve.
   - Nada de listeners de "scroll": todo va por ScrollTrigger / IntersectionObserver.
   - Solo se animan transform y opacity (salvo clip-path en el relleno de texto
     y border-radius del video, que son baratos y de un solo elemento).
   ===================================================================== */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;

  const WA_NUMBER = '526624319232';
  const waLink = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const MOTION_OK = '(prefers-reduced-motion: no-preference)';
  const DESKTOP_MOTION = '(min-width: 900px) and (prefers-reduced-motion: no-preference)';

  const header = $('#header');
  const menu = $('#menu');
  const burger = $('#burger');
  let lenis = null;
  let menuOpen = false;

  /* ---------------------------------------------------------------
     Utilidades
     --------------------------------------------------------------- */

  /** Envuelve cada palabra en .w > .w__in conservando <em> y demás hijos. */
  function splitWords(el) {
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const parts = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const inner = document.createElement('span');
            inner.className = 'w__in';
            inner.textContent = p;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    walk(el);
    return $$('.w__in', el);
  }

  /** Anillo de texto alrededor del hero: repite la frase para cerrar el círculo. */
  function buildRing(ring) {
    const phrase = ring.dataset.text || '';
    const text = phrase.repeat(3);
    const frag = document.createDocumentFragment();
    Array.from(text).forEach((ch, i) => {
      const s = document.createElement('span');
      s.style.setProperty('--i', i);
      s.textContent = ch === ' ' ? ' ' : ch;
      frag.appendChild(s);
    });
    ring.style.setProperty('--n', text.length);
    ring.appendChild(frag);
  }

  /* ---------------------------------------------------------------
     Menú móvil
     --------------------------------------------------------------- */
  function setMenu(open) {
    menuOpen = open;
    menu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
    if (lenis) open ? lenis.stop() : lenis.start();
    else root.style.overflow = open ? 'hidden' : '';
  }
  burger.addEventListener('click', () => setMenu(!menuOpen));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); } });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches && menuOpen) setMenu(false); });

  /* ---------------------------------------------------------------
     Enlaces ancla con scroll suave
     --------------------------------------------------------------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = $(id);
    if (!target) return;
    e.preventDefault();
    if (menuOpen) setMenu(false);
    const offset = id === '#inicio' ? 0 : -(header.offsetHeight + 8);
    if (lenis) lenis.scrollTo(target, { offset, duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    history.replaceState(null, '', id);
  });

  /* ---------------------------------------------------------------
     Sección activa en el menú (IntersectionObserver)
     --------------------------------------------------------------- */
  (() => {
    const links = new Map($$('.nav__list a').map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a, id) => a.classList.toggle('is-active', id === en.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  })();

  /* ---------------------------------------------------------------
     Tabs de sucursales + mapa
     --------------------------------------------------------------- */
  (() => {
    const tabs = $$('.tabs__tab');
    const tablist = $('.tabs');
    const ind = $('#tabsInd');
    const map = $('#mapFrame');
    const dir = $('#directions');
    const cover = $('#mapCover');
    const wrap = $('#mapWrap');
    const places = {
      matriz: '29.1152462,-110.9692183',
      sucursal: '29.1233357,-110.9652854'
    };
    const place = (key) => {
      const q = encodeURIComponent(places[key]);
      map.src = `https://www.google.com/maps?q=${q}&z=17&output=embed`;
      dir.href = `https://www.google.com/maps/dir/?api=1&destination=${q}`;
    };
    const moveInd = () => {
      const t = tabs.find((x) => x.getAttribute('aria-selected') === 'true');
      if (!t) return;
      ind.style.setProperty('--x', `${t.offsetLeft}px`);
      ind.style.setProperty('--w', `${t.offsetWidth}px`);
    };
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        $('#' + t.getAttribute('aria-controls')).hidden = !on;
      });
      moveInd();
      place(tab.dataset.place);
      if (focus) tab.focus();
    };
    tablist.classList.add('is-enhanced');
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (k) { e.preventDefault(); select(tabs[(i + k + tabs.length) % tabs.length], true); }
        if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
        if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
      });
    });
    moveInd();
    window.addEventListener('resize', moveInd);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveInd);

    // El mapa solo captura gestos tras un toque, para no atrapar el scroll de la página.
    cover.addEventListener('click', () => { cover.hidden = true; });
    wrap.addEventListener('pointerleave', () => { cover.hidden = false; });
  })();

  /* ---------------------------------------------------------------
     Preguntas frecuentes
     --------------------------------------------------------------- */
  (() => {
    const items = $$('.faq__item');
    let t;
    items.forEach((item) => {
      const btn = $('.faq__q', item);
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        items.forEach((o) => {
          const b = $('.faq__q', o);
          const on = o === item && open;
          o.classList.toggle('is-open', on);
          b.setAttribute('aria-expanded', String(on));
        });
        if (hasGsap) { clearTimeout(t); t = setTimeout(() => ScrollTrigger.refresh(), 700); }
      });
    });
  })();

  /* ---------------------------------------------------------------
     Formulario: valida y abre WhatsApp con el pedido armado
     --------------------------------------------------------------- */
  (() => {
    const form = $('#orderForm');
    const nameInput = $('#f-name');
    const nameField = nameInput.closest('.field');
    const err = $('#f-name-err');
    const status = $('#formStatus');
    const btn = $('#formSubmit');
    const label = $('span', btn);
    const original = label.textContent;

    const setError = (msg) => {
      err.textContent = msg;
      nameField.classList.toggle('is-invalid', !!msg);
      nameInput.setAttribute('aria-invalid', String(!!msg));
    };
    nameInput.addEventListener('input', () => { if (nameInput.value.trim().length > 1) setError(''); });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const nombre = String(data.get('nombre') || '').trim();
      if (nombre.length < 2) {
        setError('Escribe tu nombre para saber con quién hablamos.');
        nameInput.focus();
        return;
      }
      setError('');
      const detalles = String(data.get('detalles') || '').trim();
      const msg = [
        `Hola Chabelita, soy ${nombre}.`,
        `Quiero: ${data.get('producto')}.`,
        `Es para: ${data.get('para')}.`,
        `Entrega: ${data.get('entrega')}.`,
        detalles ? `Detalles: ${detalles}` : ''
      ].filter(Boolean).join('\n');
      const url = waLink(msg);

      btn.classList.add('is-sending');
      label.textContent = 'Abriendo WhatsApp';
      const win = window.open(url, '_blank', 'noopener');
      setTimeout(() => {
        btn.classList.remove('is-sending');
        label.textContent = original;
        status.innerHTML = '';
        status.append(win ? 'Listo, tu pedido va en camino a WhatsApp. ' : 'Tu navegador bloqueó la ventana. ');
        const a = document.createElement('a');
        a.href = url; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = 'Abrir WhatsApp de nuevo';
        status.append(a);
      }, 1100);
    });
  })();

  /* ---------------------------------------------------------------
     Año del pie
     --------------------------------------------------------------- */
  const yr = $('#year');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------------
     Partículas de masa y harina del hero (canvas)
     --------------------------------------------------------------- */
  function initParticles() {
    const canvas = $('#heroParticles');
    const hero = $('#inicio');
    if (!canvas || reduce) return;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, parts = [], raf = 0, visible = true;
    const mouse = { x: -9999, y: -9999 };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = hero.clientWidth; h = hero.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(70, Math.round((w * h) / 16000));
      parts = Array.from({ length: count }, () => spawn(true));
    };
    const spawn = (anywhere) => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: Math.random() * 1.8 + .5,
      vy: -(Math.random() * .22 + .06),
      vx: (Math.random() - .5) * .12,
      a: Math.random() * .5 + .2,
      ph: Math.random() * Math.PI * 2
    });
    const frame = (t) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 14400) { const f = (1 - d2 / 14400) * 1.6; p.x += (dx / Math.sqrt(d2 + 1)) * f; p.y += (dy / Math.sqrt(d2 + 1)) * f; }
        p.x += p.vx + Math.sin(t / 2600 + p.ph) * .08;
        p.y += p.vy;
        if (p.y < -10) Object.assign(p, spawn(false));
        const tw = .6 + Math.sin(t / 900 + p.ph) * .4;
        ctx.beginPath();
        ctx.fillStyle = `rgba(247,210,122,${(p.a * tw).toFixed(3)})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = visible ? requestAnimationFrame(frame) : 0;
    };
    const start = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? start() : stop(); }).observe(hero);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    if (finePointer) {
      hero.addEventListener('pointermove', (e) => { const r = hero.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
      hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    }
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 200); });
    resize();
    start();
  }

  /* ---------------------------------------------------------------
     Carga: sello con anillo de progreso, etiquetas y cortina
     --------------------------------------------------------------- */
  function runLoader(onExit) {
    const loader = $('#loader');
    const ring = $('#loaderRing');
    const num = $('#loaderNum');
    const lab = $('#loaderLabel');
    const stages = [[0, 'Amasando la masa'], [30, 'Extendiendo con cariño'], [62, 'Calentando el comal'], [92, 'Calientitas, listas']];
    let shown = -1;

    const paint = (p) => {
      const v = Math.round(p);
      num.textContent = v;
      ring.style.setProperty('--p', p.toFixed(2));
      let s = 0;
      stages.forEach((st, i) => { if (v >= st[0]) s = i; });
      if (s !== shown) { shown = s; lab.textContent = stages[s][1]; }
    };

    const finish = () => {
      loader.classList.add('is-done');
      root.classList.remove('is-loading');
      if (lenis) lenis.start();
      if (hasGsap) ScrollTrigger.refresh();
    };

    if (!hasGsap || reduce) {
      const go = () => { paint(100); setTimeout(() => { finish(); onExit(); }, reduce ? 150 : 0); };
      if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
      return;
    }

    const state = { p: 0 };
    let loaded = document.readyState === 'complete';
    const ready = Promise.all([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      loaded ? Promise.resolve() : new Promise((r) => window.addEventListener('load', r, { once: true }))
    ]);

    const t0 = performance.now();
    const crawl = gsap.to(state, { p: 88, duration: 2.4, ease: 'power2.out', onUpdate: () => paint(state.p) });
    gsap.from('.loader__badge', { scale: .6, opacity: 0, duration: 1, ease: 'expo.out' });
    gsap.from('.loader__percent, .loader__label', { y: 14, opacity: 0, duration: .8, delay: .2, ease: 'expo.out' });

    ready.then(() => {
      const wait = Math.max(0, 1500 - (performance.now() - t0));
      setTimeout(() => {
        crawl.kill();
        gsap.to(state, {
          p: 100, duration: .7, ease: 'power2.inOut', onUpdate: () => paint(state.p),
          onComplete: () => {
            const tl = gsap.timeline({ onComplete: finish });
            tl.to('.loader__core', { scale: .9, opacity: 0, duration: .5, ease: 'power2.in' })
              .to('.loader__half--top', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '-=.05')
              .to('.loader__half--bottom', { yPercent: 100, duration: 1.1, ease: 'expo.inOut' }, '<')
              .add(onExit, '-=.75');
          }
        });
      }, wait);
    });
  }

  /* ---------------------------------------------------------------
     Intro del hero (se dispara cuando abre la cortina)
     --------------------------------------------------------------- */
  function heroIntro() {
    if (!hasGsap || reduce) return;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to(header, { yPercent: 0, duration: 1.2 }, 0)
      .to('.hero .eyebrow', { y: 0, opacity: 1, duration: 1 }, .05)
      .to('.hero__title .line__in', { yPercent: 0, duration: 1.5, stagger: .13 }, .1)
      .to('.hero__lead', { y: 0, opacity: 1, duration: 1.1 }, .5)
      .to('.hero__cta > *', { y: 0, opacity: 1, duration: 1.1, stagger: .1 }, .62)
      .to('.layer--lg', { scale: 1, opacity: 1, duration: 1.8 }, .1)
      .to('.layer--ring', { scale: 1, opacity: 1, duration: 2 }, .3)
      .to('.layer--sm', { y: 0, scale: 1, opacity: 1, duration: 1.6 }, .6);
    tl.eventCallback('onComplete', () => { $$('.hero [style*="will-change"]').forEach((el) => (el.style.willChange = 'auto')); });
  }

  /* ---------------------------------------------------------------
     Todo lo que depende de GSAP / ScrollTrigger
     --------------------------------------------------------------- */
  function initMotion() {
    gsap.registerPlugin(ScrollTrigger);

    // Scroll suave (Lenis) sincronizado con ScrollTrigger
    if (!reduce && typeof window.Lenis !== 'undefined') {
      lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
      lenis.stop();
    }

    // Estado inicial del hero (lo recoge heroIntro)
    if (!reduce) {
      gsap.set(header, { yPercent: -100 });
      gsap.set('.hero__title .line__in', { yPercent: 118 });
      gsap.set(['.hero .eyebrow', '.hero__lead'], { y: 26, opacity: 0 });
      gsap.set('.hero__cta > *', { y: 26, opacity: 0 });
      gsap.set('.layer--lg', { scale: .72, opacity: 0 });
      gsap.set('.layer--ring', { scale: .8, opacity: 0 });
      gsap.set('.layer--sm', { y: 70, scale: .7, opacity: 0 });
    }

    /* --- Barra de progreso y cabecera --- */
    gsap.to('#progressBar', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .2 } });

    ScrollTrigger.create({
      start: 40, end: 'max',
      onToggle: (s) => header.classList.toggle('is-solid', s.isActive)
    });
    if (!reduce) {
      ScrollTrigger.create({
        start: 0, end: 'max',
        onUpdate: (s) => {
          if (menuOpen) return;
          const hide = s.direction === 1 && s.scroll() > 520;
          const show = s.direction === -1 || s.scroll() <= 520;
          if (hide && !header._hidden) { header._hidden = true; gsap.to(header, { yPercent: -100, duration: .6, ease: 'power3.out', overwrite: true }); }
          else if (show && header._hidden) { header._hidden = false; gsap.to(header, { yPercent: 0, duration: .6, ease: 'power3.out', overwrite: true }); }
        }
      });
    }

    /* --- WhatsApp flotante: aparece al salir del hero --- */
    const wa = $('#waFloat');
    ScrollTrigger.create({
      trigger: '#inicio', start: 'bottom 70%', end: 'max',
      onToggle: (s) => wa.classList.toggle('is-in', s.isActive)
    });

    const ringEl = $('#heroRing');
    if (ringEl) buildRing(ringEl);

    if (reduce) {
      // Sin animaciones: solo se deja el estado final que ya trae el CSS.
      return;
    }

    /* --- Parallax de puntero del hero --- */
    if (finePointer) {
      const layers = $$('.layer');
      const movers = layers.map((l) => ({
        depth: parseFloat(l.dataset.depth || 1),
        x: gsap.quickTo(l, 'x', { duration: 1.1, ease: 'power3.out' }),
        y: gsap.quickTo(l, 'y', { duration: 1.1, ease: 'power3.out' })
      }));
      const hero = $('#inicio');
      hero.addEventListener('pointermove', (e) => {
        const nx = e.clientX / window.innerWidth - .5;
        const ny = e.clientY / window.innerHeight - .5;
        movers.forEach((m) => { m.x(nx * 34 * m.depth); m.y(ny * 26 * m.depth); });
      });
      hero.addEventListener('pointerleave', () => movers.forEach((m) => { m.x(0); m.y(0); }));
    }

    // Al bajar, el disco del hero se queda atrás un poco
    gsap.to('.hero__visual', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '#inicio', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__copy', { yPercent: -8, opacity: .25, ease: 'none', scrollTrigger: { trigger: '#inicio', start: '35% top', end: 'bottom top', scrub: true } });

    /* --- Titulares: entran palabra por palabra --- */
    $$('[data-split]').forEach((el) => {
      const words = splitWords(el);
      gsap.from(words, {
        yPercent: 118, duration: 1.2, ease: 'expo.out', stagger: .055,
        scrollTrigger: { trigger: el, start: 'top 86%', once: true }
      });
    });
    $$('[data-reveal]').forEach((el) => {
      gsap.from(el, { y: 28, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });

    /* --- 2. Del comal a tu mesa: el video se abre con el scroll --- */
    (() => {
      const section = $('#comal');
      const video = $('#revealVideo');
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: section, start: 'top top', end: '+=170%', pin: true, scrub: .6, anticipatePin: 1 }
      });
      tl.fromTo('#revealFrame', { scale: .4, borderRadius: 56 }, { scale: 1, borderRadius: 0, duration: 1 }, 0)
        .fromTo(video, { scale: 1.35 }, { scale: 1, duration: 1 }, 0)
        .fromTo('.reveal__words', { opacity: 1 }, { opacity: 0, duration: .4 }, .5)
        .fromTo('.reveal__word--l', { x: 0 }, { x: '-38vw', duration: 1 }, 0)
        .fromTo('.reveal__word--r', { x: 0 }, { x: '38vw', duration: 1 }, 0)
        .fromTo('.reveal__shade', { opacity: 0 }, { opacity: 1, duration: .4 }, .5)
        .fromTo('.reveal__copy', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: .4, ease: 'power2.out' }, .68)
        .to({}, { duration: .3 });

      // El video solo corre mientras se ve
      new IntersectionObserver(([en]) => {
        if (en.isIntersecting) { const p = video.play(); if (p && p.catch) p.catch(() => {}); }
        else video.pause();
      }, { threshold: .05 }).observe(section);
    })();

    /* --- Banda de palabras (la única de la página) --- */
    (() => {
      const track = $('#marqueeTrack');
      const band = $('.marquee');
      const loop = gsap.to(track, { xPercent: -50, duration: 42, ease: 'none', repeat: -1 });
      ScrollTrigger.create({
        trigger: band, start: 'top bottom', end: 'bottom top',
        onToggle: (s) => (s.isActive ? loop.resume() : loop.pause()),
        onUpdate: (s) => {
          const boost = 1 + Math.min(Math.abs(s.getVelocity()) / 450, 5);
          gsap.to(loop, { timeScale: s.direction * boost, duration: .25, overwrite: true, onComplete: () => gsap.to(loop, { timeScale: s.direction, duration: 1.2 }) });
        }
      });
    })();

    /* --- 3. Productos: carrusel horizontal anclado (escritorio) --- */
    const mm = gsap.matchMedia();
    mm.add(DESKTOP_MOTION, () => {
      root.classList.add('gsap-ready');
      const section = $('#productos');
      const track = $('#productsTrack');
      const bar = $('#productsBar');
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);

      const pan = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: section, start: 'top top', end: () => `+=${dist()}`,
          pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: (s) => gsap.set(bar, { scaleX: s.progress })
        }
      });
      $$('.product__media').forEach((m) => {
        gsap.fromTo($('img', m), { xPercent: -6 }, {
          xPercent: 6, ease: 'none',
          scrollTrigger: { trigger: m, containerAnimation: pan, start: 'left right', end: 'right left', scrub: true }
        });
      });
      return () => root.classList.remove('gsap-ready');
    });

    /* --- 4. Proceso: tarjetas que se apilan --- */
    mm.add(MOTION_OK, () => {
      const cards = $$('.stack__card');
      cards.forEach((card, i) => {
        const img = $('.stack__media img', card);
        gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
        if (i < cards.length - 1) {
          // brightness y no opacity: la tarjeta de atrás no debe transparentarse con la de enfrente
          gsap.fromTo($('.stack__face', card), { scale: 1, filter: 'brightness(1)' }, {
            scale: .92, filter: 'brightness(.5)', ease: 'none',
            scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top top', scrub: true }
          });
        }
      });
    });

    /* --- 5. Mayoreo: celdas del bento --- */
    gsap.from($$('.cell'), {
      y: 80, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: .12,
      scrollTrigger: { trigger: '#bento', start: 'top 82%', once: true }
    });
    if (finePointer) {
      $$('[data-spot]').forEach((cell) => {
        cell.addEventListener('pointermove', (e) => {
          const r = cell.getBoundingClientRect();
          cell.style.setProperty('--mx', `${e.clientX - r.left}px`);
          cell.style.setProperty('--my', `${e.clientY - r.top}px`);
        });
      });
    }

    /* --- 6. Perfectas para: el texto se llena con el scroll --- */
    $$('.use').forEach((row) => {
      gsap.fromTo($('.use__fill', row), { clipPath: 'inset(0 100% 0 0)' }, {
        clipPath: 'inset(0 0% 0 0)', ease: 'none',
        scrollTrigger: { trigger: row, start: 'top 82%', end: 'top 38%', scrub: true }
      });
    });

    /* --- 7. Números que cuentan --- */
    $$('[data-count]').forEach((el) => {
      const end = parseInt(el.dataset.count, 10);
      const o = { v: 0 };
      el.textContent = '0';
      gsap.to(o, {
        v: end, duration: 2, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(o.v)),
        scrollTrigger: { trigger: el, start: 'top 92%', once: true }
      });
    });

    /* --- Pedido y pie --- */
    gsap.from('.form', { y: 70, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.form', start: 'top 88%', once: true } });
    gsap.from('.contact__phone', { y: 30, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.contact__phone', start: 'top 92%', once: true } });
    gsap.from('.footer__giant', { yPercent: 35, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top 85%', end: 'bottom bottom', scrub: true } });

    /* --- Botones magnéticos (solo puntero fino) --- */
    if (finePointer) {
      $$('[data-magnetic]').forEach((b) => {
        const x = gsap.quickTo(b, 'x', { duration: .6, ease: 'power3.out' });
        const y = gsap.quickTo(b, 'y', { duration: .6, ease: 'power3.out' });
        b.addEventListener('pointermove', (e) => {
          const r = b.getBoundingClientRect();
          x((e.clientX - (r.left + r.width / 2)) * .22);
          y((e.clientY - (r.top + r.height / 2)) * .3);
        });
        b.addEventListener('pointerleave', () => { x(0); y(0); });
      });
    }

    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* ---------------------------------------------------------------
     Arranque
     --------------------------------------------------------------- */
  if (hasGsap) initMotion();
  initParticles();
  runLoader(heroIntro);
})();
