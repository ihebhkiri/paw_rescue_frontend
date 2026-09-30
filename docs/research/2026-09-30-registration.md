# Inscription — état actuel vérifié

## Sources

`../AGENTS.md`, `../DESIGN.md`, `package.json`, `src/app/app.routes.ts`, `src/main.ts`, `src/app/auth/auth.component.{ts,html,scss,spec.ts}`, `src/app/auth/service/auth.ts`, `src/theme/variables.scss`, inventaire `src/assets/`. Graphify interrogé sur les routes et formulaires puis conclusions vérifiées dans les sources. Guides frontend, modèles research/plan et `.agent/PLANS.md` absents du dépôt.

## Système actuel

- Angular 22.1.7, Ionic 9.0.5 installé, Ionicons 8.1.x ; composants standalone, Reactive Forms, Signals et Vitest disponibles.
- `/auth` charge `AuthComponent` ; `/` redirige vers `/auth`. Aucune route d’inscription ou page juridique.
- `AuthComponent` contient le décor complet, le formulaire de connexion et un feedback d’indisponibilité. Le bouton S’inscrire ne navigue pas encore.
- `Auth` est un service vide ; aucune méthode de création de compte, aucun HttpClient configuré, aucun endpoint ni enum de rôle métier.
- Les seules contraintes actuelles sont email obligatoire/valide et mot de passe obligatoire. Aucun minimum de longueur ou règle supplémentaire définie.
- Décor, formulaire et responsive sont regroupés dans le SCSS du composant. La composition du décor utilise actuellement des positions absolues. Les nouveaux écrans demandent une structure principale Grid/Flex.
- Tokens existants : `--auth-ink`, `--auth-brand`, `--auth-green`, `--auth-accent`, `--auth-muted`, `--auth-border`, `--auth-surface`, `--auth-wave`, `--auth-error`.
- Assets présents : `src/assets/images/auth/login-animals.png` et `src/assets/images/logo/pawrescue-logo.png`. Les icônes simples sont fournies par Ionicons ou SVG inline. Pas de police externe.
- État Git inspecté : branche `feat/login-reference`, commit `5ff64be` contenant la connexion ; seule trace Graphify non suivie au début de cette recherche.

## Références visuelles

- `Image ChatGPT 30 sept. 2026, 17_10_01.png` : informations du compte (étape 1).
- `Image ChatGPT 30 sept. 2026, 17_10_44.png` : choix du rôle (étape 2).
- La numérotation des pièces jointes est inversée par rapport à l’ordre du parcours : se baser sur le contenu des écrans.
- Texte joint : un seul parcours à deux étapes, données conservées au retour, validation avant progression et avant création, trois rôles exclusifs, pas de backend inventé.

## Risques et éléments non disponibles

- Aucun texte ni URL approuvé pour les conditions d’utilisation ou la politique de confidentialité.
- Aucun backend : création réelle, chargement réseau, erreurs serveur et anti-double-requête ne peuvent pas être vérifiés à ce stade.
- Une extraction du décor commun devra préserver le rendu de connexion déjà validé.
- Les images sont des recréations approuvées, pas les photographies exactes des captures.

## Vérification de départ

`npm run build` et `npm test -- --watch=false` exécutés avec succès sur l’état courant ; 4 tests dans 3 fichiers. Lint réussi à la clôture de la connexion. Avertissement Browserslist connu, non bloquant.
