# Graph Report - pawrescue-ionic  (2026-10-12)

## Corpus Check
- 0 files · ~0 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 350 nodes · 385 edges · 37 communities (28 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `df355734`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- dependencies
- development
- app
- devDependencies
- options
- package.json
- auth.ts
- Reproduction de la connexion PawRescue — plan
- Inscription PawRescue en deux étapes — plan d’implémentation
- Assets générés
- ExampleInstrumentedTest
- eslint.config.js
- capacitor.config.ts
- research/2026-09-30-login-reference.md
- check-animals-mobile.cjs
- environment.prod.ts
- RegisterComponent
- Inscription — état actuel vérifié
- Parcours professionnel — plan d’implémentation
- lint
- app.routes.ts
- check-registration.cjs
- research/2026-10-01-professional-verification.md
- check-auth-mobile.cjs
- gradlew
- MainActivity.java
- register.component.ts
- check-profile-mobile.cjs
- check-notifications-mobile.cjs
- ExampleUnitTest

## God Nodes (most connected - your core abstractions)
1. `RegisterComponent` - 15 edges
2. `Parcours professionnel — plan d’implémentation` - 10 edges
3. `options` - 10 edges
4. `Reproduction de la connexion PawRescue — plan` - 10 edges
5. `VerificationComponent` - 9 edges
6. `AuthService` - 9 edges
7. `Inscription PawRescue en deux étapes — plan d’implémentation` - 9 edges
8. `development` - 7 edges
9. `app` - 7 edges
10. `scripts` - 7 edges

## Surprising Connections (you probably didn't know these)
- `VerificationComponent` --references--> `VerificationField`  [EXTRACTED]
  src/app/auth/register/verification.component.ts → src/app/auth/models/register.model.ts

## Import Cycles
- None detected.

## Communities (37 total, 9 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.06
Nodes (35): @angular/common, @angular/compiler, @angular/core, @angular/forms, @angular/platform-browser, @angular/router, @capacitor/android, @capacitor/app (+27 more)

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

### Community 6 - "auth.ts"
Cohesion: 0.13
Nodes (8): AuthComponent, AuthLayoutComponent, SignupRequest, LoginResponse, SignupResponse, AuthService, ProfileComponent, environment

### Community 7 - "Reproduction de la connexion PawRescue — plan"
Cohesion: 0.18
Nodes (10): Decision Log, Fichiers concernés, Jalons et critères observables, Objectif et architecture, Outcomes & Retrospective, Progress, Reproduction de la connexion PawRescue — plan, Risques, hypothèses et retour arrière (+2 more)

### Community 8 - "Inscription PawRescue en deux étapes — plan d’implémentation"
Cohesion: 0.14
Nodes (13): 1. Décor commun et navigation, 2. Informations du compte, 3. Rôle et retour, 4. Responsive et vérification, Decision Log, Fichiers et responsabilités, Inscription PawRescue en deux étapes — plan d’implémentation, Jalons (+5 more)

### Community 9 - "Assets générés"
Cohesion: 0.50
Nodes (3): Assets générés, Logo — src/assets/images/logo/pawrescue-logo.png, Photo — src/assets/images/auth/login-animals.png

### Community 14 - "check-animals-mobile.cjs"
Cohesion: 0.33
Nodes (3): assert, { chromium }, fs

### Community 18 - "Inscription — état actuel vérifié"
Cohesion: 0.29
Nodes (6): Inscription — état actuel vérifié, Risques et éléments non disponibles, Références visuelles, Sources, Système actuel, Vérification de départ

### Community 19 - "Parcours professionnel — plan d’implémentation"
Cohesion: 0.18
Nodes (10): Conception et comportement actuel, Critères d’acceptation, Decision Log, Fichiers et jalons, Objectif, Outcomes & Retrospective, Parcours professionnel — plan d’implémentation, Progress (+2 more)

### Community 20 - "lint"
Cohesion: 0.33
Nodes (6): lint, builder, options, lintFilePatterns, src/**/*.html, src/**/*.ts

### Community 21 - "app.routes.ts"
Cohesion: 0.09
Nodes (13): AppComponent, routes, Animal, Animals, AnimalType, AnimalDetailComponent, HomeComponent, NotificationCategory (+5 more)

### Community 22 - "check-registration.cjs"
Cohesion: 0.33
Nodes (5): assert, { chromium }, fs, path, states

### Community 24 - "check-auth-mobile.cjs"
Cohesion: 0.33
Nodes (3): assert, { chromium }, fs

### Community 25 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 33 - "register.component.ts"
Cohesion: 0.15
Nodes (10): GOVERNORATES, RegisterStep, ROLES, VerificationField, BackendRole, toBackendRole(), UserRole, AccountFieldName (+2 more)

### Community 34 - "check-profile-mobile.cjs"
Cohesion: 0.33
Nodes (3): assert, { chromium }, fs

### Community 35 - "check-notifications-mobile.cjs"
Cohesion: 0.33
Nodes (3): assert, { chromium }, fs

## Knowledge Gaps
- **154 isolated node(s):** `Animal`, `AnimalDetailComponent`, `NotificationCategory`, `NotificationItem`, `ReportDetail` (+149 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `architect` connect `development` to `app`, `lint`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `Animal`, `AnimalDetailComponent`, `NotificationCategory` to the rest of the system?**
  _154 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `development` be split into smaller, more focused modules?**
  _Cohesion score 0.0677361853832442 - nodes in this community are weakly interconnected._
- **Should `app` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._