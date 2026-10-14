/* Flo-Fab — définitions des formulaires (écran + impression), bilingues FR / EN */
(function () {
"use strict";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const v = esc;

/* ---------- langue ---------- */
let LANG = "fr";
const L = (fr, en) => LANG === "en" ? en : fr;

/* ---------- heures ---------- */
const toMin = x => { if (!x) return null; const [h, m] = x.split(":").map(Number); return h * 60 + m; };
const diff = (a, b) => { const x = toMin(a), y = toMin(b); if (x == null || y == null) return null; let d = y - x; if (d < 0) d += 1440; return d; };
const fmt = m => m == null ? "—" : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
function times(s) {
  const out = diff(s.offDep, s.cliArr), site = diff(s.cliArr, s.cliDep), back = diff(s.cliDep, s.offArr);
  let all = diff(s.offDep, s.offArr);
  if (all == null && [out, site, back].some(x => x != null)) all = [out, site, back].reduce((a, x) => a + (x || 0), 0);
  return { out, site, back, all };
}

/* ---------- gabarits écran ---------- */
const fld = (p, k, label, o = {}) => {
  const a = (o.auto ? ` autocomplete="${o.auto}"` : "") + (o.mode ? ` inputmode="${o.mode}"` : "") + (o.mirror ? ` data-mirror="${o.mirror}"` : "") + (o.pref ? ` data-pref="${o.pref}"` : "");
  return `<div class="f"><label for="${p}-${k}">${label}</label><input type="${o.type || "text"}" id="${p}-${k}" data-k="${k}"${a}></div>`;
};
const area = (p, k, label, rows) =>
  `<div class="f"><label for="${p}-${k}">${label}</label><textarea id="${p}-${k}" data-k="${k}" rows="${rows || 2}"></textarea></div>`;
const chk = (k, label) => `<label class="chk"><input type="checkbox" data-k="${k}"><span>${label}</span></label>`;
const chkVal = (k, label, vk, unit) =>
  `<div class="chkval">${chk(k, label)}<input class="sm" inputmode="decimal" data-k="${vk}" aria-label="${unit}"><span>${unit}</span></div>`;
const reading = (ck, label, pre) =>
  `<div class="reading">${chk(ck, label)}${[1, 2, 3].map(i =>
    `<label class="rd"><span>${i}</span><input inputmode="decimal" data-k="${pre}${i}" aria-label="${label} ${i}"></label>`).join("")}</div>`;

const EMAIL = { type: "email", auto: "email", mode: "email" };
const lbl = {
  departure: () => L("Départ", "Departure"),
  arrival: () => L("Arrivée", "Arrival")
};
const timeFld = (p, k, label) =>
  `<div class="f"><label for="${p}-${k}">${label}</label><input type="time" id="${p}-${k}" data-k="${k}"><button class="now" type="button" data-now="${k}">${L("Maintenant", "Now")}</button></div>`;

const hours = p => `
  <section class="sec" aria-label="${L("Heures", "Hours")}">
    <h2 class="bar">${L("HEURES", "HOURS")}</h2>
    <div class="times">
      <div class="tcol"><h3>${L("Bureau", "Office")}</h3>${timeFld(p, "offDep", lbl.departure())}${timeFld(p, "offArr", lbl.arrival())}</div>
      <div class="tcol"><h3>${L("Client", "Work place")}</h3>${timeFld(p, "cliArr", lbl.arrival())}${timeFld(p, "cliDep", lbl.departure())}</div>
      <div class="tcol" aria-live="polite"><h3>Total</h3>
        <div class="tot"><span>${L("Trajet aller", "Outbound trip")}</span><b data-out="out">—</b></div>
        <div class="tot"><span>${L("Sur place", "On site")}</span><b data-out="site">—</b></div>
        <div class="tot"><span>${L("Trajet retour", "Return trip")}</span><b data-out="back">—</b></div>
        <div class="tot grand"><span>Total</span><b data-out="all">—</b></div>
      </div>
    </div>
  </section>`;

const sigBlock = p => `
  <section class="sec" aria-label="Signatures">
    <h2 class="bar">SIGNATURES</h2>
    <div class="sigcols">
      <div class="sigcol">
        <h3>${L("Technicien", "Technician")}</h3>
        ${fld(p, "sigTechName", L("Nom", "Name"), { auto: "name" })}
        ${fld(p, "techEmail", L("Courriel", "Email"), EMAIL)}
        <div class="sigwrap">
          <div class="sigbox"><canvas data-sig="sigTech" aria-label="${L("Zone de signature du technicien", "Technician signature area")}"></canvas><div class="hint">${L("Signature du technicien", "Technician signature")}</div></div>
          <div class="sigtools"><button class="btn ghost" type="button" data-clear="sigTech">${L("Effacer", "Clear")}</button></div>
        </div>
      </div>
      <div class="sigcol">
        <h3>${L("Client", "Customer")}</h3>
        ${fld(p, "sigName", L("Nom", "Name"))}
        ${fld(p, "email", L("Courriel", "Email"), { type: "email", mode: "email" })}
        <div class="sigwrap">
          <div class="sigbox"><canvas data-sig="sig" aria-label="${L("Zone de signature du client", "Customer signature area")}"></canvas><div class="hint">${L("Signature du client", "Customer signature")}</div></div>
          <div class="sigtools"><button class="btn ghost" type="button" data-clear="sig">${L("Effacer", "Clear")}</button></div>
        </div>
      </div>
    </div>
    <div class="f sigdate"><label for="${p}-sigDate">Date</label><input type="date" id="${p}-sigDate" data-k="sigDate"></div>
  </section>`;

const notesBlock = () => `
  <section class="sec" aria-label="Notes">
    <h2 class="bar">${L("NOTE", "NOTES")}</h2>
    <div class="works"><textarea data-k="notes" aria-label="Notes" placeholder="Notes…" style="min-height:180px"></textarea></div>
  </section>`;

/* =====================================================================
   1. RAPPORT DE SERVICE
   ===================================================================== */
const REASONS = [
  ["service", "Appel de service", "Service call"], ["repair", "Réparation", "Repair"],
  ["maint", "Entretien", "Maintenance"], ["startup", "Démarrage", "Start-up"],
  ["insp", "Inspection", "Inspection"], ["other", "Autres", "Others"]
];

function serviceHtml(p) {
  return hours(p) + `
  <section class="sec" aria-label="${L("Information générale", "General details")}">
    <h2 class="bar">${L("INFORMATION GÉNÉRALE", "GENERAL DETAILS")}</h2>
    <div class="grid2">
      ${fld(p, "date", "Date", { type: "date" })}${fld(p, "tech", L("Technicien", "Technician"), { auto: "name", mirror: "sigTechName" })}
      ${fld(p, "customer", L("Client", "Customer"), { auto: "organization" })}${fld(p, "job", L("N° de job", "Job No"))}
      ${fld(p, "address", L("Adresse", "Address"), { auto: "street-address" })}${fld(p, "equip", L("Type d'équipement", "Type of equipment"))}
      ${fld(p, "contact", "Contact")}${fld(p, "model", L("Modèle", "Model"))}
      ${fld(p, "phone", L("Téléphone", "Phone"), { type: "tel", auto: "tel" })}${fld(p, "serial", L("N° de série", "Serial No"))}
      ${fld(p, "location", L("Emplacement", "Location"))}
    </div>
  </section>
  <section class="sec" aria-label="${L("Raisons", "Reasons")}">
    <h2 class="bar">${L("RAISONS", "REASONS")}</h2>
    <div class="reasons">${REASONS.map(([k, fr, en]) =>
      `<label class="reason"><span>${L(fr, en)}</span><input type="checkbox" data-k="r_${k}"></label>`).join("")}</div>
    <div class="f otherwrap" data-show-if="r_other" hidden><label for="${p}-otherTxt">${L("Précisez", "Specify")}</label><input id="${p}-otherTxt" data-k="otherTxt"></div>
  </section>
  <section class="sec" aria-label="${L("Travaux effectués", "Work done")}">
    <h2 class="bar">${L("TRAVAUX EFFECTUÉS", "WORK DONE")}</h2>
    <div class="works"><textarea data-k="works" aria-label="${L("Travaux effectués", "Work done")}" placeholder="${L("Décrivez les travaux effectués…", "Describe the work performed…")}"></textarea></div>
  </section>
  <section class="sec" aria-label="${L("Pièces utilisées", "Parts used")}">
    <h2 class="bar">${L("PIÈCES UTILISÉES", "PARTS USED")}</h2>
    <div style="overflow-x:auto">
      <table class="parts">
        <thead><tr><th class="pn">${L("N° pièce", "Part No")}</th><th>Description</th><th class="qty">${L("Qté", "Qty")}</th><th class="x"></th></tr></thead>
        <tbody data-parts></tbody>
      </table>
    </div>
    <button class="btn addrow" type="button" data-addpart>${L("+ Ajouter une pièce", "+ Add a part")}</button>
  </section>` + sigBlock(p);
}

function serviceInit({ host, state, changed }) {
  if (!Array.isArray(state.parts) || !state.parts.length) state.parts = [{}];
  // anciens brouillons : on retire les lignes vides en trop à la fin (il en reste toujours une)
  const empty = r => !(r.pn || r.desc || r.qty);
  while (state.parts.length > 1 && empty(state.parts[state.parts.length - 1])) state.parts.pop();
  const body = host.querySelector("[data-parts]");
  const render = () => {
    body.innerHTML = state.parts.map((p, i) => `<tr>
      <td><input data-i="${i}" data-p="pn" value="${esc(p.pn)}" aria-label="${L("N° pièce ligne", "Part No row")} ${i + 1}"></td>
      <td><input data-i="${i}" data-p="desc" value="${esc(p.desc)}" aria-label="Description ${L("ligne", "row")} ${i + 1}"></td>
      <td><input data-i="${i}" data-p="qty" value="${esc(p.qty)}" inputmode="decimal" aria-label="${L("Quantité ligne", "Quantity row")} ${i + 1}"></td>
      <td class="x"><button class="rm" type="button" data-rm="${i}" aria-label="${L("Retirer la ligne", "Remove row")} ${i + 1}">×</button></td></tr>`).join("");
  };
  body.addEventListener("input", e => {
    const t = e.target; if (t.dataset.p == null) return;
    state.parts[+t.dataset.i][t.dataset.p] = t.value; changed();
  });
  body.addEventListener("click", e => {
    const b = e.target.closest("[data-rm]"); if (!b) return;
    state.parts.splice(+b.dataset.rm, 1);
    if (!state.parts.length) state.parts.push({});
    render(); changed();
  });
  host.querySelector("[data-addpart]").addEventListener("click", () => {
    state.parts.push({}); render(); body.querySelector("tr:last-child input").focus(); changed();
  });
  render();
}

/* ---------- impression : pièces communes ---------- */
const cb = x => `<span class="p-box">${x ? "✓" : ""}</span>`;
/* ---------- version du formulaire + horodatage : sur TOUS les PDF ---------- */
let PRINT_TYPE = null;                         // formulaire en cours d'impression (fixé par l'enveloppe de print(), voir registre)
const p2 = x => String(x).padStart(2, "0");
const stampNow = () => { const n = new Date(); return `${n.getFullYear()}-${p2(n.getMonth() + 1)}-${p2(n.getDate())} ${p2(n.getHours())}:${p2(n.getMinutes())}`; };
const verLabel = t => { const f = t && FORMS[t]; return f ? `${L("Version", "Version")} ${f.version}${f.revised ? " (" + L("rév.", "rev.") + " " + f.revised + ")" : ""}` : ""; };
const titleOf = t => { const f = t && FORMS[t]; return f ? f.title : ""; };
// ligne d'identification du document : « Titre · Version 1.0 (rév. …) · Imprimé le 2026-10-03 18:26 »
const stampText = (t, s) => [titleOf(t), verLabel(t), `${L("Imprimé le", "Printed")} ${stampNow()}`, s && s.id ? `${L("Réf.", "Ref.")} ${s.id}` : ""].filter(Boolean).join(" · ");
const foot = s => `<div class="p-foot"><span>Flo-Fab Inc. · ${v(titleOf(PRINT_TYPE))} · ${v(verLabel(PRINT_TYPE))}</span><span>${L("Imprimé le", "Printed")} ${stampNow()} · ${L("Réf.", "Ref.")} ${v(s.id)}</span></div>`;

function printHead(s) {
  const t = times(s), f = m => m != null ? fmt(m) : "";
  const dep = L("Départ", "Departure"), arr = L("Arrivée", "Arrival");
  return `<div class="p-head">
    <img src="logo.svg" alt="">
    <div class="p-addr">860 boul. Industriel<br>Bois-des-Filion, QC<br>Canada, J6Z 4V7<br>Tel : (450) 621-2995<br>Fax : (450) 621-4995</div>
    <table class="p p-time">
      <tr><th colspan="2">${L("Bureau", "Office")}</th><th colspan="2">${L("Client", "Work place")}</th><th>Total</th></tr>
      <tr><td class="l">${dep}</td><td>${v(s.offDep)}</td><td class="l">${arr}</td><td>${v(s.cliArr)}</td><td>${f(t.out)}</td></tr>
      <tr><td class="l">${arr}</td><td>${v(s.offArr)}</td><td class="l">${dep}</td><td>${v(s.cliDep)}</td><td>${f(t.back)}</td></tr>
      <tr><td class="l" colspan="4" style="text-align:right">${L("Sur place", "On site")} : ${t.site != null ? fmt(t.site) : "—"} &nbsp;&nbsp; Total</td><td><b>${f(t.all)}</b></td></tr>
    </table>
  </div>`;
}

function printSig(s, barCls) {
  const em = L("Courriel :", "Email :");
  const img = d => d ? `<img src="${d}" alt="">` : `<div class="p-line"></div>`;
  return `<div class="avoid">
    <div class="${barCls}">SIGNATURE</div>
    <table class="p p-sig"><tr>
      <td style="width:40%"><b>${L("Technicien :", "Technician :")}</b> ${v(s.sigTechName || s.tech)}</td>
      <td><b>${L("Client :", "Customer :")}</b> ${v(s.sigName)}</td>
      <td style="width:22%"><b>Date :</b> ${v(s.sigDate)}</td></tr>
      <tr><td><b>${em}</b> ${v(s.techEmail)}</td><td colspan="2"><b>${em}</b> ${v(s.email)}</td></tr></table>
    <div class="p-sigrow"><div class="p-sigimg">${img(s.sigTech)}</div><div class="p-sigimg">${img(s.sig)}</div></div>
  </div>`;
}

function servicePrint(s) {
  const parts = (s.parts || []).filter(p => p.pn || p.desc || p.qty);
  while (parts.length < 6) parts.push({});
  const reasonsRow = REASONS.map(([k, fr, en]) => `<td>${L(fr, en)}<br>${cb(s["r_" + k])}</td>`).join("");
  return printHead(s) + `
  <div class="p-bar">${L("INFORMATION GÉNÉRALE", "GENERAL DETAILS")}</div>
  <table class="p p-gen">
    <tr><td><b>Date :</b>${v(s.date)}</td><td><b>${L("Technicien :", "Technician :")}</b>${v(s.tech)}</td></tr>
    <tr><td><b>${L("Client :", "Customer :")}</b>${v(s.customer)}</td><td><b>${L("N° de job :", "Job No :")}</b>${v(s.job)}</td></tr>
    <tr><td><b>${L("Adresse :", "Address :")}</b>${v(s.address)}</td><td><b>${L("Type d'équipement :", "Type of equipment :")}</b>${v(s.equip)}</td></tr>
    <tr><td><b>Contact :</b>${v(s.contact)}</td><td><b>${L("Modèle :", "Model :")}</b>${v(s.model)}</td></tr>
    <tr><td><b>${L("Téléphone :", "Phone :")}</b>${v(s.phone)}</td><td><b>${L("N° de série :", "Serial No :")}</b>${v(s.serial)}</td></tr>
    <tr><td colspan="2"><b>${L("Emplacement :", "Location :")}</b>${v(s.location)}</td></tr>
  </table>
  <div class="p-bar">${L("RAISONS", "REASONS")}</div>
  <table class="p p-rs"><tr>${reasonsRow}</tr>
  ${s.r_other && s.otherTxt ? `<tr><td colspan="6" style="text-align:left;font-weight:400"><b>${L("Autres :", "Others :")}</b> ${v(s.otherTxt)}</td></tr>` : ""}</table>
  <div class="p-bar">${L("TRAVAUX EFFECTUÉS", "WORK DONE")}</div>
  <div class="p-works">${v(s.works)}</div>
  <div class="avoid">
  <div class="p-bar">${L("PIÈCES UTILISÉES", "PARTS USED")}</div>
  <table class="p p-parts"><thead><tr><th style="width:24%">${L("N° PIÈCE", "PART NO")}</th><th>DESCRIPTION</th><th style="width:10%">${L("QTÉ", "QTY")}</th></tr></thead>
    <tbody>${parts.map(p => `<tr><td>${v(p.pn)}</td><td>${v(p.desc)}</td><td style="text-align:center">${v(p.qty)}</td></tr>`).join("")}</tbody></table>
  </div>` + printSig(s, "p-bar") + foot(s);
}

/* =====================================================================
   2 + 3. MISE EN MARCHE (champs communs)
   ===================================================================== */
function startupInfo(p) {
  return hours(p) + `
  <section class="sec" aria-label="${L("Information générale", "General details")}">
    <h2 class="bar">${L("RAPPORT DE MISE EN MARCHE", "START-UP REPORT")}</h2>
    <div class="grid2">
      ${fld(p, "date", "Date", { type: "date" })}${fld(p, "job", L("# Job", "Job #"))}
      ${fld(p, "customer", L("Client", "Customer"), { auto: "organization" })}${fld(p, "project", L("Projet", "Project"))}
      ${area(p, "addr", L("Adresse (client)", "Address (customer)"), 3)}${area(p, "projAddr", L("Adresse (projet)", "Address (project)"), 3)}
      ${fld(p, "contact", "Contact")}${fld(p, "ref", L("Référence", "Reference"))}
      <div class="f"><label for="${p}-page">Page</label>
        <div class="pg"><input id="${p}-page" data-k="page" inputmode="numeric" aria-label="Page"><span>/</span><input data-k="pages" inputmode="numeric" aria-label="${L("Nombre de pages", "Number of pages")}"></div></div>
    </div>
  </section>`;
}

function startupInfoPrint(s) {
  return `<div class="m-bar">${L("RAPPORT DE MISE EN MARCHE", "START-UP REPORT")}</div>
  <table class="p m-info">
    <tr><td><b>Date :</b> ${v(s.date)}</td><td><b>${L("# Job :", "Job # :")}</b> ${v(s.job)}<span class="m-pg"><b>Page</b> ${v(s.page)} / ${v(s.pages)}</span></td></tr>
    <tr><td><div><b>${L("Client :", "Customer :")}</b> ${v(s.customer)}</div><div class="m-addr"><b>${L("Adresse :", "Address :")}</b> ${v(s.addr)}</div><div><b>Contact :</b> ${v(s.contact)}</div></td>
        <td><div><b>${L("Projet :", "Project :")}</b> ${v(s.project)}</div><div class="m-addr"><b>${L("Adresse :", "Address :")}</b> ${v(s.projAddr)}</div><div><b>${L("Référence :", "Reference :")}</b> ${v(s.ref)}</div></td></tr>
  </table>`;
}

/* impression : petits composants de ligne */
const it = (l, val, o = {}) =>
  `<span class="m-it"${o.f ? ` style="flex:${o.f}"` : ""}><b>${l}</b><span class="m-u">${v(val)}</span>${o.u ? `<b>${o.u}</b>` : ""}</span>`;
const line = (...a) => `<div class="m-line">${a.join("")}</div>`;
const ck = (x, label) => `<div class="m-ck">${cb(x)}<span>${label}</span></div>`;
const ckv = (x, label, val, unit) =>
  `<div class="m-ck">${cb(x)}<span class="m-tx">${label}</span><span class="m-u" style="flex:none;width:46px">${v(val)}</span><b>${unit}</b></div>`;
const readRow = (s, ckKey, label, pre) =>
  `<div class="m-line m-rd"><span class="m-lbl">${cb(s[ckKey])} ${label}</span>${[1, 2, 3].map(i => it(i, s[pre + i])).join("")}</div>`;
const noteBlock = s => `<div class="m-notes"><b>${L("NOTE :", "NOTES :")}</b><div class="m-nl">${v(s.notes)}</div></div>`;

/* ---------- pompes : 1 affichée, ajout au besoin ---------- */
const MAXP = 6, PN = [1, 2, 3, 4, 5, 6];
const pcount = s => Math.min(MAXP, Math.max(1, parseInt(s.pumpCount, 10) || 1));
const pumpBar = () => `<div class="pumpbar" data-pumpbar>
  <span>${L("Pompes", "Pumps")} : <b data-pumpcount>1</b></span>
  <button class="btn" type="button" data-pump-add>${L("+ Ajouter une pompe", "+ Add a pump")}</button>
  <button class="btn ghost danger" type="button" data-pump-del>${L("Retirer la dernière", "Remove last")}</button>
</div>`;
const volt = () => "Voltages", amper = () => L("Ampérages", "Amperages");
const make = () => L("Marque", "Make"), model = () => L("Modèle", "Model");
const tech = () => L("Technicien", "Technician");

/* =====================================================================
   2. MISE EN MARCHE — SUBMERSIBLE
   ===================================================================== */
const SUB_CHECKS = [
  ["Vérifier l'installation générale", "Check general installation"],
  ["Vérifier l'installation électrique", "Check electrical installation"],
  ["Vérifier et ajuster les overloads tel qu'indiqué sur la pompe", "Check and adjust overloads as indicated on the pump"],
  ["Vérifier que la pompe tourne librement", "Check that the pump turns freely"],
  ["Vérifier la rotation de la pompe", "Check pump rotation"],
  ["Vérifier et ajuster les contrôles de niveau", "Check and adjust level controls"],
  ["Vérifier et ajuster l'alarme de haut niveau", "Check and adjust high-level alarm"],
  ["Simuler les séquences d'opération", "Simulate operating sequences"]
];
const ampCheck = n => L(`Vérifier l'ampérage sur Pompe ${n}`, `Check amperage on Pump ${n}`);

function subHtml(p) {
  const pump = n => `<div class="card" data-pump="${n}"><h3>${L("Pompe", "Pump")} ${n}</h3><div class="mini">
    ${fld(p, `pump${n}_marque`, make())}${fld(p, `pump${n}_modele`, model())}
    ${fld(p, `pump${n}_hp`, "HP", { mode: "decimal" })}${fld(p, `pump${n}_vitesse`, L("Vitesse", "Speed"))}
    ${fld(p, `pump${n}_volts`, "Volts", { mode: "decimal" })}${fld(p, `pump${n}_debit`, "GPM", { mode: "decimal" })}
    ${fld(p, `pump${n}_tete`, "TDH", { mode: "decimal" })}${fld(p, `pump${n}_amps`, "Amps", { mode: "decimal" })}</div></div>`;
  const meas = n => `<div class="card" data-pump="${n}" role="group" aria-label="${L("Mesures pompe", "Pump readings")} ${n}"><h3>${L("Pompe", "Pump")} ${n} — ${L("mesures", "readings")}</h3>
    ${chk(`amp${n}`, ampCheck(n))}
    ${reading(`vchk${n}`, volt(), `v${n}_`)}${reading(`achk${n}`, amper(), `a${n}_`)}</div>`;
  return startupInfo(p) + `
  <section class="sec" aria-label="${L("Système submersible", "Submersible system")}">
    <h2 class="bar">${L("SYSTÈME SUBMERSIBLE", "SUBMERSIBLE SYSTEM")}</h2>
    ${pumpBar()}
    <div class="pumps">${PN.map(pump).join("")}
      <div class="card"><h3>${L("Contrôleur", "Controller")}</h3><div class="mini">
        ${fld(p, "ctl_marque", make())}${fld(p, "ctl_modele", model())}
        ${fld(p, "ctl_serie", L("N° de série", "Serial No"))}${fld(p, "ctl_type", "Type")}
        ${fld(p, "ctl_hp", "HP", { mode: "decimal" })}${fld(p, "ctl_volts", "Volts", { mode: "decimal" })}
        ${fld(p, "ctl_over", "Overloads")}</div></div>
    </div>
    <div class="pumps" style="padding-top:0">
      <div class="card"><h3>${L("Vérifications", "Checks")}</h3>${SUB_CHECKS.map((t, i) => chk(`chk${i + 1}`, L(...t))).join("")}</div>
      ${PN.map(meas).join("")}
    </div>
    ${fld(p, "tech", tech(), { auto: "name", mirror: "sigTechName" }).replace('class="f"', 'class="f sigdate"')}
  </section>` + notesBlock() + sigBlock(p);
}

function subPrint(s) {
  const N = pcount(s), PS = PN.slice(0, N);
  const pump = n => {
    const k = x => s[`pump${n}_${x}`];
    return `<div class="m-t">${L("POMPE", "PUMP")} ${n}</div>` +
      line(it(make(), k("marque")), it(model(), k("modele"), { f: 1.5 })) +
      line(it("HP", k("hp")), it(L("Vitesse", "Speed"), k("vitesse")), it("Volts", k("volts"))) +
      line(it("GPM", k("debit")), it("TDH", k("tete")), it("Amps", k("amps")));
  };
  const left = PS.map(pump).join("") + `<div class="m-t">${L("CONTRÔLEUR", "CONTROLLER")}</div>` +
    line(it(make(), s.ctl_marque), it(model(), s.ctl_modele)) +
    line(it(L("N° de série", "Serial No"), s.ctl_serie), it("Type", s.ctl_type)) +
    line(it("HP", s.ctl_hp), it("Volts", s.ctl_volts), it("Overloads", s.ctl_over)) +
    `<div style="margin-top:10px">${line(it(tech(), s.tech, { f: 1 }), `<span class="m-it" style="flex:.6"></span>`)}</div>`;
  const right = SUB_CHECKS.map((t, i) => ck(s[`chk${i + 1}`], L(...t))).join("") +
    PS.map(n => `<div class="m-gap"></div>` + ck(s[`amp${n}`], ampCheck(n)) +
      readRow(s, `vchk${n}`, volt() + " :", `v${n}_`) + readRow(s, `achk${n}`, amper() + " :", `a${n}_`)).join("");
  return printHead(s) + startupInfoPrint(s) + `
  <div class="m-bar">${L("SYSTÈME SUBMERSIBLE", "SUBMERSIBLE SYSTEM")}</div>
  <div class="m-cols last"><div class="m-col">${left}</div><div class="m-col">${right}</div></div>
  ${noteBlock(s)}` + printSig(s, "m-bar") + foot(s);
}

/* =====================================================================
   3. MISE EN MARCHE — SURPRESSEUR
   ===================================================================== */
const SUR_CHECKS = [
  ["Vérifier l'installation générale", "Check general installation"],
  ["Vérifier l'alignement (pompe horizontale seulement)", "Check alignment (horizontal pump only)"],
  ["Vérifier l'alimentation en eau", "Check water supply"],
  ["S'assurer que la pompe est exempte d'air", "Make sure the pump is free of air"],
  ["Vérifier que l'arbre de la pompe tourne librement", "Check that the pump shaft turns freely"],
  ["Vérifier la rotation de la pompe", "Check pump rotation"],
  ["Vérifier l'alimentation électrique", "Check electrical supply"]
];
const SUR_SYS = [
  ["s1", "Ajustement de la pression du réservoir", "Tank pressure adjustment", "s1v"],
  ["s2", "Ajustement du point de consigne", "Setpoint adjustment", "s2v"],
  ["s3", "Vérifier ajustement de basse pression d'aspiration", "Check low suction pressure adjustment", "s3v"]
];
const SUR_SYS2 = [
  ["s4", "Vérifier arrêt sur débit nul", "Check no-flow shutdown"],
  ["s5", "Vérifier l'alternance des pompes", "Check pump alternation"],
  ["s6", "Vérifier l'ajustement de l'aquastat", "Check aquastat adjustment"],
  ["s7", "Mettre le système en mode AUTO", "Place the system in AUTO mode"]
];

function surHtml(p) {
  const pump = n => `<div class="card" data-pump="${n}" role="group" aria-label="${L("Pompe", "Pump")} ${n}"><h3>${L("Pompe", "Pump")} ${n}</h3>
    <div class="mini">
      ${fld(p, `pump${n}_marque`, make())}${fld(p, `pump${n}_modele`, model())}
      ${fld(p, `pump${n}_serie`, L("No. série", "Serial No."))}${fld(p, `pump${n}_hp`, "HP", { mode: "decimal" })}
      ${fld(p, `pump${n}_rpm`, "RPM", { mode: "decimal" })}${fld(p, `pump${n}_amp`, "Amp", { mode: "decimal" })}
      ${fld(p, `pump${n}_tdh`, "TDH", { mode: "decimal" })}${fld(p, `pump${n}_gpm`, "GPM", { mode: "decimal" })}
    </div>
    <div style="margin-top:8px">${SUR_CHECKS.map((t, i) => chk(`pump${n}_c${i + 1}`, L(...t))).join("")}
    ${reading(`pump${n}_vchk`, volt(), `pump${n}_v`)}${reading(`pump${n}_achk`, amper(), `pump${n}_a`)}</div></div>`;
  return startupInfo(p) + `
  <section class="sec" aria-label="${L("Surpresseur", "Booster")}">
    <h2 class="bar">${L("SURPRESSEUR", "BOOSTER SYSTEM")}</h2>
    ${pumpBar()}
    <div class="pumps">${PN.map(pump).join("")}
      <div class="card"><h3>${L("Système", "System")}</h3>
        <div class="mini">
          <div class="f"><label for="${p}-pAsp">${L("Pression d'aspiration (PSI)", "Suction pressure (PSI)")}</label><input id="${p}-pAsp" data-k="pAsp" inputmode="decimal"></div>
          <div class="f"><label for="${p}-pRef">${L("Pression de refoulement (PSI)", "Discharge pressure (PSI)")}</label><input id="${p}-pRef" data-k="pRef" inputmode="decimal"></div>
        </div>
        <div style="margin-top:8px">
          ${SUR_SYS.map(([k, fr, en, vk]) => chkVal(k, L(fr, en), vk, "PSI")).join("")}
          ${SUR_SYS2.map(([k, fr, en]) => chk(k, L(fr, en))).join("")}
        </div>
      </div>
    </div>
    ${fld(p, "tech", tech(), { auto: "name", mirror: "sigTechName" }).replace('class="f"', 'class="f sigdate"')}
  </section>` + notesBlock() + sigBlock(p);
}

function surPrint(s) {
  const N = pcount(s);
  const pump = n => {
    const k = x => s[`pump${n}_${x}`];
    return `<div class="m-t">${L("POMPE", "PUMP")} ${n}</div>` +
      line(it(make(), k("marque")), it(model(), k("modele"))) +
      line(it(L("No. Série", "Serial No."), k("serie"), { f: 1.6 }), it("HP", k("hp")), it("RPM", k("rpm"))) +
      line(it("Amp", k("amp")), it("TDH", k("tdh")), it("GPM", k("gpm"))) +
      `<div class="m-gap"></div>` +
      SUR_CHECKS.map((t, i) => ck(s[`pump${n}_c${i + 1}`], L(...t))).join("") +
      readRow(s, `pump${n}_vchk`, volt() + " :", `pump${n}_v`) + readRow(s, `pump${n}_achk`, amper() + " :", `pump${n}_a`);
  };
  const sys = line(it(L("Pression d'Aspiration :", "Suction Pressure :"), s.pAsp, { u: "PSI" })) +
    line(it(L("Pression de Refoulement :", "Discharge Pressure :"), s.pRef, { u: "PSI" })) +
    `<div class="m-gap"></div>` +
    SUR_SYS.map(([k, fr, en, vk]) => ckv(s[k], L(fr, en), s[vk], "PSI")).join("") +
    SUR_SYS2.map(([k, fr, en]) => ck(s[k], L(fr, en))).join("");
  const techLine = `<div style="margin-top:8px">${line(it(tech() + " :", s.tech, { f: 1 }), `<span class="m-it" style="flex:.6"></span>`)}</div>`;
  const cells = PN.slice(0, N).map(pump); cells.push(`<div class="m-t">&nbsp;</div>` + sys);
  let rows = "";
  for (let i = 0; i < cells.length; i += 2) {
    const last = i + 2 >= cells.length;
    rows += `<div class="m-cols${last ? " last" : ""}"><div class="m-col">${cells[i]}${last ? techLine : ""}</div><div class="m-col">${cells[i + 1] || ""}</div></div>`;
  }
  return printHead(s) + startupInfoPrint(s) + `
  <div class="m-bar">${L("SURPRESSEUR", "BOOSTER SYSTEM")}</div>
  ${rows}
  ${noteBlock(s)}` + printSig(s, "m-bar") + foot(s);
}

/* =====================================================================
   4. ESTIMATION (soumission) — matériel + main-d'œuvre, avec calculs
   ===================================================================== */
const num = x => {
  if (x == null || x === "") return null;
  const n = parseFloat(String(x).replace(/\s/g, "").replace(/\$/g, "").replace(",", "."));
  return isNaN(n) ? null : n;
};
const money = n => n == null ? "" : n.toLocaleString(LANG === "en" ? "en-CA" : "fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneyNZ = n => n ? money(n) : "";
const rate = x => { const n = num(x); return n == null ? v(x) : money(n); };

const LAB = [
  ["Ramassage", "Pick-up"], ["Estimation en atelier", "Shop estimate"], ["Main-d'œuvre atelier", "Shop labour"],
  ["Peinture", "Painting"], ["Nettoyage de la pompe", "Pump cleaning"], ["Nettoyage atelier", "Shop cleaning"],
  ["Usinage", "Machining"], ["Main-d'œuvre terrain", "Field labour"], ["Livraison", "Delivery"], ["Frais de camion", "Truck charges"]
];

function calcEst(s) {
  const sum = (arr, k) => arr.reduce((t, r) => t + (r[k] || 0), 0);
  const mat = (s.mat || []).map(r => {
    const q = num(r.qty), c = num(r.cost), sl = num(r.sell);
    return { tc: q != null && c != null ? q * c : null, ts: q != null && sl != null ? q * sl : null, a: num(r.act) };
  });
  const lab = LAB.map((_, i) => {
    const h = num(s[`lab${i}_h`]), c = num(s[`lab${i}_c`]), sl = num(s[`lab${i}_s`]);
    return { h, tc: h != null && c != null ? h * c : null, ts: h != null && sl != null ? h * sl : null, a: num(s[`lab${i}_a`]) };
  });
  const m = { cost: sum(mat, "tc"), sell: sum(mat, "ts"), act: sum(mat, "a") };
  const l = { hours: sum(lab, "h"), cost: sum(lab, "tc"), sell: sum(lab, "ts"), act: sum(lab, "a") };
  return { mat, lab, m, l, t: { cost: m.cost + l.cost, sell: m.sell + l.sell, act: m.act + l.act } };
}

const mf = (label, attrs) => `<label class="mf"><span>${label}</span><input ${attrs}></label>`;

function estHtml(p) {
  const sumRow = (label, g) => `<tr><th scope="row">${label}</th><td data-calc="${g}_cost">0,00</td><td data-calc="${g}_sell">0,00</td><td data-calc="${g}_act">0,00</td></tr>`;
  const tot = g => `<span>${L("Coût", "Cost")} <b data-calc="${g}_cost">0,00</b></span><span>${L("Vente", "Sell")} <b data-calc="${g}_sell">0,00</b></span><span>${L("Réel", "Actual")} <b data-calc="${g}_act">0,00</b></span>`;
  return `
  <section class="sec" aria-label="${L("Estimation", "Estimate")}">
    <h2 class="bar">${L("ESTIMATION", "ESTIMATE")}</h2>
    <div class="grid2">
      ${fld(p, "quote", L("Soumission no", "Quote no"))}
      <div class="f"><label for="${p}-currency">${L("Devise", "Currency")}</label><select id="${p}-currency" data-k="currency"><option value="CAD">CAD</option><option value="USD">USD</option></select></div>
      ${fld(p, "date", "Date", { type: "date" })}${fld(p, "tech", L("Préparée par", "Quote by"), { auto: "name" })}
    </div>
    <div class="esum" aria-live="polite">
      <table class="esum-t"><thead><tr><th></th><th>${L("Coût", "Cost")}</th><th>${L("Vente", "Sell")}</th><th>${L("Réel", "Actual")}</th></tr></thead>
      <tbody>${sumRow(L("Matériel", "Material"), "m")}${sumRow(L("Main-d'œuvre", "Labour"), "l")}${sumRow("Total", "t")}</tbody></table>
    </div>
  </section>
  <section class="sec" aria-label="${L("Pompe et moteur", "Pump and motor")}">
    <h2 class="bar">${L("POMPE / MOTEUR", "PUMP / MOTOR")}</h2>
    <div class="grid2">
      ${fld(p, "pumpModel", L("Pompe — modèle", "Pump — model"))}${fld(p, "pumpSN", L("Pompe — n° de série", "Pump — S/N"))}
      ${fld(p, "motorHP", L("Moteur — HP", "Motor — HP"), { mode: "decimal" })}${fld(p, "motorRPM", L("Moteur — RPM", "Motor — RPM"), { mode: "decimal" })}
      ${fld(p, "motorVolts", L("Moteur — Volts", "Motor — Volts"), { mode: "decimal" })}${fld(p, "motorFrame", L("Moteur — carcasse", "Motor — frame"))}
    </div>
  </section>
  <section class="sec" aria-label="${L("Client et projet", "Customer and project")}">
    <h2 class="bar">${L("CLIENT / PROJET", "CUSTOMER / PROJECT")}</h2>
    <div class="grid2">
      ${fld(p, "customer", L("Client", "Customer"), { auto: "organization" })}${fld(p, "contact", "Contact")}
      ${fld(p, "address", L("Adresse (client)", "Address (customer)"))}${fld(p, "project", L("Projet", "Project"))}
      ${fld(p, "ref", L("Référence", "Reference"))}${fld(p, "projAddr", L("Adresse (projet)", "Address (project)"))}
    </div>
  </section>
  <section class="sec" aria-label="${L("Matériel", "Material")}">
    <h2 class="bar">${L("MATÉRIEL", "MATERIAL")}</h2>
    <div data-mat></div>
    <button class="btn addrow" type="button" data-addmat>${L("+ Ajouter une ligne", "+ Add a line")}</button>
    <div class="etot"><span>${L("TOTAL MATÉRIEL", "TOTAL MATERIAL")}</span>${tot("m")}</div>
  </section>
  <section class="sec" aria-label="${L("Main-d'œuvre", "Labour")}">
    <h2 class="bar">${L("MAIN-D'ŒUVRE", "LABOUR")}</h2>
    ${LAB.map(([fr, en], i) => `<div class="lrow"><div class="ldesc">${L(fr, en)}</div>
      <div class="lgrid">
        ${mf(L("Heures", "Hours"), `inputmode="decimal" data-k="lab${i}_h"`)}${mf(L("Taux coût", "Cost rate"), `inputmode="decimal" data-k="lab${i}_c"`)}
        ${mf(L("Taux vente", "Sell rate"), `inputmode="decimal" data-k="lab${i}_s"`)}${mf(L("Réel", "Actual"), `inputmode="decimal" data-k="lab${i}_a"`)}
      </div>
      <div class="mcalc"><span>${L("Total coût", "Total cost")} <b data-lc="${i}">—</b></span><span>${L("Total vente", "Total sell")} <b data-ls="${i}">—</b></span></div></div>`).join("")}
    <div class="etot"><span>${L("TOTAL MAIN-D'ŒUVRE", "TOTAL LABOUR")} (<b data-calc="l_hours">0</b> ${L("h", "h")})</span>${tot("l")}</div>
  </section>`;
}

function estRefresh(host, s) {
  const c = calcEst(s);
  host.querySelectorAll("[data-calc]").forEach(e => {
    const [g, k] = e.dataset.calc.split("_");
    e.textContent = k === "hours" ? String(+c[g][k].toFixed(2)) : money(c[g][k]);
  });
  host.querySelectorAll("[data-mc]").forEach(e => { const r = c.mat[+e.dataset.mc]; e.textContent = r && r.tc != null ? money(r.tc) : "—"; });
  host.querySelectorAll("[data-ms]").forEach(e => { const r = c.mat[+e.dataset.ms]; e.textContent = r && r.ts != null ? money(r.ts) : "—"; });
  host.querySelectorAll("[data-lc]").forEach(e => { const r = c.lab[+e.dataset.lc]; e.textContent = r.tc != null ? money(r.tc) : "—"; });
  host.querySelectorAll("[data-ls]").forEach(e => { const r = c.lab[+e.dataset.ls]; e.textContent = r.ts != null ? money(r.ts) : "—"; });
}

function estInit({ host, state, changed, refresh }) {
  if (!Array.isArray(state.mat) || !state.mat.length) state.mat = [{}];
  // anciens brouillons : on retire les lignes vides en trop à la fin (il en reste toujours une)
  const emptyRow = r => !(r.qty || r.pn || r.desc || r.cost || r.sell || r.act);
  while (state.mat.length > 1 && emptyRow(state.mat[state.mat.length - 1])) state.mat.pop();
  const box = host.querySelector("[data-mat]");
  const render = () => {
    box.innerHTML = state.mat.map((r, i) => `<div class="mrow">
      <div class="mrow-h"><b>${L("Ligne", "Line")} ${i + 1}</b><button class="rm" type="button" data-rm="${i}" aria-label="${L("Retirer la ligne", "Remove line")} ${i + 1}">×</button></div>
      <div class="mgrid">
        <label class="mf s2"><span>${L("Qté", "Qty")}</span><input data-i="${i}" data-m="qty" value="${esc(r.qty)}" inputmode="decimal"></label>
        <label class="mf s4"><span>${L("N° de pièce", "Part No")}</span><input data-i="${i}" data-m="pn" value="${esc(r.pn)}"></label>
        <label class="mf s6"><span>Description</span><input data-i="${i}" data-m="desc" value="${esc(r.desc)}"></label>
        <label class="mf s2"><span>${L("Taux coût", "Cost rate")}</span><input data-i="${i}" data-m="cost" value="${esc(r.cost)}" inputmode="decimal"></label>
        <label class="mf s2"><span>${L("Taux vente", "Sell rate")}</span><input data-i="${i}" data-m="sell" value="${esc(r.sell)}" inputmode="decimal"></label>
        <label class="mf s2"><span>${L("Réel", "Actual")}</span><input data-i="${i}" data-m="act" value="${esc(r.act)}" inputmode="decimal"></label>
      </div>
      <div class="mcalc"><span>${L("Total coût", "Total cost")} <b data-mc="${i}">—</b></span><span>${L("Total vente", "Total sell")} <b data-ms="${i}">—</b></span></div></div>`).join("");
  };
  box.addEventListener("input", e => {
    const t = e.target; if (t.dataset.m == null) return;
    state.mat[+t.dataset.i][t.dataset.m] = t.value; changed(); refresh();
  });
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-rm]"); if (!b) return;
    state.mat.splice(+b.dataset.rm, 1);
    if (!state.mat.length) state.mat.push({});
    render(); changed(); refresh();
  });
  host.querySelector("[data-addmat]").addEventListener("click", () => {
    state.mat.push({}); render(); changed(); refresh();
    const last = box.querySelector(".mrow:last-child input"); if (last) { last.scrollIntoView({ block: "center", behavior: "smooth" }); last.focus({ preventScroll: true }); }
  });
  render();
}

function estPrint(s) {
  const c = calcEst(s), dep = x => x ? x.toUpperCase() : x;
  const mat = (s.mat || []).filter(r => r.qty || r.pn || r.desc || r.cost || r.sell || r.act);
  const rows = mat.map(r => ({ r, k: c.mat[(s.mat || []).indexOf(r)] }));
  while (rows.length < 9) rows.push({ r: {}, k: {} });
  const sumRow = (label, g) => `<tr><th>${label}</th><td>${moneyNZ(c[g].cost)}</td><td>${moneyNZ(c[g].sell)}</td><td>${moneyNZ(c[g].act)}</td></tr>`;
  const matRows = rows.map(({ r, k }) => `<tr><td class="ctr">${v(r.qty)}</td><td>${v(r.pn)}</td><td>${v(r.desc)}</td><td class="n">${rate(r.cost)}</td><td class="n">${money(k.tc)}</td><td class="n">${rate(r.sell)}</td><td class="n">${money(k.ts)}</td><td class="n">${rate(r.act)}</td></tr>`).join("");
  const labRows = LAB.map(([fr, en], i) => `<tr><td class="ctr">${v(s[`lab${i}_h`])}</td><td class="ctr">${dep(L(fr, en))}</td><td class="n">${rate(s[`lab${i}_c`])}</td><td class="n">${money(c.lab[i].tc)}</td><td class="n">${rate(s[`lab${i}_s`])}</td><td class="n">${money(c.lab[i].ts)}</td><td class="n">${rate(s[`lab${i}_a`])}</td></tr>`).join("");
  return `<div class="p-head">
    <img src="logo.svg" alt="">
    <div class="p-addr">860 boul. Industriel<br>Bois-des-Filion, QC<br>Canada, J6Z 4V7<br>Tel : (450) 621-2995<br>Fax : (450) 621-4995</div>
    <table class="p e-sum"><tr><th></th><th>${L("Coût", "Cost")}</th><th>${L("Vente", "Sell")}</th><th>${L("Réel", "Actual")}</th></tr>
      ${sumRow(L("Matériel", "Material"), "m")}${sumRow(L("Main-d'œuvre", "Labour"), "l")}${sumRow("Total", "t")}</table>
  </div>
  <div class="e-bar"><span>${L("SOUMISSION :", "QUOTE :")} ${v(s.quote)}</span><b>${L("ESTIMATION", "ESTIMATE")}</b><span>${v(s.currency || "CAD")}</span></div>
  <div class="m-cols last e-info">
    <div class="m-col">
      <div class="e-sub">${L("POMPE", "PUMP")}</div>
      ${line(it(L("Modèle", "Model"), s.pumpModel))}${line(it(L("N° de série", "S/N"), s.pumpSN))}
      <div class="e-sub">${L("MOTEUR", "MOTOR")}</div>
      ${line(it("HP", s.motorHP), it("RPM", s.motorRPM))}${line(it("Volts", s.motorVolts), it(L("Carcasse", "Frame"), s.motorFrame))}
    </div>
    <div class="m-col">
      ${line(it(L("Client", "Customer"), s.customer, { f: 1.5 }), it("Contact", s.contact))}${line(it(L("Adresse", "Address"), s.address))}
      <div class="m-gap"></div>
      ${line(it(L("Projet", "Project"), s.project, { f: 1.5 }), it(L("Référence", "Reference"), s.ref))}${line(it(L("Adresse", "Address"), s.projAddr))}
    </div>
  </div>
  <div class="e-title">${L("MATÉRIEL", "MATERIAL")}</div>
  <table class="p e-tbl"><colgroup><col style="width:7%"><col style="width:15%"><col><col style="width:10%"><col style="width:11%"><col style="width:10%"><col style="width:11%"><col style="width:10%"></colgroup>
    <thead><tr><th>${L("QTÉ", "QTY")}</th><th>${L("N° DE PIÈCE", "PART NO.")}</th><th>DESCRIPTION</th><th>${L("TAUX COÛT", "COST RATE")}</th><th>${L("TOTAL COÛT", "TOTAL COST")}</th><th>${L("TAUX VENTE", "SELL RATE")}</th><th>${L("TOTAL VENTE", "TOTAL SELL")}</th><th>${L("RÉEL", "ACTUAL")}</th></tr></thead>
    <tbody>${matRows}
    <tr class="e-total"><td></td><td colspan="2">${L("TOTAL MATÉRIEL", "TOTAL MAT'L")}</td><td></td><td class="n">${moneyNZ(c.m.cost)}</td><td></td><td class="n">${moneyNZ(c.m.sell)}</td><td class="n">${moneyNZ(c.m.act)}</td></tr></tbody></table>
  <div class="e-title">${L("MAIN-D'ŒUVRE", "LABOUR")}</div>
  <table class="p e-tbl"><colgroup><col style="width:9%"><col style="width:26%"><col style="width:12%"><col style="width:14%"><col style="width:12%"><col style="width:14%"><col style="width:13%"></colgroup>
    <thead><tr><th>${L("HEURES", "HOURS")}</th><th>DESCRIPTION</th><th>${L("TAUX COÛT", "COST RATE")}</th><th>${L("TOTAL COÛT", "TOTAL COST")}</th><th>${L("TAUX VENTE", "SELL RATE")}</th><th>${L("TOTAL VENTE", "TOTAL SELL")}</th><th>${L("RÉEL", "ACTUAL")}</th></tr></thead>
    <tbody>${labRows}
    <tr class="e-total"><td class="ctr">${c.l.hours ? +c.l.hours.toFixed(2) : ""}</td><td class="ctr">${L("TOTAL MAIN-D'ŒUVRE", "TOTAL LABOUR")}</td><td></td><td class="n">${moneyNZ(c.l.cost)}</td><td></td><td class="n">${moneyNZ(c.l.sell)}</td><td class="n">${moneyNZ(c.l.act)}</td></tr></tbody></table>
  <div class="e-foot">${line(it(L("Préparée par :", "Quote by :"), s.tech, { f: 2 }), it("Date :", s.date, { f: 1 }))}</div>` + foot(s);
}

/* =====================================================================
   5. RÉQUISITION D'ACHAT (impression en paysage)
   ===================================================================== */
function reqHtml(p) {
  return `
  <section class="sec" aria-label="${L("Réquisition d'achat", "Purchase requisition")}">
    <h2 class="bar">${L("RÉQUISITION D'ACHAT", "PURCHASE REQUISITION")}</h2>
    <div class="grid2">
      ${fld(p, "date", "Date", { type: "date" })}${fld(p, "job", L("# Job", "Job #"))}
      ${fld(p, "customer", L("Client", "Customer"), { auto: "organization" })}
    </div>
  </section>
  <section class="sec" aria-label="Descriptions">
    <h2 class="bar">DESCRIPTIONS <span>/ ${L("QUANTITÉ", "QUANTITY")}</span></h2>
    <div data-items></div>
    <button class="btn addrow" type="button" data-additem>${L("+ Ajouter une ligne", "+ Add a line")}</button>
  </section>
  <section class="sec" aria-label="Signatures">
    <h2 class="bar">SIGNATURES</h2>
    <div class="sigcols">
      <div class="sigcol">
        <h3>${L("Employé(e)", "Employee")}</h3>
        ${fld(p, "sigTechName", L("Nom", "Name"), { auto: "name", pref: "tech" })}
        <div class="sigwrap"><div class="sigbox"><canvas data-sig="sigEmp" aria-label="${L("Signature de l'employé", "Employee signature")}"></canvas><div class="hint">${L("Signature de l'employé(e)", "Employee signature")}</div></div>
        <div class="sigtools"><button class="btn ghost" type="button" data-clear="sigEmp">${L("Effacer", "Clear")}</button></div></div>
      </div>
      <div class="sigcol">
        <h3>${L("Approuvé par", "Approved by")}</h3>
        ${fld(p, "approver", L("Nom", "Name"), { auto: "off" })}
        <div class="sigwrap"><div class="sigbox"><canvas data-sig="sigApp" aria-label="${L("Signature de l'approbateur", "Approver signature")}"></canvas><div class="hint">${L("Signature de l'approbateur", "Approver signature")}</div></div>
        <div class="sigtools"><button class="btn ghost" type="button" data-clear="sigApp">${L("Effacer", "Clear")}</button></div></div>
      </div>
    </div>
  </section>`;
}

/* réduit une photo (caméra ou galerie) pour qu'elle reste légère dans le stockage de l'appareil */
function shrinkImage(file, maxDim = 720, quality = 0.62) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url); resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    img.src = url;
  });
}

function reqInit({ host, state, changed, toast }) {
  if (!Array.isArray(state.items) || !state.items.length) state.items = [{}];
  // anciens brouillons : on retire les lignes vides en trop à la fin (il en reste toujours une)
  const emptyItem = r => !(r.desc || r.qty || r.photo);
  while (state.items.length > 1 && emptyItem(state.items[state.items.length - 1])) state.items.pop();
  const box = host.querySelector("[data-items]");
  const render = () => {
    box.innerHTML = state.items.map((r, i) => `<div class="itrow">
      <textarea rows="2" data-i="${i}" data-m="desc" placeholder="Description" aria-label="Description ${L("ligne", "line")} ${i + 1}">${esc(r.desc)}</textarea>
      <input data-i="${i}" data-m="qty" value="${esc(r.qty)}" placeholder="${L("Qté *", "Qty *")}" inputmode="decimal" aria-required="true" aria-label="${L("Quantité (obligatoire) ligne", "Quantity (required) line")} ${i + 1}">
      <button class="rm" type="button" data-rm="${i}" aria-label="${L("Retirer la ligne", "Remove line")} ${i + 1}">×</button>
      <div class="itphoto">
        ${r.photo ? `<img class="thumb" src="${esc(r.photo)}" alt="${L("Photo de la ligne", "Line photo")} ${i + 1}"><button class="btn ghost danger" type="button" data-photo-del="${i}">${L("Retirer la photo", "Remove photo")}</button>` : ""}
        <label class="btn photobtn">📷 ${r.photo ? L("Changer la photo", "Change photo") : L("Ajouter une photo", "Add a photo")}<input type="file" accept="image/*" data-photo="${i}" hidden></label>
      </div></div>`).join("");
  };
  box.addEventListener("change", async e => {
    const t = e.target; if (t.dataset.photo == null || !t.files[0]) return;
    try {
      state.items[+t.dataset.photo].photo = await shrinkImage(t.files[0]);
      render(); changed();
    } catch (err) { toast(L("Image illisible : essayez une photo JPEG ou PNG.", "Unreadable image: try a JPEG or PNG photo.")); }
  });
  box.addEventListener("input", e => {
    const t = e.target; if (t.dataset.m == null) return;
    state.items[+t.dataset.i][t.dataset.m] = t.value; changed();
  });
  box.addEventListener("click", e => {
    const pd = e.target.closest("[data-photo-del]");
    if (pd) { delete state.items[+pd.dataset.photoDel].photo; render(); changed(); return; }
    const b = e.target.closest("[data-rm]"); if (!b) return;
    state.items.splice(+b.dataset.rm, 1);
    if (!state.items.length) state.items.push({});
    render(); changed();
  });
  host.querySelector("[data-additem]").addEventListener("click", () => {
    state.items.push({}); render(); changed();
    const last = box.querySelector(".itrow:last-child input"); if (last) { last.scrollIntoView({ block: "center", behavior: "smooth" }); last.focus({ preventScroll: true }); }
  });
  render();
}

/* règle : chaque description (ou photo) doit avoir une quantité */
function reqValidate(s) {
  const errs = [];
  (s.items || []).forEach((r, i) => {
    const hasItem = String(r.desc || "").trim() || r.photo;
    if (hasItem && !String(r.qty || "").trim())
      errs.push({ selector: `[data-i="${i}"][data-m="qty"]`, message: L(`Ligne ${i + 1} : la quantité est obligatoire.`, `Line ${i + 1}: quantity is required.`) });
  });
  return errs;
}

function reqPrint(s) {
  const items = (s.items || []).filter(r => r.desc || r.qty || r.photo);
  const minRows = items.some(r => r.photo) ? 8 : 12;
  while (items.length < minRows) items.push({});
  const img = d => d ? `<img src="${d}" alt="">` : "";
  return `<div class="r-head">
    <img src="logo.svg" alt="">
    <div class="r-addr">Flo Fab Inc.<br>860 boul. Industriel<br>Bois-des-Filion, Québec, J6Z 4V7</div>
  </div>
  <div class="r-title">${L("RÉQUISITION D'ACHAT", "PURCHASE REQUISITION")}</div>
  <div class="r-info">${line(it("Date :", s.date), it(L("# Job :", "Job # :"), s.job))}${line(it(L("Nom de l'employé :", "Employee name :"), s.sigTechName || s.tech, { f: 1.6 }), it(L("Client :", "Customer :"), s.customer))}</div>
  <table class="p r-tbl"><thead><tr><th>DESCRIPTIONS</th><th style="width:12%">${L("QUANTITÉ", "QUANTITY")}</th></tr></thead>
    <tbody>${items.map(r => `<tr><td><div class="r-desc"><span>${v(r.desc)}</span>${r.photo ? `<img src="${v(r.photo)}" alt="">` : ""}</div></td><td class="ctr">${v(r.qty)}</td></tr>`).join("")}</tbody></table>
  <div class="r-sig">
    <div class="r-sigb"><div class="r-simg">${img(s.sigEmp)}</div><div class="r-sline"><b>${L("Signature employé(e) :", "Employee signature :")}</b> ${v(s.sigTechName || s.tech)}</div></div>
    <div class="r-sigb"><div class="r-simg">${img(s.sigApp)}</div><div class="r-sline"><b>${L("Approuvé par :", "Approved by :")}</b> ${v(s.approver)}</div></div>
  </div>` + foot(s);
}

/* =====================================================================
   6. QC CONTRÔLE PROGRAMMATION — liste de contrôle qualité (fait + testé)
   ===================================================================== */
const VFD_MODES = [["open", "Boucle ouverte", "Open loop"], ["sensorless", "Sensorless curve", "Sensorless curve"], ["closed", "Boucle fermée", "Closed loop"]];
const VOLT_OPTIONS = ["460 V 60 Hz", "575 V 60 Hz", "208 V 60 Hz", "400 V 50 Hz", "230 V 50 Hz", "380 V 50 Hz", "120 V 60 Hz", "240 V 60 Hz"];
const VFD_ROWS = [
  { id: "motor", pk: "motorOk", tk: "motorTune", na: null, fr: "Données moteur entrées", en: "Motor data entered" },
  { id: "volt", pk: null, tk: "voltOk", na: null, single: true, select: "voltage", fr: "Vérifier voltage", en: "Verify voltage" },
  { id: "wire", pk: null, tk: "wireOk", na: null, single: true, fr: "Vérifier filage", en: "Verify wiring" },
  { id: "rot", pk: null, tk: "rotOk", na: null, single: true, fr: "Vérifier rotation", en: "Verify rotation" },
  { id: "cv", pk: null, tk: "cvOk", na: "cvNA", single: true, fr: "Vérifier check valve", en: "Verify check valve" },
  { id: "pid", pk: "pidProg", tk: "pidTest", na: "pidNA", pid: true, fr: "PID setup programmé", en: "PID setup programmed" },
  { id: "seq", pk: "seqProg", tk: "seqTest", na: "seqNA", fr: "Séquence lead-lag / alternance", en: "Lead-lag / alternation sequence" },
  { id: "slp", pk: "slpProg", tk: "slpTest", na: "slpNA", fr: "Sleep mode", en: "Sleep mode" },
  { id: "lp", pk: "lpProg", tk: "lpTest", na: "lpNA", fr: "Low pressure", en: "Low pressure" },
  { id: "hmi", pk: "hmiProg", tk: "hmiTest", na: "hmiNA", fr: "HMI programmé et testé", en: "HMI programmed and tested" }
];

/* état du contrôle : chaque point doit être programmé ET testé, ou sans objet */
function vfdStatus(s) {
  const rows = VFD_ROWS.map(r => {
    const autoNA = !!(r.pid && s.mode === "open");
    const na = autoNA || !!(r.na && s[r.na]);
    return { r, autoNA, na, done: na || !!((r.pk ? s[r.pk] : true) && s[r.tk] && (r.select ? s[r.select] : true)) };
  });
  const left = rows.filter(x => !x.done).length + (s.mode ? 0 : 1);
  return { rows, left, complete: left === 0, modeOk: !!s.mode };
}

function vfdHtml(p) {
  const sec = (title, inner) => `<section class="sec" aria-label="${title}"><h2 class="bar">${title}</h2>${inner}</section>`;
  const row = r => `<div class="qcrow">
      <div class="qctitle">${L(r.fr, r.en)}</div>
      <div class="duo"${r.pid ? " data-pid" : ""}>${r.single ? chk(r.tk, L("Vérifié", "Checked")) : chk(r.pk, L("Programmé", "Programmed")) + chk(r.tk, L("Testé", "Tested"))}${r.na ? chk(r.na, L("S.O.", "N/A")) : ""}</div>
      ${r.select ? `<div class="f qcsel"><label for="${p}-${r.select}">${L("Voltage", "Voltage")}</label><select id="${p}-${r.select}" data-k="${r.select}"><option value="">${L("— Choisir —", "— Choose —")}</option>${VOLT_OPTIONS.map(o => `<option value="${o}">${o}</option>`).join("")}</select></div>` : ""}
      ${r.pid ? `<div class="qcna" data-pid-na hidden>${L("Sans objet en boucle ouverte.", "Not applicable in open loop.")}</div>` : ""}
    </div>`;
  return sec(L("QC CONTRÔLE PROGRAMMATION", "QC PROGRAMMING CHECK"), `
    <div class="grid2">
      ${fld(p, "date", "Date", { type: "date" })}${fld(p, "job", L("# Job", "Job #"))}
      ${fld(p, "customer", L("Client", "Customer"), { auto: "organization" })}${fld(p, "project", L("Projet", "Project"))}
      ${fld(p, "tech", L("Technicien", "Technician"), { auto: "name", mirror: "sigTechName" })}
    </div>`) +
  sec(L("ÉQUIPEMENT", "EQUIPMENT"), `<div data-vfds></div>
    <button class="btn addrow" type="button" data-addvfd>${L("+ Ajouter un VFD", "+ Add a VFD")}</button>
    <div class="grid2" style="border-top:1px solid var(--line)">${fld(p, "hmiModel", L("HMI — modèle", "HMI — model"))}</div>`) +
  sec(L("MODE DE CONTRÔLE", "CONTROL MODE"), `
    <div class="reasons three" role="radiogroup" aria-label="${L("Mode de contrôle", "Control mode")}">${VFD_MODES.map(([k, fr, en]) =>
      `<label class="reason"><span>${L(fr, en)}</span><input type="radio" name="${p}-mode" value="${k}" data-k="mode"></label>`).join("")}</div>`) +
  sec(L("CONTRÔLE QUALITÉ", "QUALITY CHECK"), `<div class="qcsum" data-qc-sum aria-live="polite"></div>${VFD_ROWS.map(row).join("")}`) +
  notesBlock() +
  sec("SIGNATURE", `<div class="sigcols one">
      <div class="sigcol">
        <h3>${L("Technicien", "Technician")}</h3>
        ${fld(p, "sigTechName", L("Nom", "Name"), { auto: "name" })}
        <div class="sigwrap"><div class="sigbox"><canvas data-sig="sigTech" aria-label="${L("Signature du technicien", "Technician signature")}"></canvas><div class="hint">${L("Signature du technicien", "Technician signature")}</div></div>
        <div class="sigtools"><button class="btn ghost" type="button" data-clear="sigTech">${L("Effacer", "Clear")}</button></div></div>
      </div>
    </div>`);
}

function vfdInit({ host, state, changed }) {
  // anciens brouillons : un seul VFD saisi dans les champs vfdModel / vfdSerial
  if (!Array.isArray(state.vfds) || !state.vfds.length) state.vfds = [{ model: state.vfdModel || "", serial: state.vfdSerial || "" }];
  const emptyV = r => !(r.model || r.serial);
  while (state.vfds.length > 1 && emptyV(state.vfds[state.vfds.length - 1])) state.vfds.pop();
  const box = host.querySelector("[data-vfds]");
  const render = () => {
    box.innerHTML = state.vfds.map((r, i) => `<div class="vrow">
      <b class="vt">VFD ${i + 1}</b>
      <label class="mf"><span>${L("Modèle", "Model")}</span><input data-i="${i}" data-m="model" value="${esc(r.model)}"></label>
      <label class="mf"><span>${L("N° de série", "Serial No")}</span><input data-i="${i}" data-m="serial" value="${esc(r.serial)}"></label>
      <button class="rm" type="button" data-rm="${i}" aria-label="${L("Retirer le VFD", "Remove VFD")} ${i + 1}">×</button></div>`).join("");
  };
  box.addEventListener("input", e => {
    const t = e.target; if (t.dataset.m == null) return;
    state.vfds[+t.dataset.i][t.dataset.m] = t.value; changed();
  });
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-rm]"); if (!b) return;
    state.vfds.splice(+b.dataset.rm, 1);
    if (!state.vfds.length) state.vfds.push({});
    render(); changed();
  });
  host.querySelector("[data-addvfd]").addEventListener("click", () => {
    state.vfds.push({}); render(); changed();
    const last = box.querySelector(".vrow:last-child input"); if (last) { last.scrollIntoView({ block: "center", behavior: "smooth" }); last.focus({ preventScroll: true }); }
  });
  render();
}

function vfdRefresh(host, s) {
  const st = vfdStatus(s), open = s.mode === "open";
  host.querySelectorAll("[data-pid]").forEach(e => e.hidden = open);
  host.querySelectorAll("[data-pid-na]").forEach(e => e.hidden = !open);
  VFD_ROWS.forEach(r => {                       // « S.O. » coché : les cases Programmé / Testé sont désactivées
    if (!r.na) return;
    [r.pk, r.tk].filter(Boolean).forEach(k => { const el = host.querySelector(`[data-k="${k}"]`); if (el) el.disabled = !!s[r.na]; });
  });
  const sum = host.querySelector("[data-qc-sum]");
  if (sum) {
    sum.classList.toggle("ok", st.complete);
    sum.textContent = st.complete
      ? L("✓ Contrôle complet : tous les points sont validés.", "✓ Check complete: all items are validated.")
      : L(`${st.left} point${st.left > 1 ? "s" : ""} à valider${st.modeOk ? "" : " (mode de contrôle à choisir)"}.`,
          `${st.left} item${st.left > 1 ? "s" : ""} left to validate${st.modeOk ? "" : " (choose a control mode)"}.`);
  }
}

function vfdPrint(s) {
  const st = vfdStatus(s);
  let vfdList = (Array.isArray(s.vfds) ? s.vfds : [{ model: s.vfdModel, serial: s.vfdSerial }]).filter(r => r && (r.model || r.serial));
  if (!vfdList.length) vfdList = [{}];
  const rows = st.rows.map(({ r, na, autoNA }) => `<tr><td>${L(r.fr, r.en)}${r.select ? ` — <b>${v(s[r.select]) || "…"}</b>` : ""}</td>
      <td class="ctr">${r.pk ? (na ? "" : cb(s[r.pk])) : "—"}</td><td class="ctr">${na ? "" : cb(s[r.tk])}</td>
      <td class="ctr">${r.na || r.pid ? cb(na) : "—"}${autoNA ? `<div class="v-sub">${L("boucle ouverte", "open loop")}</div>` : ""}</td></tr>`).join("");
  const img = d => d ? `<img src="${d}" alt="">` : "";
  const result = st.complete
    ? `<div class="v-result">✓ ${L("RÉSULTAT QC : CONFORME — tous les points sont validés", "QC RESULT: PASSED — all items are validated")}</div>`
    : `<div class="v-result ko">✗ ${L(`RÉSULTAT QC : INCOMPLET — ${st.left} point${st.left > 1 ? "s" : ""} à valider`, `QC RESULT: INCOMPLETE — ${st.left} item${st.left > 1 ? "s" : ""} left to validate`)}</div>`;
  return `<div class="p-head"><img src="logo.svg" alt="">
    <div class="p-addr">860 boul. Industriel<br>Bois-des-Filion, QC<br>Canada, J6Z 4V7<br>Tel : (450) 621-2995<br>Fax : (450) 621-4995</div></div>
  <div class="m-bar">${L("QC CONTRÔLE PROGRAMMATION", "QC PROGRAMMING CHECK")}</div>
  <div class="m-cols last v-info"><div class="m-col">
      ${line(it("Date :", s.date), it(L("# Job :", "Job # :"), s.job))}${line(it(L("Client :", "Customer :"), s.customer))}${line(it(L("Projet :", "Project :"), s.project))}${line(it(L("Technicien :", "Technician :"), s.tech))}
    </div><div class="m-col">
      ${vfdList.map((r, i) => line(it(`VFD ${i + 1} ${L("modèle :", "model :")}`, r.model, { f: 1.5 }), it(L("N° série :", "Serial No :"), r.serial))).join("")}
      ${line(it(L("HMI modèle :", "HMI model :"), s.hmiModel))}
    </div></div>
  <div class="m-bar">${L("MODE DE CONTRÔLE", "CONTROL MODE")}</div>
  <div class="v-modes">${VFD_MODES.map(([k, fr, en]) => ck(s.mode === k, L(fr, en))).join("")}</div>
  <div class="m-bar">${L("CONTRÔLE QUALITÉ", "QUALITY CHECK")}</div>
  <table class="p v-tbl"><colgroup><col><col style="width:16%"><col style="width:16%"><col style="width:16%"></colgroup>
    <thead><tr><th>${L("POINT À VALIDER", "ITEM TO VALIDATE")}</th><th>${L("PROGRAMMÉ", "PROGRAMMED")}</th><th>${L("TESTÉ", "TESTED")}</th><th>${L("S.O.", "N/A")}</th></tr></thead>
    <tbody>${rows}</tbody></table>
  ${result}
  ${noteBlock(s)}
  <div class="avoid"><div class="m-bar">SIGNATURE</div><div class="r-sig">
    <div class="r-sigb" style="max-width:50%"><div class="r-simg">${img(s.sigTech)}</div><div class="r-sline"><b>${L("Technicien :", "Technician :")}</b> ${v(s.sigTechName || s.tech)}</div></div>
  </div></div>` + foot(s);
}

/* =====================================================================
   7. FEUILLE D'IDENTIFICATION JOB (formulaire interne)
   Grande feuille à poser sur le travail : #Quote, Client, Projet, # Job + date et heure d'impression automatiques.
   ===================================================================== */
function identHtml(p) {
  return `
  <section class="sec" aria-label="${L("Feuille d'identification job", "Job identification sheet")}">
    <h2 class="bar">${L("FEUILLE D'IDENTIFICATION JOB", "JOB IDENTIFICATION SHEET")}</h2>
    <div class="grid2">
      ${fld(p, "quote", "#Quote")}${fld(p, "customer", L("Client", "Customer"), { auto: "organization" })}
      ${fld(p, "project", L("Projet", "Project"))}${fld(p, "job", L("# Job", "# Job"))}
    </div>
    <p class="mintro" style="padding:10px 14px;margin:0;border-top:1px solid var(--line)">${L(
      "La feuille s'imprime en grand format. Un champ laissé vide s'imprime en gris clair (à remplir à la main). La date et l'heure d'impression s'ajoutent automatiquement au bas de la feuille.",
      "The sheet prints in large type. An empty field prints in light grey (to fill in by hand). The print date and time are added automatically at the bottom of the sheet.")}</p>
  </section>`;
}

function identPrint(s) {
  const n = new Date(), p2 = x => String(x).padStart(2, "0");
  const stamp = `${n.getFullYear()}-${p2(n.getMonth() + 1)}-${p2(n.getDate())} ${p2(n.getHours())}:${p2(n.getMinutes())}`;
  // la taille du texte s'adapte à la longueur pour que tout tienne en largeur
  const line = (val, placeholder) => {
    const t = String(val || "").trim(), txt = t || placeholder;
    // taille calculée d'après la largeur réelle du texte (Times New Roman), pour que tout tienne sur une ligne
    const cx = identPrint.cx || (identPrint.cx = document.createElement("canvas").getContext("2d"));
    cx.font = '100px "Times New Roman", Times, serif';
    const w1 = Math.max(0.01, cx.measureText(txt).width / 100);            // largeur du texte à 1 px
    const fs = Math.floor(Math.max(14, Math.min(80, 500 / w1)));           // 500 pt de large disponibles (≈ 670 px)
    return `<div class="i-line${t ? "" : " ph"}" style="font-size:${fs}pt">${v(txt)}</div>`;
  };
  return `<div class="i-page">
    <img class="i-logo" src="logo.svg" alt="">
    <div class="i-lines">${line(s.quote, "#Quote")}${line(s.customer, L("Client", "Customer"))}${line(s.project, L("Projet", "Project"))}${line(s.job, "# Job")}</div>
    <div class="i-foot"><span>${L("Date et heure d'impression :", "Printed on:")}</span> <b>${stamp}</b> <span class="i-ver">· ${v(verLabel("ident"))}</span></div>
  </div>`;
}

/* =====================================================================
   8. TEST DE PERFORMANCE DE POMPE — ANSI/HI 14.6, Grade 2B (formulaire interne, unités US)
   Reprend la feuille Excel « Rotodynamic test pump » : mêmes formules, mêmes seuils, mêmes verdicts.
   ===================================================================== */
const todayLocal = () => { const n = new Date(); return `${n.getFullYear()}-${p2(n.getMonth() + 1)}-${p2(n.getDate())}`; };
const nf = (x, d = 2) => x == null || !isFinite(x) ? "" : x.toLocaleString(LANG === "en" ? "en-CA" : "fr-CA", { minimumFractionDigits: d, maximumFractionDigits: d });
const nfd = (x, d = 2) => { const t = nf(x, d); return t === "" ? "—" : t; };
const PT_LBL = [["1 (Shutoff)", "1 (Débit nul)"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6", "6"], ["7 (Duty Point)", "7 (Point de service)"], ["8 (Overload)", "8 (Surcharge)"]];
const INS_LBL = [["Flow Meter", "Débitmètre"], ["Inlet Pressure Manometer", "Manomètre d'aspiration"], ["Discharge Pressure Manometer", "Manomètre de refoulement"],
  ["Tachymeter (Speed Sensor)", "Tachymètre (capteur de vitesse)"], ["Current Meter", "Ampèremètre"]];
/* Valeurs FIXES de la feuille Excel (cellules sans fond brun) : ne se saisissent pas dans le formulaire.
   Pour les changer (ex. instrument ré-étalonné), modifier ces tableaux sur GitHub, puis augmenter la version (VERSIONS.pump). */
const PUMP_SG = 1;                       // densité relative (eau = 1)
const PUMP_PATM = 14.696;                // pression barométrique (psia, niveau de la mer)
const PUMP_INS = [                       // registre des instruments : [fabricant / modèle, n° de série, étalonnage, échéance, précision]
  ["GE PT878", "2110243", "2026-01-15", "2027-01-15", "±0,25% of Rate"],
  ["WIKA S-20", "PT-2025-0144A", "2025-11-04", "2026-11-04", "±0,50% of Span"],
  ["WIKA S-20", "PT-2025-0144B", "2025-11-04", "2026-11-04", "±0,50% of Span"],
  ["Monarch Instrument", "TACH-2026-03B", "2026-03-22", "2027-03-22", "±0,01% of Reading"],
  ["Fluke 435-II", "PQA-2025-887C", "2025-08-19", "2026-08-19", "±0,50% of Reading"]
];
const PUMP_STEPS = [[0.52, 0], [-1.64, 0], [-3.81, 0.1], [-5.97, 0.5], [-7.27, 1.8], [-8.14, 4.2], [-9.43, 8.5]];   // essai NPSH : [P1 psig, chute visée %]
// dates d'étalonnage / d'échéance : modifiables dans le formulaire ; vides = valeurs du registre ci-dessus
const insDate = (s, i, j) => (s && s[`ins${i + 1}_${j === 2 ? "cal" : "due"}`]) || PUMP_INS[i][j];
const REVS = [["1", "2021-02-11", "Initial issue.", "M. Paquette"], ["2", "2025-10-20", "Corrected Grade 2B", "M.To"],
  ["3", "2026-10-14", "Conversion en formulaire de l'application Flo-Fab (calculs automatiques, graphiques, PDF).", "—"]];

/* ----- calculs (mêmes formules que la feuille Excel) ----- */
function pumpCalc(s) {
  const n = k => num(s[k]), has = x => x != null && isFinite(x);
  const Nr = n("Nr"), SG = PUMP_SG, Ds = n("Ds"), Dd = n("Dd"), Zs = n("Zs"), Zd = n("Zd"), V = n("volts"), pf = n("pf"), em = n("effM");
  const geom = has(SG) && SG > 0 && has(Ds) && Ds > 0 && has(Dd) && Dd > 0 && has(Zs) && has(Zd);
  const vel = Q => 0.002593 * ((1 / Dd ** 4) - (1 / Ds ** 4)) * Q * Q;           // différence des hauteurs de vitesse (Q en GPM, D en po)
  const pts = [];
  for (let i = 1; i <= 8; i++) {
    const N = num(s[`r${i}_N`]), Q = num(s[`r${i}_Q`]), P1 = num(s[`r${i}_P1`]), P2 = num(s[`r${i}_P2`]), I = num(s[`r${i}_I`]);
    const o = { N, Q, P1, P2, I, tdh: null, qc: null, hc: null, pc: null, eff: null };
    if (geom && has(P1) && has(P2) && has(Q)) o.tdh = ((P2 - P1) * 2.31 / SG) + (Zd - Zs) + vel(Q);
    const ratio = has(Nr) && Nr > 0 && has(N) && N > 0 ? Nr / N : null;                 // correction de vitesse (lois d'affinité)
    if (ratio != null && has(Q)) o.qc = Q * ratio;
    if (geom && ratio != null && o.qc != null && has(P1) && has(P2)) o.hc = ((P2 - P1) * 2.31 / SG) * ratio ** 2 + (Zd - Zs) + vel(o.qc);
    if (ratio != null && has(V) && has(I) && has(pf) && has(em)) o.pc = ((Math.sqrt(3) * V * I * pf * (em / 100)) / 746) * ratio ** 3;
    if (o.pc != null && o.qc != null && o.hc != null) o.eff = o.pc > 0 ? ((o.qc * o.hc * SG) / 3960) / o.pc * 100 : 0;
    pts.push(o);
  }
  const duty = pts[6];
  // valeurs garanties et seuils Grade 2B
  const Qg = n("Qg"), Hg = n("Hg"), effG = n("effG");
  const PgAuto = has(Qg) && has(Hg) && has(SG) && SG > 0 && has(effG) && effG > 0 ? Qg * Hg * SG / 3960 / (effG / 100) : null;
  const Pg = PgAuto;                                                              // puissance garantie : calculée (Q·H·SG / 3960 / η)
  const lim = {
    Qlo: has(Qg) ? Qg * 0.92 : null, Qhi: has(Qg) ? Qg * 1.08 : null, Hlo: has(Hg) ? Hg * 0.95 : null, Hhi: has(Hg) ? Hg * 1.05 : null,
    Pmax: has(Pg) ? Pg * 1.08 : null, Emin: has(effG) ? effG * 0.95 : null, Pg, PgAuto, PorMin: has(Qg) ? Qg * 0.7 : null, PorMax: has(Qg) ? Qg * 1.2 : null
  };
  // NPSH — essai de type II (NPSH3)
  const Tw = n("Tw"), Patm = PUMP_PATM, NPSHr = n("NPSHr");
  const pvap = has(Tw) ? Math.pow(10, 8.07131 - (1730.63 / (233.426 + (Tw - 32) / 1.8))) * 0.0193368 : null;
  const qtest = has(duty.Q) ? duty.Q : null, href = duty.tdh;
  // étapes : on saisit P1 et la chute visée ; débit d'essai, P2, hauteur H, NPSHA et chute sont CALCULÉS (comme la feuille Excel)
  const steps = PUMP_STEPS.map(([P1, tg]) => {
    const Q = qtest;
    const o = { Q, P1, tgt: tg, P2: null, h: null, npsha: null, drop: null };
    if (geom && has(Q) && has(P1) && has(tg) && has(href)) {
      o.P2 = P1 + (href * (1 - tg / 100) - (Zd - Zs) - vel(Q)) * SG / 2.31;                 // pression de refoulement reconstituée
      o.h = ((o.P2 - P1) * 2.31 / SG) + (Zd - Zs) + vel(Q);
      if (href !== 0) o.drop = (href - o.h) / href * 100;
    }
    if (geom && has(Q) && has(P1) && has(Patm) && has(pvap)) o.npsha = (Patm - pvap) * 2.31 / SG + (P1 * 2.31 / SG) + Zs + 0.002593 * (1 / Ds ** 4) * Q * Q;
    return o;
  });
  // NPSH3 : interpolation linéaire entre les deux étapes consécutives qui encadrent une chute de hauteur de 3 %
  const full = steps.filter(x => x.npsha != null && x.drop != null);
  let npsh3 = null, npsh3Why = "";
  for (let i = 0; i + 1 < full.length; i++) {
    const a = full[i], b = full[i + 1];
    if (a.drop < 3 && b.drop >= 3) { npsh3 = a.npsha - ((3 - a.drop) / (b.drop - a.drop)) * (a.npsha - b.npsha); break; }
  }
  if (npsh3 == null) {
    if (full.length < 2) npsh3Why = "few";
    else if (full.every(x => x.drop < 3)) npsh3Why = "low";            // l'essai doit continuer jusqu'à une chute ≥ 3 %
    else npsh3Why = "order";
  }
  const npshStatus = npsh3 != null && has(NPSHr) ? (npsh3 <= NPSHr ? "PASS" : "FAIL") : null;
  const npshaNormal = geom && has(Patm) && has(pvap) && has(duty.P1) && has(duty.Q) ? (Patm - pvap) * 2.31 / SG + (duty.P1 * 2.31 / SG) + Zs + 0.002593 * (1 / Ds ** 4) * duty.Q * duty.Q : null;
  const margin = npshaNormal != null && has(NPSHr) ? npshaNormal - NPSHr : null;
  // verdict (point de service = point 7, valeurs corrigées)
  const chk = (val, ok) => val == null || ok == null ? null : (ok ? "PASS" : "FAIL");
  const vd = {
    flow: chk(duty.qc, lim.Qlo != null && duty.qc != null ? duty.qc >= lim.Qlo && duty.qc <= lim.Qhi : null),
    head: chk(duty.hc, lim.Hlo != null && duty.hc != null ? duty.hc >= lim.Hlo && duty.hc <= lim.Hhi : null),
    power: chk(duty.pc, lim.Pmax != null && duty.pc != null ? duty.pc <= lim.Pmax : null),
    eff: chk(duty.eff, lim.Emin != null && duty.eff != null ? duty.eff >= lim.Emin : null),
    npsh: npshStatus
  };
  const vals = Object.values(vd);
  vd.final = vals.includes("FAIL") ? "REJECT" : (vals.every(x => x === "PASS") ? "ACCEPT" : null);
  // registre des instruments : étalonnage valide à la date d'essai ?
  const td = String(s.date || "");
  const ins = PUMP_INS.map((r, i) => { const due = insDate(s, i, 3); return !due || !td ? null : (due >= td ? "ok" : "expired"); });
  return { geom, pts, duty, lim, pvap, qtest, href, steps, npsh3, npsh3Why, npshStatus, npshaNormal, margin, vd, ins, NPSHr };
}

/* ----- graphiques (SVG en ligne : écran, impression et PDF) ----- */
function niceMax(v, ticks = 5) {
  if (!(v > 0)) return 1;
  const raw = v / ticks, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  return { step, max: Math.ceil(v / step - 1e-9) * step };
}
function smoothPath(pts) {                                    // courbe lissée (Catmull-Rom → Bézier)
  if (pts.length < 3) return pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}
// o : { w, h, title, xLabel, yLabel, y2Label, curves:[{pts,axis,color,marker,name}], marks:[{x,y,axis,color,name}], vlines:[{x,color,name}], fixed }
function svgChart(o) {
  const W = o.w, H = o.h, ml = 46, mr = o.y2Label ? 46 : 14, mt = 24, mb = 78 + (o.legendRows || 0) * 12;
  const all = [...o.curves.flatMap(c => c.pts), ...(o.marks || [])];
  const xs = all.map(p => p[0] != null ? p[0] : p.x).filter(x => x != null);
  if (!xs.length) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" ${o.fixed ? `width="${W}" height="${H}"` : ""} role="img" aria-label="${esc(o.title)}"><rect width="${W}" height="${H}" fill="#f4f7fb" stroke="#ccd6e3"/><text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#6b7a8c">${esc(o.title)} — ${L("données à saisir", "data to enter")}</text></svg>`;
  const xmaxRaw = Math.max(...xs, ...(o.vlines || []).map(l => l.x)), xN = niceMax(xmaxRaw * 1.04);
  const ymaxOf = ax => Math.max(...o.curves.filter(c => c.axis === ax).flatMap(c => c.pts.map(p => p[1])), ...(o.marks || []).filter(m => m.axis === ax).map(m => m.y), 0);
  const y1N = niceMax(ymaxOf(1) * 1.08 || 1), y2N = o.y2Max ? { step: o.y2Max / 5, max: o.y2Max } : niceMax(ymaxOf(2) * 1.08 || 1);
  const pw = W - ml - mr, ph = H - mt - mb;
  const X = x => ml + (x / xN.max) * pw, Y1 = y => mt + ph - (y / y1N.max) * ph, Y2 = y => mt + ph - (y / y2N.max) * ph, Yf = ax => ax === 2 ? Y2 : Y1;
  let g = `<rect x="${ml}" y="${mt}" width="${pw}" height="${ph}" fill="#fff" stroke="#9aa8b8"/>`;
  for (let t = 0; t <= 5; t++) {
    const gy = mt + ph - (t / 5) * ph;
    g += `<line x1="${ml}" y1="${gy.toFixed(1)}" x2="${ml + pw}" y2="${gy.toFixed(1)}" stroke="#e1e7ef"/>`;
    g += `<text x="${ml - 5}" y="${(gy + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#333">${+(y1N.max * t / 5).toFixed(2)}</text>`;
    if (o.y2Label) g += `<text x="${ml + pw + 5}" y="${(gy + 3).toFixed(1)}" font-size="9" fill="#333">${+(y2N.max * t / 5).toFixed(2)}</text>`;
  }
  for (let t = 0; t * xN.step <= xN.max + 1e-9; t++) {
    const gx = X(t * xN.step);
    g += `<line x1="${gx.toFixed(1)}" y1="${mt}" x2="${gx.toFixed(1)}" y2="${mt + ph}" stroke="#eef2f7"/><text x="${gx.toFixed(1)}" y="${mt + ph + 12}" text-anchor="middle" font-size="9" fill="#333">${+(t * xN.step).toFixed(2)}</text>`;
  }
  (o.vlines || []).forEach(l => { g += `<line x1="${X(l.x).toFixed(1)}" y1="${mt}" x2="${X(l.x).toFixed(1)}" y2="${mt + ph}" stroke="${l.color}" stroke-width="1.4" stroke-dasharray="5 4"/>`; });
  o.curves.forEach(c => {
    const px = c.pts.map(p => [X(p[0]), Yf(c.axis)(p[1])]);
    if (px.length > 1) g += `<path d="${smoothPath(px)}" fill="none" stroke="${c.color}" stroke-width="2"/>`;
    px.forEach(p => { g += c.marker === "square" ? `<rect x="${(p[0] - 3).toFixed(1)}" y="${(p[1] - 3).toFixed(1)}" width="6" height="6" fill="${c.color}"/>` : `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.2" fill="${c.color}"/>`; });
  });
  (o.marks || []).forEach(m => { const cx = X(m.x).toFixed(1), cy = Yf(m.axis)(m.y).toFixed(1); g += `<circle cx="${cx}" cy="${cy}" r="6.5" fill="none" stroke="${m.color}" stroke-width="2.2"/><circle cx="${cx}" cy="${cy}" r="2.6" fill="${m.color}"/>`; });
  const lg = [...o.curves.map(c => [c.color, c.name, "line"]), ...(o.marks || []).map(m => [m.color, m.name, "mark"]), ...(o.vlines || []).map(l => [l.color, l.name, "dash"])];
  const cols = 2, lw = pw / cols;
  lg.forEach((it, i) => {
    const lx = ml + (i % cols) * lw, ly = mt + ph + 38 + Math.floor(i / cols) * 12;
    g += it[2] === "dash" ? `<line x1="${lx}" y1="${ly - 3}" x2="${lx + 16}" y2="${ly - 3}" stroke="${it[0]}" stroke-width="1.6" stroke-dasharray="4 3"/>` : it[2] === "mark" ? `<circle cx="${lx + 8}" cy="${ly - 3}" r="4.5" fill="none" stroke="${it[0]}" stroke-width="2"/>` : `<line x1="${lx}" y1="${ly - 3}" x2="${lx + 16}" y2="${ly - 3}" stroke="${it[0]}" stroke-width="2.2"/>`;
    g += `<text x="${lx + 20}" y="${ly}" font-size="8.5" fill="#222">${esc(it[1])}</text>`;
  });
  g += `<text x="${ml + pw / 2}" y="${mt + ph + 28}" text-anchor="middle" font-size="9.5" fill="#222">${esc(o.xLabel)}</text>`;
  g += `<text transform="translate(11 ${mt + ph / 2}) rotate(-90)" text-anchor="middle" font-size="9.5" fill="${o.curves.find(c => c.axis === 1) ? o.curves.find(c => c.axis === 1).color : "#222"}">${esc(o.yLabel)}</text>`;
  if (o.y2Label) g += `<text transform="translate(${W - 8} ${mt + ph / 2}) rotate(90)" text-anchor="middle" font-size="9.5" fill="${o.curves.find(c => c.axis === 2).color}">${esc(o.y2Label)}</text>`;
  g += `<text x="${W / 2}" y="14" text-anchor="middle" font-size="11" font-weight="700" fill="#0b3d6e">${esc(o.title)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" ${o.fixed ? `width="${W}" height="${H}"` : ""} font-family="Arial,Helvetica,sans-serif" role="img" aria-label="${esc(o.title)}">${g}</svg>`;
}
function pumpCharts(c, fixed) {
  const good = c.pts.filter(p => p.qc != null && p.hc != null), goodE = c.pts.filter(p => p.qc != null && p.eff != null), goodP = c.pts.filter(p => p.qc != null && p.pc != null);
  const d = c.duty, xl = L("Débit corrigé à la vitesse nominale (GPM)", "Flow corrected to rated speed (GPM)");
  const vl = c.lim.PorMin != null ? [{ x: c.lim.PorMin, color: "#7b8794", name: L("POR min (70 % Qg)", "POR min (70% Qg)") }, { x: c.lim.PorMax, color: "#a0522d", name: L("POR max (120 % Qg)", "POR max (120% Qg)") }] : [];
  const perf = svgChart({
    w: fixed ? 440 : 380, h: fixed ? 300 : 320, fixed, legendRows: 3, title: L("Courbe de performance — hauteur et rendement vs débit", "Pump performance curve — head & efficiency vs flow"), xLabel: xl, yLabel: L("Hauteur totale (ft)", "Total head (ft)"), y2Label: L("Rendement (%)", "Efficiency (%)"), y2Max: 100,
    curves: [{ pts: good.map(p => [p.qc, p.hc]), axis: 1, color: "#0f6fcb", marker: "circle", name: L("Hauteur (points d'essai)", "Head (test points)") }, { pts: goodE.map(p => [p.qc, p.eff]), axis: 2, color: "#1f9d55", marker: "square", name: L("Rendement (points d'essai)", "Efficiency (test points)") }],
    marks: d.qc != null && d.hc != null ? [{ x: d.qc, y: d.hc, axis: 1, color: "#e11d48", name: L("Point de service", "Duty point") }, ...(d.eff != null ? [{ x: d.qc, y: d.eff, axis: 2, color: "#b45309", name: L("Point de service (rendement)", "Duty point (efficiency)") }] : [])] : [],
    vlines: vl
  });
  const pow = svgChart({
    w: fixed ? 280 : 380, h: 300, fixed, legendRows: 1, title: L("Puissance à l'arbre vs débit", "Shaft power vs flow"), xLabel: xl.replace(" à la vitesse nominale", "").replace(" corrected to rated speed", " corr."), yLabel: L("Puissance à l'arbre (HP)", "Shaft power (HP)"),
    curves: [{ pts: goodP.map(p => [p.qc, p.pc]), axis: 1, color: "#c0392b", marker: "circle", name: L("Puissance (points)", "Shaft power (points)") }],
    marks: d.qc != null && d.pc != null ? [{ x: d.qc, y: d.pc, axis: 1, color: "#e11d48", name: L("Point de service", "Duty point") }] : []
  });
  return { perf, pow };
}

/* ----- écran ----- */
const mfT = (label, k, extra = "") => `<label class="mf"><span>${label}</span><input data-k="${k}" autocomplete="off" ${extra}></label>`;
const mfD = (label, k) => mfT(label, k, 'inputmode="decimal"');
const mfN = (label, k) => mfT(label, k, 'inputmode="text" autocapitalize="off" spellcheck="false"');       // peut être négatif : clavier complet sur iPhone
const mfDate = (label, k) => `<label class="mf"><span>${label}</span><input type="date" data-k="${k}"></label>`;
const chipHtml = (st, kind) => st == null ? `<span class="chip">—</span>` : `<span class="chip ${st === "PASS" || st === "ACCEPT" ? "ok" : "ko"}">${pumpWord(st)}</span>`;
const pumpWord = st => ({ PASS: L("CONFORME", "PASS"), FAIL: L("NON CONFORME", "FAIL"), ACCEPT: L("ACCEPTÉ", "ACCEPT"), REJECT: L("REJETÉ", "REJECT") }[st] || "—");

function pumpHtml(p) {
  const sec = (title, inner) => `<section class="sec" aria-label="${title}"><h2 class="bar">${title}</h2>${inner}</section>`;
  const rowsTol = [["Q", L("Débit Qg", "Flow Qg"), "GPM", "qg", "±8 %"], ["H", L("Hauteur Hg", "Head Hg"), "ft", "hg", "±5 %"], ["P", L("Puissance Pg", "Power Pg"), "HP", "pg", L("max +8 %", "max +8%")], ["E", L("Rendement ηg", "Efficiency ηg"), "%", "eg", L("min −5 %", "min −5%")]];
  return sec(L("ESSAI DE PERFORMANCE DE POMPE — GRADE 2B (ANSI/HI 14.6)", "PUMP PERFORMANCE TEST — GRADE 2B (ANSI/HI 14.6)"), `
    <p class="mintro" style="padding:10px 14px 0;margin:0">${L("Pompes rotodynamiques : essai de réception de performance hydraulique, avec registres de métrologie et de moteur. Unités US (GPM, ft, psi, HP). Confirmez l'édition / l'année de la norme HI 14.6 applicable au contrat.", "Rotodynamic pumps: hydraulic performance acceptance test with metrology and motor registries. US customary units (GPM, ft, psi, HP). Confirm the ANSI/HI 14.6 edition/year that applies to the contract.")}</p>
    <div class="grid2">
      ${fld(p, "project", L("Nom du projet", "Project name"))}${fld(p, "date", L("Date de l'essai", "Test date"), { type: "date" })}
      ${fld(p, "inspector", L("Inspecteur / ingénieur", "Inspector / engineer"))}${fld(p, "facility", L("Installation / lieu", "Facility / location"))}
    </div>`) +
  sec(L("INFORMATIONS SUR LA POMPE", "PUMP INFORMATION"), `<div class="grid2">
      ${fld(p, "model", L("Modèle de la pompe", "Pump model"))}${fld(p, "serial", L("N° de série de la pompe", "Pump serial number"))}
      ${fld(p, "Nr", L("Vitesse nominale Nr (rpm)", "Rated speed Nr (rpm)"), { mode: "decimal" })}${fld(p, "effG", L("Rendement garanti (%)", "Efficiency guaranteed (%)"), { mode: "decimal" })}
      ${fld(p, "Ds", L("Ø intérieur conduite aspiration Ds (po)", "Suction pipe ID Ds (in)"), { mode: "decimal" })}${fld(p, "Dd", L("Ø intérieur conduite refoulement Dd (po)", "Discharge pipe ID Dd (in)"), { mode: "decimal" })}
      ${fld(p, "Zs", L("Élévation manomètre aspiration Zs (ft)", "Suction gauge elevation Zs (ft)"), { mode: "text" })}${fld(p, "Zd", L("Élévation manomètre refoulement Zd (ft)", "Discharge gauge elevation Zd (ft)"), { mode: "text" })}
      ${fld(p, "Qg", L("Débit garanti (US GPM)", "Flow rate (US GPM)"), { mode: "decimal" })}${fld(p, "Hg", L("Hauteur totale garantie TDH (ft)", "Total dynamic head TDH (ft)"), { mode: "decimal" })}
      ${fld(p, "impDia", L("Diamètre de la roue (po)", "Impeller diameter (in)"), { mode: "decimal" })}${fld(p, "NPSHr", L("NPSH requis NPSHr (ft)", "NPSH required NPSHr (ft)"), { mode: "decimal" })}
    </div>
    <div class="fixrow"><span>${L("Densité relative SG", "Specific gravity SG")} <b>1</b> (${L("eau", "water")}) <em>${L("fixe", "fixed")}</em></span><span>${L("Puissance garantie Pg", "Guaranteed power Pg")} <b data-pc="pg_g2">—</b> HP <em>${L("calculée", "calculated")}</em></span>
    </div>`) +
  sec(L("VALEURS GARANTIES ET SEUILS DE TOLÉRANCE (GRADE 2B)", "GUARANTEED VALUES & TOLERANCE THRESHOLDS (GRADE 2B)"), rowsTol.map(([k, lab, u, d, tol]) => `<div class="tolrow"><b>${lab}</b><span>${L("Garanti", "Guaranteed")} <b data-pc="${d}_g">—</b> ${u}</span><span>${L("Limite", "Limit")} (${tol}) <b data-pc="${d}_l">—</b> ${u}</span></div>`).join("")) +
  sec(L("INFORMATIONS SUR LE MOTEUR", "MOTOR INFORMATION"), `<div class="grid2">
      ${fld(p, "mfr", L("Fabricant du moteur", "Motor manufacturer"))}${fld(p, "mserial", L("N° de série du moteur", "Motor serial number"))}
      ${fld(p, "frame", L("Carcasse (frame)", "Frame size"))}${fld(p, "encl", L("Type d'enveloppe", "Enclosure rating"))}
      ${fld(p, "hp", L("Puissance nominale (HP)", "Nominal output power (HP)"), { mode: "decimal" })}${fld(p, "frpm", L("Vitesse pleine charge (rpm)", "Full-load speed (rpm)"), { mode: "decimal" })}
      ${fld(p, "volts", L("Tension d'alimentation (V)", "Supply voltage (V)"), { mode: "decimal" })}${fld(p, "amps", L("Courant pleine charge (A)", "Full-load current (A)"), { mode: "decimal" })}
      ${fld(p, "phase", L("Phases / fréquence (ex. 3 Ph / 60 Hz)", "Phase / frequency (e.g. 3 Ph / 60 Hz)"))}${fld(p, "sf", L("Facteur de service", "Service factor"), { mode: "decimal" })}
      ${fld(p, "effM", L("Rendement du moteur ηm (%)", "Motor efficiency ηm (%)"), { mode: "decimal" })}${fld(p, "pf", L("Facteur de puissance (PF)", "Power factor (PF)"), { mode: "decimal" })}
    </div>`) +
  sec(L("REGISTRE DES INSTRUMENTS DE MESURE", "METROLOGICAL INSTRUMENTATION REGISTRY"), `<p class="mintro" style="padding:10px 14px 0;margin:0">${L("Fabricant, n° de série et précision : fixes (registre de l'entreprise). Les dates d'étalonnage et d'échéance se modifient ; l'état d'étalonnage est vérifié à la date de l'essai.", "Manufacturer, serial number and accuracy: fixed (company registry). The calibration and due dates can be changed; the calibration status is checked against the test date.")}</p>` + INS_LBL.map(([en, fr], i) => `<div class="mrow">
      <div class="mrow-h"><b>${L(fr, en)}</b><span data-ins="${i}"></span></div>
      <div class="pout"><span>${v(PUMP_INS[i][0])}</span><span>${L("N° de série", "Serial")} <b>${v(PUMP_INS[i][1])}</b></span><span>${v(PUMP_INS[i][4])}</span></div>
      <div class="mgrid"><div class="s3">${mfDate(L("Date d'étalonnage", "Calibration date"), `ins${i + 1}_cal`)}</div><div class="s3">${mfDate(L("Échéance d'étalonnage", "Calibration due"), `ins${i + 1}_due`)}</div></div></div>`).join("")) +
  sec(L("SECTION 1 — DONNÉES BRUTES (CAPTEURS DU BANC D'ESSAI)", "SECTION 1 — RAW DATA ACQUISITION LOG (FROM TEST STAND SENSORS)"), `
    <p class="mintro" style="padding:10px 14px;margin:0">${L("Saisissez les mesures dans les cases beiges, comme dans la feuille Excel. Le TDH brut se calcule seul.", "Enter the readings in the beige cells, as in the Excel sheet. The raw TDH is calculated automatically.")}</p>
    <div class="rawwrap" role="region" aria-label="${L("Tableau des données brutes", "Raw data table")}" tabindex="0"><table class="rawt">
      <thead><tr><th>${L("Point d'essai", "Test Point")}<br><small>#</small></th><th>${L("Vitesse (Nt)", "Speed (Nt)")}<br><small>rpm</small></th><th>${L("Débit (Qt)", "Flow (Qt)")}<br><small>GPM</small></th><th>${L("Press. aspiration (P1)", "Suction Pres (P1)")}<br><small>PSI</small></th><th>${L("Press. refoulement (P2)", "Discharge Pres (P2)")}<br><small>PSI</small></th><th>${L("Courant (I)", "Current (I)")}<br><small>${L("A", "Amps")}</small></th><th>TDH (${L("brut", "raw")})<br><small>ft</small></th></tr></thead>
      <tbody>${PT_LBL.map(([en, fr], i) => { const lab = L(fr, en), n = i + 1, cell = (k, mode, name) => `<td><input data-k="r${n}_${k}" ${mode === "neg" ? 'inputmode="text" autocapitalize="off" spellcheck="false"' : 'inputmode="decimal"'} autocomplete="off" aria-label="${L("Point", "Point")} ${n} — ${name}"></td>`;
        return `<tr><th scope="row">${lab}</th>${cell("N", "", L("vitesse (rpm)", "speed (rpm)"))}${cell("Q", "", L("débit (GPM)", "flow (GPM)"))}${cell("P1", "neg", L("pression d'aspiration P1 (psi)", "suction pressure P1 (psi)"))}${cell("P2", "neg", L("pression de refoulement P2 (psi)", "discharge pressure P2 (psi)"))}${cell("I", "", L("courant (A)", "current (A)"))}<td class="calc" data-tdh="${i}">—</td></tr>`; }).join("")}</tbody>
    </table></div>`) +
  sec(L("SECTION 2 — CONVERSIONS PAR LES LOIS D'AFFINITÉ (CALCULÉES, NORMALISÉES À Nr)", "SECTION 2 — SPEED-CORRECTED AFFINITY LAW CONVERSIONS (CALCULATED, NORMALIZED TO Nr)"), `
    <p class="mintro" style="padding:10px 14px 0;margin:0">${L("Section calculée automatiquement à partir de la section 1 : rien à saisir.", "Calculated automatically from section 1: nothing to enter.")}</p>
    <div class="esum"><table class="esum-t calc2"><thead><tr><th>${L("Point", "Point")}</th><th>Qc<br><small>GPM</small></th><th>Hc<br><small>ft</small></th><th>Pc<br><small>HP</small></th><th>ηc<br><small>%</small></th></tr></thead>
      <tbody>${PT_LBL.map(([en, fr], i) => { const t = L(fr, en), m = t.match(/^([^(]*)(\(.*\))?$/); return `<tr><th scope="row">${m[1].trim()}${m[2] ? `<br><small>${m[2]}</small>` : ""}</th><td data-c2="${i}_qc">—</td><td data-c2="${i}_hc">—</td><td data-c2="${i}_pc">—</td><td data-c2="${i}_eff">—</td></tr>`; }).join("")}</tbody></table></div>`) +
  sec(L("SECTION 3 — ESSAI NPSH TYPE II (NPSH3 AU DÉBIT GARANTI) — HI 14.6 §14.6.5.8.2.2", "SECTION 3 — NPSH TEST TYPE II (NPSH3 AT GUARANTEE FLOW) — HI 14.6 §14.6.5.8.2.2"), `
    <p class="mintro" style="padding:10px 14px 0;margin:0">${L("Seule la température de l'eau se saisit. Les pressions d'aspiration P1 et les chutes visées des 7 étapes sont fixes ; le débit (= point 7), P2, la hauteur, le NPSHA, la chute et le NPSH3 interpolé à 3 % sont calculés. ACCEPTÉ si NPSH3 ≤ NPSHR garanti (aucune tolérance positive, §14.6.5.8.3).", "Only the water temperature is entered. The suction pressures P1 and target drops of the 7 steps are fixed; flow (= point 7), P2, head, NPSHA, drop and the NPSH3 interpolated at 3% are calculated. PASS requires NPSH3 ≤ guaranteed NPSHR — no positive tolerance (§14.6.5.8.3).")}</p>
    <div class="grid2">${fld(p, "Tw", L("Température de l'eau Tw (°F)", "Water temperature Tw (°F)"), { mode: "decimal" })}</div>
    <div class="fixrow"><span>${L("Pression barométrique Patm", "Barometric pressure Patm")} <b>14,696</b> psia <em>${L("fixe (niveau de la mer)", "fixed (sea level)")}</em></span><span>${L("NPSHR garanti", "Guaranteed NPSHR")} <b data-np="npshr">—</b> ft <em>${L("de « Informations sur la pompe »", "from “Pump information”")}</em></span></div>
    <div class="pout" style="padding:0 14px 6px"><span>${L("Pression de vapeur Pvap", "Vapour pressure Pvap")} <b data-np="pvap">—</b> psia</span><span>${L("Débit d'essai (= point 7, brut)", "Test flow (= point 7, raw)")} <b data-np="qtest">—</b> GPM</span><span>${L("Hauteur de référence Href (point 7, brute)", "Reference head Href (point 7, raw)")} <b data-np="href">—</b> ft</span></div>
    ${PUMP_STEPS.map(([p1, tg], j) => `<div class="mrow"><div class="mrow-h"><b>${L("Étape", "Step")}&nbsp;${j + 1}</b><span class="fixv">P1 ${nf(p1, 2)} psig · ${L("chute visée", "target drop")} ${nf(tg, 1)} % · <em>${L("fixes", "fixed")}</em></span></div>
      <div class="pout" data-st="${j}" aria-live="polite"></div></div>`).join("")}
    <div class="etot"><span>NPSH3 (${L("interpolé à 3 % de chute", "interpolated at 3% drop")})</span><span><b data-np="npsh3">—</b> ft</span><span data-np="status"></span></div>
    <div class="npnote" data-np="why"></div>
    <div class="pout" style="padding:6px 14px 10px"><span>${L("INFORMATIF — NPSHa à la condition normale (non étranglée)", "INFORMATIONAL — NPSHa at the normal (non-throttled) duty condition")} <b data-np="npsha">—</b> ft</span><span>${L("Marge installée (NPSHa − NPSHR garanti)", "Installed margin (NPSHa − guaranteed NPSHR)")} <b data-np="margin">—</b> ft <span class="fixv" data-np="marginf"></span></span></div>`) +
  sec(L("SECTION 4 — COURBES DE PERFORMANCE ET ZONE D'EXPLOITATION PRÉFÉRÉE (POR)", "SECTION 4 — PERFORMANCE CURVE ANALYSIS (BEST EFFICIENCY & PREFERRED OPERATING ZONE)"), `
    <div class="pout" style="padding:10px 14px 0"><span>${L("Débit de référence BEP (Qg)", "Reference BEP flow (Qg)")} <b data-por="qg">—</b> GPM</span><span>POR ${L("min (70 % Qg)", "min (70% Qg)")} <b data-por="min">—</b> GPM</span><span>POR ${L("max (120 % Qg)", "max (120% Qg)")} <b data-por="max">—</b> GPM</span><span>${L("Point de service (Qc / Hc)", "Duty point (Qc / Hc)")} <b data-por="duty">—</b></span></div>
    <p class="mintro" style="padding:6px 14px 0;margin:0">${L("Un point en surcharge (au-dessus du débit garanti) est ajouté (§14.6.5.7.1). Le vrai BEP peut se situer hors de la plage d'essai.", "An overload point above the guarantee flow (§14.6.5.7.1) is included. The true best-efficiency point may lie beyond the tested range.")}</p>
    <div class="chartbox" data-chart="perf"></div><div class="chartbox" data-chart="pow"></div>`) +
  sec(L("SECTION 5 — ÉVALUATION AUTOMATIQUE GRADE 2B (POINT DE SERVICE)", "SECTION 5 — AUTOMATED GRADE 2B EVALUATION (DUTY POINT CHECK)"), `
    <div class="vgrid">${[["flow", L("Débit", "Flow"), "vflow"], ["head", L("Hauteur", "Head"), "vhead"], ["power", L("Puissance", "Power"), "vpower"], ["eff", L("Rendement", "Efficiency"), "veff"], ["npsh", "NPSH", "vnpsh"]].map(([k, lab]) => `<div class="vcell"><span class="vlab">${lab}</span><span data-vd="${k}"></span><span class="vlim" data-vl="${k}"></span></div>`).join("")}</div>
    <div class="etot"><span>${L("VERDICT FINAL", "FINAL VERDICT")}</span><span data-vd="final"></span></div>
    <div class="npnote" data-vd="note"></div>`) +
  sec(L("SECTION 6 — COMMENTAIRES / REMARQUES", "SECTION 6 — COMMENTS / REMARKS"), `<p class="mintro" style="padding:10px 14px;margin:0">${L("À écrire à la main sur la feuille imprimée (lignes vierges), comme sur la feuille Excel.", "Handwritten on the printed sheet (blank lines), as on the Excel sheet.")}</p>`) +
  sec(L("SECTION 7 — SIGNATURES DES TÉMOINS", "SECTION 7 — WITNESS SIGN-OFF"), `<p class="mintro" style="padding:10px 14px 0;margin:0">${L("Signatures à la main sur la feuille imprimée ; seules les dates se saisissent.", "Signatures are handwritten on the printed sheet; only the dates are entered.")}</p>
    <div class="grid2">${[["Mfr", L("Représentant du fabricant — date", "Manufacturer rep — date")], ["Wit", L("Ingénieur témoin — date", "Witness engineer — date")], ["Tpi", L("Inspecteur tiers — date", "Third-party inspector — date")]].map(([k, lab]) => fld(p, `sig${k}Date`, lab, { type: "date" })).join("")}</div>`) +
  sec(L("SECTION 8 — HISTORIQUE DES RÉVISIONS DU DOCUMENT", "SECTION 8 — DOCUMENT REVISION HISTORY"), `<div class="esum"><table class="esum-t revt"><thead><tr><th>Rev</th><th>Date</th><th>Description</th><th>${L("Par", "By")}</th></tr></thead><tbody>${REVS.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td style="text-align:left">${v(r[2])}</td><td>${v(r[3])}</td></tr>`).join("")}</tbody></table></div>`);
}

function pumpRefresh(host, s) {
  const c = pumpCalc(s), q = sel => host.querySelector(sel), setT = (sel, t) => { const e = q(sel); if (e) e.textContent = t; }, setH = (sel, h) => { const e = q(sel); if (e) e.innerHTML = h; };
  const lim = c.lim;
  setT('[data-pc="qg_g"]', nfd(num(s.Qg), 1)); setT('[data-pc="qg_l"]', lim.Qlo != null ? `${nf(lim.Qlo, 1)} – ${nf(lim.Qhi, 1)}` : "—");
  setT('[data-pc="hg_g"]', nfd(num(s.Hg), 2)); setT('[data-pc="hg_l"]', lim.Hlo != null ? `${nf(lim.Hlo, 2)} – ${nf(lim.Hhi, 2)}` : "—");
  setT('[data-pc="pg_g"]', nfd(lim.Pg, 2)); setT('[data-pc="pg_g2"]', nfd(lim.Pg, 2)); setT('[data-pc="pg_l"]', lim.Pmax != null ? `≤ ${nf(lim.Pmax, 2)}` : "—");
  setT('[data-pc="eg_g"]', nfd(num(s.effG), 2)); setT('[data-pc="eg_l"]', lim.Emin != null ? `≥ ${nf(lim.Emin, 2)}` : "—");
  c.pts.forEach((p, i) => {
    setT(`[data-tdh="${i}"]`, nfd(p.tdh));
    setT(`[data-c2="${i}_qc"]`, nfd(p.qc, 1)); setT(`[data-c2="${i}_hc"]`, nfd(p.hc)); setT(`[data-c2="${i}_pc"]`, nfd(p.pc)); setT(`[data-c2="${i}_eff"]`, nfd(p.eff));
  });
  c.ins.forEach((st, i) => setH(`[data-ins="${i}"]`, st == null ? "" : st === "ok" ? `<span class="chip ok">✓ ${L("Étalonnage valide", "Calibration valid")}</span>` : `<span class="chip ko">⚠ ${L("Étalonnage échu", "Calibration expired")}</span>`));
  setT('[data-np="pvap"]', nfd(c.pvap, 4)); setT('[data-np="qtest"]', nfd(c.qtest, 1)); setT('[data-np="href"]', nfd(c.href, 2));
  c.steps.forEach((st, j) => setH(`[data-st="${j}"]`, `<span class="calc">${L("Calculé :", "Calculated:")}</span><span>Qt <b>${nfd(st.Q, 1)}</b> GPM</span><span>P2 <b>${nfd(st.P2)}</b> psig</span><span>H <b>${nfd(st.h)}</b> ft</span><span>NPSHA <b>${nfd(st.npsha)}</b> ft</span><span>${L("Chute", "Drop")} <b>${nfd(st.drop)}</b> %</span>`));
  setT('[data-np="npsh3"]', nfd(c.npsh3)); setH('[data-np="status"]', chipHtml(c.npshStatus));
  setT('[data-np="why"]', c.npsh3 != null ? "" : ({ few: L("Saisissez au moins deux étapes complètes (P1 et P2) pour interpoler le NPSH3.", "Enter at least two complete steps (P1 and P2) to interpolate NPSH3."), low: L("Aucune étape n'atteint 3 % de chute : poursuivez l'essai (réduire encore le NPSHA) jusqu'à dépasser 3 %.", "No step reaches a 3% drop: continue the test (reduce NPSHA further) until it exceeds 3%."), order: L("Les étapes doivent se suivre par NPSHA décroissant (chute croissante) pour encadrer 3 %.", "Steps must follow in decreasing NPSHA (increasing drop) so that 3% is bracketed.") }[c.npsh3Why] || ""));
  setT('[data-np="npsha"]', nfd(c.npshaNormal)); setT('[data-np="margin"]', nfd(c.margin));
  setT('[data-np="npshr"]', nfd(c.NPSHr)); setT('[data-np="marginf"]', c.margin != null ? `= ${nf(c.npshaNormal)} − ${nf(c.NPSHr)}` : "");
  setT('[data-por="qg"]', nfd(num(s.Qg), 0)); setT('[data-por="min"]', nfd(lim.PorMin, 0)); setT('[data-por="max"]', nfd(lim.PorMax, 0));
  setT('[data-por="duty"]', c.duty.qc != null && c.duty.hc != null ? `${nf(c.duty.qc, 1)} GPM / ${nf(c.duty.hc, 2)} ft` : "—");
  const ch = pumpCharts(c, false); setH('[data-chart="perf"]', ch.perf); setH('[data-chart="pow"]', ch.pow);
  const lm = { flow: lim.Qlo != null ? `${nf(lim.Qlo, 0)} – ${nf(lim.Qhi, 0)} GPM` : "", head: lim.Hlo != null ? `${nf(lim.Hlo, 1)} – ${nf(lim.Hhi, 1)} ft` : "", power: lim.Pmax != null ? `max ${nf(lim.Pmax, 1)} HP` : "", eff: lim.Emin != null ? `min ${nf(lim.Emin, 1)} %` : "", npsh: c.NPSHr != null ? `NPSH3 ≤ ${nf(c.NPSHr, 1)} ft` : "" };
  ["flow", "head", "power", "eff", "npsh"].forEach(k => { setH(`[data-vd="${k}"]`, chipHtml(c.vd[k])); setT(`[data-vl="${k}"]`, lm[k]); });
  setH('[data-vd="final"]', chipHtml(c.vd.final));
  const expired = c.ins.filter(x => x === "expired").length;
  setT('[data-vd="note"]', c.vd.final ? (expired ? L(`⚠ ${expired} instrument(s) avec étalonnage échu à la date de l'essai (information : n'entre pas dans le verdict).`, `⚠ ${expired} instrument(s) with calibration expired on the test date (information only: not part of the verdict).`) : "")
    : L("Verdict en attente : il faut le point 7 (service) complet, les données NPSH et les valeurs garanties.", "Verdict pending: the complete duty point (7), the NPSH data and the guaranteed values are needed."));
}

function pumpInit({ host, state }) {
  PUMP_INS.forEach((r, i) => [["cal", 2], ["due", 3]].forEach(([k, j]) => {
    const el = host.querySelector(`[data-k="ins${i + 1}_${k}"]`);
    if (el && !state[`ins${i + 1}_${k}`]) el.value = r[j];
  }));
}

/* ----- impression / PDF ----- */
function pumpPrint(s) {
  const c = pumpCalc(s), lim = c.lim, st = x => x == null ? "" : x === "PASS" || x === "ACCEPT" ? "ok" : "ko";
  const cell = (val, d) => { const t = nf(val, d); return t === "" ? "" : t; };
  const tdp = (cls, txt) => `<td class="ctr ${cls}">${txt}</td>`;
  const img = d => d ? `<img src="${d}" alt="">` : "";
  const pl = (lab, key, u) => it(lab, s[key], u ? { u } : {});
  const ch = pumpCharts(c, true);
  const raw = c.pts.map((p, i) => `<tr><td>${v(L(PT_LBL[i][1], PT_LBL[i][0]))}</td><td class="n">${v(s[`r${i + 1}_N`])}</td><td class="n">${v(s[`r${i + 1}_Q`])}</td><td class="n">${v(s[`r${i + 1}_P1`])}</td><td class="n">${v(s[`r${i + 1}_P2`])}</td><td class="n">${v(s[`r${i + 1}_I`])}</td><td class="n">${cell(p.tdh)}</td></tr>`).join("");
  const cor = c.pts.map((p, i) => `<tr><td>${v(L(PT_LBL[i][1], PT_LBL[i][0]))}</td><td class="n">${cell(p.qc, 1)}</td><td class="n">${cell(p.hc)}</td><td class="n">${cell(p.pc)}</td><td class="n">${cell(p.eff)}</td></tr>`).join("");
  const stepsRows = PUMP_STEPS.map(([p1, tg], j) => { const k = c.steps[j]; return `<tr><td class="ctr">${j + 1}</td><td class="n">${cell(k.Q, 1)}</td><td class="n">${nf(p1, 2)}</td><td class="n">${nf(tg, 1)}</td><td class="n">${cell(k.P2)}</td><td class="n">${cell(k.h)}</td><td class="n">${cell(k.npsha)}</td><td class="n">${cell(k.drop)}</td></tr>`; }).join("");
  const ins = INS_LBL.map(([en, fr], i) => { const r = PUMP_INS[i]; return `<tr><td>${v(L(fr, en))}</td><td>${v(r[0])}</td><td>${v(r[1])}</td><td class="ctr">${v(insDate(s, i, 2))}</td><td class="ctr">${v(insDate(s, i, 3))}</td><td>${v(r[4])}</td>${c.ins[i] == null ? "<td></td>" : tdp(c.ins[i] === "ok" ? "ok" : "ko", c.ins[i] === "ok" ? "✓" : L("ÉCHU", "EXPIRED"))}</tr>`; }).join("");
  const vdRow = [["flow", lim.Qlo != null ? `${nf(lim.Qlo, 0)} ${L("à", "to")} ${nf(lim.Qhi, 0)} GPM` : ""], ["head", lim.Hlo != null ? `${nf(lim.Hlo, 1)} ${L("à", "to")} ${nf(lim.Hhi, 1)} ft` : ""], ["power", lim.Pmax != null ? `Max ${nf(lim.Pmax, 1)} HP` : ""], ["eff", lim.Emin != null ? `Min ${nf(lim.Emin, 1)} %` : ""], ["npsh", c.NPSHr != null ? `NPSH3 ≤ ${nf(c.NPSHr, 1)} ft` : ""]];
  const sec = (title, body) => `<div class="avoid"><div class="m-bar">${title}</div>${body}</div>`;
  return `<div class="p-head"><img src="logo.svg" alt="">
    <div class="p-addr">860 boul. Industriel<br>Bois-des-Filion, QC<br>Canada, J6Z 4V7<br>Tel : (450) 621-2995<br>Fax : (450) 621-4995</div></div>
  <div class="avoid"><div class="e-bar"><span>${L("FEUILLE D'ESSAI DE PERFORMANCE DE POMPE", "PUMP PERFORMANCE TEST SHEET")}</span><b>GRADE 2B</b><span>ANSI/HI 14.6</span></div>
    <div class="t-note">${L("Pompes rotodynamiques : essais de réception de performance hydraulique — avec registres de métrologie et de moteur (unités US).", "Rotodynamic pumps: hydraulic performance acceptance tests — with metrology and motor registries (US customary units).")} ${L("Édition / année ANSI/HI 14.6 :", "ANSI/HI 14.6 edition/year:")} <span class="t-blank"></span></div></div>
  ${sec(L("PROJET ET IDENTIFICATION", "PROJECT & ASSET METADATA"), `<div class="m-cols last"><div class="m-col">${line(it(L("Projet", "Project"), s.project))}${line(it(L("Date de l'essai", "Test date"), s.date))}</div><div class="m-col">${line(it(L("Inspecteur / ingénieur", "Inspector / engineer"), s.inspector))}${line(it(L("Installation / lieu", "Facility / location"), s.facility))}</div></div>`)}
  ${sec(L("INFORMATIONS SUR LA POMPE", "PUMP INFORMATION"), `<div class="m-cols last"><div class="m-col">
      ${line(pl(L("Modèle", "Model"), "model", ""), pl(L("N° de série", "Serial No"), "serial", ""))}${line(pl("Nr", "Nr", "rpm"), it("SG", "1", { u: L("(eau)", "(water)") }))}${line(pl("Ds", "Ds", "in"), pl("Dd", "Dd", "in"))}${line(pl("Zs", "Zs", "ft"), pl("Zd", "Zd", "ft"))}
    </div><div class="m-col">
      ${line(pl(L("Débit", "Flow"), "Qg", "GPM"), pl("TDH", "Hg", "ft"))}${line(pl(L("Ø roue", "Impeller Ø"), "impDia", "in"), pl("NPSHr", "NPSHr", "ft"))}${line(pl(L("Rendement garanti", "Guaranteed eff."), "effG", "%"), it("Pg", lim.Pg != null ? nf(lim.Pg, 2) : "", { u: "HP" }))}
    </div></div>`)}
  ${sec(L("VALEURS GARANTIES ET SEUILS DE TOLÉRANCE (GRADE 2B)", "GUARANTEED VALUES & TOLERANCE THRESHOLDS (GRADE 2B)"), `<table class="p t-tbl"><colgroup><col style="width:24%"><col style="width:16%"><col style="width:30%"><col style="width:30%"></colgroup>
      <thead><tr><th>${L("Paramètre", "Parameter")}</th><th>${L("Valeur garantie", "Guaranteed value")}</th><th>${L("Limite Grade 2B", "Grade 2B limit")}</th><th>${L("Plage calculée", "Calculated boundary")}</th></tr></thead>
      <tbody><tr><td>${L("Débit (Qg)", "Flow (Qg)")}</td><td class="n">${cell(num(s.Qg), 1)}</td><td>${L("Bilatéral (±8 %)", "Bilateral (±8%)")}</td><td class="ctr">${lim.Qlo != null ? `${nf(lim.Qlo, 1)} ${L("à", "to")} ${nf(lim.Qhi, 1)} GPM` : ""}</td></tr>
      <tr><td>${L("Hauteur (Hg)", "Head (Hg)")}</td><td class="n">${cell(num(s.Hg), 2)}</td><td>${L("Bilatéral (±5 %)", "Bilateral (±5%)")}</td><td class="ctr">${lim.Hlo != null ? `${nf(lim.Hlo, 2)} ${L("à", "to")} ${nf(lim.Hhi, 2)} ft` : ""}</td></tr>
      <tr><td>${L("Puissance à l'arbre (Pg)", "Shaft power (Pg)")}</td><td class="n">${cell(lim.Pg, 2)}</td><td>${L("Unilatéral (+8 %)", "Unilateral (+8%)")}</td><td class="ctr">${lim.Pmax != null ? `${L("Maximum :", "Maximum:")} ${nf(lim.Pmax, 2)} HP` : ""}</td></tr>
      <tr><td>${L("Rendement (ηg)", "Efficiency (ηg)")}</td><td class="n">${cell(num(s.effG), 2)}</td><td>${L("Unilatéral (−5 %)", "Unilateral (−5%)")}</td><td class="ctr">${lim.Emin != null ? `${L("Minimum :", "Minimum:")} ${nf(lim.Emin, 2)} %` : ""}</td></tr></tbody></table>`)}
  ${sec(L("INFORMATIONS SUR LE MOTEUR", "MOTOR INFORMATION"), `<div class="m-cols last"><div class="m-col">
      ${line(pl(L("Fabricant", "Manufacturer"), "mfr", ""), pl(L("N° de série", "Serial No"), "mserial", ""))}${line(pl(L("Carcasse", "Frame"), "frame", ""), pl(L("Enveloppe", "Enclosure"), "encl", ""))}${line(pl(L("Puissance", "Output"), "hp", "HP"), pl(L("Vitesse P.C.", "FL speed"), "frpm", "rpm"))}
    </div><div class="m-col">
      ${line(pl(L("Tension", "Voltage"), "volts", "V"), pl(L("Courant P.C.", "FL current"), "amps", "A"))}${line(pl(L("Phases / fréq.", "Phase / freq."), "phase", ""), pl(L("Fact. service", "Service factor"), "sf", ""))}${line(pl("ηm", "effM", "%"), pl("PF", "pf", ""))}
    </div></div>`)}
  ${sec(L("REGISTRE DES INSTRUMENTS DE MESURE", "METROLOGICAL INSTRUMENTATION REGISTRY"), `<table class="p t-tbl"><colgroup><col style="width:21%"><col style="width:17%"><col style="width:17%"><col style="width:13%"><col style="width:13%"><col style="width:12%"><col style="width:7%"></colgroup>
      <thead><tr><th>${L("Instrument", "Instrument")}</th><th>${L("Fabricant / modèle", "Manufacturer / model")}</th><th>${L("N° de série", "Serial No")}</th><th>${L("Étalonnage", "Calibration")}</th><th>${L("Échéance", "Due")}</th><th>${L("Précision", "Accuracy")}</th><th></th></tr></thead><tbody>${ins}</tbody></table>`)}
  ${sec(L("SECTION 1 — JOURNAL DES DONNÉES BRUTES (CAPTEURS DU BANC D'ESSAI)", "SECTION 1 — RAW DATA ACQUISITION LOG (FROM TEST STAND SENSORS)"), `<table class="p t-tbl"><colgroup><col style="width:19%"><col style="width:12%"><col style="width:13%"><col style="width:14%"><col style="width:14%"><col style="width:13%"><col style="width:15%"></colgroup>
      <thead><tr><th>${L("Point d'essai", "Test point")}</th><th>${L("Vitesse (Nt)", "Speed (Nt)")}<br>rpm</th><th>${L("Débit (Qt)", "Flow (Qt)")}<br>GPM</th><th>${L("Pression asp. (P1)", "Suction pres. (P1)")}<br>psi</th><th>${L("Pression ref. (P2)", "Discharge pres. (P2)")}<br>psi</th><th>${L("Courant (I)", "Current (I)")}<br>A</th><th>TDH (${L("brut", "raw")})<br>ft</th></tr></thead><tbody>${raw}</tbody></table>`)}
  ${sec(L("SECTION 2 — CONVERSIONS PAR LES LOIS D'AFFINITÉ (NORMALISÉES À Nr)", "SECTION 2 — SPEED-CORRECTED AFFINITY LAW CONVERSIONS (NORMALIZED TO Nr)"), `<table class="p t-tbl"><colgroup><col style="width:24%"><col style="width:19%"><col style="width:19%"><col style="width:19%"><col style="width:19%"></colgroup>
      <thead><tr><th>${L("Point d'essai", "Test point")}</th><th>${L("Débit corrigé (Qc)", "Corrected flow (Qc)")}<br>GPM</th><th>${L("Hauteur corrigée (Hc)", "Corrected head (Hc)")}<br>ft</th><th>${L("Puissance à l'arbre (Pc)", "Shaft power (Pc)")}<br>HP</th><th>${L("Rendement (ηc)", "Pump efficiency (ηc)")}<br>%</th></tr></thead><tbody>${cor}</tbody></table>`)}
  ${sec(L("SECTION 3 — ESSAI NPSH TYPE II (NPSH3 AU DÉBIT GARANTI) — HI 14.6 §14.6.5.8.2.2", "SECTION 3 — NPSH TEST: TYPE II (NPSH3 DETERMINATION AT GUARANTEE FLOW RATE) PER HI 14.6 §14.6.5.8.2.2"), `
    <div class="t-note">${L("Débit constant au débit garanti, NPSHA réduit par étranglement ; NPSH3 = NPSHA à 3 % de chute de hauteur. Saisies : P1 et chute visée ; débit, P2, H, NPSHA et chute sont calculés. ACCEPTÉ si NPSH3 ≤ NPSHR garanti (aucune tolérance positive, §14.6.5.8.3).", "Flow held constant at the guarantee rate while NPSHA is reduced by suction throttling; NPSH3 is the NPSHA at a 3% head drop. Inputs: P1 and target drop; flow, P2, H, NPSHA and drop are calculated. PASS requires NPSH3 ≤ guaranteed NPSHR (no positive tolerance, §14.6.5.8.3).")}</div>
    <div class="m-cols last"><div class="m-col">${line(it(L("Température de l'eau Tw", "Water temperature Tw"), s.Tw, { u: "°F", f: 1.6 }), it("Patm", "14.696", { u: "psia" }))}${line(it("Pvap", nf(c.pvap, 4), { u: "psia" }), it(L("Débit d'essai", "Test flow"), nf(c.qtest, 1), { u: "GPM", f: 1.3 }))}</div>
      <div class="m-col">${line(it("NPSHr", s.NPSHr, { u: "ft" }), it("Href", nf(c.href, 2), { u: "ft" }))}</div></div>
    <table class="p t-tbl"><colgroup><col style="width:7%"><col style="width:13%"><col style="width:13%"><col style="width:13%"><col style="width:13%"><col style="width:13%"><col style="width:13%"><col style="width:15%"></colgroup>
      <thead><tr><th>${L("Étape", "Step")}</th><th>${L("Débit Qt", "Flow Qt")}<br>GPM</th><th>${L("Press. asp. P1", "Suction P1")}<br>psig</th><th>${L("Chute visée", "Target drop")}<br>%</th><th>${L("Press. ref. P2", "Discharge P2")}<br>psig (calc.)</th><th>${L("Hauteur H", "Head H")}<br>ft</th><th>NPSHA<br>ft</th><th>${L("Chute / réf.", "Drop vs ref.")}<br>%</th></tr></thead><tbody>${stepsRows || `<tr><td class="ctr">&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`}</tbody></table>
    <table class="p t-tbl" style="margin-top:4px"><colgroup><col style="width:46%"><col style="width:18%"><col style="width:36%"></colgroup><tbody>
      <tr><td>${L("Hauteur de référence Href (point 7, brute)", "Reference head Href (duty point raw)")}</td><td class="n">${cell(c.href, 2)}</td><td>ft</td></tr>
      <tr><td><b>NPSH3</b> (${L("interpolé à 3 % de chute", "interpolated at 3% head drop")})</td><td class="n"><b>${cell(c.npsh3, 2)}</b></td><td>ft ${c.npsh3 == null ? `<small>${L("(à compléter)", "(to complete)")}</small>` : ""}</td></tr>
      <tr><td>${L("Statut NPSH (essai de type II)", "NPSH status (Type II test result)")}</td>${tdp(st(c.npshStatus), c.npshStatus ? pumpWord(c.npshStatus) : "—")}<td></td></tr></tbody></table>
    <div class="t-note">${L("INFORMATIF (hors critère d'acceptation HI 14.6) — NPSHa à la condition normale :", "INFORMATIONAL (not an HI 14.6 acceptance criterion) — NPSHa at the normal duty condition:")} <b>${nfd(c.npshaNormal)}</b> ft · ${L("marge installée (NPSHa − NPSHR garanti) :", "installed margin (NPSHa − guaranteed NPSHR):")} <b>${nfd(c.margin)}</b> ft</div>`)}
  ${sec(L("SECTION 4 — COURBES DE PERFORMANCE ET ZONE D'EXPLOITATION PRÉFÉRÉE (POR)", "SECTION 4 — PERFORMANCE CURVE ANALYSIS (BEST EFFICIENCY & PREFERRED OPERATING ZONE)"), `
    <div class="m-cols last"><div class="m-col">${line(it(L("Débit BEP de référence (Qg)", "Reference BEP flow (Qg)"), nf(num(s.Qg), 0), { u: "GPM", f: 2 }))}${line(it(L("POR — débit min (70 % Qg)", "POR — min flow (70% Qg)"), nf(lim.PorMin, 0), { u: "GPM", f: 2 }))}</div>
      <div class="m-col">${line(it(L("POR — débit max (120 % Qg)", "POR — max flow (120% Qg)"), nf(lim.PorMax, 0), { u: "GPM", f: 2 }))}${line(it(L("Point de service (Qc / Hc)", "Duty point (Qc / Hc)"), c.duty.qc != null && c.duty.hc != null ? `${nf(c.duty.qc, 1)} GPM / ${nf(c.duty.hc, 2)} ft` : "", { f: 2 }))}</div></div>
    <div class="t-charts"><div>${ch.perf}</div><div>${ch.pow}</div></div>`)}
  ${sec(L("SECTION 5 — ÉVALUATION AUTOMATIQUE GRADE 2B (POINT DE SERVICE)", "SECTION 5 — AUTOMATED GRADE 2B EVALUATION MATRIX (DUTY POINT CHECK)"), `<table class="p t-tbl"><colgroup><col style="width:15%"><col style="width:17%"><col style="width:17%"><col style="width:17%"><col style="width:17%"><col style="width:17%"></colgroup>
      <thead><tr><th>${L("Point d'essai", "Test point")}</th><th>${L("Débit", "Flow")}</th><th>${L("Hauteur", "Head")}</th><th>${L("Puissance", "Power")}</th><th>${L("Rendement", "Efficiency")}</th><th>NPSH</th></tr></thead>
      <tbody><tr><td>${L("Limites", "Limits")}</td>${vdRow.map(([, t]) => `<td class="ctr">${t}</td>`).join("")}</tr>
      <tr><td>${L("7 (Point de service)", "7 (Duty Point)")}</td>${["flow", "head", "power", "eff", "npsh"].map(k => tdp(st(c.vd[k]), c.vd[k] ? pumpWord(c.vd[k]) : "—")).join("")}</tr></tbody></table>
      <table class="p t-tbl" style="margin-top:4px"><colgroup><col style="width:70%"><col style="width:30%"></colgroup><tbody><tr><td><b>${L("VERDICT FINAL", "FINAL VERDICT")}</b> — ACCEPT / REJECT</td>${tdp(st(c.vd.final), `<b>${c.vd.final ? pumpWord(c.vd.final) : L("EN ATTENTE", "PENDING")}</b>`)}</tr></tbody></table>`)}
  ${sec(L("SECTION 6 — COMMENTAIRES / REMARQUES", "SECTION 6 — COMMENTS / REMARKS"), `<div class="t-note">${L("Écarts, observations, mesures correctives ou autres remarques sur cet essai :", "Record any deviations, observations, corrective actions, or other remarks regarding this test:")}</div><div class="t-lines">${"<div></div>".repeat(5)}</div>`)}
  <div class="avoid"><div class="m-bar">${L("SECTION 7 — SIGNATURES DES TÉMOINS", "SECTION 7 — WITNESS SIGN-OFF SIGNATURE BLOCK")}</div><div class="t-sigs">${[["Mfr", L("Représentant du fabricant", "Manufacturer rep signature")], ["Wit", L("Ingénieur témoin", "Witness engineer signature")], ["Tpi", L("Inspecteur tiers", "Third party inspector signature")]].map(([k, lab]) => `<div class="t-sig"><div class="t-sigl"></div><div><b>${lab}</b></div><div>Date : <b>${v(s[`sig${k}Date`])}</b></div></div>`).join("")}</div></div>
  ${sec(L("SECTION 8 — HISTORIQUE DES RÉVISIONS DU DOCUMENT", "SECTION 8 — DOCUMENT REVISION HISTORY"), `<table class="p t-tbl"><colgroup><col style="width:7%"><col style="width:15%"><col><col style="width:18%"></colgroup><thead><tr><th>Rev</th><th>Date</th><th>Description</th><th>${L("Par", "By")}</th></tr></thead><tbody>${REVS.map(r => `<tr><td class="ctr">${r[0]}</td><td class="ctr">${r[1]}</td><td>${v(r[2])}</td><td>${v(r[3])}</td></tr>`).join("")}</tbody></table>`)}` + foot(s);
}

/* ---------- versions des formulaires ----------
   À AUGMENTER à chaque modification d'un formulaire (champs, libellés, mise en page) : le numéro s'imprime sur chaque PDF.
   Format : [version, date de révision]. */
const VERSIONS = {
  service: ["1.0", "2026-10-03"],
  sub:     ["1.0", "2026-10-03"],
  sur:     ["1.0", "2026-10-03"],
  est:     ["1.0", "2026-10-03"],
  req:     ["1.0", "2026-10-03"],
  vfd:     ["1.0", "2026-10-03"],
  ident:   ["1.1", "2026-10-08"],
  pump:    ["3.0", "2026-10-14"]
};

/* ---------- registre ---------- */
const FORMS = {
  service: {
    group: "call", folder: "Rapports de service", fileTag: "Service",
    get title() { return L("Rapport de service", "Service call report"); },
    get desc() { return L("Appel de service, réparation, entretien, inspection.", "Service call, repair, maintenance, inspection."); },
    html: serviceHtml, init: serviceInit, print: servicePrint,
    blank: () => ({ parts: [{}] }),
    label: s => [s.customer, s.job && L("job ", "job ") + s.job].filter(Boolean).join(" — ")
  },
  sub: {
    group: "call", folder: "Mise en marche - Submersible", fileTag: "MEM-Submersible",
    get title() { return L("Mise en marche — Submersible", "Start-up — Submersible"); },
    get desc() { return L("Pompes, contrôleur, vérifications et mesures.", "Pumps, controller, checks and readings."); },
    html: subHtml, print: subPrint, pumps: true,
    blank: () => ({ page: "1", pages: "1", pumpCount: 1 }),
    label: s => [s.customer || s.project, s.job && "Job " + s.job].filter(Boolean).join(" — ")
  },
  est: {
    group: "internal", folder: "Estimations", fileTag: "Estimation",
    get title() { return L("Estimation (soumission)", "Estimate (quote)"); },
    get desc() { return L("Matériel, main-d'œuvre, coût et prix de vente.", "Material, labour, cost and sell price."); },
    html: estHtml, init: estInit, refresh: estRefresh, print: estPrint,
    blank: () => ({ currency: "CAD", mat: [{}] }),
    label: s => [s.customer || s.project, s.quote && L("Soum. ", "Quote ") + s.quote].filter(Boolean).join(" — ")
  },
  vfd: {
    group: "internal", folder: "QC contrôle programmation", fileTag: "QC-Programmation",
    get title() { return L("QC contrôle programmation", "QC programming check"); },
    get short() { return L("QC programmation", "Programming QC"); },
    get desc() { return L("Contrôle qualité : programmé et testé (moteur, PID, lead-lag, sleep, low pressure, HMI).", "Quality check: programmed and tested (motor, PID, lead-lag, sleep, low pressure, HMI)."); },
    html: vfdHtml, init: vfdInit, refresh: vfdRefresh, print: vfdPrint,
    blank: () => ({}),
    label: s => [s.customer || s.project, s.job && "Job " + s.job].filter(Boolean).join(" — ")
  },
  ident: {
    group: "internal", folder: "Feuilles d'identification job", fileTag: "Identification-Job",
    get title() { return L("Feuille d'identification job", "Job identification sheet"); },
    get short() { return L("Identification job", "Job ID sheet"); },
    get desc() { return L("Grande feuille #Quote, client, projet, # Job avec date et heure d'impression.", "Large sheet: #Quote, customer, project, # Job, with print date and time."); },
    html: identHtml, print: identPrint,
    blank: () => ({}),
    label: s => [s.customer || s.project, s.job && "Job " + s.job].filter(Boolean).join(" — ")
  },
  pump: {
    group: "internal", folder: "Tests de pompe", fileTag: "Test-Pompe",
    get title() { return L("Test de performance de pompe (HI 14.6)", "Pump performance test (HI 14.6)"); },
    get short() { return L("Test de pompe", "Pump test"); },
    get desc() { return L("Essai hydraulique Grade 2B (ANSI/HI 14.6) : points d'essai, NPSH3, courbes et verdict ACCEPTÉ / REJETÉ.", "Grade 2B hydraulic test (ANSI/HI 14.6): test points, NPSH3, curves and ACCEPT / REJECT verdict."); },
    html: pumpHtml, init: pumpInit, refresh: pumpRefresh, print: pumpPrint,
    blank: () => ({ sigMfrDate: todayLocal(), sigWitDate: todayLocal(), sigTpiDate: todayLocal() }),
    label: s => [s.project || s.facility, s.model && (s.model + (s.serial ? " / " + s.serial : ""))].filter(Boolean).join(" — ")
  },
  req: {
    group: "internal", folder: "Réquisitions d'achat", fileTag: "Requisition",
    get title() { return L("Réquisition d'achat", "Purchase requisition"); },
    get desc() { return L("Articles à acheter, quantités et approbation.", "Items to purchase, quantities and approval."); },
    html: reqHtml, init: reqInit, print: reqPrint, validate: reqValidate, landscape: true,
    blank: () => ({ items: [{}] }),
    label: s => [s.customer, s.job && "Job " + s.job].filter(Boolean).join(" — ")
  },
  sur: {
    group: "call", folder: "Mise en marche - Surpresseur", fileTag: "MEM-Surpresseur",
    get title() { return L("Mise en marche — Surpresseur", "Start-up — Booster"); },
    get desc() { return L("Pompes, pressions, vérifications et mesures.", "Pumps, pressures, checks and readings."); },
    html: surHtml, print: surPrint, pumps: true,
    blank: () => ({ page: "1", pages: "1", pumpCount: 1 }),
    label: s => [s.customer || s.project, s.job && "Job " + s.job].filter(Boolean).join(" — ")
  }
};

Object.entries(FORMS).forEach(([t, d]) => {
  d.version = VERSIONS[t][0]; d.revised = VERSIONS[t][1]; d.id = t;
  const orig = d.print;
  d.print = function (s) { PRINT_TYPE = t; try { return orig.call(this, s); } finally { PRINT_TYPE = null; } };
});
FORMS.ident.ownStamp = true;                   // la feuille a déjà sa propre ligne date / heure / version

/* signature du contenu d'un rapport (ignore les champs de suivi) : sert à savoir s'il a changé depuis l'impression / l'envoi */
function contentKey(s) {
  const c = Object.assign({}, s);
  ["printedAt", "emailedAt", "sentKey", "updated", "created", "id", "drive"].forEach(k => delete c[k]);
  const o = {}; Object.keys(c).sort().forEach(k => o[k] = c[k]);
  return JSON.stringify(o);
}

/* formulaires internes : jamais rangés sur Google Drive (courriel ou impression seulement) */
/* tous les formulaires sont enregistrés sur Google Drive, SAUF la feuille d'identification job (courriel ou impression seulement) */
const NO_DRIVE = ["ident"];
const storesOnDrive = t => !!FORMS[t] && !NO_DRIVE.includes(t);

window.Flo = { FORMS, esc, times, fmt, L, contentKey, stampText, stampNow, verLabel, storesOnDrive, pumpCalc, setLang: l => { LANG = l === "en" ? "en" : "fr"; }, getLang: () => LANG };
})();
