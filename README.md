# Sunday Media

A minimalist, mobile-first checklist and troubleshooting app for a solo Sunday church media operator.
It runs as plain static files with no build step, is hosted on **GitHub Pages**, and syncs in real time through **Google Firebase Firestore**.

```
index.html   – markup, header, bottom nav, sheet/dialog/lightbox shells
styles.css   – light/dark theme, mobile layout
app.js       – all logic, seed data, Firestore sync, image compression
chat.js      – shared team chat and Firebase anonymous sign-in
chat.css     – chat layout and styling
README.md    – this file
```

---

## 1. Try it locally (no Firebase needed)

The checklist starts in **Local mode** and saves to this browser's `localStorage` if Firebase credentials are not configured. Shared chat requires Firebase and anonymous authentication.

ES modules don't run from `file://`, so serve the folder:

```bash
cd sunday-media
python3 -m http.server 8080
```

Open <http://localhost:8080>. The header shows a grey **Local** dot.

Default edit PIN: **1234**

---

## 2. Create the Firebase project (free Spark tier)

1. Go to <https://console.firebase.google.com>, click **Add project**, give it a name (for example `sunday-media`) and finish. You can leave Google Analytics off.
2. In the left menu, open **Build → Firestore Database** and click **Create database**.
   - Pick a location close to you (for example `europe-west2`, London).
   - Start in **production mode**. You'll set the rules in step 4.
3. Open **Project settings** (cog icon) → **General**, scroll to **Your apps**, and click the **Web** icon (`</>`).
   - Give it a nickname. **Don't** tick Firebase Hosting.
   - Copy the `firebaseConfig` object that appears.

## 3. Configure Firebase and chat

At the top of **both** `app.js` and `chat.js`, replace the configuration with the same Firebase web app configuration:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "sunday-media.firebaseapp.com",
  projectId: "sunday-media",
  storageBucket: "sunday-media.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123",
};
```

> The web `apiKey` is not a secret. Firebase web keys are meant to be public. Your **Firestore rules** are what protect the data.

Team chat always uses anonymous authentication, even when the checklist does not. In **Authentication → Get started → Sign-in method**, enable **Anonymous**. Under **Authentication → Settings → Authorized domains**, add your GitHub Pages domain and any other domain used to access the app. Add `localhost` if you use it for local testing and it is not already listed.

The checklist can optionally use the same anonymous authentication: set `USE_ANONYMOUS_AUTH = true` in `app.js` if your checklist rules require a signed-in user. Leave it `false` if your checklist rules permit unauthenticated access.

## 4. Set Firestore security rules

In **Firestore Database → Rules**, use rules appropriate for your existing project. The following alternatives cover both the checklist and chat. If you already have rules for other collections, preserve those rules rather than replacing them with these examples.

**Option A: simplest.** Anyone can read and write the checklist; anonymous users can read and write chat:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sundayMedia/{docId} {
      allow read, write: if true;
    }
    match /chat/{messageId} {
      allow read, write: if request.auth != null;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Option B: slightly stronger.** Require anonymous sign-in for both the checklist and chat:

1. Enable anonymous sign-in as described in step 3.
2. In `app.js`, set `const USE_ANONYMOUS_AUTH = true;`.
3. Use rules such as:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sundayMedia/{docId} {
      allow read, write: if request.auth != null;
    }
    match /chat/{messageId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Publish the rules, then reload the app. Anonymous sign-in is available to anyone who can access the app; these example rules do not restrict access to your team or prevent anonymous users from editing or deleting data.

> ⚠️ The 4-digit PIN is a **UI lock** that stops accidental edits during a service. It is **not** real security, because the PIN is stored in the same document. Don't put anything sensitive in this app.

## 5. Publish on GitHub Pages

1. Create a new repository on <https://github.com>, for example `sunday-media`. It can be public.
2. Click **Add file → Upload files**, drag in `index.html`, `styles.css`, `app.js`, `chat.js`, `chat.css` and `README.md`, then click **Commit changes**.
3. Go to **Settings → Pages**.
   - **Source:** *Deploy from a branch*
   - **Branch:** `main`, folder `/ (root)`, then **Save**.
4. Wait about a minute and refresh. Your site URL appears at the top, for example
   `https://YOUR-USERNAME.github.io/sunday-media/`.

When it first connects, the app finds the empty Firestore document `/sundayMedia/main` and **fills it automatically** with the default run sheet. The header dot turns green and reads **Live**.

### Add it to your phone's home screen

- **iPhone (Safari):** Share → *Add to Home Screen*
- **Android (Chrome):** ⋮ → *Add to Home screen*

---

## 6. Using the app

| Action | How |
|---|---|
| Check off a task | Tap the card. It moves into **Completed (X)** at the bottom of its section. |
| Un-check | Open **Completed**, then tap the item. It goes back to its original position. |
| Undo | Tap **Undo** on the toast (shown for 8 s) or the ↶ button in the header. |
| Troubleshoot | Tap **?** on a card. The FAQ opens in a bottom sheet and you keep your place. |
| View a photo | Tap the thumbnail to open it full screen. |
| Reset for next Sunday | Tap **Reset** in the header and confirm. This unchecks everything and deletes nothing. |
| Dark / light | Tap the moon/sun icon. Your choice is remembered on each device. |
| Edit | Tap 🔒 and enter the PIN. Use ↑/↓ to reorder, **Edit** to change, and 🗑 to delete. Add sections, tasks, reference cards and FAQs with the dashed buttons. |
| Settings | While unlocked, tap ⚙ (or **Settings** in the banner) to change the PIN, export/import a JSON backup, or re-seed the defaults. |

**Formatting** in any text field: `**bold**` and `*italic*`. In the time-badge field, include `EXACT` (for example `10:25 AM EXACT`) to get a red urgent badge.

**Pinned reference cards** have no checkbox and always stay visible, which suits camera assignments. Put each line in *Sub-steps / lines*.

---

## 7. Images and storage limits

- Photos picked from the camera or photo library are resized in the browser to **max 800 px**, then saved as **JPEG at 0.7 quality** in Base64 **inside the Firestore document**. Firebase Storage isn't needed.
- A typical photo ends up around **40–120 KB**. Firestore allows **1 MiB per document**, so expect roughly **6–10 photos** in total.
- **Settings** shows a usage meter. If a change would go over the limit, the app blocks it and asks you to remove an image.

The whole app stays well within the free Spark tier, because a Sunday's use is only a few hundred document reads and writes.

---

## 8. How sync works

- All data lives in one document: `/sundayMedia/main`. That makes every save a single atomic write.
- Every device listens in real time, so a tick on your phone appears on the media-desk laptop within about a second.
- Firestore's offline cache is turned on. If the church Wi-Fi drops, changes are queued (the dot shows **Offline · queued**) and sync automatically when you're back online.
- `localStorage` keeps a copy as a cache, so the app opens instantly.
- If two devices edit at exactly the same moment, the last write wins. That's fine for a solo operator.

**Moving Local-mode edits to Firebase:** before adding your config, go to *Settings → Export JSON*. After connecting, use *Settings → Import JSON*.

---

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| Header says **Sync error** / "permission denied" | Check the Firestore rules (step 4). If you use anonymous auth, make sure it's enabled and your GitHub domain is authorised. |
| Chat says **Enable anonymous sign-in in Firebase Authentication** | Enable the Anonymous provider in Firebase Authentication (step 3), then reload. |
| Chat says **Chat access denied** | Ensure Firestore rules allow authenticated users to read and write `/chat/{messageId}` (step 4), then reload. |
| Chat says **Chat sign-in failed** | Check the error code in the browser console, the Firebase config in `chat.js`, and the authorised domains in Firebase Authentication. Reload after correcting the configuration. |
| Header says **Local (Firebase failed)** | The config values are wrong or blocked. Open the browser console for details. |
| Changes don't appear on GitHub Pages | Pages caches for a few minutes. Hard-refresh (Shift + Reload) or add `?v=2` to the URL. |
| Blank page when opening `index.html` directly | Serve it over HTTP (see step 1). Modules don't run from `file://`. |
| Forgot the PIN | In the Firebase console, open the document `sundayMedia/main` and edit `settings.pin`. |
| Want to start over | *Settings → Re-seed default run sheet*, or delete the `sundayMedia/main` document in the console and reload. |
