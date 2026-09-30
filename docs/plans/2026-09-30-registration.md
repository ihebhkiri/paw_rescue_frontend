# Inscription PawRescue en deux étapes — plan d’implémentation

## Objectif et approche

Reproduire les deux captures dans une seule page `/auth/register` avec un état local `currentStep = signal<1 | 2>(1)`. Conserver `/auth` pour la connexion. Réutiliser les images, couleurs et icônes existantes, sans nouvelle dépendance, store global ou endpoint fictif.

La recherche de référence est `../research/2026-09-30-registration.md`. Le backend, les documents juridiques et une politique de mot de passe spécifique n’existent pas. Les captures sont le design de référence, sans variante graphique à faire choisir.

## Fichiers et responsabilités

- Créer `src/app/auth/layout/auth-layout.component.{ts,html,scss}` : `AuthLayoutComponent`, décor et marque communs, langue FR, courbe et watermark ; projection du contenu du panneau droit. Un seul paramètre `variant: 'login' | 'register'` pour les deux proportions effectivement requises. Grid/Flex pour les zones principales, position absolue seulement pour les éléments décoratifs. Cette extraction est justifiée par la réutilisation immédiate entre connexion et inscription.
- Modifier `src/app/auth/auth.component.{ts,html,scss}` : employer le décor commun, préserver le formulaire et remplacer le feedback S’inscrire par un `RouterLink` vers `/auth/register`.
- Adapter `src/app/auth/auth.component.spec.ts` au lien routé et conserver les tests de connexion.
- Créer `src/app/auth/register/register.component.{ts,html,scss}` : `RegisterComponent`, formulaire typé, indicateur d’étapes, cartes de rôle et actions.
- Créer `src/app/auth/register/register.component.spec.ts` : comportement et transitions du parcours.
- Modifier `src/app/app.routes.ts` : route lazy `/auth/register` et titres de route distincts Connexion/Créer un compte.
- Modifier `src/theme/variables.scss` seulement pour les nouvelles couleurs de rôles et d’information réellement réutilisées.
- Mettre à jour le présent plan, captures `docs/previews/register-step-{1,2}-{desktop,mobile}.png`, puis `graphify update .`.
- Laisser `src/app/auth/service/auth.ts`, les dépendances et les endpoints inchangés.

## Jalons

### 1. Décor commun et navigation

- Créer une branche dédiée à partir de `5ff64be` en conservant les documents et changements utilisateur.
- Extraire le décor sans changement du rendu de connexion ; conserver le cadrage desktop et l’adaptation mobile.
- Enregistrer la route d’inscription ; relier S’inscrire et Se connecter avec Angular Router.
- Vérifier le test existant de connexion et comparer le rendu à `docs/previews/login-desktop.png`.

### 2. Informations du compte

- Formulaire parent composé du groupe `account` et du contrôle `selectedRole`.
- Contrôles `account.firstName`, `lastName`, `email`, `password`, `confirmPassword`, `acceptTerms`, non nullables. Prénom/nom obligatoires (refuser les chaînes entièrement blanches sans restreindre les noms réels), email obligatoire/valide, mots de passe obligatoires et égaux, conditions obligatoirement acceptées.
- Pas de nouvelle règle de complexité de mot de passe : aucune n’existe actuellement.
- Afficher Prénom/Nom côte à côte sur desktop, puis email, mot de passe et confirmation pleine largeur ; visibilité indépendante des deux mots de passe.
- Afficher les erreurs seulement après interaction/soumission, avec labels accessibles et association aux messages.
- `continue()` marque uniquement le groupe account touché ; reste à l’étape 1 si invalide, sinon passe à 2 et place le focus sur son titre. Aucune création à ce stade.
- Conditions et confidentialité : présentation de lien comme sur la capture ; faute d’URL disponible, actions accessibles indiquant leur indisponibilité. Ne pas inventer de document, de route vide ou de consentement juridiquement effectif. À remplacer par de vrais liens lorsque les documents sont fournis.
- Vérifier : champs vides, email invalide, noms blancs, mots de passe différents, conditions non cochées empêchent la progression ; formulaire valide permet le passage.

### 3. Rôle et retour

- `selectedRole` est un contrôle `RegistrationRole | null`, avec union locale `'VOLUNTEER' | 'VETERINARIAN' | 'SHELTER'`. Il décrit uniquement le choix UI, pas un contrat serveur ni un privilège accordé.
- Aucun rôle présélectionné, conformément aux captures. Trois radios natifs dans un même groupe, carte entière cliquable, sélection unique et focus visibles.
- Reproduire les libellés exacts : Bénévole / Je donne de mon temps ; Vétérinaire / Je soigne et j’accompagne ; Refuge / Je gère un refuge ou une association.
- Réutiliser les icônes disponibles ; SVG locaux simples pour le stéthoscope et la maison avec patte si Ionicons ne possède pas d’équivalent fidèle. Aucun asset photographique supplémentaire.
- Indicateur : étape 1 cochée, étape 2 active ; message d’information exact ; actions Retour et Créer un compte en proportions 40/60.
- `back()` retourne à l’étape 1 sans effacer les données ni le rôle ; focus sur le titre de l’étape.
- `submit()` revérifie le groupe account et le rôle ; revient à l’étape 1 si nécessaire. Si tout est valide, afficher un message honnête indiquant que la création n’est pas encore disponible. Identifier ce point d’intégration par un commentaire court ; aucun stockage de mots de passe, requête, faux compte, faux succès ou délai simulé.
- En l’absence d’API, ne pas inventer de chargement : un signal loading, un verrou de double soumission et la gestion d’erreurs réseau seront ajoutés au branchement de la vraie requête, dont la durée et le résultat justifient ces états.
- Vérifier : rôle requis, exclusivité, changement de rôle, retour conservant les saisies, soumission finale sans faux succès.

### 4. Responsive et vérification

- Desktop ≥1024 px : deux zones, panneau droit contraint à environ 650 px, champs de 60–64 px, cartes de 90–100 px, titre et espacement calés sur les captures à 1672 × 941.
- Tablette 768–1023 px : deux zones si la lisibilité est préservée, compacter le décor et empiler les champs nom/prénom si nécessaire.
- Mobile <768 px : décor masqué, marque compacte et langue visibles, marges de 24 px, noms empilés, stepper lisible, cartes pleine largeur ; empiler les actions sur les très petits écrans si nécessaire.
- Comparer les deux étapes à 1672 × 941, 820 × 1180, 390 × 844 et largeur 320 px ; vérifier absence de débordement, navigation clavier/radios, focus après transition et conservation des données.
- Exécuter les tests d’inscription ciblés, puis `npm test -- --watch=false`, `npm run build`, `npm run lint`. Utiliser l’exécution hors sandbox déjà nécessaire au compilateur Windows si les mêmes restrictions se reproduisent.
- Revoir le diff pour exactitude, sécurité, maintien des données, absence de duplication inutile et absence de régression de connexion.

## Risques et retour arrière

- Le changement du décor commun ne doit pas modifier les proportions approuvées de connexion ; capture avant/après requise.
- Ni la sélection d’un rôle ni une validation frontend ne confèrent d’autorisation backend. La future API devra valider le rôle et les conditions côté serveur.
- Création réelle, traitement réseau, chargement et documents légaux restent hors vérification tant que les services/documents n’existent pas.
- Réversibilité : retirer la route et le composant d’inscription, remettre le décor de connexion depuis le commit de départ ; ne pas réinitialiser le travail utilisateur.

## Progress

- [x] Recherche, lecture des captures et du texte joint.
- [x] Plan confronté aux contraintes et à l’existant.
- [x] Validation humaine de ce nouveau parcours.
- [x] Décor commun et navigation implémentés sur `feat/registration`.
- [x] Formulaire et validation étape 1 implémentés.
- [x] Étape 2, radios et retour conservant les données implémentés.
- [x] Tests, revue et captures responsive.

## Surprises & Discoveries

- Première tentative de tests bloquée par la limite d’usage du contrôle d’autorisation ; reprise après demande utilisateur. Build et lint ensuite exécutés avec succès.
- Ionic garde des pages montées : identifiant de clip SVG unique par instance du décor pour éviter les collisions lors des navigations.
- Décor principal migré en Grid, marque et mission dans le flux ; seuls fond, courbe, annotation et watermark restent superposés.
- Validation navigateur et tests de transitions en cours. Aucun backend ni chargement simulé ajouté.

- L’étape 1 correspond à la deuxième pièce jointe ; l’étape 2 à la première.
- Le travail de connexion a été commité par l’utilisateur depuis la session précédente.
- Pas de backend ni de documents légaux à raccorder.

## Decision Log

- 2026-09-30 : une seule page avec Signal local ; pas de routes par étape.
- 2026-09-30 : extraction limitée au décor commun, maintenant réellement réutilisé ; pas de composant par champ ou carte.
- 2026-09-30 : conservation des assets générés et des tokens ; pas de nouvelle dépendance.

## Outcomes & Retrospective

Implémentation terminée sur feat/registration : décor partagé, formulaire typé en deux étapes, validation, visibilité indépendante des mots de passe, radios natives et conservation des saisies. Assets existants réutilisés ; aucune dépendance ajoutée.

Vérification finale :
- npm test -- --watch=false : 4 fichiers, 7 tests réussis.
- npm run build : succès, bundle initial 493,23 kB. Avertissement Browserslist préexistant sur les anciens navigateurs non pris en charge.
- npm run lint : succès.
- git diff --check : succès (normalisation CRLF uniquement).
- graphify update . : succès, 232 nœuds / 241 liens ; avertissements de configurations sans nœuds et de labels de communautés à actualiser.
- Contrôle des deux étapes : 1672 × 941 (géométrie), 1536 × 941 (captures), 820 × 1180, 390 × 844 et 320 × 844. Pas de débordement horizontal ; défilement vertical normal sur téléphone. Captures dans docs/previews/register-step-* et login-after-registration.png.
- Parcours navigateur : validation bloquante, passage et retour, choix au clavier, conservation du rôle, focus, message final sans faux succès et liens connexion/inscription. Revue du code conforme au périmètre approuvé.

Limites : aucun compte créé sans API ; documents juridiques indisponibles ; chargement et erreurs réseau à ajouter avec la requête réelle. Aucun commit ni push effectué. Serveur local disponible sur http://127.0.0.1:4201/auth/register.
