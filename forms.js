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
const foot = s => `<div class="p-foot"><span>Flo-Fab Inc.</span><span>${L("Réf.", "Ref.")} ${v(s.id)}</span></div>`;

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
    const fs = Math.round(Math.max(24, Math.min(80, 1050 / Math.max(1, txt.length))));
    return `<div class="i-line${t ? "" : " ph"}" style="font-size:${fs}pt">${v(txt)}</div>`;
  };
  return `<div class="i-page">
    <img class="i-logo" src="logo.svg" alt="">
    <div class="i-lines">${line(s.quote, "#Quote")}${line(s.customer, L("Client", "Customer"))}${line(s.project, L("Projet", "Project"))}${line(s.job, "# Job")}</div>
    <div class="i-foot"><span>${L("Date et heure d'impression :", "Printed on:")}</span> <b>${stamp}</b></div>
  </div>`;
}

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

/* signature du contenu d'un rapport (ignore les champs de suivi) : sert à savoir s'il a changé depuis l'impression / l'envoi */
function contentKey(s) {
  const c = Object.assign({}, s);
  ["printedAt", "emailedAt", "sentKey", "updated", "created", "id", "drive"].forEach(k => delete c[k]);
  const o = {}; Object.keys(c).sort().forEach(k => o[k] = c[k]);
  return JSON.stringify(o);
}

window.Flo = { FORMS, esc, times, fmt, L, contentKey, setLang: l => { LANG = l === "en" ? "en" : "fr"; }, getLang: () => LANG };
})();
