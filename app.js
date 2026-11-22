/* ==========================================================================
   Sunday Media — app.js
   Zero-build, vanilla ES module. Runs directly from GitHub Pages.
   Data lives in ONE Firestore document (real-time sync) with a
   localStorage fallback so the app works before Firebase is configured.
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. FIREBASE CONFIG — paste your values from:
      Firebase console → Project settings → General → Your apps → Web app → Config
      Leave the "YOUR_..." placeholders in place to run in Local (offline) mode.
   -------------------------------------------------------------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyCs-tYC1lrGt7ASf55zEQ50Q_ZARe6taEY",
  authDomain: "media-operator-tool.firebaseapp.com",
  projectId: "media-operator-tool",
  storageBucket: "media-operator-tool.firebasestorage.app",
  messagingSenderId: "1036073291573",
  appId: "1:1036073291573:web:bdc66367c5b3efdd6dc67c"
};

// Sign in anonymously before checklist sync so rules can require `request.auth != null`.
// Enable "Anonymous" in Firebase console → Authentication → Sign-in method first.
const USE_ANONYMOUS_AUTH = true;

// Where the single shared document lives: /sundayMedia/main
const FS_COLLECTION = "sundayMedia";
const FS_DOC = "main";

/* --------------------------------------------------------------------------
   2. APP CONSTANTS
   -------------------------------------------------------------------------- */
const FIREBASE_SDK = "https://www.gstatic.com/firebasejs/10.14.1";
const LS_STATE = "sundayMedia:state";
const LS_THEME = "sundayMedia:theme";
const LS_TAB = "sundayMedia:tab";
const DEFAULT_PIN = "1234";
const SCHEMA = 1;
const DOC_LIMIT = 1_000_000;   // stay safely under Firestore's 1 MiB document limit
const UNDO_MS = 8000;          // undo toast lifetime
const IMG_MAX = 800;           // max image width/height in px
const IMG_QUALITY = 0.7;       // JPEG quality
const TAB_IDS = ["setup", "service", "setdown", "faq"];

/* --------------------------------------------------------------------------
   3. SEED DATA — default Sunday Media Operator run sheet
   -------------------------------------------------------------------------- */
function buildSeed() {
  let n = 0;
  const id = (p) => `${p}${++n}`;
  const T = (text, o = {}) => ({
    id: id("t"), text, note: "", subSteps: [], time: "",
    isReference: false, faqId: "", image: "", done: false, ...o,
  });
  const R = (text, subSteps, o = {}) => T(text, { isReference: true, subSteps, ...o });
  const G = (title, items, time = "") => ({ id: id("g"), title, time, items });

  return {
    schema: SCHEMA,
    updatedAt: 0,
    settings: { pin: DEFAULT_PIN },
    tabs: [
      {
        id: "setup", title: "Setup", groups: [
          G("Arrival 8:30am - Initial Setup", [
            T("Turn on Stage TVs in Wesley's using remote on the stage.", {
              note: "*Note:* HDMI switch on stage should be set to source 1; change using the button on the top of the switch if needed (blue light indicator on the front tells you the source it is on).",
              faqId: "faq-tvs",
            }),
            T("Turn on Wesley's bar TV using remote in the drawer of the unit below the TV."),
            T("Pick up a radio en route back to the sanctuary."),
            T("Turn on the front TVs using the wall socket up the stairs to the pulpit.", {
              note: "The 4th and 5th TVs may need turning on using the remote on the sound box on the pulpit.",
            }),
            T("Turn on sanctuary cameras and flip lens caps:", {
              subSteps: [
                "Bottom right, next to the kitchen",
                "Two bottom center cameras (will need a chair for these; remove top camera lens cap)",
                "Bottom right, next to the buggy park",
                "Front camera above the pulpit (be careful navigating the wires)",
                "Head back to media desk: turn on master white switch, top right camera, and top centre camera (between sound and media desk—long reach)",
              ],
            }),
            T("Turn on confidence monitor / lyrics TVs using the remote on the media desk."),
          ], "8:30 AM"),

          G("Setting Up Livestream Test", [
            T("Log onto the laptop and load Safari."),
            T("Navigate to YouTube Studio."),
            T("Click **Create** (top right) and select **Go live** to load the main livestream page."),
            T("Ensure stream visibility is set to **Unlisted** so it doesn't go public early."),
          ]),

          G("Worship Set Runthrough", [
            T("Turn on the computer screens and Mac.", {
              note: "*Tip:* If login screen isn't visible, press Space a few times, Backspace an equal number, and type the password 'blind'.",
              faqId: "faq-mac",
            }),
            T("Open ProPresenter and select background images/camera slide to verify picture on main stage TVs.", {
              note: "Validate Wesley's TVs are on (ask someone to check if worship is starting).",
              faqId: "faq-tvs",
            }),
            T("In ProPresenter (top right), select **Live → Start Stream** to send feed to YouTube Studio."),
            T("Right-click the incoming video in YouTube Studio, copy the URL, paste into a new browser tab, and unmute to monitor livestream audio."),
            T("Run through the worship set with the worship team to learn songs and verify lyric arrangements."),
            T("**Run a sound check with the sound team using the service countdown or notices video before prayer.**"),
            T("End the test livestream before prayer: click **Live → Stop Stream** in ProPresenter.", { time: "9:30 AM" }),
          ]),

          G("Other Tasks", [
            T("Get iPads from Room 5 (Kids, Welcome, and 1–2 spares for notices & sermon — often done by Joanna)."),
          ]),

          G("After Prayer", [
            T("In YouTube Studio → **Edit**, change livestream visibility to **Public** and add to playlists (**Sunday Service** + current preaching series)."),
            T("Verify welcome slides are active at 10:00 AM (should be automatic).", { time: "10:00 AM" }),
            T("Turn on the livestream in ProPresenter.", { time: "10:15 AM" }),
            T("Be upstairs at the media desk by 10:24 AM at the latest.", { time: "10:24 AM" }),
            T("At 10:25 AM **EXACTLY**, trigger the service countdown (use computer clock or right screen clock) and set camera to **4. Middle Centre**.", { time: "10:25 AM EXACT" }),
          ]),
        ],
      },
      {
        id: "service", title: "Main Service", groups: [
          G("Camera Guidance (Reference)", [
            R("General Camera Assignments", [
              "**Notices & Closeup / Sermon:** Camera 5 (Bottom Centre)",
              "**Worship:** Cameras 1 – 4 and 6",
              "**Camera 7 (Front Centre):** Generally unused, unless highlighting someone in church being recognised.",
            ], { faqId: "faq-cameras" }),
          ]),
          G("Worship", [
            T("Follow through the worship set (be ready if the worship leader goes off-script). Cycle worship cameras roughly every 4 slides or between verses/choruses/bridges."),
            T("**Offering (between 3rd and 4th song):** Put the Giving QR code on the centre screen.", {
              note: "**Important:** Select the third slide to clear the Giving QR code before starting the final song.",
            }),
          ]),
          G("Notices & Sermon", [
            T("**Notices:** Select a camera slide transitioning into notices. 10–15 seconds after the host introduces themselves, switch to **Camera 5** and start the notices slide loop. Wait for host cue to play the 5-minute break video."),
            T("**Sermon:** Come out of notices onto **Camera 5** (preacher should be in position before the break finishes)."),
          ]),
          G("Service Closing", [
            T("As ministry time starts, stay on **Camera 5** until saying goodbye to the livestream, then select **Slide loop to live stream** and switch to **Camera 6** (switch to Cam 6 early if people on stage are walking off camera)."),
            T("Once the service closes in prayer, select **Slide loop everywhere** (unless substantial ministry is happening)."),
            T("**Radio the kids team** to let them know the service is over and they can bring the kids down (go tell them in person if there is no response)."),
          ]),
        ],
      },
      {
        id: "setdown", title: "Set Down", groups: [
          G("First (Immediately After Service)", [
            T("Turn off cameras and close/put on lens caps and covers."),
            T("Return the radio."),
            T("Set YouTube livestream settings back to **Unlisted** and update the stream title date to next Sunday."),
          ]),
          G("Once Most People Have Left", [
            T("Turn off ProPresenter and shut down the Mac."),
            T("Turn off the laptop."),
            T("Turn off top TV (Confidence monitor)."),
            T("Turn off front five TVs (wall plug switch + TV remote for the final two screens)."),
            T("Turn off crèche and buggy park TVs."),
            T("Turn off Wesley's TVs."),
            T("Turn off the standing lights above the pulpit (and front centre camera if not done yet)."),
          ]),
        ],
      },
    ],
    faqs: [
      {
        id: "faq-tvs",
        title: "TVs are not all showing welcome slides when loading ProPresenter",
        steps: [
          "Check that the TVs are actually turned on.",
          "Verify the TV input is set to **Sanctuary** (generally only applicable to Wesley's TVs).",
          "Check that the HDMI switch on Wesley's stage is set to **Source 1** (blue light indicator).",
          "If all of the above are met, **Shut Down** (do not Restart) the Mac and turn it back on again.",
        ],
        image: "",
      },
      {
        id: "faq-cameras",
        title: "Cameras on the livestream freeze repeatedly",
        steps: [
          "Unplug the USB cable from the front of the Mac and replug it after a few seconds.",
          "If freezing continues, unplug the HDMI cable for **Camera 4** (look for HDMI Input 4 on the back of the ATEM switcher).",
        ],
        image: "",
      },
      {
        id: "faq-mac",
        title: "Mac login screen does not appear on boot",
        steps: [
          "Wait a few seconds—the login prompt may be rendering on an inactive display.",
          "Press **Space** a few times, press **Backspace** the exact same number of times, and type the password \"blind\", then press Enter. Once logged in, displays will return to normal.",
        ],
        image: "",
      },
    ],
  };
}

/* --------------------------------------------------------------------------
   4. UTILITIES
   -------------------------------------------------------------------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = (p = "id") => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const str = (v) => (typeof v === "string" ? v : v == null ? "" : String(v));
const lines = (v) => str(v).split("\n").map((s) => s.trim()).filter(Boolean);
const clone = (o) => JSON.parse(JSON.stringify(o));
const byteSize = (o) => new Blob([JSON.stringify(o)]).size;
const fmtKB = (b) => `${Math.round(b / 1024)} KB`;
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const swap = (arr, i, j) => { if (j < 0 || j >= arr.length) return false; [arr[i], arr[j]] = [arr[j], arr[i]]; return true; };

/** Escape HTML special characters. */
function esc(s) {
  return str(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** Tiny safe markdown: **bold** and *italic*. Strips stray "[cite: N]" markers. */
function md(s) {
  return esc(str(s).replace(/\s*\[cite:\s*[\d,\s]+\]/gi, ""))
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<em>$2</em>");
}

const ICON = {
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="M12 17v5"/><path d="M9 3h6l-1 6 4 4H6l4-4z"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  image: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></svg>',
};

/* --------------------------------------------------------------------------
   5. STATE & NORMALISATION
   -------------------------------------------------------------------------- */
let state = null;            // the single source of truth (mirrors the Firestore doc)
let remote = null;           // { fs, ref } once Firebase is connected
let editMode = false;
let activeTab = "setup";
let undoStack = [];          // [{ id, prev }]
const openDrawers = new Set();
const openFaqs = new Set();
let lastRenderedJson = "";

function normItem(i = {}) {
  return {
    id: str(i.id) || uid("t"),
    text: str(i.text),
    note: str(i.note),
    subSteps: Array.isArray(i.subSteps) ? i.subSteps.map(str).filter(Boolean) : [],
    time: str(i.time),
    isReference: !!i.isReference,
    faqId: str(i.faqId),
    image: typeof i.image === "string" && i.image.startsWith("data:image/") ? i.image : "",
    done: !!i.done && !i.isReference,
  };
}
function normGroup(g = {}) {
  return { id: str(g.id) || uid("g"), title: str(g.title), time: str(g.time), items: (Array.isArray(g.items) ? g.items : []).map(normItem) };
}
function normFaq(f = {}) {
  return {
    id: str(f.id) || uid("faq"),
    title: str(f.title),
    steps: Array.isArray(f.steps) ? f.steps.map(str).filter(Boolean) : [],
    image: typeof f.image === "string" && f.image.startsWith("data:image/") ? f.image : "",
  };
}
/** Coerce any stored/imported object into a valid state shape. */
function normalize(raw) {
  const s = raw && typeof raw === "object" ? raw : {};
  const seedTabs = [["setup", "Setup"], ["service", "Main Service"], ["setdown", "Set Down"]];
  const tabsIn = Array.isArray(s.tabs) ? s.tabs : [];
  return {
    schema: SCHEMA,
    updatedAt: Number(s.updatedAt) || 0,
    settings: { pin: /^\d{4}$/.test(str(s.settings?.pin)) ? s.settings.pin : DEFAULT_PIN },
    tabs: seedTabs.map(([id, title]) => {
      const t = tabsIn.find((x) => x && x.id === id);
      return { id, title, groups: (t && Array.isArray(t.groups) ? t.groups : []).map(normGroup) };
    }),
    faqs: (Array.isArray(s.faqs) ? s.faqs : []).map(normFaq),
  };
}

const getTab = (id) => state.tabs.find((t) => t.id === id);
const getFaq = (id) => state.faqs.find((f) => f.id === id);
function findItem(id) {
  for (const tab of state.tabs) for (const group of tab.groups) {
    const item = group.items.find((i) => i.id === id);
    if (item) return { tab, group, item };
  }
  return null;
}
function findGroup(id) {
  for (const tab of state.tabs) {
    const group = tab.groups.find((g) => g.id === id);
    if (group) return { tab, group };
  }
  return null;
}

/* --------------------------------------------------------------------------
   6. STORAGE — localStorage cache + optional Firestore real-time sync
   -------------------------------------------------------------------------- */
function readLocal() {
  try { const raw = localStorage.getItem(LS_STATE); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeLocal(s) {
  try { localStorage.setItem(LS_STATE, JSON.stringify(s)); }
  catch (e) { console.warn("localStorage write failed", e); }
}
function isFirebaseConfigured() {
  return ["apiKey", "projectId", "appId"].every((k) => {
    const v = firebaseConfig[k];
    return typeof v === "string" && v.trim() && !v.startsWith("YOUR_");
  });
}

function setSync(stateName, label) {
  const el = $("#sync");
  const labels = { local: "Local", connecting: "Connecting…", live: "Live", offline: "Offline · queued", error: "Sync error" };
  el.dataset.state = stateName;
  el.lastElementChild.textContent = label || labels[stateName] || stateName;
}

/** Save state locally and push to Firestore (fire-and-forget; Firestore queues offline writes). */
function persist() {
  state.updatedAt = Date.now();
  writeLocal(state);
  if (!remote) return;
  remote.fs.setDoc(remote.ref, clone(state)).catch((err) => {
    console.error("Firestore write failed", err);
    setSync("error");
    showToast(`Sync failed: ${err.code || err.message}`);
  });
}

/**
 * Apply a mutation, enforce the document size limit, persist and re-render.
 * Returns false (and rolls back) if the document would be too large.
 */
function commit(mutate, { rerender = true } = {}) {
  const before = JSON.stringify(state);
  mutate();
  const bytes = byteSize(state);
  if (bytes > DOC_LIMIT) {
    state = JSON.parse(before);
    alertDialog("Too much data", `This change would make the saved data ${fmtKB(bytes)}, above the ~1 MB Firestore limit. Remove or replace some reference images and try again.`);
    return false;
  }
  persist();
  if (rerender) render(true);
  return true;
}

async function initStorage() {
  // Paint instantly from cache (or seed) — then upgrade to live sync if configured.
  const cached = readLocal();
  state = cached ? normalize(cached) : buildSeed();
  if (!cached) writeLocal(state);
  render(true);

  if (!isFirebaseConfigured()) { setSync("local"); return; }
  setSync("connecting");

  try {
    const [{ initializeApp }, fs] = await Promise.all([
      import(`${FIREBASE_SDK}/firebase-app.js`),
      import(`${FIREBASE_SDK}/firebase-firestore.js`),
    ]);
    const app = initializeApp(firebaseConfig);

    if (USE_ANONYMOUS_AUTH) {
      const auth = await import(`${FIREBASE_SDK}/firebase-auth.js`);
      await auth.signInAnonymously(auth.getAuth(app));
    }

    // Persistent cache = works through patchy church Wi-Fi; writes queue and sync later.
    let db;
    try {
      db = fs.initializeFirestore(app, {
        localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
      });
    } catch {
      db = fs.getFirestore(app);
    }

    const ref = fs.doc(db, FS_COLLECTION, FS_DOC);
    remote = { fs, ref };
    let seeding = false;

    fs.onSnapshot(ref, { includeMetadataChanges: true }, async (snap) => {
      if (!snap.exists()) {
        // Only seed once the SERVER confirms the document is missing (not just the cache).
        if (snap.metadata.fromCache || seeding) return;
        seeding = true;
        state = buildSeed();
        writeLocal(state);
        render(true);
        try { await fs.setDoc(ref, clone(state)); showToast("Firestore seeded with default run sheet"); }
        catch (e) { console.error(e); setSync("error"); showToast(`Seeding failed: ${e.code || e.message}`); }
        return;
      }
      setSync(snap.metadata.fromCache ? "offline" : "live");
      const next = normalize(snap.data());
      if (JSON.stringify(next) === JSON.stringify(state)) return; // nothing new
      state = next;
      writeLocal(state);
      render();
    }, (err) => {
      console.error("Firestore listener error", err);
      setSync("error");
      showToast(err.code === "permission-denied" ? "Firestore permission denied — check your security rules" : `Sync error: ${err.code || err.message}`);
    });
  } catch (err) {
    console.error("Firebase init failed — staying in local mode", err);
    remote = null;
    setSync("error", "Local (Firebase failed)");
  }
}

/* --------------------------------------------------------------------------
   7. RENDERING
   -------------------------------------------------------------------------- */
const badge = (t) => `<span class="badge ${/exact/i.test(t) ? "badge-exact" : ""}">${ICON.clock}${esc(t)}</span>`;

function render(force = false) {
  if (!state) return;
  const json = JSON.stringify(state) + editMode + activeTab;
  if (!force && json === lastRenderedJson) return;
  lastRenderedJson = json;

  document.body.classList.toggle("editing", editMode);
  $("#edit-banner").hidden = !editMode;
  $("#btn-lock").setAttribute("aria-label", editMode ? "Open settings" : "Unlock edit mode");

  renderNav();
  const view = $("#view");
  view.innerHTML = activeTab === "faq" ? renderFaqTab() : renderChecklistTab(getTab(activeTab));
  updateUndoBtn();
}

function renderNav() {
  $$(".tab").forEach((b) => {
    if (b.dataset.tab === activeTab) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  for (const tab of state.tabs) {
    const tasks = tab.groups.flatMap((g) => g.items).filter((i) => !i.isReference);
    const left = tasks.filter((i) => !i.done).length;
    const el = $(`[data-count="${tab.id}"]`);
    if (!el) continue;
    el.textContent = tasks.length ? (left ? String(left) : "✓") : "";
    el.classList.toggle("zero", tasks.length > 0 && left === 0);
  }
}

function renderChecklistTab(tab) {
  const tasks = tab.groups.flatMap((g) => g.items).filter((i) => !i.isReference);
  const done = tasks.filter((i) => i.done).length;
  let html = `<div class="tab-title"><h2>${esc(tab.title)}</h2>${tasks.length ? `<span class="progress">${done} / ${tasks.length} done</span>` : ""}</div>`;

  if (!tab.groups.length) html += `<div class="empty">No sections yet.${editMode ? "" : " Unlock edit mode to add some."}</div>`;

  tab.groups.forEach((g, gi) => {
    const gTasks = g.items.filter((i) => !i.isReference);
    const gDone = gTasks.filter((i) => i.done).length;
    const active = editMode ? g.items : g.items.filter((i) => i.isReference || !i.done);
    const completed = editMode ? [] : g.items.filter((i) => !i.isReference && i.done);
    const complete = gTasks.length > 0 && gDone === gTasks.length;

    html += `<section class="group" data-group="${esc(g.id)}">
      <header class="group-head">
        <div class="group-title"><h3>${md(g.title)}</h3>${g.time ? badge(g.time) : ""}</div>
        ${gTasks.length ? `<span class="count ${complete ? "complete" : ""}">${gDone}/${gTasks.length}</span>` : ""}
      </header>
      ${editMode ? `<div class="group-tools">
        <button class="mini-btn" type="button" data-action="group-up" data-id="${esc(g.id)}" aria-label="Move section up" ${gi === 0 ? "disabled" : ""}>${ICON.up}</button>
        <button class="mini-btn" type="button" data-action="group-down" data-id="${esc(g.id)}" aria-label="Move section down" ${gi === tab.groups.length - 1 ? "disabled" : ""}>${ICON.down}</button>
        <button class="mini-btn" type="button" data-action="group-edit" data-id="${esc(g.id)}">${ICON.edit} Section</button>
        <button class="mini-btn danger" type="button" data-action="group-delete" data-id="${esc(g.id)}">${ICON.trash} Delete</button>
      </div>` : ""}
      <div class="list">
        ${active.map((it, i) => itemCard(it, i, g.items.length)).join("")}
        ${!editMode && complete ? `<div class="all-done">${ICON.check} Section complete</div>` : ""}
      </div>
      ${completed.length ? `<details class="drawer" data-drawer="${esc(g.id)}" ${openDrawers.has(g.id) ? "open" : ""}>
        <summary>${ICON.chev}<span>Completed (${completed.length})</span></summary>
        <div class="list">${completed.map((it) => itemCard(it)).join("")}</div>
      </details>` : ""}
      ${editMode ? `<div class="add-row">
        <button class="add-btn" type="button" data-action="item-add" data-group="${esc(g.id)}">${ICON.plus} Task</button>
        <button class="add-btn" type="button" data-action="ref-add" data-group="${esc(g.id)}">${ICON.pin} Reference card</button>
      </div>` : ""}
    </section>`;
  });

  if (editMode) html += `<button class="add-btn big" type="button" data-action="group-add">${ICON.plus} Add section header</button>`;
  return html;
}

function itemCard(it, index = 0, total = 1) {
  const isRef = it.isReference;
  const faq = it.faqId ? getFaq(it.faqId) : null;
  const interactive = editMode
    ? `data-action="item-edit" data-id="${esc(it.id)}" role="button" tabindex="0"`
    : isRef ? "" : `data-action="toggle" data-id="${esc(it.id)}" role="checkbox" aria-checked="${it.done}" tabindex="0"`;

  return `<div class="card ${isRef ? "ref" : "task"} ${it.done ? "done" : ""}" data-item="${esc(it.id)}" ${interactive}>
    ${isRef ? "" : `<div class="check" aria-hidden="true">${ICON.check}</div>`}
    <div class="card-body">
      ${isRef ? `<div class="ref-label">${ICON.pin} Reference</div>` : ""}
      ${it.time ? `<div class="card-meta">${badge(it.time)}</div>` : ""}
      <div class="card-text">${md(it.text)}</div>
      ${it.subSteps.length ? `<ul class="substeps">${it.subSteps.map((s) => `<li>${md(s)}</li>`).join("")}</ul>` : ""}
      ${it.note ? `<div class="card-note">${md(it.note)}</div>` : ""}
      ${editMode ? `<div class="edit-row">
        ${it.done ? `<span class="tag-done">Completed</span>` : ""}
        <button class="mini-btn" type="button" data-action="item-up" data-id="${esc(it.id)}" aria-label="Move up" ${index === 0 ? "disabled" : ""}>${ICON.up}</button>
        <button class="mini-btn" type="button" data-action="item-down" data-id="${esc(it.id)}" aria-label="Move down" ${index === total - 1 ? "disabled" : ""}>${ICON.down}</button>
        <button class="mini-btn" type="button" data-action="item-edit" data-id="${esc(it.id)}">${ICON.edit} Edit</button>
        <button class="mini-btn danger" type="button" data-action="item-delete" data-id="${esc(it.id)}" aria-label="Delete">${ICON.trash}</button>
      </div>` : ""}
    </div>
    ${(it.image || faq) ? `<div class="card-aside">
      ${it.image ? `<button class="thumb" type="button" data-action="image" data-id="${esc(it.id)}" aria-label="View reference image"><img src="${it.image}" alt="" loading="lazy" /></button>` : ""}
      ${faq ? `<button class="help-btn" type="button" data-action="faq" data-faq="${esc(faq.id)}" aria-label="Troubleshooting: ${esc(faq.title)}"><span>?</span></button>` : ""}
    </div>` : ""}
  </div>`;
}

function faqBody(f) {
  return `<ol class="steps">${f.steps.map((s) => `<li>${md(s)}</li>`).join("")}</ol>
    ${f.image ? `<button class="faq-image" type="button" data-action="image" data-id="${esc(f.id)}" aria-label="View image full screen">
      <img src="${f.image}" alt="" loading="lazy" /><span class="faq-image-label">${ICON.image} Tap to enlarge</span></button>` : ""}`;
}

function renderFaqTab() {
  let html = `<div class="tab-title"><h2>FAQ</h2><span class="progress">${state.faqs.length} entries</span></div>`;
  if (editMode) html += `<button class="add-btn big" type="button" data-action="faq-add">${ICON.plus} Add FAQ entry</button>`;
  if (!state.faqs.length) html += `<div class="empty">No troubleshooting entries yet.</div>`;
  state.faqs.forEach((f, i) => {
    html += `<details class="faq" data-faq-card="${esc(f.id)}" ${editMode || openFaqs.has(f.id) ? "open" : ""}>
      <summary><span class="faq-ico">?</span><span class="q">${md(f.title)}</span>${f.image ? ICON.image : ""}${ICON.chev}</summary>
      <div class="faq-body">${faqBody(f)}</div>
      ${editMode ? `<div class="edit-row">
        <button class="mini-btn" type="button" data-action="faq-up" data-id="${esc(f.id)}" aria-label="Move up" ${i === 0 ? "disabled" : ""}>${ICON.up}</button>
        <button class="mini-btn" type="button" data-action="faq-down" data-id="${esc(f.id)}" aria-label="Move down" ${i === state.faqs.length - 1 ? "disabled" : ""}>${ICON.down}</button>
        <button class="mini-btn" type="button" data-action="faq-edit" data-id="${esc(f.id)}">${ICON.edit} Edit</button>
        <button class="mini-btn danger" type="button" data-action="faq-delete" data-id="${esc(f.id)}" aria-label="Delete">${ICON.trash}</button>
      </div>` : ""}
    </details>`;
  });
  return html;
}

function flash(id) {
  requestAnimationFrame(() => {
    const el = document.querySelector(`[data-item="${CSS.escape(id)}"]`);
    if (!el) return;
    el.classList.remove("flash");
    void el.offsetWidth;
    el.classList.add("flash");
    el.addEventListener("animationend", () => el.classList.remove("flash"), { once: true });
  });
}

/* --------------------------------------------------------------------------
   8. CHECKLIST INTERACTIONS + UNDO
   -------------------------------------------------------------------------- */
let toggling = false;

async function toggleItem(id) {
  if (toggling) return;
  const found = findItem(id);
  if (!found || found.item.isReference) return;
  toggling = true;
  try {
    const card = document.querySelector(`[data-item="${CSS.escape(id)}"]`);
    const willBeDone = !found.item.done;
    if (card) {
      card.classList.toggle("done", willBeDone); // instant check feedback
      if (!reduceMotion()) {
        await card.animate(
          [{ opacity: 1, transform: "none" }, { opacity: 0, transform: willBeDone ? "translateX(24px)" : "translateY(-8px)" }],
          { duration: 220, delay: 120, easing: "ease-in", fill: "forwards" }
        ).finished.catch(() => {});
      }
    }
    const fresh = findItem(id); // state may have been replaced by a remote snapshot
    if (!fresh) return;
    const prev = fresh.item.done;
    fresh.item.done = !prev;
    undoStack.push({ id, prev });
    if (undoStack.length > 50) undoStack.shift();
    persist();
    render(true);
    flash(id);
    showToast(fresh.item.done ? "Task completed" : "Moved back to list", { undo: true });
  } finally {
    toggling = false;
  }
}

function undo() {
  const last = undoStack.pop();
  hideToast();
  if (!last) { updateUndoBtn(); return; }
  const found = findItem(last.id);
  if (!found) { updateUndoBtn(); return; }
  found.item.done = last.prev;
  if (found.tab.id !== activeTab) setTab(found.tab.id, false);
  if (last.prev) openDrawers.add(found.group.id);
  persist();
  render(true);
  flash(last.id);
}

function updateUndoBtn() { $("#btn-undo").disabled = undoStack.length === 0; }

/* Toast */
let toastTimer = null;
function showToast(msg, { undo: withUndo = false, ms = withUndo ? UNDO_MS : 3000 } = {}) {
  const t = $("#toast");
  $("#toast-msg").textContent = msg;
  $("#toast-undo").hidden = !withUndo;
  t.hidden = false;
  t.style.setProperty("--toast-ms", `${ms}ms`);
  t.classList.remove("timing");
  void t.offsetWidth;
  t.classList.add("timing");
  requestAnimationFrame(() => t.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, ms);
  updateUndoBtn();
}
function hideToast() {
  const t = $("#toast");
  clearTimeout(toastTimer);
  t.classList.remove("show");
  setTimeout(() => { if (!t.classList.contains("show")) t.hidden = true; }, 260);
}

/* --------------------------------------------------------------------------
   9. LAYERS — bottom sheet, dialog, lightbox
   -------------------------------------------------------------------------- */
let sheetCleanup = null;
let lastFocus = null;

function openSheet(html, onMount) {
  const layer = $("#sheet-layer");
  if (sheetCleanup) { sheetCleanup(); sheetCleanup = null; }
  lastFocus = document.activeElement;
  $("#sheet-body").innerHTML = html;
  layer.hidden = false;
  $(".sheet", layer).scrollTop = 0;
  requestAnimationFrame(() => layer.classList.add("open"));
  sheetCleanup = onMount ? onMount($("#sheet-body")) || null : null;
  document.body.style.overflow = "hidden";
}
function closeSheet() {
  const layer = $("#sheet-layer");
  if (layer.hidden) return;
  layer.classList.remove("open");
  if (sheetCleanup) { sheetCleanup(); sheetCleanup = null; }
  setTimeout(() => { if (!layer.classList.contains("open")) { layer.hidden = true; $("#sheet-body").innerHTML = ""; } }, 300);
  document.body.style.overflow = "";
  lastFocus?.focus?.({ preventScroll: true });
}

let dialogResolve = null;
function openDialog(html, onMount) {
  const layer = $("#dialog-layer");
  $("#dialog-body").innerHTML = html;
  layer.hidden = false;
  requestAnimationFrame(() => layer.classList.add("open"));
  onMount?.($("#dialog-body"));
}
function closeDialog(result) {
  const layer = $("#dialog-layer");
  layer.classList.remove("open");
  setTimeout(() => { if (!layer.classList.contains("open")) layer.hidden = true; }, 200);
  const r = dialogResolve; dialogResolve = null;
  r?.(result);
}

function confirmDialog({ title, message = "", confirmLabel = "Confirm", danger = false }) {
  return new Promise((resolve) => {
    dialogResolve = resolve;
    openDialog(`<h2>${esc(title)}</h2>${message ? `<p>${esc(message)}</p>` : ""}
      <div class="dialog-actions">
        <button class="btn" type="button" data-d="no">Cancel</button>
        <button class="btn ${danger ? "btn-danger" : "btn-primary"}" type="button" data-d="yes">${esc(confirmLabel)}</button>
      </div>`, (root) => {
      $('[data-d="no"]', root).onclick = () => closeDialog(false);
      $('[data-d="yes"]', root).onclick = () => closeDialog(true);
      $('[data-d="yes"]', root).focus();
    });
  });
}
function alertDialog(title, message) {
  return new Promise((resolve) => {
    dialogResolve = resolve;
    openDialog(`<h2>${esc(title)}</h2><p>${esc(message)}</p>
      <div class="dialog-actions"><button class="btn btn-primary" type="button" data-d="ok">OK</button></div>`,
      (root) => { const b = $('[data-d="ok"]', root); b.onclick = () => closeDialog(true); b.focus(); });
  });
}

/** 4-digit PIN keypad. Resolves true when validate(code) passes, false if cancelled. */
function pinDialog({ title = "Enter PIN", subtitle = "Unlock edit mode", validate }) {
  return new Promise((resolve) => {
    dialogResolve = resolve;
    let code = "";
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "cancel", "0", "del"];
    openDialog(`<div class="pin" id="pin">
        <h2>${esc(title)}</h2><p>${esc(subtitle)}</p>
        <div class="pin-dots" aria-live="polite" aria-label="PIN digits entered">${"<span></span>".repeat(4)}</div>
        <div class="pin-pad">${keys.map((k) => k === "cancel"
          ? `<button type="button" class="pin-aux" data-k="cancel">Cancel</button>`
          : k === "del" ? `<button type="button" class="pin-aux" data-k="del" aria-label="Delete digit">⌫</button>`
          : `<button type="button" data-k="${k}">${k}</button>`).join("")}</div>
      </div>`, (root) => {
      const pin = $("#pin", root);
      const paint = () => $$(".pin-dots span", root).forEach((s, i) => s.classList.toggle("on", i < code.length));
      const press = (k) => {
        if (k === "cancel") { cleanup(); closeDialog(false); return; }
        if (k === "del") { code = code.slice(0, -1); paint(); return; }
        if (code.length >= 4) return;
        code += k; paint();
        if (code.length === 4) {
          if (validate(code)) { cleanup(); setTimeout(() => closeDialog(true), 120); }
          else {
            pin.classList.add("shake");
            if (navigator.vibrate) navigator.vibrate(120);
            setTimeout(() => { pin.classList.remove("shake"); code = ""; paint(); }, 450);
          }
        }
      };
      const onKey = (e) => {
        if (/^\d$/.test(e.key)) press(e.key);
        else if (e.key === "Backspace") press("del");
        else if (e.key === "Escape") press("cancel");
      };
      const cleanup = () => document.removeEventListener("keydown", onKey);
      document.addEventListener("keydown", onKey);
      $$("[data-k]", root).forEach((b) => (b.onclick = () => press(b.dataset.k)));
    });
  });
}

function openLightbox(src) {
  if (!src) return;
  const lb = $("#lightbox");
  $("#lightbox-img").src = src;
  lb.hidden = false;
  requestAnimationFrame(() => lb.classList.add("open"));
}
function closeLightbox() {
  const lb = $("#lightbox");
  lb.classList.remove("open");
  setTimeout(() => { lb.hidden = true; $("#lightbox-img").removeAttribute("src"); }, 200);
}
function imageFor(id) {
  return findItem(id)?.item.image || getFaq(id)?.image || "";
}

/** Contextual FAQ bottom sheet — keeps your place in the checklist. */
function openFaqSheet(faqId) {
  const f = getFaq(faqId);
  if (!f) { showToast("That FAQ entry no longer exists"); return; }
  openSheet(`<div class="sheet-head"><div class="eyebrow">Troubleshooting</div><h2>${md(f.title)}</h2></div>
    ${faqBody(f)}
    <button class="btn btn-block" type="button" data-close>Back to checklist</button>`);
}

/* --------------------------------------------------------------------------
   10. IMAGE UPLOAD — canvas resize to 800px, JPEG 0.7, Base64 data URL
   -------------------------------------------------------------------------- */
async function compressImage(file, max = IMG_MAX, quality = IMG_QUALITY) {
  if (!file || !file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("This image format can't be read by your browser."));
      i.src = url;
    });
    const w = img.naturalWidth, h = img.naturalHeight;
    const scale = Math.min(1, max / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";            // JPEG has no alpha — flatten transparent PNGs onto white
    ctx.fillRect(0, 0, cw, ch);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, cw, ch);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    return { dataUrl, width: cw, height: ch, bytes: Math.round((dataUrl.length * 3) / 4) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const imageFieldHtml = () => `<div class="field">
  <span>Reference image</span>
  <div class="img-field">
    <div class="img-preview" data-role="preview"></div>
    <div class="img-actions">
      <label class="btn">${ICON.camera}<span data-role="pick-label">Add photo</span>
        <input type="file" accept="image/*" data-role="file" /></label>
      <button type="button" class="btn btn-danger-ghost" data-role="remove">${ICON.trash} Remove</button>
    </div>
    <small data-role="info">Resized to max ${IMG_MAX}px and compressed (JPEG ${IMG_QUALITY}) before saving.</small>
  </div>
</div>`;

function bindImageField(root, get, set) {
  const preview = $('[data-role="preview"]', root);
  const info = $('[data-role="info"]', root);
  const paint = () => {
    const src = get();
    preview.innerHTML = src ? `<img src="${src}" alt="Image preview" />` : "No image attached";
    $('[data-role="remove"]', root).hidden = !src;
    $('[data-role="pick-label"]', root).textContent = src ? "Replace photo" : "Add photo";
  };
  $('[data-role="file"]', root).addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    info.textContent = "Compressing…";
    try {
      const r = await compressImage(file);
      set(r.dataUrl);
      info.textContent = `Compressed to ${r.width}×${r.height} · ${fmtKB(r.bytes)} (from ${fmtKB(file.size)})`;
    } catch (err) {
      info.textContent = err.message;
    }
    paint();
  });
  $('[data-role="remove"]', root).addEventListener("click", () => { set(""); info.textContent = "Image will be removed when you save."; paint(); });
  paint();
}

/* --------------------------------------------------------------------------
   11. EDIT MODE — editors for items, sections and FAQs
   -------------------------------------------------------------------------- */
async function toggleLock() {
  if (editMode) { openSettings(); return; }
  const ok = await pinDialog({ validate: (c) => c === state.settings.pin });
  if (ok) { editMode = true; hideToast(); render(true); showToast("Edit mode unlocked"); }
}
function exitEditMode() { editMode = false; closeSheet(); render(true); }

function faqOptions(selected) {
  return `<option value="">None</option>` + state.faqs.map((f) =>
    `<option value="${esc(f.id)}" ${f.id === selected ? "selected" : ""}>${esc(f.title.replace(/\*/g, ""))}</option>`).join("");
}

/** Add/edit a checklist task or pinned reference card. */
function openItemEditor({ groupId, itemId = null, asReference = false }) {
  const existing = itemId ? findItem(itemId) : null;
  const gid = existing ? existing.group.id : groupId;
  const draft = existing ? clone(existing.item) : normItem({ isReference: asReference });
  let image = draft.image;

  openSheet(`<form class="form" novalidate>
      <h2>${existing ? "Edit item" : asReference ? "New reference card" : "New task"}</h2>
      <div class="seg" role="radiogroup" aria-label="Item type">
        <label><input type="radio" name="kind" value="task" /><span>Checklist task</span></label>
        <label><input type="radio" name="kind" value="ref" /><span>Pinned reference</span></label>
      </div>
      <label class="field"><span>Text</span><textarea name="text" rows="3" placeholder="What needs doing?"></textarea>
        <small>Formatting: **bold**, *italic*</small></label>
      <label class="field"><span>Sub-steps / lines</span><textarea name="subSteps" rows="4" placeholder="One per line (optional)"></textarea></label>
      <label class="field"><span>Note / tip</span><textarea name="note" rows="2" placeholder="Optional"></textarea></label>
      <div class="field"><span>Time badge</span>
        <input name="time" placeholder="e.g. 10:25 AM EXACT" autocomplete="off" />
        <div class="chips">${["8:30 AM", "9:30 AM", "10:00 AM", "10:15 AM", "10:24 AM", "10:25 AM EXACT"].map((t) => `<button type="button" class="chip" data-time="${t}">${t}</button>`).join("")}
          <button type="button" class="chip" data-time="">Clear</button></div>
        <small>Include "EXACT" to show a red urgent badge.</small></div>
      <label class="field"><span>Linked FAQ (shows a ? button)</span><select name="faqId">${faqOptions(draft.faqId)}</select></label>
      ${imageFieldHtml()}
      <div class="form-error" data-role="error"></div>
      <div class="form-actions">
        <button type="button" class="btn" data-close>Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>`, (root) => {
    const form = $("form", root);
    form.text.value = draft.text;
    form.subSteps.value = draft.subSteps.join("\n");
    form.note.value = draft.note;
    form.time.value = draft.time;
    $(`input[name="kind"][value="${draft.isReference ? "ref" : "task"}"]`, form).checked = true;
    $$("[data-time]", form).forEach((b) => (b.onclick = () => (form.time.value = b.dataset.time)));
    bindImageField(root, () => image, (v) => (image = v));
    if (!existing) setTimeout(() => form.text.focus(), 320);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = form.text.value.trim();
      if (!text) { $('[data-role="error"]', root).textContent = "Please enter the item text."; form.text.focus(); return; }
      const isRef = form.kind.value === "ref";
      const next = normItem({
        ...draft, text, isReference: isRef,
        subSteps: lines(form.subSteps.value), note: form.note.value.trim(),
        time: form.time.value.trim(), faqId: form.faqId.value, image,
        done: isRef ? false : draft.done,
      });
      const ok = commit(() => {
        const target = findGroup(gid);
        if (!target) throw new Error("Section no longer exists");
        const idx = target.group.items.findIndex((i) => i.id === next.id);
        if (idx >= 0) target.group.items[idx] = next; else target.group.items.push(next);
      });
      if (ok) { closeSheet(); flash(next.id); }
    });
  });
}

/** Add/edit a section header (group). */
function openGroupEditor(groupId = null) {
  const existing = groupId ? findGroup(groupId) : null;
  openSheet(`<form class="form" novalidate>
      <h2>${existing ? "Edit section" : "New section header"}</h2>
      <label class="field"><span>Section title</span><input name="title" placeholder="e.g. Arrival 8:30am - Initial Setup" autocomplete="off" /></label>
      <label class="field"><span>Time badge (optional)</span><input name="time" placeholder="e.g. 8:30 AM" autocomplete="off" /></label>
      <div class="form-error" data-role="error"></div>
      <div class="form-actions">
        <button type="button" class="btn" data-close>Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>`, (root) => {
    const form = $("form", root);
    form.title.value = existing?.group.title || "";
    form.time.value = existing?.group.time || "";
    setTimeout(() => form.title.focus(), 320);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = form.title.value.trim();
      if (!title) { $('[data-role="error"]', root).textContent = "Please enter a title."; return; }
      const ok = commit(() => {
        const g = existing ? findGroup(existing.group.id)?.group : null;
        if (g) { g.title = title; g.time = form.time.value.trim(); }
        else getTab(activeTab).groups.push(normGroup({ title, time: form.time.value.trim() }));
      });
      if (ok) closeSheet();
    });
  });
}

/** Add/edit an FAQ entry. */
function openFaqEditor(faqId = null) {
  const existing = faqId ? getFaq(faqId) : null;
  const draft = existing ? clone(existing) : normFaq({});
  let image = draft.image;
  openSheet(`<form class="form" novalidate>
      <h2>${existing ? "Edit FAQ" : "New FAQ entry"}</h2>
      <label class="field"><span>Problem / question</span><textarea name="title" rows="2" placeholder="e.g. Cameras on the livestream freeze repeatedly"></textarea></label>
      <label class="field"><span>Troubleshooting steps</span><textarea name="steps" rows="6" placeholder="One step per line"></textarea>
        <small>One step per line — numbered automatically. Formatting: **bold**, *italic*</small></label>
      ${imageFieldHtml()}
      <div class="form-error" data-role="error"></div>
      <div class="form-actions">
        <button type="button" class="btn" data-close>Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>`, (root) => {
    const form = $("form", root);
    form.title.value = draft.title;
    form.steps.value = draft.steps.join("\n");
    bindImageField(root, () => image, (v) => (image = v));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = form.title.value.trim();
      if (!title) { $('[data-role="error"]', root).textContent = "Please enter the problem or question."; return; }
      const next = normFaq({ ...draft, title, steps: lines(form.steps.value), image });
      const ok = commit(() => {
        const idx = state.faqs.findIndex((f) => f.id === next.id);
        if (idx >= 0) state.faqs[idx] = next; else state.faqs.push(next);
      });
      if (ok) { openFaqs.add(next.id); closeSheet(); }
    });
  });
}

async function deleteItem(id) {
  const f = findItem(id);
  if (!f) return;
  const label = f.item.text.replace(/\*/g, "").slice(0, 80);
  if (!(await confirmDialog({ title: "Delete this item?", message: label, confirmLabel: "Delete", danger: true }))) return;
  commit(() => { const g = findItem(id)?.group; if (g) g.items = g.items.filter((i) => i.id !== id); });
  undoStack = undoStack.filter((u) => u.id !== id);
}
async function deleteGroup(id) {
  const f = findGroup(id);
  if (!f) return;
  const n = f.group.items.length;
  if (!(await confirmDialog({ title: `Delete “${f.group.title}”?`, message: n ? `This also deletes the ${n} item${n === 1 ? "" : "s"} inside it.` : "", confirmLabel: "Delete section", danger: true }))) return;
  commit(() => { const t = findGroup(id)?.tab; if (t) t.groups = t.groups.filter((g) => g.id !== id); });
}
async function deleteFaq(id) {
  const f = getFaq(id);
  if (!f) return;
  const links = state.tabs.flatMap((t) => t.groups.flatMap((g) => g.items)).filter((i) => i.faqId === id).length;
  if (!(await confirmDialog({ title: "Delete this FAQ?", message: `${f.title}${links ? ` — it will be unlinked from ${links} item${links === 1 ? "" : "s"}.` : ""}`, confirmLabel: "Delete", danger: true }))) return;
  commit(() => {
    state.faqs = state.faqs.filter((x) => x.id !== id);
    state.tabs.forEach((t) => t.groups.forEach((g) => g.items.forEach((i) => { if (i.faqId === id) i.faqId = ""; })));
  });
}

function moveItem(id, dir) {
  commit(() => { const f = findItem(id); if (f) { const a = f.group.items; const i = a.indexOf(f.item); swap(a, i, i + dir); } });
  flash(id);
}
function moveGroup(id, dir) {
  commit(() => { const f = findGroup(id); if (f) { const a = f.tab.groups; const i = a.indexOf(f.group); swap(a, i, i + dir); } });
}
function moveFaq(id, dir) {
  commit(() => { const i = state.faqs.findIndex((f) => f.id === id); swap(state.faqs, i, i + dir); });
}

/* --------------------------------------------------------------------------
   12. SETTINGS — PIN, backup export/import, re-seed
   -------------------------------------------------------------------------- */
function openSettings() {
  const bytes = byteSize(state);
  const pct = Math.min(100, Math.round((bytes / DOC_LIMIT) * 100));
  const images = state.tabs.flatMap((t) => t.groups.flatMap((g) => g.items)).filter((i) => i.image).length + state.faqs.filter((f) => f.image).length;
  const syncText = remote ? `Firestore · /${FS_COLLECTION}/${FS_DOC}` : "Local only (this device). Add Firebase config in app.js to sync.";

  openSheet(`<h2>Settings</h2>
    <section class="settings-section">
      <h3>Sync &amp; storage</h3>
      <div class="kv"><span class="muted">Mode</span><span>${esc(syncText)}</span></div>
      <div class="meter ${pct > 85 ? "hot" : ""}"><i style="width:${pct}%"></i></div>
      <div class="kv"><span class="muted">${fmtKB(bytes)} of ~${fmtKB(DOC_LIMIT)} used</span><span class="muted">${images} image${images === 1 ? "" : "s"}</span></div>
    </section>

    <section class="settings-section">
      <h3>Change PIN</h3>
      <form class="pin-form" data-role="pin-form" novalidate>
        <label class="field"><span>New PIN</span><input name="p1" type="password" inputmode="numeric" pattern="\\d{4}" maxlength="4" autocomplete="off" /></label>
        <label class="field"><span>Confirm</span><input name="p2" type="password" inputmode="numeric" pattern="\\d{4}" maxlength="4" autocomplete="off" /></label>
        <div class="form-error" data-role="pin-error" style="grid-column:1/-1"></div>
        <button class="btn btn-primary" type="submit">Update PIN</button>
      </form>
    </section>

    <section class="settings-section">
      <h3>Backup</h3>
      <div class="settings-row">
        <button class="btn" type="button" data-role="export">${ICON.download} Export JSON</button>
        <label class="btn">${ICON.upload} Import JSON<input type="file" accept="application/json,.json" data-role="import" hidden /></label>
      </div>
      <small class="muted">Exports include checklist, FAQs, images and the PIN.</small>
    </section>

    <section class="settings-section">
      <h3>Danger zone</h3>
      <div class="settings-row">
        <button class="btn btn-danger-ghost" type="button" data-role="reseed">Re-seed default run sheet</button>
      </div>
      <small class="muted">Replaces all sections, items and FAQs with the original defaults. Your PIN is kept.</small>
    </section>

    <div class="form-actions">
      <button class="btn" type="button" data-close>Close</button>
      <button class="btn btn-primary" type="button" data-role="exit">Exit Edit Mode</button>
    </div>`, (root) => {
    // PIN change
    $('[data-role="pin-form"]', root).addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.target, err = $('[data-role="pin-error"]', root);
      const p1 = f.p1.value.trim(), p2 = f.p2.value.trim();
      if (!/^\d{4}$/.test(p1)) { err.textContent = "PIN must be exactly 4 digits."; return; }
      if (p1 !== p2) { err.textContent = "PINs don't match."; return; }
      commit(() => { state.settings.pin = p1; }, { rerender: false });
      f.reset(); err.textContent = "";
      showToast("PIN updated");
    });

    // Export
    $('[data-role="export"]', root).addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `sunday-media-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });

    // Import
    $('[data-role="import"]', root).addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      let parsed;
      try { parsed = JSON.parse(await file.text()); } catch { alertDialog("Import failed", "That file isn't valid JSON."); return; }
      if (!parsed || !Array.isArray(parsed.tabs) || !Array.isArray(parsed.faqs)) {
        alertDialog("Import failed", "This doesn't look like a Sunday Media backup (missing tabs or faqs).");
        return;
      }
      const next = normalize(parsed);
      if (!parsed.settings?.pin) next.settings.pin = state.settings.pin;
      const count = next.tabs.reduce((n, t) => n + t.groups.reduce((m, g) => m + g.items.length, 0), 0);
      if (!(await confirmDialog({ title: "Replace all data?", message: `Import ${count} items and ${next.faqs.length} FAQs from “${file.name}”. Current data will be overwritten.`, confirmLabel: "Import", danger: true }))) return;
      if (commit(() => { state = next; })) { undoStack = []; closeSheet(); showToast("Backup imported"); }
    });

    // Re-seed
    $('[data-role="reseed"]', root).addEventListener("click", async () => {
      if (!(await confirmDialog({ title: "Re-seed default data?", message: "All custom sections, items, FAQs and images will be replaced with the default run sheet. Export a backup first if unsure.", confirmLabel: "Re-seed", danger: true }))) return;
      const pin = state.settings.pin;
      if (commit(() => { state = buildSeed(); state.settings.pin = pin; })) { undoStack = []; closeSheet(); showToast("Default run sheet restored"); }
    });

    $('[data-role="exit"]', root).addEventListener("click", exitEditMode);
  });
}

/* --------------------------------------------------------------------------
   13. HEADER — clock, theme, reset, tabs
   -------------------------------------------------------------------------- */
function startClock() {
  const el = $("#clock");
  const pad = (n) => String(n).padStart(2, "0");
  const tick = () => {
    const d = new Date();
    el.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    setTimeout(tick, 1000 - d.getMilliseconds() + 5); // align to the second boundary
  };
  tick();
}

function applyThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#f6f6f7";
}
function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(LS_THEME, next); } catch {}
  applyThemeColor();
}

async function resetForNextSunday() {
  const ok = await confirmDialog({
    title: "Reset for next Sunday?",
    message: "This unchecks every task across Setup, Main Service and Set Down. Nothing is deleted.",
    confirmLabel: "Reset all",
  });
  if (!ok) return;
  commit(() => { state.tabs.forEach((t) => t.groups.forEach((g) => g.items.forEach((i) => (i.done = false)))); }, { rerender: false });
  undoStack = [];
  openDrawers.clear();
  setTab("setup");
  window.scrollTo({ top: 0, behavior: "smooth" });
  showToast("All clear — ready for next Sunday");
}

function setTab(id, scroll = true) {
  if (!TAB_IDS.includes(id)) id = "setup";
  activeTab = id;
  try { localStorage.setItem(LS_TAB, id); } catch {}
  if (location.hash !== `#${id}`) history.replaceState(null, "", `#${id}`);
  render(true);
  if (scroll) window.scrollTo({ top: 0 });
}

/* --------------------------------------------------------------------------
   14. EVENT WIRING (single delegated handler)
   -------------------------------------------------------------------------- */
function wireEvents() {
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) { closeSheet(); return; }
    const el = e.target.closest("[data-action]");
    if (!el || el.disabled) return;
    const { action, id } = el.dataset;
    switch (action) {
      case "tab": setTab(el.dataset.tab); break;
      case "toggle": toggleItem(id); break;
      case "faq": openFaqSheet(el.dataset.faq); break;
      case "image": openLightbox(imageFor(id)); break;
      case "item-edit": openItemEditor({ itemId: id }); break;
      case "item-add": openItemEditor({ groupId: el.dataset.group }); break;
      case "ref-add": openItemEditor({ groupId: el.dataset.group, asReference: true }); break;
      case "item-up": moveItem(id, -1); break;
      case "item-down": moveItem(id, 1); break;
      case "item-delete": deleteItem(id); break;
      case "group-add": openGroupEditor(); break;
      case "group-edit": openGroupEditor(id); break;
      case "group-up": moveGroup(id, -1); break;
      case "group-down": moveGroup(id, 1); break;
      case "group-delete": deleteGroup(id); break;
      case "faq-add": openFaqEditor(); break;
      case "faq-edit": openFaqEditor(id); break;
      case "faq-up": moveFaq(id, -1); break;
      case "faq-down": moveFaq(id, 1); break;
      case "faq-delete": deleteFaq(id); break;
    }
  });

  // Keyboard access for card "checkboxes"
  $("#view").addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest?.(".card[data-action]");
    if (!card || card !== e.target) return;
    e.preventDefault();
    card.click();
  });

  // Remember which accordions are open (toggle doesn't bubble → capture)
  $("#view").addEventListener("toggle", (e) => {
    const d = e.target;
    if (d.dataset?.drawer) d.open ? openDrawers.add(d.dataset.drawer) : openDrawers.delete(d.dataset.drawer);
    if (d.dataset?.faqCard && !editMode) d.open ? openFaqs.add(d.dataset.faqCard) : openFaqs.delete(d.dataset.faqCard);
  }, true);

  $("#btn-undo").addEventListener("click", undo);
  $("#toast-undo").addEventListener("click", undo);
  $("#btn-theme").addEventListener("click", toggleTheme);
  $("#btn-reset").addEventListener("click", resetForNextSunday);
  $("#btn-lock").addEventListener("click", toggleLock);
  $("#btn-settings").addEventListener("click", openSettings);
  $("#btn-exit-edit").addEventListener("click", exitEditMode);
  $("#lightbox").addEventListener("click", closeLightbox);

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("#lightbox").hidden) closeLightbox();
    else if (!$("#dialog-layer").hidden) { /* PIN dialog handles its own Escape */ if (!$("#pin")) closeDialog(false); }
    else closeSheet();
  });

  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    if (TAB_IDS.includes(id) && id !== activeTab) setTab(id);
  });
  window.addEventListener("online", () => remote && setSync("connecting"));
  window.addEventListener("offline", () => remote && setSync("offline"));
}

/* --------------------------------------------------------------------------
   15. BOOT
   -------------------------------------------------------------------------- */
(function boot() {
  const fromHash = location.hash.slice(1);
  let saved = null;
  try { saved = localStorage.getItem(LS_TAB); } catch {}
  activeTab = TAB_IDS.includes(fromHash) ? fromHash : TAB_IDS.includes(saved) ? saved : "setup";
  applyThemeColor();
  wireEvents();
  startClock();
  initStorage();
})();
