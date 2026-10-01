# Parcours professionnel — plan d’implémentation

## Objectif
Implémenter les quatre états du brief et les deux confirmations dans Angular/Ionic avec aperçu. Demande d’exécution directe reçue le 2026-10-01.

## Conception et comportement actuel
Deux étapes locales existent ; aucune API. Conserver AuthLayoutComponent, assets et tokens. Étendre RegisterComponent à trois étapes conditionnelles et un état confirmation distinct sans stepper. Extraire uniquement le formulaire professionnel, responsabilité autonome avec validation et fichier en mémoire.

## Fichiers et jalons
- [x] RegisterComponent TS/HTML/SCSS : choix de rôle, badges, stepper 2/3 étapes, confirmations et aperçu via query param en développement uniquement.
- [x] verification.component.ts/html/scss : formulaires professionnels typés, gouvernorats tunisiens, PDF/JPG/PNG (10 Mo maximum), retour conservant les saisies et événement après validation en démonstration uniquement.
- [x] register.component.spec.ts et verification.component.spec.ts : parcours, validation, absence de faux succès en mode normal, confirmations sans stepper et lien /auth.
- [x] Vérifier tests, build, lint et navigateur aux largeurs 1536/820/390/320 ; produire présentation de six états dans docs/previews.

## Critères d’acceptation
Les bénévoles restent à deux étapes. Les professionnels passent à la vérification ; confirmation après soumission valide dans l’aperçu. Aucun quatrième numéro, session, stockage ou requête simulée. Texte exact, pictogramme par rôle, bouton vers /auth. Contact sans adresse inventée : information d’indisponibilité si aucun canal configuré. Aperçu identifié comme démonstration et ignoré en production.

## Risques et retour arrière
API et contact absents : intégration réelle non vérifiable. Validation frontend indicative, à répéter côté serveur lors de l’intégration. Revenir sur les seuls fichiers de cette fonctionnalité sans écraser les modifications utilisateur.

## Progress
Terminé sur feat/professional-verification, sans commit ni push. Serveur Angular : http://127.0.0.1:4201 ; présentation : http://127.0.0.1:4202/professional-registration.html.

## Surprises & Discoveries
Le template a déjà des modifications utilisateur ; les préserver. Les tests existants attendent des libellés de boutons supprimés dans ces modifications : vérifier et signaler séparément.

- Libellés accessibles et aria-pressed des deux boutons de visibilité restaurés pour conserver l’accessibilité et les tests existants ; autres modifications utilisateur conservées.
- Sandbox Windows : build/tests refusent de lire les chemins parents. Réussite des mêmes commandes hors sandbox, sans modification du compilateur.
- Les captures d’un élément dans une page Ionic défilante peuvent couper le bas hors viewport : captures mobiles réalisées avec une hauteur ajustée au contenu. Contrôles responsive réalisés séparément à hauteur 844 px.
- Le script navigateur attend le rendu Angular des messages de validation avant assertion.

## Decision Log
- 2026-10-01 : réutiliser le décor, aucun nouveau mockup ni framework.
- 2026-10-01 : aperçu de développement séparé de toute preuve de création effective ; pas de backend inventé.

## Outcomes & Retrospective
Les six états sont réalisés avec le décor partagé inchangé et sans nouvelle dépendance. Les confirmations restent un état distinct ; aucun quatrième numéro. Vérification indépendante avec champs typés et document en mémoire uniquement ; changement de rôle efface le justificatif pour éviter de réutiliser celui d’un autre profil.

Vérifications réussies :
- npm test -- --watch=false : 5 fichiers, 13 tests.
- npm run build : succès, bundle initial 494,24 kB ; avertissement Browserslist préexistant.
- npm run lint : succès.
- docs/previews/check-registration.cjs via Playwright/Edge : six états desktop, contrôles à 820/390/320 px sans débordement horizontal, validation des deux formulaires, conservation des saisies/fichier au retour, focus de confirmation et navigation connexion ; aucune erreur JavaScript.
- Revue visuelle des confirmations desktop/mobile, formulaire vétérinaire, formulaire organisation et choix de rôle. Douze captures dans docs/previews, présentation HTML à deux colonnes avec liens interactifs.
- git diff --check : succès (avertissements CRLF seulement).
- graphify update . : succès, 265 nœuds / 274 liens ; artefacts générés non commités, avertissements de labels et configurations sans nœuds.
- Revue correctness/security/intégrité/maintenabilité/performance : pas de session, requête simulée, persistance de mot de passe, dépendance supplémentaire ou faux succès dans le parcours normal.

Limites : backend de création et upload absent ; succès effectif et envoi d’e-mail non vérifiables. Le canal de contact manque : le bouton l’indique sans adresse fictive. Les paramètres d’aperçu sont ignorés en production. Prochaine action de développement : raccorder la soumission à un contrat API réel puis afficher la confirmation uniquement après sa réponse positive.
