# Graph Report - pawrescue-ionic  (2026-10-04)

## Corpus Check
- 59 files · ~478,395 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 366 nodes · 407 edges · 36 communities (30 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5b03e8bf`
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
- ExampleInstrumentedTest.java
- eslint.config.js
- capacitor.config.ts
- research/2026-09-30-login-reference.md
- check-animals-mobile.cjs
- environment.prod.ts
- RegisterComponent
- Inscription — état actuel vérifié
- Parcours professionnel — plan d’implémentation
- Animals
- app.routes.ts
- check-registration.cjs
- research/2026-10-01-professional-verification.md
- check-auth-mobile.cjs
- gradlew
- MainActivity.java
- VerificationComponent
- check-profile-mobile.cjs
- check-notifications-mobile.cjs

## God Nodes (most connected - your core abstractions)
1. `RegisterComponent` - 16 edges
2. `options` - 10 edges
3. `VerificationComponent` - 10 edges
4. `AuthService` - 10 edges
5. `Reproduction de la connexion PawRescue — plan` - 10 edges
6. `Parcours professionnel — plan d’implémentation` - 10 edges
7. `Inscription PawRescue en deux étapes — plan d’implémentation` - 9 edges
8. `app` - 7 edges
9. `development` - 7 edges
10. `scripts` - 7 edges

## Surprising Connections (you probably didn't know these)
- `VerificationComponent` --references--> `VerificationField`  [EXTRACTED]
  src/app/auth/register/verification.component.ts → src/app/auth/models/register.model.ts

## Import Cycles
- None detected.

## Communities (36 total, 6 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.06
Nodes (35): @angular/common, @angular/compiler, @angular/core, @angular/forms, @angular/platform-browser, @angular/router, @capacitor/android, @capacitor/app (+27 more)

### Community 1 - "development"
Cohesion: 0.09
Nodes (25): build, serve, test, builder, configurations, defaultConfiguration, progress, watch (+17 more)

### Community 2 - "app"
Cohesion: 0.06
Nodes (33): setParserOptionsProject, setParserOptionsProject, architect, prefix, projectType, root, schematics, sourceRoot (+25 more)

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
Cohesion: 0.11
Nodes (14): AuthComponent, Component, AuthLayoutComponent, Component, SignupRequest, LoginResponse, SignupResponse, ROLES (+6 more)

### Community 7 - "Reproduction de la connexion PawRescue — plan"
Cohesion: 0.18
Nodes (10): Decision Log, Fichiers concernés, Jalons et critères observables, Objectif et architecture, Outcomes & Retrospective, Progress, Reproduction de la connexion PawRescue — plan, Risques, hypothèses et retour arrière (+2 more)

### Community 8 - "Inscription PawRescue en deux étapes — plan d’implémentation"
Cohesion: 0.14
Nodes (13): 1. Décor commun et navigation, 2. Informations du compte, 3. Rôle et retour, 4. Responsive et vérification, Decision Log, Fichiers et responsabilités, Inscription PawRescue en deux étapes — plan d’implémentation, Jalons (+5 more)

### Community 9 - "Assets générés"
Cohesion: 0.50
Nodes (3): Assets générés, Logo — src/assets/images/logo/pawrescue-logo.png, Photo — src/assets/images/auth/login-animals.png

### Community 10 - "ExampleInstrumentedTest.java"
Cohesion: 0.33
Nodes (5): ExampleInstrumentedTest, ExampleUnitTest, androidx.test.ext.junit.runners.AndroidJUnit4, org.junit.runner.RunWith, org.junit.Test

### Community 14 - "check-animals-mobile.cjs"
Cohesion: 0.33
Nodes (3): assert, { chromium }, fs

### Community 17 - "RegisterComponent"
Cohesion: 0.17
Nodes (4): RegisterStep, toBackendRole(), RegisterComponent, Component

### Community 18 - "Inscription — état actuel vérifié"
Cohesion: 0.29
Nodes (6): Inscription — état actuel vérifié, Risques et éléments non disponibles, Références visuelles, Sources, Système actuel, Vérification de départ

### Community 19 - "Parcours professionnel — plan d’implémentation"
Cohesion: 0.18
Nodes (10): Conception et comportement actuel, Critères d’acceptation, Decision Log, Fichiers et jalons, Objectif, Outcomes & Retrospective, Parcours professionnel — plan d’implémentation, Progress (+2 more)

### Community 20 - "Animals"
Cohesion: 0.17
Nodes (8): Animal, Animals, AnimalType, Injectable, AnimalDetailComponent, Component, HomeComponent, Component

### Community 21 - "app.routes.ts"
Cohesion: 0.09
Nodes (13): AppComponent, Component, routes, NotificationCategory, NotificationItem, NotificationsComponent, Component, ProfileComponent (+5 more)

### Community 22 - "check-registration.cjs"
Cohesion: 0.33
Nodes (5): assert, { chromium }, fs, path, states

### Community 24 - "check-auth-mobile.cjs"
Cohesion: 0.33
Nodes (3): assert, { chromium }, fs

### Community 25 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 33 - "VerificationComponent"
Cohesion: 0.20
Nodes (5): GOVERNORATES, VerificationField, FIELD_NAME_MAPPING, Component, VerificationComponent

### Community 34 - "check-profile-mobile.cjs"
Cohesion: 0.33
Nodes (3): assert, { chromium }, fs

### Community 35 - "check-notifications-mobile.cjs"
Cohesion: 0.33
Nodes (3): assert, { chromium }, fs

## Knowledge Gaps
- **152 isolated node(s):** `$schema`, `version`, `newProjectRoot`, `projectType`, `styleext` (+147 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `architect` connect `app` to `development`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `$schema`, `version`, `newProjectRoot` to the rest of the system?**
  _152 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `development` be split into smaller, more focused modules?**
  _Cohesion score 0.08666666666666667 - nodes in this community are weakly interconnected._
- **Should `app` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._