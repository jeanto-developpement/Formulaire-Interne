# Flo-Fab — Formulaires (service et mise en marche)

Application web pour les techniciens : fonctionne sur téléphone, tablette et ordinateur, **même hors ligne**.

## Formulaires inclus
L'accueil les sépare en deux groupes : **Appel de service** (rapport de service, mises en marche) et **Formulaires internes** (estimation, réquisition d'achat, QC contrôle programmation, feuille d'identification job, test de performance de pompe). Les rapports enregistrés sont classés de la même façon.

| Formulaire | Contenu |
|---|---|
| **Rapport de service** | Heures, information générale, raisons, travaux effectués, pièces utilisées |
| **Mise en marche — Submersible** | Pompes 1 à 3, contrôleur, vérifications, mesures (voltages / ampérages) |
| **Mise en marche — Surpresseur** | Pompes 1 à 3, pressions (PSI), vérifications, mesures |
| **Estimation (soumission)** | Pompe/moteur, matériel et main-d'œuvre avec totaux coût / vente / réel calculés (CAD ou USD) |
| **Feuille de contrôle** | Grande feuille posée sur l'équipement (comme la feuille papier), avec logo : client, # job + bloc, puissance (HP) et unité n/n, puis les **lignes de contrôle choisies dans l'app** parmi : Alignement, Électrique, Programmation, Isolation, Finition, Inhibiteur de rouille, Pièces shippées lousses, Contrôle qualité — chacune avec une case et une ligne pour les initiales (à remplir à la main) ; date, heure et version au bas de la feuille |
| **Test de performance de pompe (HI 14.6)** | Essai hydraulique **Grade 2B** (ANSI/HI 14.6, unités US) repris de la feuille Excel « Rotodynamic test pump » — **on ne saisit que les cellules au fond brun** (projet, pompe, moteur, mesures brutes des 8 points dans un tableau comme l'Excel, dates de signature) et les dates d'étalonnage des instruments ; tout le reste est fixe (SG = 1, registre des instruments — tableau `PUMP_INS` dans `forms.js`) ou calculé. Sections : 1 données brutes, 2 conversions à la vitesse nominale, 3 courbes et zone d'exploitation préférée (2 graphiques), 4 verdict selon la méthode HI 14.6 — un résultat pour le débit, la hauteur totale, la puissance absorbée et le rendement (courbe H-Q corrigée contre la croix de tolérance Grade 2B ±8 % / ±5 %, débit / hauteur acceptés si l'un des deux est conforme ; rendement −5 % et puissance +8 % lus à l'intersection de la droite origine – point garanti ; pompes ≤ 10 kW : ±10 % / ±8 %, rendement à vérifier avec la formule de la norme), 5 commentaires, 6 signatures, 7 historique des révisions. L'essai NPSH a été retiré (version 3.1) ; évaluation HI 14.6 (version 3.2) ; puissance remise dans le verdict (version 3.3) ; 4 résultats séparés en section 4 (version 3.4) ; **PDF toujours bilingue français / anglais**, quelle que soit la langue de l'app (version 3.5). |
| **QC contrôle programmation** | Liste de **contrôle qualité** : équipement (VFD — modèle et n° de série, avec possibilité d'en ajouter — et HMI — modèle), mode de contrôle, puis données moteur, vérification du voltage (choix : 460 V 60 Hz, 575 V 60 Hz, 208 V 60 Hz, 400 V 50 Hz, 230 V 50 Hz, 380 V 50 Hz, 120 V 60 Hz, 240 V 60 Hz), filage, rotation, check valve, PID, séquence lead-lag, sleep mode, low pressure et HMI à valider « programmé » et « testé » (ou S.O.), résultat QC conforme / incomplet, signature du technicien |
| **Feuille d'identification job** | Grande feuille à poser sur le travail : #Quote, client, projet, # Job, avec la date et l'heure d'impression inscrites automatiquement |
| **Réquisition d'achat** | Articles à acheter avec quantités et **photo** (caméra ou galerie), signatures de l'employé et de l'approbateur (imprimée en paysage). **La quantité est obligatoire pour chaque description** (Enregistrer, Courriel et Imprimer sont bloqués sinon) |

Dans les deux mises en marche, **une seule pompe est affichée au départ** ; le bouton « + Ajouter une pompe » en ajoute au besoin (jusqu'à 6). Seules les pompes affichées sont imprimées.

Communs aux trois : heures bureau/client avec calcul automatique, nom et signature du technicien et du client, date.

## Google : courriel avec PDF joint + enregistrement sur Drive
Optionnel. Un petit script Google (`google-apps-script/Code.gs`, à déployer une fois) permet :
- **Courriel** : envoi direct avec le PDF en pièce jointe (fenêtre destinataire / Cc / objet / message) ;
- **Enregistrer** : copie automatique de **tous les formulaires** sur Google Drive, classée par type de formulaire, **sauf la feuille d'identification job** (courriel ou impression seulement) ;
- reprise automatique après une coupure de réseau (rapports « à synchroniser »).
**Configuration centralisée** : URL du script et jeton dans `config.js` (GitHub), mot de passe admin / dossier Drive / plafonds dans la console Google Apps Script — **rien à saisir sur les appareils**.
**Console admin** (🔒, bas de l'accueil, mot de passe vérifié par le script) : suppression / export / import des rapports enregistrés, test de la connexion. Les techniciens n'y ont pas accès.
Mise en place pas à pas : **[GOOGLE_SETUP.md](GOOGLE_SETUP.md)**. Sans configuration, le bouton Courriel ouvre simplement un courriel à compléter.

## Date, heure et version sur chaque PDF
Chaque PDF porte, en pied de page : **le formulaire, sa version (et sa date de révision), la date et l'heure d'impression, la référence du rapport**. Les PDF créés par l'app (courriel / Drive) l'ont en vrai texte sur **chaque page** (avec « Page n/N ») et dans les propriétés du fichier. À l'impression par le navigateur, le pied de page est en fin de document, et l'horodatage s'ajoute aussi en haut de la page 1 quand le document dépasse une page. La Feuille d'identification job garde sa ligne « Date et heure d'impression » et y ajoute la version.

**Changer la version d'un formulaire** (à chaque modification de ses champs, libellés ou mise en page) : dans `forms.js`, tableau `VERSIONS` — par exemple `service: ["1.1", "2026-11-15"]` — puis augmenter le numéro dans `sw.js`. La version est aussi enregistrée dans les données envoyées sur Drive (`formVersion`).

## Format Lettre uniquement
Tous les PDF sont au **format Lettre (8,5 × 11 po)** — portrait, sauf la réquisition d'achat en paysage Lettre. Jamais de A4.
- **PC / Mac** : la page d'impression déclare le format Lettre ; le navigateur l'applique.
- **iPhone / iPad** : Safari ignore le format de page demandé. Le bouton **Imprimer / PDF** y crée donc lui-même le PDF Lettre (comme pour le courriel et Drive), puis ouvre la feuille de partage (Imprimer, Enregistrer dans Fichiers, AirDrop…) ou télécharge le fichier.
- **Réglage** dans `config.js` : `printMode: "auto"` (défaut : navigateur sur PC / Mac, PDF créé par l'app sur iPhone / iPad), `"browser"` (toujours la boîte d'impression) ou `"pdf"` (toujours un PDF Lettre créé par l'app, partout). Si le PDF ne peut pas être créé, l'app retombe sur l'impression du navigateur et l'indique.
- Un PDF créé par l'app est une image haute résolution de la page (texte non sélectionnable) ; l'impression du navigateur garde le texte sélectionnable.

## PC, iPad et iPhone
- **Marges d'impression** : la feuille porte elle-même ses marges (12 mm à gauche et à droite, 9 mm en haut et en bas, sur chaque page). Le réglage « Marges » de la boîte d'impression du navigateur (Aucune, Minimum…) ne peut donc plus les supprimer. Conseil : désactiver « En-têtes et pieds de page » du navigateur, car l'app imprime déjà son propre pied de page.
- **iPhone / iPad** : tous les champs font au moins 16 px (Safari ne zoome plus la page quand on touche un champ), les zones tactiles font 44 px, rien ne déborde même sur un iPhone SE (320 px). Les PDF de l'app (courriel / Drive) sont dessinés **une page à la fois**, avec de petites images, pour respecter la limite de mémoire de Safari sur les longs documents.
- Imprimer depuis un iPhone / iPad : bouton **Imprimer / PDF** → menu de partage → « Enregistrer dans Fichiers » ou AirPrint. Le bouton **Courriel** (avec Google configuré) joint le PDF automatiquement et fonctionne partout.

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
Après toute modification, changer le numéro de version dans `sw.js` (ex. `flofab-v78` → `flofab-v79`) pour forcer le rafraîchissement sur les appareils.

## Confidentialité
Aucune donnée n'est envoyée à un serveur. Tout est stocké dans le navigateur (localStorage). Effacer les données du navigateur supprime les rapports : exportez-les régulièrement.
