# Graph Report - pawrescue-ionic  (2026-09-30)

## Corpus Check
- 29 files · ~124,131 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 232 nodes · 241 edges · 19 communities (12 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5ff64bec`
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

## God Nodes (most connected - your core abstractions)
1. `RegisterComponent` - 12 edges
2. `options` - 10 edges
3. `Reproduction de la connexion PawRescue — plan` - 10 edges
4. `Inscription PawRescue en deux étapes — plan d’implémentation` - 9 edges
5. `app` - 7 edges
6. `development` - 7 edges
7. `scripts` - 7 edges
8. `architect` - 6 edges
9. `production` - 6 edges
10. `Inscription — état actuel vérifié` - 6 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (19 total, 7 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.06
Nodes (31): @angular/common, @angular/compiler, @angular/core, @angular/forms, @angular/platform-browser, @angular/router, @capacitor/app, @capacitor/core (+23 more)

### Community 1 - "development"
Cohesion: 0.07
Nodes (34): architect, build, extract-i18n, lint, serve, test, builder, configurations (+26 more)

### Community 2 - "app"
Cohesion: 0.08
Nodes (24): setParserOptionsProject, setParserOptionsProject, prefix, projectType, root, schematics, sourceRoot, schematicCollections (+16 more)

### Community 3 - "devDependencies"
Cohesion: 0.08
Nodes (25): @angular/build, @angular/compiler-cli, angular-eslint, @angular/language-service, @capacitor/cli, eslint, @ionic/angular-toolkit, jsdom (+17 more)

### Community 4 - "options"
Cohesion: 0.11
Nodes (19): options, options, assets, browser, buildTarget, index, inlineStyleLanguage, outputPath (+11 more)

### Community 5 - "package.json"
Cohesion: 0.14
Nodes (13): author, description, homepage, name, private, scripts, build, lint (+5 more)

### Community 6 - "register.component.ts"
Cohesion: 0.13
Nodes (9): AppComponent, Component, routes, AuthComponent, Component, AuthLayoutComponent, Component, AccountFieldName (+1 more)

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

## Knowledge Gaps
- **119 isolated node(s):** `$schema`, `version`, `newProjectRoot`, `projectType`, `styleext` (+114 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `architect` connect `development` to `app`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `app` connect `app` to `development`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `$schema`, `version`, `newProjectRoot` to the rest of the system?**
  _119 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Should `development` be split into smaller, more focused modules?**
  _Cohesion score 0.0659536541889483 - nodes in this community are weakly interconnected._
- **Should `app` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._