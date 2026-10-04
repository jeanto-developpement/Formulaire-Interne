/*
 * Configuration Flo-Fab — À MODIFIER SUR GITHUB (une seule fois, valable pour TOUS les appareils).
 * Aucun réglage n'est demandé aux techniciens : ils reçoivent ces valeurs en ouvrant l'application.
 *
 * Pour modifier : sur GitHub, ouvrez ce fichier → icône crayon ✏️ → changez les valeurs entre guillemets → « Commit changes ».
 * Les appareils prennent la nouvelle configuration à leur prochaine ouverture de l'application (après 1 à 2 minutes).
 *
 * Laissez scriptUrl et token vides pour désactiver Google (l'app fonctionne alors seule, sans courriel ni Drive).
 * L'autre moitié de la configuration (mot de passe admin, dossier Drive, plafonds, copie obligatoire…) se règle dans la
 * console Google Apps Script : voir GOOGLE_SETUP.md.
 *
 * ⚠ Ce fichier est lisible par quiconque ouvre le site : le jeton n'est donc pas un secret absolu. Le script Google
 *   applique des plafonds quotidiens (courriels et fichiers) pour limiter les abus. Pour changer de jeton : propriété
 *   API_TOKEN dans le script + champ token ci-dessous.
 */
window.FLOFAB_CONFIG = {
  scriptUrl: "https://script.google.com/macros/s/AKfycbxN8B54QjSbNY_30u6TOT-ME7aa577Rfy3tMyZvD7Xl53YzT_KbO56LN_ZW-RNUcWpM/exec",      // URL de l'application Web du script Google (se termine par /exec)
  token: "d58e339805b844f6a30aefc895c4135496bfc2ac9b964ab08260dda108603c02",          // jeton : même valeur que la propriété API_TOKEN du script
  ccDefault: "",      // copie (Cc) proposée dans la fenêtre « Envoyer par courriel » — facultatif
  autoDrive: true     // true = chaque « Enregistrer » envoie aussi le rapport sur Drive ; false = jamais automatique
};
