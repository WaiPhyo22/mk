/**
 * =====================================================================
 *  WEDDING WEBSITE CONFIGURATION — edit this one file to update the site
 * =====================================================================
 *
 * Everything that changes between couples / events lives here:
 *   1. WEDDING   – names, date, time, venue, map link, families
 *   2. GALLERY   – photo list (drop files into assets/images/)
 *   3. FIREBASE  – Firebase web config for the guestbook
 *   4. FEATURES  – guestbook / RSVP switches
 *
 * Details below were taken from the printed invitation (Invitation.jpg).
 * Please double-check spelling and the map link before sharing the site.
 */

export const WEDDING = {
  couple: {
    groom: 'Kaung Myat Ko Ko',
    bride: 'Khaing Su Su Zaw',
    groomMm: 'ကောင်းမြတ်ကိုကို',
    brideMm: 'ခိုင်စုစုဇော်',
  },

  /**
   * WEDDING DATE — used by the countdown timer.
   * ISO 8601 format with the Myanmar time-zone offset (+06:30).
   * Set to '' (empty string) to hide the countdown and show a placeholder.
   */
  dateISO: '2026-10-29T08:00:00+06:30',

  // Text shown on the page (not used for calculations).
  dateDisplay: 'Thursday, 29 October 2026',
  dateDisplayMm: '၁၃၈၈ ခုနှစ်၊ သီတင်းကျွတ်လဆုတ် (၃) ရက်၊ ကြာသပတေးနေ့',
  timeDisplay: '8:00 AM – 12:00 PM',
  timeDisplayMm: 'နံနက် ၈:၀၀ နာရီမှ နေ့လည် ၁၂:၀၀ နာရီအထိ',

  venue: {
    name: 'Wedding Pavilion at the residence of U Tint Zaw & Daw Thin Thin Mar',
    nameMm: 'ဦးတင့်ဇော် + ဒေါ်သင်းသင်းမာ တို့၏ နေအိမ် မင်္ဂလာမဏ္ဍပ်',
    address: 'Taung Kaing (South) Village, Singu Township, Mandalay Region, Myanmar',
    addressMm: 'တောင်ကိုင်း (တ) ရွာ၊ စဉ့်ကူးမြို့နယ်၊ မန္တလေးတိုင်းဒေသကြီး',
    /**
     * Google Maps link. Replace with the exact pin:
     * open Google Maps → find the house → Share → Copy link → paste here.
     * Leave '' to hide the map button.
     */
    mapUrl:
      'https://www.google.com/maps/search/?api=1&query=Taung+Kaing+Village+Singu+Township+Mandalay+Region+Myanmar',
  },

  families: {
    groomParentsMm: 'ဦးတင်လှိုင် + ဒေါ်အောင် တို့၏ သား',
    brideParentsMm: 'ဦးတင့်ဇော် + ဒေါ်သင်းသင်းမာ တို့၏ သမီး',
  },

  /**
   * Optional hero background photo, e.g. 'assets/images/hero.webp'.
   * Leave '' to use the built-in ivory & blush gradient.
   * Recommended: landscape, ~1600px wide, WebP, under 250 KB.
   */
  heroImage: '',
};

/**
 * PHOTO GALLERY
 * Add your photos to assets/images/ and list them here.
 *   thumb – small version for the grid (~600–800px wide, WebP)
 *   full  – larger version for the lightbox (~1600px wide)
 *   alt   – short description for screen readers
 *   fit   – optional 'contain' to show the whole image in the grid (no cropping)
 * Entries with thumb: '' render as elegant "photo coming soon" placeholders.
 */
export const GALLERY = [
  {
    thumb: 'assets/images/invitation-800.webp',
    full: 'assets/images/invitation-1600.webp',
    alt: 'Our wedding invitation card',
    fit: 'contain',
  },
  { thumb: '', full: '', alt: 'Couple photo 1' },
  { thumb: '', full: '', alt: 'Couple photo 2' },
  { thumb: '', full: '', alt: 'Couple photo 3' },
  { thumb: '', full: '', alt: 'Couple photo 4' },
  { thumb: '', full: '', alt: 'Couple photo 5' },
];

/**
 * FIREBASE WEB CONFIG (for the guestbook)
 * Firebase Console → Project settings → General → Your apps → Web app → "SDK setup and configuration" → Config.
 * These values are NOT secrets — they identify your project. Security comes
 * from firestore.rules. NEVER put service-account keys or admin credentials here.
 * Leave apiKey empty and the guestbook will show a "not configured yet" notice.
 */
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyB3EtlHtmxoEMGiK9CVXilbLnSOtjM6T0E',
  authDomain: 'kandk-a137e.firebaseapp.com',
  projectId: 'kandk-a137e',
  storageBucket: 'kandk-a137e.firebasestorage.app',
  messagingSenderId: '563600517113',
  appId: '1:563600517113:web:c14e02e9141a734294bf28',
};

/**
 * OPTIONAL: Firebase App Check with reCAPTCHA v3 (strongly recommended).
 * Paste the reCAPTCHA v3 *site* key here (see README → App Check).
 */
export const APP_CHECK_SITE_KEY = '';

export const FEATURES = {
  guestbook: {
    collection: 'wedding_wishes',
    pageSize: 8,
    maxNameLength: 60,       // keep in sync with firestore.rules
    maxMessageLength: 500,   // keep in sync with firestore.rules
    cooldownSeconds: 60,     // per-browser wait between submissions
    minSecondsOnForm: 3,     // bots tend to submit instantly
  },
  rsvp: {
    /**
     * false = the RSVP form validates input but does NOT store anything,
     * and tells guests to confirm directly with the family.
     * true  = responses are saved to Firestore collection `rsvp_responses`.
     *         Only turn this on after enabling the RSVP rule in firestore.rules
     *         (see README → "Enabling RSVP storage").
     */
    saveToFirestore: false,
    collection: 'rsvp_responses',
    maxGuests: 10,
  },
};
