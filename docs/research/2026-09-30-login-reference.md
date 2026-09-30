# État actuel de l’écran de connexion

- Application dans `pawrescue-ionic/`, Angular 22.1.7, Ionic déclaré ^9.0.0, Ionicons ^8.1.0, Reactive Forms et Vitest déjà disponibles.
- `src/app/app.routes.ts` expose `/auth` et y redirige `/`.
- `src/app/auth/auth.component.ts` définit `AuthComponent`; son template ne contient que « auth works! », son SCSS est vide.
- `src/app/auth/service/auth.ts` est un squelette sans authentification. Son import `Service` depuis Angular est à vérifier avant toute utilisation ; aucune intégration à un backend n’est définie.
- `src/assets/` contient seulement `shapes.svg` et un favicon. Aucun logo PawRescue, photographie chien/chat ou police dédiée disponible.
- `src/theme/variables.scss` ne définit aucun token. `src/global.scss` importe la palette sombre système Ionic.
- Modifications utilisateur existantes : routes modifiées, ancienne page home supprimée, dossier auth non suivi. Les préserver.
- Instructions disponibles : `../AGENTS.md`, `../DESIGN.md`. Absents : guides frontend, modèles research/plan, `.agent/PLANS.md`, graphe Graphify.
- La capture 1536 × 1024 fixe la composition desktop. Le texte joint décrit les variantes responsive et le formulaire ; il sert de spécification accompagnant la référence.
- Risque principal : sans photographie source et logo, la fidélité du panneau gauche ne peut pas être complète. La capture composite ne constitue pas une image de fond réutilisable avec du texte HTML superposé.
- Inspection uniquement ; aucun build ou test exécuté à ce stade.
