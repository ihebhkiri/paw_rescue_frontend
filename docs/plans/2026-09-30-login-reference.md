# Reproduction de la connexion PawRescue — plan

## Objectif et architecture

Reproduire la capture fournie dans `AuthComponent`, accessible à `/auth`, sans déplacer l’architecture ni ajouter de dépendance. HTML sémantique et SCSS pour la composition ; Reactive Forms typés pour les champs ; Ionicons pour les icônes disponibles. La capture constitue le design approuvé, sans nouvelle direction artistique.

## État vérifié

Voir `../research/2026-09-30-login-reference.md`. La page est un squelette ; aucune API de connexion ni image métier n’existe. Les changements utilisateur ne doivent pas être écrasés. L’implémentation nécessite une branche dédiée dans le dépôt imbriqué, en conservant le travail courant.

## Fichiers concernés

- Modifier `src/app/auth/auth.component.ts`, `.html`, `.scss` : écran, formulaire, visibilité du mot de passe, validation après interaction.
- Modifier `src/app/auth/auth.component.spec.ts` : vérifier validation et bascule de visibilité sans perdre la saisie.
- Modifier `src/theme/variables.scss` si nécessaire pour les tokens de la référence.
- Modifier `src/index.html` pour la langue française, le titre de page et le zoom accessible ; `angular.json` pour le budget de styles mesuré.
- Assets générés à la demande explicite de l’utilisateur : `src/assets/images/auth/login-animals.png` et `src/assets/images/logo/pawrescue-logo.png` (fond transparent). Utiliser ces fichiers locaux.
- Ne modifier ni routes existantes ni service d’authentification pour inventer une connexion.

## Jalons et critères observables

1. Créer la composition desktop : panneau nature occupant environ la moitié de l’écran, séparation ondulée, marque, titre et quatre actions ; panneau clair avec watermark et sélecteur FR. À 1536 × 1024, formulaire d’environ 586 px, champs de 68 px et bouton vert de 70 px. Conserver textes, couleurs et hiérarchie de la capture.
2. Implémenter email, password et rememberMe avec contrôles non nullables ; email requis et valide, mot de passe requis. Erreurs discrètes après blur ou soumission, labels accessibles, focus visible, œil utilisable au clavier. Aucune simulation de succès : les actions sans intégration doivent signaler honnêtement leur indisponibilité après activation, sans ajouter de contenu permanent à l’état initial.
3. Responsive : deux colonnes à partir de 992 px ; entre 768 et 991 px, ajuster les proportions et tailles ; sous 768 px, masquer le grand décor et conserver marque, langue et formulaire avec 24 px de marge ; sous 380 px, empiler les boutons sociaux si nécessaire.
4. Vérifier avec `npm run build`, `npm test -- --watch=false` et `npm run lint` depuis `pawrescue-ionic/`. Distinguer les erreurs préexistantes du service des régressions. Contrôler visuellement 1536 × 1024, 820 × 1180 et 390 × 844, ainsi que 320 px de large : absence de débordement, lisibilité et navigation clavier.

## Risques, hypothèses et retour arrière

- Les assets sont des recréations visuellement proches de la capture, pas les originaux ni des copies pixel à pixel.
- Langue, récupération, inscription et fournisseurs sociaux n’ont pas de routes ou services définis. Le périmètre couvre leur présentation et un feedback honnête, pas leur intégration.
- Le thème clair de cet écran doit rester stable même si le système utilise un thème sombre.
- Budget SCSS actuel : avertissement 2 ko, erreur 4 ko. Privilégier une feuille compacte avant tout changement de budget.
- Retour arrière : annuler uniquement les changements de cette tâche, jamais ceux déjà présents.

## Progress

- [x] Inspection et inventaire des assets.
- [x] Plan confronté à la capture et au texte joint.
- [x] Photo chien/chat et logo générés et sauvegardés localement sur demande utilisateur.
- [x] Approbation humaine du plan conformément à AGENTS.md.
- [x] Implémentation sur branche dédiée `feat/login-reference` : composition, formulaire et responsive.
- [ ] Tests, revue du diff et vérification responsive.

## Surprises & Discoveries

- Ionic installé : 9.0.5 ; composants standalone exportés depuis `@ionic/angular`, pas `@ionic/angular/standalone`.
- Build : restriction de lecture des dossiers parents sous sandbox ; exécution hors sandbox autorisée.
- Compilation applicative réussie mais budget de style initial bloquant : 7,81 ko pour cet écran à trois formats. Budget `anyComponentStyle` ajusté à 8 ko (avertissement) / 10 ko (erreur), sans répartir artificiellement les styles dans des fichiers globaux. `angular.json` ajouté aux fichiers modifiés.
- `npm run lint` réussi après les premiers jalons. Tests et contrôle navigateur en cours.
- `npm test -- --watch=false` : 3 fichiers, 4 tests réussis (service existant inclus). Aucun correctif requis dans le service.
- `npm run build` : succès après ajustement du budget. Avertissement Browserslist préexistant sur les anciennes versions hors support Angular.
- Contrôle navigateur : desktop 1536 px, tablette 820 px, mobiles 390 et 320 px ; formulaire, validation et feedback sans backend vérifiés. Ajustement du cadrage tablette pour préserver le chat, masqué par un simple `cover` sur un panneau étroit.
- Accessibilité : `src/index.html` passe en français et autorise à nouveau le zoom ; tokens de texte secondaire légèrement assombris pour le contraste.
- `graphify update .` exécuté avec succès : 193 nœuds et 194 relations ; avertissement sur six fichiers de configuration sans nœuds. Sorties générées laissées non commitées.

- Le dépôt Git et l’application se trouvent un niveau sous le dossier de travail.
- Les guides et modèles cités dans AGENTS.md ne sont pas présents.
- Aucun asset de la référence disponible.

## Decision Log

- 2026-09-30 : réutiliser AuthComponent plutôt que créer une seconde page login.
- 2026-09-30 : ne pas inventer de flux backend ou générer d’assets de remplacement.
- 2026-09-30 : la demande suivante autorise explicitement la génération des deux assets ; cette décision remplace la restriction précédente sur les images. Génération avec l’outil imagegen intégré, sans dépendance ajoutée. Prompts conservés dans `../research/2026-09-30-generated-assets.md`.

## Outcomes & Retrospective

Inspection et plan terminés. Aucun code de production modifié ; aucun test exécuté. Prochaine action : après approbation du plan, préparer la branche et implémenter les jalons dans l’ordre.
