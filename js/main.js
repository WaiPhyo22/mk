/**
 * Main page behaviour: config binding, navigation, countdown, gallery
 * lightbox, scroll reveal, RSVP form and lazy-loading the guestbook.
 */
import { WEDDING, GALLERY, FEATURES, FIREBASE_CONFIG } from './config.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------------------------------------------------------------
 * 1. Fill [data-bind="path.in.WEDDING"] elements from config.js
 * ------------------------------------------------------------- */
function bindConfig() {
  const lookup = (path) => path.split('.').reduce((obj, key) => (obj ? obj[key] : undefined), WEDDING);

  $$('[data-bind]').forEach((el) => {
    const value = lookup(el.dataset.bind);
    if (value) el.textContent = value;
  });

  const mapBtn = $('#map-button');
  if (WEDDING.venue.mapUrl) {
    mapBtn.href = WEDDING.venue.mapUrl;
  } else {
    mapBtn.hidden = true;
  }

  if (WEDDING.heroImage) {
    $('.hero').style.setProperty('--hero-image', `url("${WEDDING.heroImage}")`);
    $('.hero').classList.add('has-image');
  }

  $('#year').textContent = new Date().getFullYear();
}

/* ---------------------------------------------------------------
 * 2. Header + mobile navigation
 * ------------------------------------------------------------- */
function initNav() {
  const header = $('.site-header');
  const toggle = $('.nav-toggle');
  const menu = $('#nav-menu');

  const onScroll = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 40);
    $('#back-to-top').classList.toggle('is-visible', window.scrollY > 700);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const closeMenu = () => {
    toggle.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-open');
  };

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    menu.classList.toggle('is-open', !open);
  });

  $$('a', menu).forEach((a) => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());

  $('#back-to-top').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ---------------------------------------------------------------
 * 3. Countdown
 * ------------------------------------------------------------- */
function initCountdown() {
  const grid = $('#countdown-grid');
  const note = $('#countdown-note');
  const target = WEDDING.dateISO ? new Date(WEDDING.dateISO) : null;

  if (!target || Number.isNaN(target.getTime())) {
    grid.hidden = true;
    note.textContent = 'Our wedding date will be announced soon — please check back!';
    return;
  }

  const units = {
    days: $('[data-unit="days"]'),
    hours: $('[data-unit="hours"]'),
    minutes: $('[data-unit="minutes"]'),
    seconds: $('[data-unit="seconds"]'),
  };
  const pad = (n) => String(n).padStart(2, '0');
  const CELEBRATION_HOURS = 12;

  let timer;
  const tick = () => {
    const diff = target.getTime() - Date.now();

    if (diff <= 0) {
      clearInterval(timer);
      grid.hidden = true;
      note.textContent =
        -diff < CELEBRATION_HOURS * 3600 * 1000
          ? 'Today is our wedding day! 💍'
          : 'We are married! Thank you for celebrating with us. 💕';
      return;
    }

    const s = Math.floor(diff / 1000);
    units.days.textContent = Math.floor(s / 86400);
    units.hours.textContent = pad(Math.floor((s % 86400) / 3600));
    units.minutes.textContent = pad(Math.floor((s % 3600) / 60));
    units.seconds.textContent = pad(s % 60);
  };

  tick();
  timer = setInterval(tick, 1000);
}

/* ---------------------------------------------------------------
 * 4. Gallery + lightbox
 * ------------------------------------------------------------- */
function initGallery() {
  const grid = $('#gallery-grid');
  const dialog = $('#lightbox');
  const img = $('#lightbox-img');
  const caption = $('#lightbox-caption');
  const photos = GALLERY.filter((p) => p.thumb);
  let current = 0;

  GALLERY.forEach((photo) => {
    const item = document.createElement('li');
    item.className = 'gallery-item reveal';

    if (!photo.thumb) {
      item.classList.add('is-placeholder');
      const ph = document.createElement('div');
      ph.className = 'gallery-placeholder';
      ph.setAttribute('role', 'img');
      ph.setAttribute('aria-label', `${photo.alt} — coming soon`);
      const label = document.createElement('span');
      label.textContent = 'Photo coming soon';
      ph.append(label);
      item.append(ph);
    } else {
      const index = photos.indexOf(photo);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = photo.fit === 'contain' ? 'gallery-button is-contain' : 'gallery-button';
      btn.setAttribute('aria-label', `Open photo: ${photo.alt}`);
      const thumb = document.createElement('img');
      thumb.src = photo.thumb;
      thumb.alt = photo.alt;
      thumb.loading = 'lazy';
      thumb.decoding = 'async';
      btn.append(thumb);
      btn.addEventListener('click', () => open(index));
      item.append(btn);
    }
    grid.append(item);
  });

  function show(i) {
    current = (i + photos.length) % photos.length;
    const p = photos[current];
    img.src = p.full || p.thumb;
    img.alt = p.alt;
    caption.textContent = p.alt;
    $$('.lightbox-nav', dialog).forEach((b) => (b.hidden = photos.length < 2));
  }

  function open(i) {
    show(i);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    document.body.classList.add('no-scroll');
  }

  function close() {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  dialog.addEventListener('close', () => document.body.classList.remove('no-scroll'));
  $('#lightbox-close').addEventListener('click', close);
  $('#lightbox-prev').addEventListener('click', () => show(current - 1));
  $('#lightbox-next').addEventListener('click', () => show(current + 1));
  dialog.addEventListener('click', (e) => e.target === dialog && close());
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });

  // Swipe on touch screens
  let startX = null;
  dialog.addEventListener('touchstart', (e) => (startX = e.touches[0].clientX), { passive: true });
  dialog.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    startX = null;
  });
}

/* ---------------------------------------------------------------
 * 5. Scroll reveal animations
 * ------------------------------------------------------------- */
function initReveal() {
  const items = $$('.reveal');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      }),
    { threshold: 0.12 }
  );
  items.forEach((el) => io.observe(el));
}

/* ---------------------------------------------------------------
 * 6. Guestbook — load Firebase only when the section is near view
 * ------------------------------------------------------------- */
let guestbookModule = null;

function loadGuestbookModule() {
  if (!guestbookModule) guestbookModule = import('./guestbook.js');
  return guestbookModule;
}

function initGuestbookLazy() {
  const section = $('#wishes');

  const start = () =>
    loadGuestbookModule()
      .then((m) => m.initGuestbook())
      .catch((err) => {
        console.error('[guestbook] failed to load:', err);
        const state = $('#wishes-state');
        state.hidden = false;
        state.dataset.type = 'error';
        state.textContent = 'The guestbook could not be loaded. Please check your connection and refresh.';
        $('#wish-form fieldset').disabled = true;
      });

  // No config → show the setup notice immediately without downloading Firebase.
  if (!FIREBASE_CONFIG.apiKey) {
    $('#guestbook-setup').hidden = false;
    $('#wish-form fieldset').disabled = true;
    const state = $('#wishes-state');
    state.hidden = false;
    state.dataset.type = 'info';
    state.textContent = 'Wishes will appear here once the guestbook is connected.';
    return;
  }

  if (!('IntersectionObserver' in window)) return start();
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        start();
      }
    },
    { rootMargin: '600px 0px' }
  );
  io.observe(section);
}

/* ---------------------------------------------------------------
 * 7. RSVP
 * ------------------------------------------------------------- */
function initRsvp() {
  const cfg = FEATURES.rsvp;
  const form = $('#rsvp-form');
  const guests = $('#rsvp-guests');
  const status = $('#rsvp-status');
  const submitBtn = $('#rsvp-submit');
  const saving = cfg.saveToFirestore && Boolean(FIREBASE_CONFIG.apiKey);

  guests.max = cfg.maxGuests;
  $('#rsvp-notice').hidden = saving;

  const setStatus = (type, text) => {
    status.dataset.type = type;
    status.textContent = text;
    status.hidden = !text;
  };

  form.addEventListener('change', () => {
    const attending = form.elements.attending.value;
    guests.disabled = attending === 'no';
    if (attending === 'no') guests.value = 0;
    else if (Number(guests.value) < 1) guests.value = 1;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    const attending = form.elements.attending.value;
    const count = attending === 'no' ? 0 : Number(guests.value);

    if (!name) return setStatus('error', 'Please enter your name.');
    if (name.length > 60) return setStatus('error', 'Name must be 60 characters or fewer.');
    if (!attending) return setStatus('error', 'Please let us know if you can attend.');
    if (attending === 'yes' && (!Number.isInteger(count) || count < 1 || count > cfg.maxGuests)) {
      return setStatus('error', `Number of attendees must be between 1 and ${cfg.maxGuests}.`);
    }

    if (!saving) {
      setStatus(
        'info',
        `Thank you, ${name}! Online RSVP is not connected yet, so this response has not been saved. ` +
          'Please confirm your attendance directly with the families.'
      );
      return;
    }

    submitBtn.disabled = true;
    setStatus('info', 'Sending your RSVP…');
    try {
      const { saveRsvp } = await loadGuestbookModule();
      await saveRsvp({ name, attending: attending === 'yes', guests: count });
      form.reset();
      guests.disabled = false;
      setStatus('success', `Thank you, ${name}! Your RSVP has been received. 💕`);
    } catch (err) {
      console.error('[rsvp] submit failed:', err);
      setStatus('error', 'Sorry, your RSVP could not be sent. Please try again or contact the families directly.');
    } finally {
      submitBtn.disabled = false;
    }
  });
}

/* --------------------------------------------------------------- */
bindConfig();
initNav();
initCountdown();
initGallery();
initReveal();
initGuestbookLazy();
initRsvp();
