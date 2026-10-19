# Kaung Myat Ko Ko & Khaing Su Su Zaw — Wedding Website

A static, mobile-first wedding website (HTML + CSS + vanilla JavaScript) with a
Firebase Firestore guestbook. It needs no build step and no backend server, and it can be hosted on Vercel.

Wedding details were taken from the printed invitation (`Invitation.jpg`):

| | |
|---|---|
| Date | Thursday, 29 October 2026 (၁၃၈၈ ခုနှစ်၊ သီတင်းကျွတ်လဆုတ် ၃ ရက်) |
| Time | 8:00 AM – 12:00 PM |
| Venue | Wedding pavilion at the residence of U Tint Zaw & Daw Thin Thin Mar, Taung Kaing (South) Village, Singu Township, Mandalay Region |

> ⚠️ Before sharing, check the spelling and replace the **Google Maps link**.
> The current link is a general area search, not the exact house. Both are in `js/config.js`.

---

## Project structure

```
index.html              Page markup (all sections)
css/style.css           Styles: palette, layout, animations
js/config.js            ⭐ THE file to edit: names, date, venue, map, gallery, Firebase config
js/main.js              Navigation, countdown, gallery lightbox, RSVP, lazy-loads the guestbook
js/firebase.js          Firebase initialisation (modular SDK from CDN, optional App Check)
js/guestbook.js         Firestore guestbook: submit, paginated read, spam checks
assets/images/          Optimised images (WebP + JPG)
firestore.rules         Firestore Security Rules
firestore.indexes.json  Composite index needed by the guestbook query
firebase.json           Lets the Firebase CLI deploy the rules and index (optional)
vercel.json             Security and caching headers for Vercel
```

## Run locally

ES modules do not load from `file://`, so serve the folder over HTTP:

```bash
# any one of these, from the project folder
python -m http.server 8080
npx serve .
```

Open http://localhost:8080.

---

## 1. Edit the content (`js/config.js`)

- **`WEDDING.dateISO`** sets the countdown target (`'2026-10-29T08:00:00+06:30'`).
  Set it to `''` and the countdown shows a friendly “date coming soon” message.
- **`WEDDING.venue.mapUrl`**: in Google Maps, find the place, tap **Share → Copy link** and paste the link here.
- **`WEDDING.heroImage`**: optional hero background photo (for example `assets/images/hero.webp`).
- **`GALLERY`**: list your photos. Entries with an empty `thumb` show as “Photo coming soon” tiles.
- **Our Story**: edit the three placeholder chapters directly in `index.html` (search for `EDIT ME`).

### Image tips (for guests on slow connections)
- Export photos as **WebP**: about 800 px wide for thumbnails (under 120 KB) and about 1600 px for the lightbox (under 300 KB).
  Free tool: https://squoosh.app
- Gallery images already use `loading="lazy"`, and Firebase only loads when the guestbook section scrolls into view.

---

## 2. Firebase setup (guestbook)

Until this is done, the guestbook shows a **“Guestbook not connected yet”** notice and does not pretend to save anything.

1. **Create the project**: open https://console.firebase.google.com, choose **Add project**, enter a name (for example `kk-wedding`) and create it. Google Analytics is optional.
2. **Create Firestore**: choose **Build → Firestore Database → Create database**.
   - Pick the location `asia-southeast1` (Singapore), which is close to Myanmar.
   - Start in **production mode**. Do not use test mode: it leaves the database open to everyone.
3. **Register a web app**: open **Project settings (⚙) → General → Your apps → Web (`</>`)**, give it a nickname and register it. Firebase Hosting is not needed.
4. **Copy the config**: copy the `firebaseConfig` object that Firebase shows into `FIREBASE_CONFIG` in `js/config.js`:
   ```js
   export const FIREBASE_CONFIG = {
     apiKey: 'AIza…',
     authDomain: 'kk-wedding.firebaseapp.com',
     projectId: 'kk-wedding',
     storageBucket: 'kk-wedding.appspot.com',
     messagingSenderId: '…',
     appId: '1:…:web:…',
   };
   ```
   These values are **public identifiers, not secrets**. Every Firebase website exposes them, and security comes from the rules.
   **Never** put a service-account JSON or admin key in this project.
5. **Publish the Security Rules**: open **Build → Firestore Database → Rules**, select all (Ctrl+A), paste the contents of `firestore.rules` and click **Publish**.
   ⚠️ Do **not** use **Realtime Database → Rules**. It looks almost the same but only accepts JSON, and it shows
   **"Parse error" on line 1** for these rules. This site does not use Realtime Database at all.
6. **Create the index**: open **Firestore → Indexes → Composite → Add index** with:
   - Collection: `wedding_wishes`
   - Fields: `approved` Ascending, `createdAt` Descending
   - Query scope: Collection

   If you skip this step, the browser console shows an error with a direct “create index” link the first time wishes load. Index creation takes a few minutes.

   *Optional CLI alternative:* `npm i -g firebase-tools`, then `firebase login`, then
   `firebase deploy --only firestore --project <projectId>`. This deploys both the rules and the index.

7. **Restrict the API key (recommended)**: in Google Cloud Console → APIs & Services → Credentials, open the browser key and add **HTTP referrer** restrictions: `https://your-site.vercel.app/*`, your custom domain, and `http://localhost:8080/*`.

### Approving wishes (moderation)

Each new wish is saved with `approved: false` and is **not public** yet. To show it:

1. Open Firebase Console → Firestore → `wedding_wishes`.
2. Open the document, click the `approved` field, change it to `true` and save.

The console uses your Google account's owner permissions, so this is safe. To hide a wish later, set `approved` back to `false` or delete the document.
There is **no admin page in the website** on purpose. A password check written in frontend JavaScript is not real security.

> Want wishes to appear instantly without approval? That is possible but riskier (public spam or abuse goes live straight away).
> You would change the rule to `data.approved == true`, send `approved: true` from `guestbook.js`, and rely on App Check plus deleting bad entries.
> We recommend keeping moderation.

### Data structure

```
wedding_wishes/{autoId}
  name:      string  (1–60 chars)
  message:   string  (2–500 chars)
  createdAt: timestamp (server time; rules require == request.time)
  approved:  boolean (always false on create; only the couple sets true)
```

### What the Security Rules enforce
- Guests can **create** wishes only, with exactly these 4 fields, correct types, length limits, a server timestamp and `approved == false`.
- Guests can **read** only approved wishes.
- **No updates or deletes** from the website, for anyone.
- Every other collection is denied.

### Spam and abuse protection, and its limits
Anonymous public forms can never be fully spam-proof. The site uses several layers:

| Layer | Where | Strength |
|---|---|---|
| Moderation (`approved` flag) | Rules | **Strong**: spam never becomes public |
| Field and length validation | Rules plus client | Strong: the server enforces it |
| Honeypot hidden field | Client | Stops simple bots |
| Minimum 3 s on page before submitting | Client | Stops instant bot posts |
| 60 s cooldown per browser | Client (`localStorage`) | Easily bypassed; courtesy only |
| **Firebase App Check** (optional) | Firebase | **Strong**: blocks requests that do not come from your real site |

Client-side checks can be bypassed by someone calling the Firestore API directly. Rules and moderation are the real protection.
Firestore Rules cannot rate-limit per IP address. For true rate limiting you would need a trusted server (for example a Cloud Function with reCAPTCHA verification),
which this project deliberately avoids. For a wedding guestbook, moderation plus App Check is enough.

#### Enable App Check (recommended)
1. Create a **reCAPTCHA v3** key at https://www.google.com/recaptcha/admin. Add your Vercel domain and `localhost`.
2. Open Firebase Console → **App Check → Apps → your web app → reCAPTCHA v3**, paste the **secret key** and save.
3. Put the **site key** into `APP_CHECK_SITE_KEY` in `js/config.js` and deploy.
4. Check the App Check metrics. When you see verified requests, click **Enforce** for Cloud Firestore.

### Enabling RSVP storage (optional)
By default the RSVP form validates input but **does not save** anything, and it tells guests to confirm directly. To store RSVPs:
1. In `firestore.rules`, uncomment the `rsvp_responses` block and publish the rules.
2. In `js/config.js`, set `FEATURES.rsvp.saveToFirestore = true`.
3. Read the responses in Firebase Console → Firestore → `rsvp_responses`. The rules allow create only, so guests cannot read each other's RSVPs.

---

## 3. Deploy to Vercel (via GitHub)

The project is fully static, with no environment variables and no build.
The Firebase web config lives in `js/config.js`. Plain browser JavaScript cannot read Vercel environment variables (`process.env`) without a build step,
and the web config is public anyway.

1. **Push to GitHub**
   ```bash
   cd D:\kandk
   git init
   git add .
   git commit -m "Wedding website"
   git branch -M main
   git remote add origin https://github.com/<your-user>/kk-wedding.git
   git push -u origin main
   ```
2. **Import into Vercel**: at https://vercel.com/new, choose **Import Git Repository** and select the repo.
   - Framework Preset: **Other**
   - Build Command: *(leave empty)*
   - Output Directory: *(leave empty; the root is served)*
   - Install Command: *(leave empty)*
   - Click **Deploy**.
3. Every `git push` to `main` redeploys automatically.
4. *(Optional)* Add a custom domain under **Project → Settings → Domains**.
5. Add the final domain to the **API key referrer restrictions** and the **reCAPTCHA domains** (if you use App Check).

*CLI alternative:* `npm i -g vercel`, then `vercel` (preview) and `vercel --prod`.

---

## 4. Post-deployment checklist

- [ ] The site loads on a phone. The names, date, time and venue are correct.
- [ ] The countdown shows the days remaining (it switches to “Today is our wedding day!” on the day).
- [ ] **Open in Google Maps** goes to the correct location.
- [ ] Gallery photos open in the lightbox. The arrows, swipe and Esc work.
- [ ] Guestbook: submitting with an empty name or message shows a validation message.
- [ ] Guestbook: a valid wish shows “Thank you! Your wish has been received…”.
- [ ] Firebase Console → `wedding_wishes` contains the new document with `approved: false` and a `createdAt` timestamp.
- [ ] The wish is **not** visible on the site yet. After you set `approved` to `true` and refresh, it **is** visible, newest first.
- [ ] With more than 8 approved wishes, **Load more wishes** appears and works.
- [ ] Rules check: in Firestore → Rules → **Rules Playground**, simulate an unauthenticated `update` or `delete` on a `wedding_wishes` document. It must be **denied**.
- [ ] Rules check: simulate a `create` with `approved: true`. It must be **denied**.
- [ ] The browser console shows no errors (in particular no “requires an index” error).
- [ ] RSVP shows the “not saved” notice, unless you enabled RSVP storage.
