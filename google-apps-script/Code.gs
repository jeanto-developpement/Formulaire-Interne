/**
 * Flo-Fab — Formulaires
 * Reçoit les PDF de l'application, les range dans Google Drive et envoie les courriels (PDF en pièce jointe).
 *
 * MISE EN PLACE (voir GOOGLE_SETUP.md) — la configuration se fait UNIQUEMENT ici (console Google Apps Script)
 * et dans le fichier config.js du dépôt GitHub. Rien à configurer sur les appareils.
 *  1. Collez ce fichier dans un projet Google Apps Script.
 *  2. Exécutez une fois la fonction « creerAcces » : elle crée le JETON (à mettre dans config.js) et le MOT DE PASSE de la
 *     console admin, et les affiche dans le journal d'exécution.
 *     Propriétés du script (⚙ Paramètres du projet) :
 *       API_TOKEN            jeton (le même que dans config.js)
 *       ADMIN_PASSWORD       mot de passe de la console admin de l'application (8 caractères minimum)
 *     Facultatif :
 *       ROOT_FOLDER_ID       ID d'un dossier Drive existant où tout sera rangé
 *       ALWAYS_CC            adresse(s) mises en copie de TOUS les courriels (ex. boîte de l'entreprise)
 *       FROM_NAME            nom affiché de l'expéditeur (défaut : Flo-Fab Inc.)
 *       MAX_EMAILS_PER_DAY   plafond de courriels envoyés par jour par l'application (défaut : 60)
 *       MAX_UPLOADS_PER_DAY  plafond de fichiers rangés sur Drive par jour (défaut : 400)
 *  3. Exécutez une fois la fonction « autoriser » (accepte les autorisations Drive et Gmail).
 *  4. Déployer > Nouveau déploiement > Application Web
 *       Exécuter en tant que : Moi      Qui a accès : Tout le monde
 *     puis copiez l'URL qui se termine par /exec dans config.js (sur GitHub).
 *
 * Les courriels partent du compte Google qui a déployé le script.
 */

var VERSION = "1.3";
var ADMIN_MAX_FAILS = 5;          // essais ratés avant blocage
var ADMIN_LOCK_SECONDS = 600;     // durée du blocage (10 min)
var DEFAULT_ROOT_NAME = "Flo-Fab - Formulaires";
var MAX_RECIPIENTS = 10;
var DEFAULT_MAX_EMAILS_PER_DAY = 60;
var DEFAULT_MAX_UPLOADS_PER_DAY = 400;
var MAX_BODY_CHARS = 5000;
var MAX_PDF_BYTES = 20 * 1024 * 1024;

/* ------------------------------------------------------------------ utilitaires */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function prop_(name) {
  return PropertiesService.getScriptProperties().getProperty(name) || "";
}

function tokenOk_(token) {
  var expected = prop_("API_TOKEN");
  return expected.length > 0 && String(token || "") === expected;
}

function safeName_(name, fallback) {
  var s = String(name || "").replace(/[\\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
  return s ? s.substring(0, 80) : fallback;
}

function rootFolder_() {
  var id = prop_("ROOT_FOLDER_ID");
  if (id) return DriveApp.getFolderById(id);
  var it = DriveApp.getFoldersByName(DEFAULT_ROOT_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(DEFAULT_ROOT_NAME);
}

function subFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

// remplace un fichier du même nom (mise à jour d'un rapport modifié) : l'ancien va à la corbeille
function putFile_(folder, name, blob) {
  var it = folder.getFilesByName(name);
  while (it.hasNext()) it.next().setTrashed(true);
  return folder.createFile(blob.setName(name));
}

// un rapport modifié (client, no de job, date…) change de nom de fichier : on retrouve ses anciennes versions grâce à
// l'identifiant du rapport (fin du nom : _XXXXXX.pdf) et on les met à la corbeille pour ne pas laisser de doublons
function trashOlderVersions_(typeFolder, tag, keepName) {
  var folders = [], it = typeFolder.getFolders();
  while (it.hasNext()) folders.push(it.next());
  folders.forEach(function (f) {
    var files = f.searchFiles('title contains "' + tag + '" and trashed = false');
    while (files.hasNext()) {
      var file = files.next();
      if (file.getName() !== keepName) file.setTrashed(true);
    }
  });
}

function parseEmails_(value) {
  var list = String(value || "").split(/[;,\s]+/).map(function (x) { return x.trim(); }).filter(function (x) { return x; });
  return list;
}

// mot de passe de la console admin (ADMIN_PASSWORD ; l'ancienne propriété ADMIN_PIN reste acceptée)
function adminPassword_() {
  return prop_("ADMIN_PASSWORD") || prop_("ADMIN_PIN");
}

// vérifie le mot de passe de la console admin ; 5 mauvais essais = blocage de 10 minutes pour tout le monde
function adminCheck_(pwd) {
  var expected = adminPassword_();
  if (!expected) return { ok: false, error: "nopin" };
  var cache = CacheService.getScriptCache();
  var fails = parseInt(cache.get("adm_fails") || "0", 10);
  if (fails >= ADMIN_MAX_FAILS) return { ok: false, error: "locked" };
  if (String(pwd || "") === expected) { cache.remove("adm_fails"); return { ok: true }; }
  cache.put("adm_fails", String(fails + 1), ADMIN_LOCK_SECONDS);
  return { ok: false, error: "pin" };
}

// plafonds quotidiens : même si quelqu'un lisait le jeton dans config.js (fichier public sur GitHub Pages),
// il ne pourrait ni vider les quotas de courriels ni inonder Drive
function dayKey_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "America/Toronto", "yyyyMMdd");
}
function counter_(name) {
  var v = prop_("cnt_" + name + "_" + dayKey_());
  return v ? parseInt(v, 10) : 0;
}
function bump_(name, by) {
  var props = PropertiesService.getScriptProperties(), today = dayKey_();
  props.setProperty("cnt_" + name + "_" + today, String(counter_(name) + (by || 1)));
  var all = props.getProperties();                       // ménage : on retire les compteurs des jours précédents
  Object.keys(all).forEach(function (k) { if (/^cnt_/.test(k) && k.indexOf("_" + today) === -1) props.deleteProperty(k); });
}
function limit_(propName, dflt) {
  var n = parseInt(prop_(propName), 10);
  return n > 0 ? n : dflt;
}

function emailsValid_(list) {
  for (var i = 0; i < list.length; i++) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(list[i])) return list[i];
  }
  return null;
}

function yearOf_(dateStr) {
  var m = /^(\d{4})-\d{2}-\d{2}/.exec(String(dateStr || ""));
  return m ? m[1] : String(new Date().getFullYear());
}

/* ------------------------------------------------------------------ points d'entrée */

// Test de connexion depuis l'application : ...?ping=1&token=...
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (!tokenOk_(p.token)) return json_({ ok: false, error: "unauthorized", service: "flofab", version: VERSION });
  try {
    var root = rootFolder_();
    return json_({
      ok: true, service: "flofab", version: VERSION,
      folder: root.getName(), folderUrl: root.getUrl(),
      sender: Session.getEffectiveUser().getEmail(), quota: MailApp.getRemainingDailyQuota(),
      adminPassword: adminPassword_().length > 0, adminPin: adminPassword_().length > 0,
      emailsToday: counter_("emails"), emailsMax: limit_("MAX_EMAILS_PER_DAY", DEFAULT_MAX_EMAILS_PER_DAY),
      uploadsToday: counter_("uploads"), uploadsMax: limit_("MAX_UPLOADS_PER_DAY", DEFAULT_MAX_UPLOADS_PER_DAY)
    });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// action "upload" : PDF + données sur Drive      action "send" : idem + courriel avec le PDF joint
function doPost(e) {
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    var d = JSON.parse(e.postData.contents);
    if (!tokenOk_(d.token)) return json_({ ok: false, error: "unauthorized" });
    if (d.action === "adminCheck") return json_(adminCheck_(d.pin));
    if (!d.meta || !d.pdfBase64) return json_({ ok: false, error: "Requête incomplète." });

    lock.waitLock(30000); locked = true;

    // même requête reçue deux fois (réessai réseau) : on renvoie le résultat sans renvoyer le courriel
    var cache = CacheService.getScriptCache();
    var cacheKey = d.requestId ? "req_" + String(d.requestId).substring(0, 90) : "";
    if (cacheKey) {
      var hit = cache.get(cacheKey);
      if (hit) { var again = JSON.parse(hit); again.duplicate = true; return json_(again); }
    }

    // vérifier le courriel AVANT de ranger quoi que ce soit
    var wantMail = d.action === "send" && d.email;
    var to = [], cc = [];
    if (wantMail) {
      to = parseEmails_(d.email.to);
      cc = parseEmails_(d.email.cc).concat(parseEmails_(prop_("ALWAYS_CC")));
      if (!to.length) return json_({ ok: false, error: "Aucun destinataire." });
      if (to.length + cc.length > MAX_RECIPIENTS) return json_({ ok: false, error: "Trop de destinataires (max " + MAX_RECIPIENTS + ")." });
      var bad = emailsValid_(to.concat(cc));
      if (bad) return json_({ ok: false, error: "Adresse invalide : " + bad });
    }

    if (counter_("uploads") >= limit_("MAX_UPLOADS_PER_DAY", DEFAULT_MAX_UPLOADS_PER_DAY)) return json_({ ok: false, error: "Plafond quotidien de fichiers atteint." });
    if (wantMail && counter_("emails") + to.length + cc.length > limit_("MAX_EMAILS_PER_DAY", DEFAULT_MAX_EMAILS_PER_DAY)) return json_({ ok: false, error: "Plafond quotidien de courriels atteint." });
    var bytes = Utilities.base64Decode(d.pdfBase64);
    if (bytes.length > MAX_PDF_BYTES) return json_({ ok: false, error: "PDF trop volumineux." });

    var meta = d.meta;
    var base = safeName_(meta.fileBase, "rapport-" + new Date().getTime());
    var typeFolder = subFolder_(rootFolder_(), safeName_(meta.folder, "Autres"));
    var yearFolder = subFolder_(typeFolder, yearOf_(meta.date));
    var idTag = /_([A-Za-z0-9]{4,12})$/.exec(base);
    if (idTag) {
      trashOlderVersions_(typeFolder, "_" + idTag[1] + ".pdf", base + ".pdf");
      trashOlderVersions_(typeFolder, "_" + idTag[1] + ".json", base + ".json");
    }
    var pdfBlob = Utilities.newBlob(bytes, "application/pdf", base + ".pdf");
    var pdfFile = putFile_(yearFolder, base + ".pdf", pdfBlob);

    var jsonId = "";
    if (d.json) {
      var dataFolder = subFolder_(typeFolder, "_données");
      var jsonFile = putFile_(dataFolder, base + ".json", Utilities.newBlob(JSON.stringify(d.json, null, 2), "application/json", base + ".json"));
      jsonId = jsonFile.getId();
    }

    var emailed = false;
    if (wantMail) {
      var opts = {
        to: to.join(","), subject: String(d.email.subject || meta.title || "Document Flo-Fab").substring(0, 250),
        body: String(d.email.body || "").substring(0, MAX_BODY_CHARS) + "\n\n— Envoyé depuis les Formulaires Flo-Fab", attachments: [pdfFile.getBlob().setName(base + ".pdf")],
        name: prop_("FROM_NAME") || "Flo-Fab Inc."
      };
      if (cc.length) opts.cc = cc.join(",");
      MailApp.sendEmail(opts);
      emailed = true;
      bump_("emails", to.length + cc.length);
    }

    bump_("uploads", 1);
    var result = {
      ok: true, pdfId: pdfFile.getId(), pdfUrl: pdfFile.getUrl(), jsonId: jsonId,
      folderUrl: yearFolder.getUrl(), emailed: emailed
    };
    if (cacheKey) cache.put(cacheKey, JSON.stringify(result), 21600);
    return json_(result);
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    if (locked) lock.releaseLock();
  }
}

/* ------------------------------------------------------------------ à exécuter une seule fois */

// Crée (une seule fois) le jeton de l'application ET le mot de passe de la console admin, puis les affiche dans le journal.
// Rien n'est jamais écrasé : pour recréer un jeton, supprimez d'abord la propriété API_TOKEN.
function creerAcces() {
  var props = PropertiesService.getScriptProperties();
  var token = prop_("API_TOKEN");
  if (!token) {
    token = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
    props.setProperty("API_TOKEN", token);
    Logger.log("NOUVEAU jeton (à copier dans config.js sur GitHub, champ token) : " + token);
  } else {
    Logger.log("Jeton existant : " + token);
  }
  var pwd = adminPassword_();
  if (!pwd) {
    var alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // sans caractères ambigus (0/O, 1/l/I)
    var raw = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
    pwd = "";
    for (var i = 0; i < 12; i++) pwd += alphabet.charAt(parseInt(raw.substr(i * 2, 2), 16) % alphabet.length);
    props.setProperty("ADMIN_PASSWORD", pwd);
    Logger.log("NOUVEAU mot de passe de la console admin (pour le changer : modifiez la propriété ADMIN_PASSWORD) : " + pwd);
  } else {
    Logger.log("Un mot de passe admin existe déjà (non affiché). Pour le changer : modifiez la propriété ADMIN_PASSWORD.");
  }
}

// ancien nom, conservé pour compatibilité
function creerJeton() { creerAcces(); }

// Exécutez cette fonction une fois depuis l'éditeur pour accorder les autorisations Drive et Gmail.
function autoriser() {
  var root = rootFolder_();
  Logger.log("Dossier Drive : " + root.getName() + " — " + root.getUrl());
  Logger.log("Courriels restants aujourd'hui : " + MailApp.getRemainingDailyQuota());
  Logger.log("Jeton configuré : " + (prop_("API_TOKEN") ? "oui" : "NON — ajoutez la propriété API_TOKEN"));
  Logger.log("Mot de passe console admin : " + (adminPassword_() ? "oui" : "NON — exécutez creerAcces (ou ajoutez la propriété ADMIN_PASSWORD)"));
}
