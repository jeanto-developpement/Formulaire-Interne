/* Flo-Fab — formulaires : routeur, sauvegarde, signatures, langue FR / EN */
(function () {
"use strict";
const Flo = window.Flo, { FORMS, esc, times, fmt, L } = Flo;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];

const store = {
  get(k, d) { try { const x = localStorage.getItem(k); return x ? JSON.parse(x) : d; } catch (e) { return d; } },
  set(k, x) { try { localStorage.setItem(k, JSON.stringify(x)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
const MAXP = 6;
const REPORTS = "flofab-reports", DRAFT = "flofab-draft-", PREF = "flofab-sr-prefs";
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------- langue ---------- */
let lang = store.get(PREF, {}).lang === "en" ? "en" : "fr";
Flo.setLang(lang);

/* ---------- migration de la première version (rapport de service seul) ---------- */
function upgradeService(r) {
  const n = Object.assign({}, r, { type: "service" });
  if (Array.isArray(r.reasons)) { r.reasons.forEach(k => n["r_" + k] = true); delete n.reasons; }
  return n;
}
(function migrate() {
  const old = store.get("flofab-sr-reports", null);
  if (old) {
    const list = store.get(REPORTS, []);
    old.forEach(r => { if (!list.some(x => x.id === r.id)) list.push(upgradeService(r)); });
    store.set(REPORTS, list); store.del("flofab-sr-reports");
  }
  const d = store.get("flofab-sr-draft", null);
  if (d) { store.set(DRAFT + "service", upgradeService(d)); store.del("flofab-sr-draft"); }
})();

/* ---------- état ---------- */
let cur = null;       // { type, def, state, host, dirty }
let pads = [];

function baseState(type) {
  const p = store.get(PREF, {});
  return Object.assign({
    id: uid(), type, created: new Date().toISOString(), date: today(), sigDate: today(),
    tech: p.tech || "", sigTechName: p.tech || "", techEmail: p.techEmail || "", sig: "", sigTech: ""
  }, FORMS[type].blank());
}

/* ---------- statut « imprimé / envoyé » (verrou de réinitialisation) ---------- */
const clone = o => JSON.parse(JSON.stringify(o));
const contentKey = Flo.contentKey;
const Cloud = window.Cloud;
// vrai si ce rapport a été imprimé ou envoyé depuis sa dernière modification
const isSent = r => !!(r.printedAt || r.emailedAt) && r.sentKey === contentKey(r);

function markSent(kind) {
  if (!cur) return;
  const st = cur.state, now = new Date().toISOString();
  const key = contentKey(st), other = kind === "printedAt" ? "emailedAt" : "printedAt";
  if (st.sentKey !== key) delete st[other];          // contenu modifié depuis l'autre envoi : cet ancien statut ne vaut plus
  st[kind] = now; st.sentKey = key;
  const list = store.get(REPORTS, []), i = list.findIndex(r => r.id === st.id);
  if (i >= 0) { st.updated = now; list[i] = clone(st); store.set(REPORTS, list); }   // rapport déjà enregistré : on le met à jour
  cur.dirty = true; persist();
  setStatus(kind === "printedAt" ? L("Imprimé", "Printed") : L("Courriel ouvert", "Email opened"));
}

/* ---------- toast / statut ---------- */
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("on");
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("on"), 2400);
}
const setStatus = m => { $("#status").textContent = m; };

/* ---------- confirmation intégrée (confirm() est bloqué dans certains contextes) ---------- */
function ask(msg, yesLabel, altLabel, neutral) {
  return new Promise(resolve => {
    const m = $("#modal"), yes = $("#modalYes"), no = $("#modalNo"), alt = $("#modalAlt");
    $("#modalMsg").textContent = msg;
    yes.textContent = yesLabel || L("Confirmer", "Confirm");
    no.textContent = L("Annuler", "Cancel");
    alt.hidden = !altLabel; if (altLabel) alt.textContent = altLabel;
    yes.classList.toggle("danger", !neutral); alt.classList.toggle("danger", !neutral);
    m.hidden = false; no.focus();
    const finish = v => {
      m.hidden = true;
      yes.removeEventListener("click", onYes); no.removeEventListener("click", onNo); alt.removeEventListener("click", onAlt);
      m.removeEventListener("click", onBg); document.removeEventListener("keydown", onKey);
      resolve(v);
    };
    const onYes = () => finish(true), onNo = () => finish(false), onAlt = () => finish("alt");
    const onBg = e => { if (e.target === m) finish(false); };
    const onKey = e => { if (e.key === "Escape") finish(false); };
    yes.addEventListener("click", onYes); no.addEventListener("click", onNo); alt.addEventListener("click", onAlt);
    m.addEventListener("click", onBg); document.addEventListener("keydown", onKey);
  });
}

/* ---------- textes statiques (changent avec la langue) ---------- */
function applyStatic() {
  document.documentElement.lang = lang === "en" ? "en-CA" : "fr-CA";
  $("#homeBtn").textContent = L("Accueil", "Home");
  $("#resetBtn").textContent = L("Réinitialiser", "Reset");
  $("#saveBtn").textContent = L("Enregistrer", "Save");
  $("#emailBtn").textContent = L("Courriel", "Email");
  $("#printBtn").textContent = L("Imprimer / PDF", "Print / PDF");
  $("#themeBtn").setAttribute("aria-label", L("Changer le thème", "Toggle theme"));

  $(".brand").setAttribute("aria-label", L("Accueil des formulaires", "Forms home"));
  $$("[data-lang]").forEach(b => b.setAttribute("aria-pressed", b.dataset.lang === lang));
}
function setTitles() {
  if (cur) {
    $("#pageTitle").firstChild.nodeValue = cur.def.short || cur.def.title;
    $("#pageSub").textContent = "";
    document.title = cur.def.title + " · Flo-Fab";
  } else {
    $("#pageTitle").firstChild.nodeValue = L("Formulaires", "Forms");
    $("#pageSub").textContent = L("Service et mise en marche", "Service and start-up");
    document.title = L("Formulaires · Flo-Fab", "Forms · Flo-Fab");
  }
}

/* ---------- brouillon ---------- */
let saveT;
function changed() {
  if (!cur) return;
  cur.dirty = true; setStatus(L("Modification…", "Editing…"));
  clearTimeout(saveT); saveT = setTimeout(persist, 400);
}
function persist() {
  clearTimeout(saveT);
  if (!cur || !cur.dirty) return;
  const ok = store.set(DRAFT + cur.type, cur.state);
  setStatus(ok ? L("Brouillon enregistré", "Draft saved") : L("Enregistrement local impossible", "Unable to save locally"));
  if (!ok) toast(L("Stockage de l'appareil plein : exportez ou supprimez d'anciens rapports (ou retirez des photos).", "Device storage full: export or delete old reports (or remove photos)."));
  cur.dirty = false;
}

/* ---------- liaison des champs ---------- */
function inferPumps(o) {
  for (let n = MAXP; n >= 1; n--) {
    const re = new RegExp("^(pump" + n + "_|amp" + n + "$|vchk" + n + "$|achk" + n + "$|v" + n + "_|a" + n + "_)");
    if (Object.keys(o).some(k => re.test(k) && o[k])) return n;
  }
  return 1;
}
function refresh() {
  const n = cur.state.pumpCount;
  if (n != null) {
    $$("[data-pump]", cur.host).forEach(e => e.hidden = +e.dataset.pump > n);
    $$("[data-pumpcount]", cur.host).forEach(e => e.textContent = n);
    const a = $("[data-pump-add]", cur.host), d = $("[data-pump-del]", cur.host);
    if (a) a.disabled = n >= MAXP; if (d) d.disabled = n <= 1;
  }
  const t = times(cur.state);
  $$("[data-out]", cur.host).forEach(e => e.textContent = fmt(t[e.dataset.out]));
  $$("[data-show-if]", cur.host).forEach(e => e.hidden = !cur.state[e.dataset.showIf]);
  if (cur.def.refresh) cur.def.refresh(cur.host, cur.state);
}

function bind() {
  const host = cur.host, st = cur.state;
  $$("[data-k]", host).forEach(el => {
    const k = el.dataset.k, isCb = el.type === "checkbox", isRadio = el.type === "radio";
    if (isCb) el.checked = !!st[k]; else if (isRadio) el.checked = st[k] === el.value; else el.value = st[k] ?? "";
    el.addEventListener(isCb || isRadio ? "change" : "input", () => {
      if (isRadio && !el.checked) return;
      const prev = st[k];
      st[k] = isCb ? el.checked : el.value;
      if (el.dataset.mirror) {
        const m = el.dataset.mirror;
        if (!st[m] || st[m] === prev) { st[m] = el.value; const t = $(`[data-k="${m}"]`, host); if (t) t.value = el.value; }
      }
      if (k === "tech" || k === "techEmail") { const p = store.get(PREF, {}); p[k] = el.value; store.set(PREF, p); }
      if (el.dataset.pref) { const p = store.get(PREF, {}); p[el.dataset.pref] = el.value; store.set(PREF, p); }
      refresh(); changed();
    });
  });
  $$("[data-now]", host).forEach(b => b.addEventListener("click", () => {
    const d = new Date(), el = $(`[data-k="${b.dataset.now}"]`, host);
    el.value = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    el.dispatchEvent(new Event("input"));
  }));
  setupPads();
}

/* ---------- ajout / retrait de pompes ---------- */
function setupPumpBar() {
  const host = cur.host, st = cur.state, bar = $("[data-pumpbar]", host);
  if (!bar) return;
  $("[data-pump-add]", bar).addEventListener("click", () => {
    if (st.pumpCount >= MAXP) return;
    st.pumpCount++; refresh(); changed();
    const c = $(`[data-pump="${st.pumpCount}"] input`, host);
    if (c) { c.scrollIntoView({ block: "center", behavior: "smooth" }); c.focus({ preventScroll: true }); }
  });
  $("[data-pump-del]", bar).addEventListener("click", async () => {
    const n = st.pumpCount; if (n <= 1) return;
    const els = $$(`[data-pump="${n}"] [data-k]`, host);
    if (els.some(e => st[e.dataset.k]) && !(await ask(L(`Retirer la pompe ${n} ? Les données saisies pour cette pompe seront effacées.`, `Remove pump ${n}? The data entered for this pump will be erased.`), L("Retirer", "Remove")))) return;
    els.forEach(e => { const k = e.dataset.k; if (e.type === "checkbox") { e.checked = false; st[k] = false; } else { e.value = ""; st[k] = ""; } });
    st.pumpCount = n - 1; refresh(); changed();
  });
}

/* ---------- signatures ---------- */
function setupPads() {
  pads = $$("canvas[data-sig]", cur.host).map(cv => {
    const p = { cv, ctx: cv.getContext("2d"), key: cv.dataset.sig, drawing: false, last: null, hint: cv.nextElementSibling };
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.addEventListener("pointerdown", e => {
      p.drawing = true; p.last = pos(e); cv.setPointerCapture(e.pointerId); p.hint.style.visibility = "hidden";
      p.ctx.beginPath(); p.ctx.arc(p.last.x, p.last.y, 1.1, 0, Math.PI * 2); p.ctx.fillStyle = "#0a1a33"; p.ctx.fill();
    });
    cv.addEventListener("pointermove", e => {
      if (!p.drawing) return; const q = pos(e);
      p.ctx.beginPath(); p.ctx.moveTo(p.last.x, p.last.y); p.ctx.lineTo(q.x, q.y); p.ctx.stroke(); p.last = q;
    });
    const end = () => { if (!p.drawing) return; p.drawing = false; cur.state[p.key] = cv.toDataURL("image/png"); changed(); };
    cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
    return p;
  });
  $$("[data-clear]", cur.host).forEach(b => b.addEventListener("click", () => {
    cur.state[b.dataset.clear] = ""; drawPads(); changed();
  }));
}
function drawPad(p) {
  const r = p.cv.getBoundingClientRect(), data = cur && cur.state[p.key];
  p.ctx.clearRect(0, 0, r.width, r.height);
  p.hint.style.visibility = data ? "hidden" : "visible";
  if (data) { const im = new Image(); im.onload = () => p.ctx.drawImage(im, 0, 0, r.width, r.height); im.src = data; }
}
function drawPads() { pads.forEach(drawPad); }
function sizePads() {
  pads.forEach(p => {
    const r = p.cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    if (!r.width) return;
    p.cv.width = Math.round(r.width * dpr); p.cv.height = Math.round(r.height * dpr);
    p.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    p.ctx.lineWidth = 2.2; p.ctx.lineCap = "round"; p.ctx.lineJoin = "round"; p.ctx.strokeStyle = "#0a1a33";
    drawPad(p);
  });
}
let rz; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(sizePads, 150); });

/* ---------- vues ---------- */
const GROUPS = [
  { id: "call", get title() { return L("Appel de service", "Service call"); } },
  { id: "internal", get title() { return L("Formulaires internes", "Internal forms"); } }
];
const reportsSorted = () => store.get(REPORTS, []).filter(r => FORMS[r.type])
  .sort((a, b) => (b.updated || b.created || "").localeCompare(a.updated || a.created || ""));

function showHome() {
  persist(); cur = null; pads = [];
  $("#view-form").hidden = true; $("#actions").hidden = true;
  const home = $("#view-home"); home.hidden = false;
  setTitles(); setStatus("");

  const card = ([t, d]) => {
    const draft = store.get(DRAFT + t, null);
    return `<a class="fcard ${t} ${d.group}" href="#/${t}"><b>${esc(d.title)}</b><span>${esc(d.desc)}</span>${draft ? `<em class="badge">${L("Brouillon en cours — reprendre", "Draft in progress — resume")}</em>` : ""}</a>`;
  };
  const row = r => `<li>
      <div class="meta"><b>${esc(FORMS[r.type].label(r) || L("Sans client", "No customer"))}</b>
      <span>${esc(FORMS[r.type].title)} · ${esc(r.date || "")}${(r.type === "req" ? (r.sigTechName || r.tech) : r.tech) ? " · " + esc(r.type === "req" ? (r.sigTechName || r.tech) : r.tech) : ""}</span>
      ${Cloud.configured() ? (needsSync(r) ? `<span class="tag warn">☁ ${L("à synchroniser", "to sync")}</span>` : `<a class="tag" href="${esc(r.drive.url || "#")}" target="_blank" rel="noopener">☁ Drive</a>`) : ""}
      ${isSent(r) ? `<span class="tag">✓ ${[r.printedAt && L("Imprimé", "Printed"), r.emailedAt && L("Courriel", "Emailed")].filter(Boolean).join(" · ")}</span>`
                  : `<span class="tag warn">${L("À imprimer ou envoyer", "To print or email")}</span>`}</div>
      <a class="btn" href="#/${r.type}/${r.id}">${L("Ouvrir", "Open")}</a></li>`;
  const list = reportsSorted();
  const newForms = GROUPS.map(g => `<h3 class="grp">${esc(g.title)}</h3>
    <div class="cards">${Object.entries(FORMS).filter(([, d]) => d.group === g.id).map(card).join("")}</div>`).join("");
  const saved = list.length
    ? GROUPS.map(g => {
        const items = list.filter(r => FORMS[r.type].group === g.id);
        return items.length ? `<h3 class="grp">${esc(g.title)}</h3><div class="histbox"><ul class="hist">${items.map(row).join("")}</ul></div>` : "";
      }).join("")
    : `<div class="histbox"><ul class="hist"><li class="empty">${L("Aucun rapport enregistré pour l'instant.", "No saved reports yet.")}</li></ul></div>`;
  const pending = list.filter(needsSync).length;
  const driveBar = Cloud.configured()
    ? `<div class="drivebar"><span>☁ ${L("Google Drive et courriel : connectés", "Google Drive and email: connected")} — ${pending ? L(`${pending} rapport(s) à synchroniser`, `${pending} report(s) to sync`) : L("tout est synchronisé", "everything is synced")}</span>${pending ? `<button class="btn" type="button" data-sync>${L("Synchroniser", "Sync")}</button>` : ""}</div>`
    : `<div class="drivebar off"><span>${L("Courriel avec PDF joint et enregistrement sur Google Drive : non configurés (l'administrateur doit renseigner config.js sur GitHub).", "Email with attached PDF and saving to Google Drive: not configured (the administrator must fill in config.js on GitHub).")}</span></div>`;
  home.innerHTML = `<div class="hub">
    <h2>${L("Nouveau formulaire", "New form")}</h2>${newForms}
    <h2>${L("Rapports enregistrés", "Saved reports")}</h2>${driveBar}${saved}
    <p class="hubnote">${Cloud.configured()
      ? L("Les rapports sont gardés sur cet appareil et copiés sur Google Drive. Suppression, export et import : console admin (en bas de cette page).", "Reports are kept on this device and copied to Google Drive. Deleting, exporting and importing: admin console (bottom of this page).")
      : L("Les rapports restent sur cet appareil. Suppression, export et import : console admin (en bas de cette page).", "Reports stay on this device. Deleting, exporting and importing: admin console (bottom of this page).")}</p>
    <p class="adminlink"><button class="btn ghost" id="cloudBtn" type="button" title="${L("Console admin (code requis)", "Admin console (code required)")}">🔒 ${L("Console admin", "Admin console")}</button></p>
  </div>`;
}

function mountForm() {
  const { def, type, state, host } = cur;
  host.innerHTML = `<div class="sheet">${def.html(type)}</div>`;
  setTitles();
  bind();
  if (def.init) def.init({ host, state, changed, refresh, toast });
  setupPumpBar();
  refresh();
  requestAnimationFrame(sizePads);
}

function showForm(type, id) {
  const def = FORMS[type]; let state;
  if (id) {
    const r = store.get(REPORTS, []).find(x => x.id === id);
    if (!r) { toast(L("Rapport introuvable", "Report not found")); location.hash = "#/"; return; }
    const src = JSON.parse(JSON.stringify(r));
    if (def.pumps && src.pumpCount == null) src.pumpCount = inferPumps(src);
    state = Object.assign(baseState(type), src);
  } else {
    const d = store.get(DRAFT + type, null);
    if (d && def.pumps && d.pumpCount == null) d.pumpCount = inferPumps(d);
    state = d ? Object.assign(baseState(type), d) : baseState(type);
  }
  $("#view-home").hidden = true;
  const host = $("#view-form"); host.hidden = false; $("#actions").hidden = false;
  cur = { type, def, state, host, dirty: false };
  setStatus(id ? L("Rapport enregistré ouvert", "Saved report opened") : "");
  mountForm();
  window.scrollTo(0, 0);
}

function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (cur) persist();
  if (parts[0] === "setup") {            // anciens liens de configuration : la configuration ne se fait plus par appareil
    try { history.replaceState(null, "", "#/"); } catch (e) { location.hash = "#/"; }
    showHome(); toast(L("Ce lien de configuration n'est plus utilisé : la configuration est centralisée (config.js sur GitHub).", "This setup link is no longer used: configuration is centralised (config.js on GitHub)."));
    return;
  }
  if (parts[0] && FORMS[parts[0]]) showForm(parts[0], parts[1]); else showHome();
}
window.addEventListener("hashchange", route);
window.addEventListener("pagehide", persist);

/* ---------- changement de langue ---------- */
function setLang(l) {
  if (l === lang) return;
  lang = l; Flo.setLang(l);
  const p = store.get(PREF, {}); p.lang = l; store.set(PREF, p);
  applyStatic();
  if (cur) { persist(); mountForm(); } else showHome();
}
$$("[data-lang]").forEach(b => b.addEventListener("click", () => setLang(b.dataset.lang)));

/* ---------- Google Drive : synchronisation ---------- */
let syncing = false, resyncAgain = false;
const needsSync = r => !r.drive || r.drive.key !== contentKey(r);

function applyDrive(id, info) {
  const list = store.get(REPORTS, []), i = list.findIndex(r => r.id === id);
  if (i >= 0) { list[i].drive = info; store.set(REPORTS, list); }
  if (cur && cur.state.id === id) { cur.state.drive = info; cur.dirty = true; persist(); }
}
async function syncOne(r) {
  const { info } = await Cloud.send(r, null);
  info.key = contentKey(r); applyDrive(r.id, info); return info;
}
async function syncAll(opts) {
  const silent = opts && opts.silent;
  if (silent && !Cloud.cfg().auto) return;            // autoDrive:false (config.js) : jamais d'envoi en arrière-plan, seulement avec les boutons « Synchroniser »
  if (syncing || !Cloud.configured() || navigator.onLine === false) return;
  const todo = store.get(REPORTS, []).filter(r => FORMS[r.type] && needsSync(r));
  if (!todo.length) { if (!silent) toast(L("Tout est déjà sur Drive.", "Everything is already on Drive.")); return; }
  syncing = true; let ok = 0, fail = 0, lastErr = "";
  for (const r of todo) {
    setStatus(L(`Drive : ${ok + fail + 1}/${todo.length}…`, `Drive: ${ok + fail + 1}/${todo.length}…`));
    try { await syncOne(r); ok++; } catch (e) { fail++; lastErr = e.message; if (/jeton|token/i.test(e.message)) break; }
  }
  syncing = false;
  if (resyncAgain && !fail) { resyncAgain = false; setTimeout(() => syncAll({ silent: true }), 300); }
  setStatus(fail ? L("Drive : en attente", "Drive: pending") : L("Drive ✓", "Drive ✓"));
  if (fail) toast(L(`Drive : ${ok} envoyé(s), ${fail} en attente — ${lastErr}`, `Drive: ${ok} sent, ${fail} pending — ${lastErr}`));
  else if (!silent) toast(L(`${ok} rapport(s) enregistré(s) sur Drive.`, `${ok} report(s) saved to Drive.`));
  if (!cur) showHome();
}
async function driveAfterSave() {
  if (!Cloud.configured() || !Cloud.cfg().auto || !cur) return;
  if (syncing) { resyncAgain = true; return; }                      // une synchronisation est en cours : on repassera juste après
  const r = store.get(REPORTS, []).find(x => x.id === cur.state.id); if (!r) return;
  syncing = true; setStatus(L("Drive : envoi…", "Drive: uploading…"));
  try { await syncOne(r); setStatus(L("Enregistré · Drive ✓", "Saved · Drive ✓")); toast(L("Enregistré sur Drive.", "Saved to Drive.")); }
  catch (e) { setStatus(L("Enregistré · Drive en attente", "Saved · Drive pending")); toast(L("Enregistré. Drive : ", "Saved. Drive: ") + e.message + L(" (nouvel essai plus tard)", " (will retry later)")); }
  finally { syncing = false; }
}

/* ---------- validation (champs obligatoires) ---------- */
function validateForm() {
  if (!cur || !cur.def.validate) return true;
  $$(".invalid", cur.host).forEach(e => { e.classList.remove("invalid"); e.removeAttribute("aria-invalid"); });
  const errs = cur.def.validate(cur.state);
  if (!errs.length) return true;
  let first = null;
  errs.forEach(er => {
    const el = $(er.selector, cur.host);
    if (el) { el.classList.add("invalid"); el.setAttribute("aria-invalid", "true"); first = first || el; }
  });
  if (first) { first.scrollIntoView({ block: "center", behavior: "smooth" }); first.focus({ preventScroll: true }); }
  toast(errs[0].message + (errs.length > 1 ? L(` (+${errs.length - 1} autre${errs.length > 2 ? "s" : ""})`, ` (+${errs.length - 1} more)`) : ""));
  return false;
}
document.addEventListener("input", e => {
  const t = e.target;
  if (t.classList && t.classList.contains("invalid") && String(t.value).trim()) { t.classList.remove("invalid"); t.removeAttribute("aria-invalid"); }
});

/* ---------- actions ---------- */
function saveReport() {
  if (!cur || !validateForm()) return;
  const list = store.get(REPORTS, []); cur.state.updated = new Date().toISOString();
  const i = list.findIndex(r => r.id === cur.state.id), copy = JSON.parse(JSON.stringify(cur.state));
  if (i >= 0) list[i] = copy; else list.unshift(copy);
  if (store.set(REPORTS, list)) { cur.dirty = true; persist(); toast(L("Rapport enregistré", "Report saved")); driveAfterSave(); }
  else toast(L("Espace plein : exportez puis supprimez d'anciens rapports", "Storage full: export, then delete old reports"));
}
$("#saveBtn").addEventListener("click", saveReport);
$("#resetBtn").addEventListener("click", async () => {
  if (!cur) return;
  const savedRep = store.get(REPORTS, []).find(r => r.id === cur.state.id);
  if (savedRep && !isSent(savedRep)) {
    const c = await ask(L("Ce rapport enregistré n'a pas encore été imprimé ni envoyé par courriel. Imprimez-le ou envoyez-le avant de le réinitialiser.",
      "This saved report has not been printed or emailed yet. Print or email it before resetting it."),
      L("Imprimer / PDF", "Print / PDF"), L("Courriel", "Email"), true);
    if (c === true) $("#printBtn").click(); else if (c === "alt") $("#emailBtn").click();
    return;
  }
  const isSaved = !!savedRep;
  const ok = isSaved
    ? await ask(L("Ce formulaire est un rapport enregistré. Tous les champs et les signatures seront effacés. Voulez-vous garder la copie enregistrée ou la supprimer ?",
        "This form is a saved report. All fields and signatures will be erased. Do you want to keep the saved copy or delete it?"),
        L("Réinitialiser (garder la copie)", "Reset (keep the saved copy)"), L("Réinitialiser et supprimer la copie", "Reset and delete the saved copy"))
    : await ask(L("Réinitialiser le formulaire ? Tous les champs et les signatures seront effacés.",
        "Reset the form? All fields and signatures will be erased."), L("Réinitialiser", "Reset"));
  if (!ok || !cur) return;
  if (ok === "alt") store.set(REPORTS, store.get(REPORTS, []).filter(r => r.id !== cur.state.id));
  const t = cur.type; clearTimeout(saveT); store.del(DRAFT + t);
  cur.state = baseState(t); cur.dirty = false;
  try { history.replaceState(null, "", "#/" + t); } catch (e) {}
  mountForm(); window.scrollTo(0, 0); setStatus("");
  toast(ok === "alt" ? L("Formulaire réinitialisé et rapport supprimé", "Form reset and report deleted") : L("Formulaire réinitialisé", "Form reset"));
});
function buildPrint() {
  if (!cur) return;
  markSent("printedAt");
  const holder = $("#print");
  holder.innerHTML = cur.def.print(cur.state);
  // document de plus d'une page : l'horodatage + la version figurent aussi en haut de la page 1 (le pied de page est sur la dernière)
  const P = cur.def.landscape ? { w: 965, h: 748 } : { w: 725, h: 988 };
  holder.classList.add("capture"); holder.style.width = P.w + "px";
  const tall = holder.scrollHeight > P.h + 1;
  holder.classList.remove("capture"); holder.style.width = "";
  if (tall && !cur.def.ownStamp) holder.insertAdjacentHTML("afterbegin", `<div class="p-stamp">${esc(Flo.stampText(cur.type, cur.state))}</div>`);
  $("#pageStyle").textContent = cur.def.landscape ? "@page{size:letter landscape;margin:9mm 12mm}" : "";
}
$("#printBtn").addEventListener("click", () => { if (!validateForm()) return; buildPrint(); setTimeout(() => window.print(), 80); });
window.addEventListener("beforeprint", buildPrint);

/* courriel : avec Google configuré → envoi par le script (PDF joint + copie sur Drive) ; sinon ouvre un courriel adressé au client (PDF à joindre à la main) */
$("#emailBtn").addEventListener("click", async () => {
  if (!cur || !validateForm()) return;
  const s = cur.state, def = cur.def, lab = def.label(s);
  const subject = `${def.title}${lab ? " — " + lab : ""} — Flo-Fab`;
  const body = L(
    `Bonjour,\n\nVeuillez trouver ci-joint le document « ${def.title} »${lab ? " (" + lab + ")" : ""}${s.date ? " du " + s.date : ""}.\n\nCordialement,\n${s.sigTechName || s.tech || ""}\nFlo-Fab Inc.\n(450) 621-2995`,
    `Hello,\n\nPlease find attached the document "${def.title}"${lab ? " (" + lab + ")" : ""}${s.date ? " dated " + s.date : ""}.\n\nBest regards,\n${s.sigTechName || s.tech || ""}\nFlo-Fab Inc.\n(450) 621-2995`);
  if (Cloud.configured()) {
    const sentTo = await Cloud.mailDialog({ to: (s.email || "").trim(), subject, body }, async mail => {
      const snapshot = JSON.parse(JSON.stringify(cur.state));
      const { info } = await Cloud.send(snapshot, mail);
      info.key = contentKey(snapshot); cur.state.drive = info;
      Cloud.saveCfg({ lastTo: mail.to.split(",")[0] });
      markSent("emailedAt");
      setStatus(L("Courriel envoyé · Drive ✓", "Email sent · Drive ✓"));
      toast(L("Courriel envoyé à ", "Email sent to ") + mail.to.split(",").join(", "));
    });
    return sentTo;
  }
  const url = `mailto:${(s.email || "").trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  markSent("emailedAt");
  try { window.location.href = url; } catch (e) {}
  toast(L("Joignez le PDF au courriel (Imprimer / PDF → Enregistrer en PDF).", "Attach the PDF to the email (Print / PDF → Save as PDF)."));
});

/* accueil : supprimer / exporter / importer */
const homeEl = $("#view-home");
homeEl.addEventListener("click", e => {
  if (e.target.closest("[data-sync]")) syncAll();
  if (e.target.closest("#cloudBtn")) Cloud.openSettings();
});

/* ---------- console admin : rapports enregistrés (suppression, export, import, synchronisation) ---------- */
function renderAdminReports() {
  const list = reportsSorted(), box = $("#admReports");
  box.innerHTML = list.length
    ? `<div class="admlist">${list.map(r => `<div class="admrow"><div class="meta"><b>${esc(FORMS[r.type].label(r) || L("Sans client", "No customer"))}</b><span>${esc(FORMS[r.type].title)} · ${esc(r.date || "")}</span></div>
        <button class="btn ghost danger" type="button" data-adel="${r.id}">${L("Supprimer", "Delete")}</button></div>`).join("")}</div>`
    : `<p class="mintro">${L("Aucun rapport enregistré.", "No saved reports.")}</p>`;
}
document.addEventListener("flofab-admin-reports", renderAdminReports);
$("#admReports").addEventListener("click", async e => {
  const d = e.target.closest("[data-adel]"); if (!d) return;
  if (!(await Cloud.unlock())) return;
  if (!(await ask(L("Supprimer ce rapport ? Cette action est définitive sur cet appareil (la copie sur Drive n'est pas touchée).", "Delete this report? This is permanent on this device (the Drive copy is not touched)."), L("Supprimer", "Delete")))) return;
  store.set(REPORTS, store.get(REPORTS, []).filter(r => r.id !== d.dataset.adel));
  renderAdminReports(); if (!cur) showHome();
});
$("#admExport").addEventListener("click", async () => {
  if (!(await Cloud.unlock())) return;
  const blob = new Blob([JSON.stringify(store.get(REPORTS, []), null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `rapports-flofab-${today()}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$("#importFile").addEventListener("change", async e => {
  const f = e.target.files[0]; if (!f) return;
  if (!(await Cloud.unlock())) { e.target.value = ""; return; }
  try {
    const data = JSON.parse(await f.text()); const inc = (Array.isArray(data) ? data : [data]).map(r => r && r.type ? r : (r && upgradeService(r)));
    const list = store.get(REPORTS, []), ids = new Set(list.map(r => r.id));
    const add = inc.filter(r => r && r.id && FORMS[r.type] && !ids.has(r.id));
    store.set(REPORTS, [...add, ...list]); renderAdminReports(); if (!cur) showHome();
    toast(L(`${add.length} rapport(s) importé(s)`, `${add.length} report(s) imported`));
  } catch (err) { toast(L("Fichier invalide : choisissez un export JSON de cette application", "Invalid file: choose a JSON export from this app")); }
  e.target.value = "";
});
$("#admSyncAll").addEventListener("click", async () => { if (await Cloud.unlock()) syncAll(); });

/* ---------- thème ---------- */
const root = document.documentElement;
const savedTheme = store.get(PREF, {}).theme; if (savedTheme) root.dataset.theme = savedTheme;
$("#themeBtn").addEventListener("click", () => {
  const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme:dark)").matches;
  root.dataset.theme = dark ? "light" : "dark";
  const p = store.get(PREF, {}); p.theme = root.dataset.theme; store.set(PREF, p);
});

/* ---------- démarrage ---------- */
applyStatic();
Cloud.init();
document.addEventListener("flofab-toast", e => toast(e.detail));
window.addEventListener("online", () => syncAll({ silent: true }));
route();
setTimeout(() => syncAll({ silent: true }), 1500);
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
