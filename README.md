# Flo-Fab — Formulaires (service et mise en marche)

Application web pour les techniciens : fonctionne sur téléphone, tablette et ordinateur, **même hors ligne**.

## Formulaires inclus
L'accueil les sépare en deux groupes : **Appel de service** (rapport de service, mises en marche) et **Formulaires internes** (estimation, réquisition d'achat, QC contrôle programmation, feuille d'identification job). Les rapports enregistrés sont classés de la même façon.

| Formulaire | Contenu |
|---|---|
| **Rapport de service** | Heures, information générale, raisons, travaux effectués, pièces utilisées |
| **Mise en marche — Submersible** | Pompes 1 à 3, contrôleur, vérifications, mesures (voltages / ampérages) |
| **Mise en marche — Surpresseur** | Pompes 1 à 3, pressions (PSI), vérifications, mesures |
| **Estimation (soumission)** | Pompe/moteur, matériel et main-d'œuvre avec totaux coût / vente / réel calculés (CAD ou USD) |
| **QC contrôle programmation** | Liste de **contrôle qualité** : équipement (VFD — modèle et n° de série, avec possibilité d'en ajouter — et HMI — modèle), mode de contrôle, puis données moteur, vérification du voltage (choix : 460 V 60 Hz, 575 V 60 Hz, 208 V 60 Hz, 400 V 50 Hz, 230 V 50 Hz, 380 V 50 Hz, 120 V 60 Hz, 240 V 60 Hz), filage, rotation, check valve, PID, séquence lead-lag, sleep mode, low pressure et HMI à valider « programmé » et « testé » (ou S.O.), résultat QC conforme / incomplet, signature du technicien |
| **Feuille d'identification job** | Grande feuille à poser sur le travail : #Quote, client, projet, # Job, avec la date et l'heure d'impression inscrites automatiquement |
| **Réquisition d'achat** | Articles à acheter avec quantités et **photo** (caméra ou galerie), signatures de l'employé et de l'approbateur (imprimée en paysage). **La quantité est obligatoire pour chaque description** (Enregistrer, Courriel et Imprimer sont bloqués sinon) |

Dans les deux mises en marche, **une seule pompe est affichée au départ** ; le bouton « + Ajouter une pompe » en ajoute au besoin (jusqu'à 6). Seules les pompes affichées sont imprimées.

Communs aux trois : heures bureau/client avec calcul automatique, nom et signature du technicien et du client, date.

## Google : courriel avec PDF joint + enregistrement sur Drive
Optionnel. Un petit script Google (`google-apps-script/Code.gs`, à déployer une fois) permet :
- **Courriel** : envoi direct avec le PDF en pièce jointe (fenêtre destinataire / Cc / objet / message) ;
- **Enregistrer** : copie automatique de chaque rapport (PDF + données) sur Google Drive, classée par type de formulaire ;
- reprise automatique après une coupure de réseau (rapports « à synchroniser »).
**Configuration centralisée** : URL du script et jeton dans `config.js` (GitHub), mot de passe admin / dossier Drive / plafonds dans la console Google Apps Script — **rien à saisir sur les appareils**.
**Console admin** (🔒, bas de l'accueil, mot de passe vérifié par le script) : suppression / export / import des rapports enregistrés, test de la connexion. Les techniciens n'y ont pas accès.
Mise en place pas à pas : **[GOOGLE_SETUP.md](GOOGLE_SETUP.md)**. Sans configuration, le bouton Courriel ouvre simplement un courriel à compléter.

## Date, heure et version sur chaque PDF
Chaque PDF porte, en pied de page : **le formulaire, sa version (et sa date de révision), la date et l'heure d'impression, la référence du rapport**. Les PDF créés par l'app (courriel / Drive) l'ont en vrai texte sur **chaque page** (avec « Page n/N ») et dans les propriétés du fichier. À l'impression par le navigateur, le pied de page est en fin de document, et l'horodatage s'ajoute aussi en haut de la page 1 quand le document dépasse une page. La Feuille d'identification job garde sa ligne « Date et heure d'impression » et y ajoute la version.

**Changer la version d'un formulaire** (à chaque modification de ses champs, libellés ou mise en page) : dans `forms.js`, tableau `VERSIONS` — par exemple `service: ["1.1", "2026-11-15"]` — puis augmenter le numéro dans `sw.js`. La version est aussi enregistrée dans les données envoyées sur Drive (`formVersion`).

## Fonctions
- **Langue : français / anglais** — bouton **FR | EN** dans l'en-tête. Il change l'écran *et* le PDF imprimé (français par défaut ; le choix est mémorisé sur l'appareil).
- **Imprimer / PDF** : reproduit la mise en page des formulaires papier, sur une page Letter (choisir « Enregistrer en PDF »).
- Brouillon sauvegardé automatiquement ; rapports enregistrés sur l'appareil (accueil → *Rapports enregistrés*).
- Export / import JSON des rapports (console admin).
- Installable comme une app : « Ajouter à l'écran d'accueil » (PWA).

## Mise en ligne sur GitHub Pages
1. Créer un dépôt GitHub (ex. `formulaires-flofab`).
2. Téléverser **tous** les fichiers de ce dossier à la racine du dépôt (*Add file → Upload files*).
3. *Settings → Pages* → Source : **Deploy from a branch** → branche `main`, dossier `/ (root)` → *Save*.
4. Après 1 à 2 minutes : `https://<compte>.github.io/formulaires-flofab/`.

> ⚠️ GitHub Pages est **public** sur les comptes gratuits (la page vide, pas les rapports). Les rapports ne quittent jamais l'appareil.

## Fichiers
- `config.js` — **configuration Google (à modifier sur GitHub)** : URL du script, jeton, Cc, copie auto
- `cloud.js` — génération du PDF dans le navigateur, réglages Google, fenêtre courriel, appels au script
- `vendor/` — bibliothèques html2canvas et jsPDF (licence MIT), chargées seulement à l'envoi
- `google-apps-script/Code.gs` — le script à coller dans Google Apps Script
- `index.html` — page d'accueil et structure
- `forms.js` — les trois formulaires (écran et impression) : **c'est ici qu'on modifie un libellé ou qu'on ajoute un champ**
- `app.js` — sauvegarde, signatures, navigation
- `app.css` — styles (écran et impression)
- `sw.js`, `manifest.json`, icônes — mode hors ligne et installation

## Mise à jour
Après toute modification, changer le numéro de version dans `sw.js` (ex. `flofab-v50` → `flofab-v51`) pour forcer le rafraîchissement sur les appareils.

## Confidentialité
Aucune donnée n'est envoyée à un serveur. Tout est stocké dans le navigateur (localStorage). Effacer les données du navigateur supprime les rapports : exportez-les régulièrement.
