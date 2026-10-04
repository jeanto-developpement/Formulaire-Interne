# Courriel et Google Drive — mise en place (15 minutes, une seule fois)

**La configuration se fait à deux endroits seulement, jamais sur les appareils :**

| Où | Quoi |
|---|---|
| **GitHub** — fichier `config.js` | URL du script Google, jeton, copie (Cc) par défaut, copie automatique sur Drive |
| **Console Google Apps Script** | Mot de passe de la console admin, dossier Drive, plafonds quotidiens, copie obligatoire, nom de l'expéditeur |

Les techniciens n'ont **rien à saisir** : en ouvrant l'application, ils reçoivent la configuration de `config.js`. Si vous la changez, tous les appareils la prennent à leur prochaine ouverture.

```
Application (GitHub Pages) ──► Votre script Google ──► Google Drive  (PDF + données)
   lit config.js                                  └──► Gmail        (courriel avec PDF joint)
```

## 1. Créer le script (console Google Apps Script)
1. Connectez-vous au compte Google qui **enverra les courriels et possédera les fichiers** (idéalement un compte de l'entreprise).
2. Allez sur <https://script.google.com> → **Nouveau projet** (« Flo-Fab Formulaires »).
3. Remplacez le code d'exemple par tout le contenu de **`google-apps-script/Code.gs`**. Enregistrez (💾).

## 2. Créer le jeton et le mot de passe administrateur
1. Choisissez la fonction **`creerAcces`** → **Exécuter**. Acceptez les autorisations (« Avancé » → « Accéder à… » si Google affiche un avertissement : c'est votre propre script).
2. Ouvrez le **Journal d'exécution** et copiez les deux valeurs :
   - le **jeton** : il ira dans `config.js` ;
   - le **mot de passe administrateur** : il ouvre la **console admin** de l'application.
3. Choisissez la fonction **`autoriser`** → **Exécuter** (autorisations Drive et Gmail).

Réglages du script (⚙ **Paramètres du projet → Propriétés du script**) :

| Propriété | Rôle | Défaut |
|---|---|---|
| `API_TOKEN` | Le jeton (créé par `creerAcces`) | — |
| `ADMIN_PASSWORD` | Mot de passe de la console admin, 8 caractères minimum. **Pour le changer : modifiez cette propriété** (effet immédiat sur tous les appareils). | — |
| `ROOT_FOLDER_ID` | ID d'un dossier Drive existant où tout sera rangé | dossier « Flo-Fab - Formulaires » créé automatiquement |
| `ALWAYS_CC` | Adresse(s) mises en copie de **tous** les courriels (ex. boîte de l'entreprise) | aucune |
| `FROM_NAME` | Nom affiché de l'expéditeur | Flo-Fab Inc. |
| `MAX_EMAILS_PER_DAY` | Plafond de destinataires (to + cc) par jour | 60 |
| `MAX_UPLOADS_PER_DAY` | Plafond de fichiers rangés sur Drive par jour | 400 |

## 3. Déployer
1. **Déployer** → **Nouveau déploiement** → type **Application Web**.
2. **Exécuter en tant que : Moi**. **Qui a accès : Tout le monde**. *(Obligatoire pour que l'application puisse l'appeler ; le jeton et les plafonds protègent l'accès.)*
3. **Déployer**, puis copiez l'**URL de l'application Web** (elle se termine par `/exec`).

> Si vous modifiez `Code.gs` plus tard : **Déployer → Gérer les déploiements → ✏️ → Nouvelle version**. L'URL ne change pas.

## 4. Renseigner `config.js` sur GitHub
1. Dans votre dépôt GitHub, ouvrez **`config.js`** → icône crayon ✏️.
2. Collez l'URL et le jeton entre les guillemets :
   ```js
   window.FLOFAB_CONFIG = {
     scriptUrl: "https://script.google.com/macros/s/.../exec",
     token: "le-jeton-copié-du-journal",
     ccDefault: "",
     autoDrive: true
   };
   ```
3. **Commit changes**. Après 1 à 2 minutes, tous les appareils sont configurés à leur prochaine ouverture (rien à faire sur les téléphones).
4. Vérifiez : au bas de l'accueil, **🔒 Console admin** → mot de passe → onglet **Connexion** → **Tester la connexion** : « ✓ Connecté ».

| Champ de `config.js` | Effet |
|---|---|
| `scriptUrl` / `token` | Vides = Google désactivé (l'application fonctionne seule, le bouton Courriel ouvre un courriel à compléter) |
| `ccDefault` | Copie proposée dans la fenêtre « Envoyer par courriel » (modifiable à l'envoi) |
| `autoDrive` | `true` : chaque **Enregistrer** envoie aussi le rapport sur Drive. `false` : jamais automatique (seulement avec le bouton **Synchroniser** ou en envoyant un courriel) |

## La console admin (réservée à l'administrateur)
Bouton **🔒 Console admin**, au bas de l'accueil. Elle demande **toujours le mot de passe administrateur**, vérifié par votre script Google (jamais stocké sur les appareils). L'accès reste ouvert **10 minutes** (« Verrouiller » pour fermer tout de suite). Après 5 mauvais mots de passe, le script bloque les essais pendant 10 minutes.

| Onglet | Contenu |
|---|---|
| **Rapports enregistrés** | **Supprimer**, **exporter** (JSON), **importer**, tout synchroniser avec Drive |
| **Connexion** | Lecture seule : source (`config.js`), URL, jeton masqué, Cc, copie auto ; **Tester la connexion** (dossier Drive, expéditeur, usage du jour) |

**Les techniciens** peuvent ouvrir, modifier, enregistrer, imprimer et envoyer leurs rapports, mais ne voient ni les réglages, ni les boutons Supprimer / Exporter / Importer.

Limites :
- La console exige une **connexion** pour vérifier le mot de passe (hors ligne, elle reste fermée).
- Sans Google configuré (`config.js` vide), la console ne s'ouvre pas : rien ne peut vérifier le mot de passe.
- **Mot de passe oublié** : dans la console Google Apps Script, supprimez la propriété `ADMIN_PASSWORD`, exécutez `creerAcces`, lisez le nouveau mot de passe dans le journal.

## Ce que ça fait au quotidien
| Action | Résultat |
|---|---|
| **Enregistrer** | Enregistre sur l'appareil **et** (si `autoDrive`) envoie le PDF + les données sur Drive. |
| **Courriel** | Fenêtre (destinataire, Cc, objet, message) puis envoi **avec le PDF joint** ; une copie est rangée sur Drive. |
| **Sans réseau / script en panne** | Le rapport reste enregistré sur l'appareil, marqué « à synchroniser ». Il part au retour du réseau (si `autoDrive`) ou avec le bouton **Synchroniser**. |
| **Rapport modifié puis réenregistré** | Le fichier Drive est remplacé (l'ancienne version va à la corbeille Drive). Pas de doublons. |

Rangement sur Drive :
```
Flo-Fab - Formulaires /
  Rapports de service /  2026 / 2026-10-01_Service_Hydro-Test_SC-77_a1b2c3.pdf
                         _données / …a1b2c3.json     (données du rapport, ré-importables dans l'app)
  Mise en marche - Submersible /  …
  Mise en marche - Surpresseur /  …
  Estimations /  …
  Réquisitions d'achat /  …
  QC contrôle programmation /  …
```

## Sécurité — à lire
**`config.js` est un fichier public** : quiconque ouvre votre site GitHub Pages peut le lire, donc **le jeton n'est pas un secret absolu**. C'est le prix d'une configuration sans rien saisir sur les appareils. Ce qui limite les dégâts :
- le script applique des **plafonds quotidiens** (courriels et fichiers) : un abus ne peut ni vider vos quotas ni inonder Drive ;
- chaque courriel porte la mention « Envoyé depuis les Formulaires Flo-Fab » et part de **votre** compte : les abus sont visibles dans « Envoyés » ;
- **changer de jeton** se fait en deux endroits, une fois : supprimer `API_TOKEN` dans le script, relancer `creerAcces`, coller le nouveau jeton dans `config.js` ;
- la **console admin** (suppression, export, import) reste protégée par un mot de passe vérifié côté script, pas par le jeton.

Pour un niveau de protection supérieur, vous pouvez rendre le dépôt privé (GitHub Pages sur dépôt privé demande un forfait payant) ; la mise en place reste identique.

Limites Google : environ **100 courriels/jour** avec un compte Gmail gratuit, **1 500/jour** avec Google Workspace.

## Dépannage
| Message | Cause probable |
|---|---|
| « Google n'est pas configuré… » | `scriptUrl` ou `token` vide dans `config.js`, ou le commit n'est pas encore publié (patientez 1 à 2 minutes). |
| « Jeton refusé » | Le jeton de `config.js` ne correspond pas à la propriété `API_TOKEN` du script. |
| « Réponse invalide du script Google » | L'URL ne se termine pas par `/exec`, ou le déploiement n'est pas « Tout le monde ». |
| « Connexion impossible » | Pas de réseau, ou URL incorrecte. |
| « Mot de passe incorrect » / « Trop d'essais » | Mauvais mot de passe. Après 5 erreurs, patientez 10 minutes. |
| « Aucun mot de passe administrateur défini… » | Exécutez `creerAcces` (ou ajoutez `ADMIN_PASSWORD`), puis redéployez une **nouvelle version**. |
| « Plafond quotidien … atteint » | Augmentez `MAX_EMAILS_PER_DAY` / `MAX_UPLOADS_PER_DAY` dans le script, ou attendez demain. |
| « Authorization is required » (dans Google) | Relancez `autoriser` depuis l'éditeur, acceptez, puis créez une **nouvelle version** du déploiement. |
| Le courriel part, mais d'un autre compte | Les courriels partent du compte qui a **déployé** le script. |

## Bon à savoir
- Les PDF envoyés par ce circuit sont générés dans le navigateur : ce sont des **images haute résolution** de la page (texte non sélectionnable). Le bouton **Imprimer / PDF** du navigateur garde, lui, un PDF avec texte sélectionnable.
- Le PDF est dans la langue choisie dans l'application (FR / EN) au moment de l'envoi.
- Chaque page du PDF porte en pied de page le formulaire, **sa version**, la **date et l'heure** d'envoi et la référence du rapport ; le fichier JSON rangé dans `_données` contient aussi `formVersion`.
- Les anciens liens de configuration et les réglages enregistrés par les versions précédentes sur les appareils ne sont plus utilisés : ils sont effacés automatiquement.
