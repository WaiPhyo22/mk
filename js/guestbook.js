/**
 * Guestbook (wedding wishes) backed by Cloud Firestore.
 *
 * - New wishes are saved with approved: false. They only become public after
 *   the couple flips `approved` to true in the Firebase Console.
 * - Reads only ever request approved wishes (rules reject anything else).
 * - All guest text is rendered with textContent — never innerHTML.
 */
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db, isFirebaseConfigured } from './firebase.js';
import { FEATURES } from './config.js';

const CFG = FEATURES.guestbook;
const COOLDOWN_KEY = 'wishLastSubmittedAt';

const $ = (id) => document.getElementById(id);

let lastVisible = null;
let loadingPage = false;
const formOpenedAt = Date.now();

/* ---------- helpers ---------- */

function setStatus(el, type, text) {
  el.textContent = text;
  el.dataset.type = type; // success | error | info
  el.hidden = !text;
}

function formatDate(ts) {
  if (!ts || typeof ts.toDate !== 'function') return '';
  return ts.toDate().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function readLastSubmit() {
  try {
    return Number(localStorage.getItem(COOLDOWN_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeLastSubmit() {
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
  } catch {
    /* storage unavailable — cooldown simply won't persist */
  }
}

function friendlyError(err) {
  const code = err && err.code;
  if (code === 'permission-denied') {
    return 'Sorry, your wish could not be accepted. Please check the length of your name and message and try again.';
  }
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return 'Connection problem — please check your internet and try again.';
  }
  if (code === 'resource-exhausted') {
    return 'Too many wishes are being sent right now. Please try again in a minute.';
  }
  return 'Something went wrong. Please try again in a moment.';
}

/* ---------- rendering ---------- */

function renderWish(data) {
  const card = document.createElement('article');
  card.className = 'wish-card';

  const msg = document.createElement('p');
  msg.className = 'wish-message';
  msg.textContent = data.message;

  const footer = document.createElement('footer');
  footer.className = 'wish-meta';

  const name = document.createElement('span');
  name.className = 'wish-name';
  name.textContent = data.name;

  const date = document.createElement('time');
  date.className = 'wish-date';
  const d = formatDate(data.createdAt);
  date.textContent = d;
  if (data.createdAt && data.createdAt.toDate) {
    date.dateTime = data.createdAt.toDate().toISOString();
  }

  footer.append(name, date);
  card.append(msg, footer);
  return card;
}

async function loadWishes({ reset = false } = {}) {
  if (loadingPage) return;
  loadingPage = true;

  const list = $('wishes-list');
  const state = $('wishes-state');
  const moreBtn = $('wishes-more');

  if (reset) {
    lastVisible = null;
    list.replaceChildren();
  }

  setStatus(state, 'info', 'Loading wishes…');
  moreBtn.disabled = true;

  try {
    const parts = [
      collection(db, CFG.collection),
      where('approved', '==', true),
      orderBy('createdAt', 'desc'),
    ];
    if (lastVisible) parts.push(startAfter(lastVisible));
    parts.push(limit(CFG.pageSize));

    const snap = await getDocs(query(...parts));

    snap.forEach((doc) => list.appendChild(renderWish(doc.data())));
    if (snap.docs.length) lastVisible = snap.docs[snap.docs.length - 1];

    if (!list.children.length) {
      setStatus(state, 'info', 'No wishes yet — be the first to leave one! 💐');
    } else {
      setStatus(state, 'info', '');
    }

    moreBtn.hidden = snap.docs.length < CFG.pageSize;
  } catch (err) {
    console.error('[guestbook] load failed:', err);
    // A missing composite index logs a console link to create it.
    setStatus(state, 'error', 'We couldn’t load the wishes right now. Please refresh to try again.');
  } finally {
    moreBtn.disabled = false;
    loadingPage = false;
  }
}

/* ---------- submission ---------- */

function validate(name, message) {
  if (!name) return 'Please enter your name.';
  if (name.length > CFG.maxNameLength) return `Name must be ${CFG.maxNameLength} characters or fewer.`;
  if (!message) return 'Please write a wish or message.';
  if (message.length < 2) return 'Your message is a little too short.';
  if (message.length > CFG.maxMessageLength) return `Message must be ${CFG.maxMessageLength} characters or fewer.`;
  return '';
}

async function handleSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const nameInput = $('wish-name');
  const msgInput = $('wish-message');
  const submitBtn = $('wish-submit');
  const status = $('wish-status');

  const name = nameInput.value.trim();
  const message = msgInput.value.trim();

  // Spam check 1: honeypot field must stay empty (hidden from humans).
  if ($('wish-website').value) {
    setStatus(status, 'success', 'Thank you for your lovely wish! 💕');
    form.reset();
    return;
  }

  const problem = validate(name, message);
  if (problem) {
    setStatus(status, 'error', problem);
    (name && name.length <= CFG.maxNameLength ? msgInput : nameInput).focus();
    return;
  }

  // Spam check 2: humans take a few seconds to type.
  if ((Date.now() - formOpenedAt) / 1000 < CFG.minSecondsOnForm) {
    setStatus(status, 'error', 'Please take a moment before sending your wish.');
    return;
  }

  // Spam check 3: per-browser cooldown.
  const since = (Date.now() - readLastSubmit()) / 1000;
  if (since < CFG.cooldownSeconds) {
    const wait = Math.ceil(CFG.cooldownSeconds - since);
    setStatus(status, 'error', `Thank you! Please wait ${wait} seconds before sending another wish.`);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.dataset.loading = 'true';
  setStatus(status, 'info', 'Sending your wish…');

  try {
    await addDoc(collection(db, CFG.collection), {
      name,
      message,
      approved: false,
      createdAt: serverTimestamp(),
    });
    writeLastSubmit();
    form.reset();
    updateCounter();
    setStatus(
      status,
      'success',
      'Thank you! Your wish has been received and will appear here once the couple has seen it. 💕'
    );
  } catch (err) {
    console.error('[guestbook] submit failed:', err);
    setStatus(status, 'error', friendlyError(err));
  } finally {
    submitBtn.disabled = false;
    delete submitBtn.dataset.loading;
  }
}

function updateCounter() {
  const counter = $('wish-counter');
  const len = $('wish-message').value.length;
  counter.textContent = `${len} / ${CFG.maxMessageLength}`;
  counter.dataset.over = String(len > CFG.maxMessageLength);
}

/* ---------- public API ---------- */

export function initGuestbook() {
  const form = $('wish-form');
  const setup = $('guestbook-setup');

  $('wish-name').maxLength = CFG.maxNameLength;
  $('wish-message').maxLength = CFG.maxMessageLength;
  updateCounter();
  $('wish-message').addEventListener('input', updateCounter);

  if (!isFirebaseConfigured || !db) {
    setup.hidden = false;
    form.querySelector('fieldset').disabled = true;
    setStatus(
      $('wishes-state'),
      'info',
      'Wishes will appear here once the guestbook is connected.'
    );
    return;
  }

  form.addEventListener('submit', handleSubmit);
  $('wishes-more').addEventListener('click', () => loadWishes());
  loadWishes({ reset: true });
}

/**
 * Save an RSVP (only called when FEATURES.rsvp.saveToFirestore is true).
 * Throws if Firebase is not configured so the caller never fakes success.
 */
export async function saveRsvp({ name, attending, guests }) {
  if (!isFirebaseConfigured || !db) throw new Error('firebase-not-configured');
  await addDoc(collection(db, FEATURES.rsvp.collection), {
    name,
    attending,
    guests,
    createdAt: serverTimestamp(),
  });
}
