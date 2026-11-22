// Sunday Media – shared team chat (Firebase Firestore, real-time)
// Self-contained: does not depend on app.js.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, addDoc, query, orderBy, limitToLast,
  onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---- 1. CONFIG: paste from Firebase console > Project settings > Your apps ----
const firebaseConfig = {
  apiKey: "AIzaSyCs-tYC1lrGt7ASf55zEQ50Q_ZARe6taEY",
  authDomain: "media-operator-tool.firebaseapp.com",
  projectId: "media-operator-tool",
  storageBucket: "media-operator-tool.firebasestorage.app",
  messagingSenderId: "1036073291573",
  appId: "1:1036073291573:web:bdc66367c5b3efdd6dc67c"
};

// Messages from this display name are highlighted as the media lead.
const LEAD_NAME = "Rob";
const MAX_MESSAGES = 200;
// -------------------------------------------------------------------------------

const NAME_KEY = "sundayMedia:chatName";
const SEEN_KEY = "sundayMedia:chatLastSeen";
const $ = (id) => document.getElementById(id);

const el = {
  fab: $("chat-fab"), badge: $("chat-badge"), panel: $("chat-panel"),
  list: $("chat-list"), form: $("chat-form"), input: $("chat-input"),
  send: $("chat-send"), close: $("chat-close"), rename: $("chat-rename"),
  status: $("chat-status")
};

let uid = null;
let messages = [];
let lastSeen = Number(localStorage.getItem(SEEN_KEY) || 0);
let firstSnapshot = true;
let unsubscribeMessages = null;
let listening = false;

const getName = () => (localStorage.getItem(NAME_KEY) || "").trim();

function askName(force = false) {
  let name = getName();
  if (name && !force) return name;
  const entered = prompt("Your name (shown with your messages):", name || "");
  if (entered === null) return name;
  name = entered.trim().slice(0, 40);
  if (name) localStorage.setItem(NAME_KEY, name);
  return name;
}

function setStatus(state, text) {
  el.status.dataset.state = state;
  el.status.textContent = text;
}

function authErrorMessage(err) {
  if (err.code === "auth/admin-restricted-operation" || err.code === "auth/operation-not-allowed") {
    return "Enable anonymous sign-in in Firebase Authentication";
  }
  return `Chat sign-in failed${err.code ? ` (${err.code})` : ""}`;
}

function isOpen() { return !el.panel.hidden; }

function openChat() {
  el.panel.hidden = false;
  el.fab.setAttribute("aria-expanded", "true");
  if (!getName()) askName();
  markSeen();
  render();
  setTimeout(() => el.input.focus(), 50);
}

function closeChat() {
  el.panel.hidden = true;
  el.fab.setAttribute("aria-expanded", "false");
  el.fab.focus();
}

function msgTime(m) {
  return m.createdAt?.toMillis ? m.createdAt.toMillis() : Date.now();
}

function markSeen() {
  const latest = messages.length ? msgTime(messages[messages.length - 1]) : Date.now();
  lastSeen = Math.max(lastSeen, latest);
  localStorage.setItem(SEEN_KEY, String(lastSeen));
  updateBadge();
}

function updateBadge() {
  const unread = messages.filter((m) => m.uid !== uid && msgTime(m) > lastSeen).length;
  el.badge.hidden = unread === 0 || isOpen();
  el.badge.textContent = unread > 99 ? "99+" : String(unread);
}

function fmtTime(ms) {
  const d = new Date(ms);
  const today = new Date().toDateString() === d.toDateString();
  const t = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return today ? t : `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ${t}`;
}

function render() {
  const nearBottom = el.list.scrollHeight - el.list.scrollTop - el.list.clientHeight < 80;
  el.list.replaceChildren();

  if (!messages.length) {
    const li = document.createElement("li");
    li.className = "chat-empty";
    li.textContent = "No messages yet. Ask a question and the media lead will reply.";
    el.list.append(li);
    return;
  }

  for (const m of messages) {
    const li = document.createElement("li");
    li.className = "chat-msg";
    if (m.uid === uid) li.classList.add("mine");
    if ((m.name || "").toLowerCase() === LEAD_NAME.toLowerCase()) li.classList.add("lead");

    const meta = document.createElement("div");
    meta.className = "chat-meta";
    const who = document.createElement("strong");
    who.textContent = m.name || "Unknown";
    const when = document.createElement("time");
    when.textContent = m.createdAt ? fmtTime(msgTime(m)) : "Sending…";
    meta.append(who, when);

    const body = document.createElement("p");
    body.textContent = m.text; // textContent prevents HTML injection

    li.append(meta, body);
    el.list.append(li);
  }

  if (nearBottom || firstSnapshot) el.list.scrollTop = el.list.scrollHeight;
}

function notify(newMsgs) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (document.visibilityState === "visible" && isOpen()) return;
  for (const m of newMsgs) {
    try { new Notification(`Sunday Media – ${m.name}`, { body: m.text.slice(0, 120), tag: "sunday-media-chat" }); }
    catch { /* some mobile browsers only allow notifications via service worker */ }
  }
}

function autosize() {
  el.input.style.height = "auto";
  el.input.style.height = Math.min(el.input.scrollHeight, 120) + "px";
}

// ---- Firebase ----
let db, msgsRef;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  msgsRef = collection(db, "chat");
  const auth = getAuth(app);

  onAuthStateChanged(auth, (user) => {
    if (unsubscribeMessages) unsubscribeMessages();
    unsubscribeMessages = null;
    listening = false;
    uid = user ? user.uid : null;
    if (!user) return;
    setStatus("connecting", "Connecting…");
    const q = query(msgsRef, orderBy("createdAt", "asc"), limitToLast(MAX_MESSAGES));
    listening = true;
    unsubscribeMessages = onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
      setStatus(snap.metadata.fromCache ? (navigator.onLine ? "connecting" : "error") : "live",
        snap.metadata.fromCache
          ? (navigator.onLine ? "Connecting… (cached messages)" : "Offline – showing cached messages")
          : "Live");
      const incoming = [];
      snap.docChanges().forEach((c) => {
        if (c.type === "added" && !firstSnapshot) {
          const d = c.doc.data();
          if (d.uid !== uid) incoming.push(d);
        }
      });
      messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      render();
      if (isOpen() && document.visibilityState === "visible") markSeen(); else updateBadge();
      if (incoming.length) notify(incoming);
      firstSnapshot = false;
    }, (err) => {
      listening = false;
      console.error("Chat listener failed", err);
      setStatus("error", err.code === "permission-denied"
        ? "Chat access denied – check Firestore rules"
        : `Chat unavailable${err.code ? ` (${err.code})` : ""}`);
    });
  });

  signInAnonymously(auth).catch((err) => {
    console.error("Chat sign-in failed", err);
    setStatus("error", authErrorMessage(err));
  });
} catch (err) {
  console.error(err);
  setStatus("error", "Chat not configured");
}

window.addEventListener("online", () => {
  if (listening) setStatus("connecting", "Connecting…");
});
window.addEventListener("offline", () => {
  if (listening) setStatus("error", "Offline – messages will send when reconnected");
});

// ---- UI events ----
el.fab.addEventListener("click", () => (isOpen() ? closeChat() : openChat()));
el.close.addEventListener("click", closeChat);
el.rename.addEventListener("click", () => askName(true));
el.panel.addEventListener("keydown", (e) => { if (e.key === "Escape") closeChat(); });
el.input.addEventListener("input", autosize);
el.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); el.form.requestSubmit(); }
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && isOpen()) markSeen();
});

el.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = el.input.value.trim().slice(0, 1000);
  if (!text) return;
  if (!uid || !msgsRef || !listening) return;
  const name = askName();
  if (!name) return;

  // Ask once for notification permission (useful for the person monitoring)
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }

  el.send.disabled = true;
  try {
    await addDoc(msgsRef, { text, name, uid, createdAt: serverTimestamp() });
    el.input.value = "";
    autosize();
  } catch (err) {
    console.error("Chat message send failed", err);
    alert(err.code === "permission-denied"
      ? "Message could not be sent. Check the Firestore rules for chat."
      : `Message could not be sent${err.code ? ` (${err.code})` : ""}. Check your connection and try again.`);
  } finally {
    el.send.disabled = false;
    el.input.focus();
  }
});

render();
