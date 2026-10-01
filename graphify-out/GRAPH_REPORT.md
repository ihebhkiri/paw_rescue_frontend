# Graph Report - pawrescue-ionic  (2026-10-01)

## Corpus Check
- 34 files · ~396,294 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 265 nodes · 274 edges · 24 communities (16 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3962c4b0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- dependencies
- development
- app
- devDependencies
- options
- package.json
- register.component.ts
- Reproduction de la connexion PawRescue — plan
- Inscription PawRescue en deux étapes — plan d’implémentation
- Assets générés
- Auth
- eslint.config.js
- capacitor.config.ts
- research/2026-09-30-login-reference.md
- environment.ts
- environment.prod.ts
- RegisterComponent
- Inscription — état actuel vérifié
- Parcours professionnel — plan d’implémentation
- AppComponent
- lint
- check-registration.cjs
- research/2026-10-01-professional-verification.md

## God Nodes (most connected - your core abstractions)
1. `RegisterComponent` - 15 edges
2. `options` - 10 edges
3. `Reproduction de la connexion PawRescue — plan` - 10 edges
4. `Parcours professionnel — plan d’implémentation` - 10 edges
5. `VerificationComponent` - 9 edges
6. `Inscription PawRescue en deux étapes — plan d’implémentation` - 9 edges
7. `app` - 7 edges
8. `development` - 7 edges
9. `scripts` - 7 edges
10. `architect` - 6 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (24 total, 8 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.06
Nodes (31): @angular/common, @angular/compiler, @angular/core, @angular/forms, @angular/platform-browser, @angular/router, @capacitor/app, @capacitor/core (+23 more)

### Community 1 - "development"
Cohesion: 0.07
Nodes (34): architect, build, extract-i18n, serve, test, builder, configurations, defaultConfiguration (+26 more)

### Community 2 - "app"
Cohesion: 0.08
Nodes (24): setParserOptionsProject, setParserOptionsProject, prefix, projectType, root, schematics, sourceRoot, schematicCollections (+16 more)

### Community 3 - "devDependencies"
Cohesion: 0.08
Nodes (25): @angular/build, @angular/compiler-cli, angular-eslint, @angular/language-service, @capacitor/cli, eslint, @ionic/angular-toolkit, jsdom (+17 more)

### Community 4 - "options"
Cohesion: 0.15
Nodes (13): options, assets, browser, index, inlineStyleLanguage, outputPath, polyfills, scripts (+5 more)

### Community 5 - "package.json"
Cohesion: 0.14
Nodes (13): author, description, homepage, name, private, scripts, build, lint (+5 more)

### Community 6 - "register.component.ts"
Cohesion: 0.11
Nodes (9): AuthComponent, Component, AuthLayoutComponent, Component, AccountFieldName, RegistrationRole, Component, VerificationComponent (+1 more)

### Community 7 - "Reproduction de la connexion PawRescue — plan"
Cohesion: 0.18
Nodes (10): Decision Log, Fichiers concernés, Jalons et critères observables, Objectif et architecture, Outcomes & Retrospective, Progress, Reproduction de la connexion PawRescue — plan, Risques, hypothèses et retour arrière (+2 more)

### Community 8 - "Inscription PawRescue en deux étapes — plan d’implémentation"
Cohesion: 0.14
Nodes (13): 1. Décor commun et navigation, 2. Informations du compte, 3. Rôle et retour, 4. Responsive et vérification, Decision Log, Fichiers et responsabilités, Inscription PawRescue en deux étapes — plan d’implémentation, Jalons (+5 more)

### Community 9 - "Assets générés"
Cohesion: 0.50
Nodes (3): Assets générés, Logo — src/assets/images/logo/pawrescue-logo.png, Photo — src/assets/images/auth/login-animals.png

### Community 18 - "Inscription — état actuel vérifié"
Cohesion: 0.29
Nodes (6): Inscription — état actuel vérifié, Risques et éléments non disponibles, Références visuelles, Sources, Système actuel, Vérification de départ

### Community 19 - "Parcours professionnel — plan d’implémentation"
Cohesion: 0.18
Nodes (10): Conception et comportement actuel, Critères d’acceptation, Decision Log, Fichiers et jalons, Objectif, Outcomes & Retrospective, Parcours professionnel — plan d’implémentation, Progress (+2 more)

### Community 20 - "AppComponent"
Cohesion: 0.36
Nodes (3): AppComponent, Component, routes

### Community 21 - "lint"
Cohesion: 0.33
Nodes (6): lint, builder, options, lintFilePatterns, src/**/*.html, src/**/*.ts

### Community 22 - "check-registration.cjs"
Cohesion: 0.33
Nodes (5): assert, { chromium }, fs, path, states

## Knowledge Gaps
- **135 isolated node(s):** `$schema`, `version`, `newProjectRoot`, `projectType`, `styleext` (+130 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `architect` connect `development` to `app`, `lint`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `app` connect `app` to `development`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **What connects `$schema`, `version`, `newProjectRoot` to the rest of the system?**
  _135 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Should `development` be split into smaller, more focused modules?**
  _Cohesion score 0.0677361853832442 - nodes in this community are weakly interconnected._
- **Should `app` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._