/* Flo-Fab — Google (courriel + Drive) via Google Apps Script, et génération du PDF dans le navigateur */
(function () {
"use strict";
const Flo = window.Flo, { FORMS, esc, L } = Flo;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k, d) { try { const x = localStorage.getItem(k); return x ? JSON.parse(x) : d; } catch (e) { return d; } },
  set(k, x) { try { localStorage.setItem(k, JSON.stringify(x)); return true; } catch (e) { return false; } }
};

/* ======================================================================
   Configuration : lue dans config.js (dépôt GitHub) — jamais saisie sur les appareils.
   Seul « dernier destinataire » est mémorisé localement (confort, pas un réglage).
   ====================================================================== */
const LOCAL = "flofab-cloud-local";
const conf = () => window.FLOFAB_CONFIG || {};
const cfg = () => ({
  url: String(conf().scriptUrl || "").trim(), token: String(conf().token || "").trim(),
  cc: String(conf().ccDefault || "").trim(), auto: conf().autoDrive !== false,
  lastTo: store.get(LOCAL, {}).lastTo || ""
});
const saveCfg = patch => { if (patch && "lastTo" in patch) store.set(LOCAL, { lastTo: String(patch.lastTo || "") }); };
const configured = () => { const c = cfg(); return !!(c.url && c.token); };
// versions précédentes : les réglages étaient enregistrés sur chaque appareil. On les efface (config.js fait foi) et on garde le dernier destinataire.
try {
  const old = store.get("flofab-cloud", null);
  if (old) { if (old.lastTo && !store.get(LOCAL, {}).lastTo) store.set(LOCAL, { lastTo: old.lastTo }); localStorage.removeItem("flofab-cloud"); }
} catch (e) {}

/* ======================================================================
   Génération du PDF (html2canvas + jsPDF, chargés à la demande)
   ====================================================================== */
const loadScript = src => new Promise((res, rej) => {
  const s = document.createElement("script"); s.src = src; s.onload = res;
  s.onerror = () => rej(new Error(L("Impossible de charger " + src, "Unable to load " + src))); document.head.appendChild(s);
});
async function ensureLibs() {
  if (!window.html2canvas) await loadScript("vendor/html2canvas.min.js");
  if (!(window.jspdf && window.jspdf.jsPDF)) await loadScript("vendor/jspdf.umd.min.js");
}

// Le logo SVG est converti en PNG une fois (certains navigateurs refusent de dessiner un SVG dans un canvas)
let logoPngCache = null;
async function logoPng() {
  if (logoPngCache) return logoPngCache;
  const svg = await (await fetch("logo.svg")).text();
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const c = document.createElement("canvas"); c.width = 621 * 2; c.height = 269 * 2;
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return (logoPngCache = c.toDataURL("image/png"));
}

const PAGE = { portrait: { w: 725, h: 988 }, landscape: { w: 965, h: 748 } };   // zone utile en px CSS (marges 12 mm / 9 mm)
const MARGIN_X = 34.016, MARGIN_Y = 25.512;                                    // en points

// où couper les pages : jamais au milieu d'une ligne de tableau, d'un bloc de signature, etc.
// Quand une page commence au milieu d'un tableau, sa ligne d'en-tête (thead) est répétée en haut de la page.
function pageBreaks(holder, pageH) {
  const top0 = holder.getBoundingClientRect().top, total = holder.scrollHeight;
  const box = e => { const r = e.getBoundingClientRect(); return [r.top - top0, r.bottom - top0]; };
  const unbreakable = $$("tr,.m-cols,.avoid,.m-line,.m-ck,.r-sigb,.p-head,.m-it", holder).map(box);
  const tables = $$("table", holder).map(t => { const [a, b] = box(t), th = t.querySelector("thead"); const h = th ? box(th) : null; return { a, b, head: h ? { y0: h[0], y1: h[1] } : null }; });
  const cand = new Set();
  $$("tr,.m-cols,.avoid,.m-bar,.p-bar,.e-title,.m-notes,.p-head,.r-sig,.v-result,.r-info,.e-bar,.e-foot,.p-foot,.p-works,.v-modes,table,.r-title,.r-head", holder)
    .forEach(e => { const [a, b] = box(e); cand.add(Math.round(a)); cand.add(Math.round(b)); });
  const ok = y => !unbreakable.some(([a, b]) => y > a + 1 && y < b - 1);
  const list = [...cand].filter(y => y > 0 && y < total && ok(y)).sort((a, b) => a - b);
  const breaks = []; let start = 0, head = null;
  while (total - start > pageH - (head ? head.y1 - head.y0 : 0) + 1) {
    const limit = start + pageH - (head ? head.y1 - head.y0 : 0);
    const good = list.filter(y => y > start + pageH * 0.4 && y <= limit);
    const y = good.length ? good[good.length - 1] : limit;
    const t = tables.find(t => t.head && t.a + 1 < y && y < t.b - 1);      // la page suivante commence dans ce tableau
    head = t ? t.head : null;
    breaks.push({ y, head }); start = y;
  }
  return breaks;
}

// html2canvas dessine mal les bordures « collapse » (traits doublés et parasites) : on les remplace par des bordures simples de 1 px
function fixTableBorders(root) {
  $$("table.p", root).forEach(t => {
    t.style.borderCollapse = "separate"; t.style.borderSpacing = "0"; t.style.border = "none";
    t.style.borderTop = "1px solid #000"; t.style.borderLeft = "1px solid #000";
    $$("td,th", t).forEach(c => {
      const heavy = c.parentElement.classList.contains("e-total");
      c.style.border = "none"; c.style.borderRight = "1px solid #000"; c.style.borderBottom = "1px solid #000";
      if (heavy) c.style.borderTop = "1px solid #000";
    });
  });
}

// lignes d'écriture (le dégradé répété n'est pas rendu par html2canvas) : on les dessine avec de vrais éléments
function drawRuledLines(doc, root, selector, lh, color, offset) {
  $$(selector, root).forEach(el => {
    el.style.backgroundImage = "none"; el.style.position = "relative"; el.style.overflow = "hidden";
    const h = el.getBoundingClientRect().height, n = Math.floor(h / lh);
    for (let i = 0; i < n; i++) {
      const ln = doc.createElement("div");
      ln.style.cssText = `position:absolute;left:0;right:0;top:${i * lh + lh - 1 + (offset || 0)}px;height:1px;background:${color};pointer-events:none`;
      el.appendChild(ln);
    }
  });
}

async function makePdf(def, state) {
  await ensureLibs();
  const landscape = !!def.landscape, P = PAGE[landscape ? "landscape" : "portrait"];
  const holder = document.getElementById("print");
  holder.innerHTML = def.print(state);
  const png = await logoPng();
  $$("img[src$='logo.svg']", holder).forEach(i => { i.src = png; });
  holder.classList.add("capture"); holder.style.width = P.w + "px";
  try {
    await Promise.all($$("img", holder).map(i => i.complete ? Promise.resolve() : new Promise(r => { i.onload = i.onerror = r; })));
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const breaks = pageBreaks(holder, P.h), total = holder.scrollHeight;
    const canvas = await window.html2canvas(holder, {
      scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false, width: P.w, windowWidth: 1400,
      onclone: doc => {
        const el = doc.getElementById("print");
        el.style.position = "absolute"; el.style.left = "0"; el.style.top = "0";
        fixTableBorders(el);
        drawRuledLines(doc, el, ".p-works", 22, "#999");
        drawRuledLines(doc, el, ".m-nl", 20, "#000");
      }
    });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: "pt", format: "letter", orientation: landscape ? "landscape" : "portrait", compress: true });
    const edges = [0, ...breaks.map(b => b.y), total];
    for (let i = 0; i < edges.length - 1; i++) {
      const y0 = edges[i], y1 = edges[i + 1], head = i > 0 ? breaks[i - 1].head : null;
      const hh = head ? head.y1 - head.y0 : 0, bodyH = Math.max(1, Math.round((y1 - y0) * 2)), headH = Math.round(hh * 2);
      const page = document.createElement("canvas"); page.width = canvas.width; page.height = bodyH + headH;
      const ctx = page.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, page.width, page.height);
      if (head) ctx.drawImage(canvas, 0, Math.round(head.y0 * 2), canvas.width, headH, 0, 0, canvas.width, headH);
      ctx.drawImage(canvas, 0, Math.round(y0 * 2), canvas.width, bodyH, 0, headH, canvas.width, bodyH);
      if (i > 0) pdf.addPage("letter", landscape ? "landscape" : "portrait");
      pdf.addImage(page.toDataURL("image/jpeg", 0.92), "JPEG", MARGIN_X, MARGIN_Y, P.w * 0.75, (y1 - y0 + hh) * 0.75, undefined, "FAST");
    }
    return { base64: pdf.output("datauristring").split(",")[1], pages: edges.length - 1 };
  } finally {
    holder.classList.remove("capture"); holder.style.width = ""; holder.innerHTML = "";
  }
}

/* ======================================================================
   Noms de fichiers
   ====================================================================== */
const clean = s => String(s || "").trim().replace(/[\\/:*?"<>|#%&{}$!'`@=+]/g, "").replace(/\s+/g, "-").slice(0, 40);
function fileBase(type, s) {
  const def = FORMS[type];
  const parts = [s.date || new Date().toISOString().slice(0, 10), clean(def.fileTag), clean(s.customer || s.project || ""), clean(s.job || s.quote || ""), String(s.id || "").slice(-6)];
  return parts.filter(Boolean).join("_");
}

/* ======================================================================
   Appel du script Google Apps Script
   ====================================================================== */
async function post(payload, timeoutMs, override) {
  const c = override || cfg();
  if (!c.url || !c.token) throw new Error(L("Google n'est pas configuré (⚙ Réglages).", "Google is not configured (⚙ Settings)."));
  if (navigator.onLine === false) throw new Error(L("Hors ligne.", "Offline."));
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeoutMs || 120000);
  let res;
  try {
    // « text/plain » = requête simple (pas de pré-vérification CORS, que Google Apps Script ne gère pas)
    res = await fetch(c.url, { method: "POST", body: JSON.stringify(Object.assign({ token: c.token }, payload)), redirect: "follow", signal: ctl.signal });
  } catch (e) {
    throw new Error(e.name === "AbortError" ? L("Délai dépassé.", "Timed out.") : L("Connexion impossible au script Google.", "Unable to reach the Google script."));
  } finally { clearTimeout(t); }
  let j; try { j = await res.json(); } catch (e) { throw new Error(L("Réponse invalide du script Google (vérifiez l'URL et le déploiement « Tout le monde »).", "Invalid response from the Google script (check the URL and the “Anyone” deployment).")); }
  if (!j.ok) throw new Error(errText(j.error));
  return j;
}
function errText(e) {
  if (e === "unauthorized") return L("Jeton refusé : vérifiez le jeton dans la console admin.", "Token rejected: check the token in the admin console.");
  if (e === "pin") return L("Mot de passe incorrect.", "Wrong password.");
  if (e === "locked") return L("Trop d'essais. Réessayez dans 10 minutes.", "Too many attempts. Try again in 10 minutes.");
  if (e === "nopin") return L("Aucun mot de passe administrateur défini dans le script : exécutez « creerAcces » (propriété ADMIN_PASSWORD).", "No admin password is set in the script: run “creerAcces” (ADMIN_PASSWORD property).");
  return String(e || L("Erreur du script Google.", "Google script error."));
}

async function ping(c) {
  c = c || cfg();
  if (!c.url || !c.token) throw new Error(L("Entrez l'URL et le jeton.", "Enter the URL and the token."));
  if (navigator.onLine === false) throw new Error(L("Hors ligne.", "Offline."));
  let res;
  try { res = await fetch(c.url + (c.url.includes("?") ? "&" : "?") + "ping=1&token=" + encodeURIComponent(c.token), { redirect: "follow" }); }
  catch (e) { throw new Error(L("Connexion impossible au script Google.", "Unable to reach the Google script.")); }
  let j; try { j = await res.json(); } catch (e) { throw new Error(L("Réponse invalide : l'URL doit se terminer par /exec et le déploiement doit être « Tout le monde ».", "Invalid response: the URL must end with /exec and the deployment must be “Anyone”.")); }
  if (!j.ok) throw new Error(errText(j.error));
  return j;
}

// le mot de passe de la console admin est vérifié par le script Google (jamais stocké sur l'appareil)
async function adminCheck(pwd, override) { return post({ action: "adminCheck", pin: pwd, requestId: "adm-" + Date.now().toString(36) }, 30000, override); }

function metaFor(type, s) {
  const def = FORMS[type];
  return { type, folder: def.folder, id: s.id, customer: s.customer || s.project || "", job: s.job || s.quote || "", date: s.date || "", tech: s.tech || s.sigTechName || "", lang: Flo.getLang(), title: def.title, fileBase: fileBase(type, s) };
}

// enregistre le PDF + les données (JSON) sur Drive ; avec `email`, envoie aussi le courriel avec le PDF en pièce jointe
async function send(report, email) {
  const def = FORMS[report.type];
  const pdf = await makePdf(def, report);
  const copy = JSON.parse(JSON.stringify(report)); delete copy.drive;
  const res = await post({
    action: email ? "send" : "upload", requestId: (email ? "mail-" : "up-") + report.id + "-" + Date.now().toString(36),
    meta: metaFor(report.type, report), pdfBase64: pdf.base64, json: copy, email: email || null
  });
  return { res, pages: pdf.pages, info: { at: new Date().toISOString(), url: res.pdfUrl || "", id: res.pdfId || "", folder: res.folderUrl || "" } };
}

/* ======================================================================
   Fenêtres : Réglages + Courriel
   ====================================================================== */
const validEmails = s => String(s || "").split(/[;,\s]+/).map(x => x.trim()).filter(Boolean);
const emailOk = x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x);

function setText() {
  const t = (id, fr, en) => { const e = document.getElementById(id); if (e) e.textContent = L(fr, en); };
  t("setTitle", "Console admin", "Admin console");
  $$(".tabbtn").forEach(b => { b.textContent = { reports: L("Rapports enregistrés", "Saved reports"), conn: L("Connexion", "Connection") }[b.dataset.tab]; });
  t("admRepIntro", "Seul l'administrateur (mot de passe) peut supprimer, exporter ou importer les rapports enregistrés.", "Only the administrator (password) can delete, export or import saved reports.");
  t("admExport", "Exporter (JSON)", "Export (JSON)");
  t("admImportL", "Importer (JSON)", "Import (JSON)");
  t("admSyncAll", "Tout synchroniser avec Drive", "Sync everything to Drive");
  t("connIntro", "Ces réglages sont communs à tous les appareils. Ils se modifient uniquement dans config.js (GitHub) et dans la console Google Apps Script — jamais sur l'appareil.", "These settings are shared by every device. They are changed only in config.js (GitHub) and in the Google Apps Script console — never on the device.");
  t("setTest", "Tester la connexion", "Test connection");
  t("setLock", "🔒 Verrouiller", "🔒 Lock");
  t("setClose", "Fermer", "Close");
  t("pinTitle", "Console admin", "Admin console");
  t("pinMsg", "Entrez le mot de passe administrateur.", "Enter the admin password.");
  t("pinAL", "Mot de passe administrateur", "Admin password");
  t("pinShowL", "Afficher le mot de passe", "Show password");
  t("pinCancel", "Annuler", "Cancel");
  t("pinOk", "Ouvrir", "Open");
  t("mailTitle", "Envoyer par courriel", "Send by email");
  t("mToL", "À (séparer par des virgules)", "To (separate with commas)");
  t("mCcL", "Cc", "Cc");
  t("mSubL", "Objet", "Subject");
  t("mBodyL", "Message", "Message");
  t("mCancel", "Annuler", "Cancel");
  t("mSend", "Envoyer", "Send");
}

/* ----- console admin : mot de passe vérifié par le script Google (jamais stocké sur l'appareil) ----- */
let adminUntil = 0;
const adminUnlocked = () => Date.now() < adminUntil;
const adminTouch = () => { adminUntil = Date.now() + 10 * 60 * 1000; };

function pinDialog() {
  setText();
  return new Promise(resolve => {
    const m = $("#pinModal"), inp = $("#pinA"), ok = $("#pinOk"), cancel = $("#pinCancel"), err = $("#pinErr"), show = $("#pinShow");
    inp.value = ""; show.checked = false; inp.type = "password"; err.hidden = true; ok.disabled = false; m.hidden = false; inp.focus();
    let busy = false;
    const done = v => { m.hidden = true; ok.removeEventListener("click", submit); cancel.removeEventListener("click", onCancel); m.removeEventListener("keydown", onEnter); m.removeEventListener("click", onBg); document.removeEventListener("keydown", onEsc); show.removeEventListener("change", onShow); resolve(v); };
    const onShow = () => { inp.type = show.checked ? "text" : "password"; };
    const submit = async () => {
      if (busy || !inp.value) return; busy = true; ok.disabled = true; err.hidden = true;
      try { await adminCheck(inp.value); adminTouch(); done(true); }
      catch (e) { err.textContent = e.message; err.hidden = false; busy = false; ok.disabled = false; inp.select(); }
    };
    const onCancel = () => { if (!busy) done(false); }, onEnter = e => { if (e.key === "Enter" && e.target === inp) submit(); }, onBg = e => { if (e.target === m && !busy) done(false); }, onEsc = e => { if (e.key === "Escape" && !busy) done(false); };
    ok.addEventListener("click", submit); cancel.addEventListener("click", onCancel); m.addEventListener("keydown", onEnter); m.addEventListener("click", onBg); document.addEventListener("keydown", onEsc); show.addEventListener("change", onShow);
  });
}
// la console demande TOUJOURS le mot de passe (valable 10 minutes). Sans Google configuré (config.js), il n'y a rien pour le vérifier.
async function unlock() {
  if (!configured()) { document.dispatchEvent(new CustomEvent("flofab-toast", { detail: L("Google n'est pas configuré : l'administrateur doit renseigner config.js (GitHub).", "Google is not configured: the administrator must fill in config.js (GitHub).") })); return false; }
  if (adminUnlocked()) { adminTouch(); return true; }
  return pinDialog();
}

function showTab(name) {
  $$(".tabbtn").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === name));
  $$("[data-tabpane]").forEach(p => { p.hidden = p.dataset.tabpane !== name; });
  if (name === "reports") document.dispatchEvent(new CustomEvent("flofab-admin-reports"));
  if (name === "conn") renderConn();
}
const shorten = (u, n) => u.length > n ? u.slice(0, n - 14) + "…" + u.slice(-12) : u;
function renderConn() {
  const c = cfg(), yes = L("oui", "yes"), no = L("non", "no");
  $("#connInfo").innerHTML = [
    [L("Source", "Source"), "config.js (GitHub)"],
    [L("URL du script", "Script URL"), esc(shorten(c.url, 52))],
    [L("Jeton", "Token"), "•••••• (" + c.token.length + L(" caractères", " characters") + ")"],
    [L("Cc par défaut", "Default Cc"), esc(c.cc || "—")],
    [L("Copie auto sur Drive", "Auto copy to Drive"), c.auto ? yes : no]
  ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  msg("");
}
async function openSettings() {
  setText();
  if (!(await unlock())) return;
  showTab("reports");
  $("#setModal").hidden = false;
}
const closeConsole = () => { $("#setModal").hidden = true; };
function msg(text, kind) { const e = $("#setMsg"); e.textContent = text; e.className = "mmsg " + (kind || ""); }

function wireSettings() {
  $$(".tabbtn").forEach(b => b.addEventListener("click", () => showTab(b.dataset.tab)));
  $("#setClose").addEventListener("click", closeConsole);
  $("#setModal").addEventListener("click", e => { if (e.target.id === "setModal") closeConsole(); });
  $("#setLock").addEventListener("click", () => { adminUntil = 0; closeConsole(); });
  $("#setTest").addEventListener("click", async () => {
    msg(L("Test en cours…", "Testing…"));
    try {
      const j = await ping();
      const ok = j.adminPassword || j.adminPin;
      msg(L("✓ Connecté. Dossier Drive : ", "✓ Connected. Drive folder: ") + (j.folder || "—") + (j.sender ? L(" · Courriels envoyés depuis ", " · Emails sent from ") + j.sender : "")
        + (j.emailsMax ? L(` · Aujourd'hui : ${j.emailsToday}/${j.emailsMax} courriels, ${j.uploadsToday}/${j.uploadsMax} fichiers`, ` · Today: ${j.emailsToday}/${j.emailsMax} emails, ${j.uploadsToday}/${j.uploadsMax} files`) : "")
        + (ok ? "" : L(" · ⚠ mot de passe admin manquant dans le script (creerAcces)", " · ⚠ admin password missing in the script (creerAcces)")), ok ? "ok" : "err");
    } catch (e) { msg("✗ " + e.message, "err"); }
  });
}

// fenêtre « Envoyer par courriel » : onSend(mail) fait l'envoi ; la fenêtre reste ouverte (avec l'erreur) s'il échoue
function mailDialog(defaults, onSend) {
  setText();
  return new Promise(resolve => {
    const m = $("#mailModal"), c = cfg();
    $("#mTo").value = defaults.to || c.lastTo || ""; $("#mCc").value = defaults.cc != null ? defaults.cc : c.cc;
    $("#mSub").value = defaults.subject; $("#mBody").value = defaults.body;
    $("#mNote").textContent = L("Le PDF est joint automatiquement et une copie est enregistrée sur Google Drive.", "The PDF is attached automatically and a copy is saved to Google Drive.");
    $("#mErr").hidden = true; const sendBtn = $("#mSend"), cancel = $("#mCancel");
    let busy = false;
    sendBtn.disabled = false; cancel.disabled = false; sendBtn.textContent = L("Envoyer", "Send");
    m.hidden = false; (($("#mTo").value) ? $("#mSub") : $("#mTo")).focus();
    const done = v => { m.hidden = true; sendBtn.removeEventListener("click", onSendClick); cancel.removeEventListener("click", onCancel); m.removeEventListener("click", onBg); document.removeEventListener("keydown", onKey); resolve(v); };
    const fail = t => { const e = $("#mErr"); e.textContent = t; e.hidden = false; };
    const onSendClick = async () => {
      if (busy) return;
      const to = validEmails($("#mTo").value), cc = validEmails($("#mCc").value);
      if (!to.length) return fail(L("Entrez au moins un destinataire.", "Enter at least one recipient."));
      const bad = [...to, ...cc].find(x => !emailOk(x)); if (bad) return fail(L("Adresse invalide : ", "Invalid address: ") + bad);
      busy = true; $("#mErr").hidden = true; sendBtn.disabled = true; cancel.disabled = true; sendBtn.textContent = L("Envoi en cours…", "Sending…");
      try { await onSend({ to: to.join(","), cc: cc.join(","), subject: $("#mSub").value.trim(), body: $("#mBody").value }); done(true); }
      catch (e) { fail(e.message || String(e)); busy = false; sendBtn.disabled = false; cancel.disabled = false; sendBtn.textContent = L("Envoyer", "Send"); }
    };
    const onCancel = () => { if (!busy) done(false); }, onBg = e => { if (e.target === m && !busy) done(false); }, onKey = e => { if (e.key === "Escape" && !busy) done(false); };
    sendBtn.addEventListener("click", onSendClick); cancel.addEventListener("click", onCancel); m.addEventListener("click", onBg); document.addEventListener("keydown", onKey);
  });
}

/* ======================================================================
   API publique
   ====================================================================== */
window.Cloud = {
  cfg, saveCfg, configured, makePdf, send, ping, openSettings, mailDialog, fileBase,
  unlock, lock() { adminUntil = 0; closeConsole(); }, isUnlocked: adminUnlocked,
  init() { wireSettings(); setText(); },
  setText, setMsg: msg, closeConsole
};
})();
