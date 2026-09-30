# Graph Report - pawrescue-ionic  (2026-09-30)

## Corpus Check
- 24 files · ~96,769 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 193 nodes · 194 edges · 17 communities (11 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ddd3b819`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- dependencies
- development
- app
- devDependencies
- options
- package.json
- AppComponent
- Reproduction de la connexion PawRescue — plan
- lint
- Assets générés
- Auth
- eslint.config.js
- capacitor.config.ts
- research/2026-09-30-login-reference.md
- environment.ts
- environment.prod.ts

## God Nodes (most connected - your core abstractions)
1. `options` - 10 edges
2. `Reproduction de la connexion PawRescue — plan` - 10 edges
3. `app` - 7 edges
4. `development` - 7 edges
5. `scripts` - 7 edges
6. `architect` - 6 edges
7. `production` - 6 edges
8. `build` - 5 edges
9. `ci` - 5 edges
10. `schematics` - 5 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (17 total, 6 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.06
Nodes (31): @angular/common, @angular/compiler, @angular/core, @angular/forms, @angular/platform-browser, @angular/router, @capacitor/app, @capacitor/core (+23 more)

### Community 1 - "development"
Cohesion: 0.08
Nodes (28): architect, build, extract-i18n, serve, test, builder, configurations, defaultConfiguration (+20 more)

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

### Community 6 - "AppComponent"
Cohesion: 0.20
Nodes (5): AppComponent, Component, routes, AuthComponent, Component

### Community 7 - "Reproduction de la connexion PawRescue — plan"
Cohesion: 0.18
Nodes (10): Decision Log, Fichiers concernés, Jalons et critères observables, Objectif et architecture, Outcomes & Retrospective, Progress, Reproduction de la connexion PawRescue — plan, Risques, hypothèses et retour arrière (+2 more)

### Community 8 - "lint"
Cohesion: 0.33
Nodes (6): lint, builder, options, lintFilePatterns, src/**/*.html, src/**/*.ts

### Community 9 - "Assets générés"
Cohesion: 0.50
Nodes (3): Assets générés, Logo — src/assets/images/logo/pawrescue-logo.png, Photo — src/assets/images/auth/login-animals.png

## Knowledge Gaps
- **101 isolated node(s):** `$schema`, `version`, `newProjectRoot`, `projectType`, `styleext` (+96 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `architect` connect `development` to `lint`, `app`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `app` connect `app` to `development`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **What connects `$schema`, `version`, `newProjectRoot` to the rest of the system?**
  _101 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Should `development` be split into smaller, more focused modules?**
  _Cohesion score 0.082010582010582 - nodes in this community are weakly interconnected._
- **Should `app` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._