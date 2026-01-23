---
status: resolved
trigger: "npx start no longer works - npm error 'could not determine executable to run'"
created: 2026-01-23T00:00:00Z
updated: 2026-01-23T00:05:00Z
---

## Current Focus

hypothesis: CONFIRMED - user misremembered command
test: create helpful documentation and optional npm scripts setup
expecting: user will have clear instructions to run dev server
next_action: add dev server documentation to project

## Symptoms

expected: Start development server for PodEdit application
actual: Error "could not determine executable to run" - npm log shows npx is fetching "start@5.1.0" package from npm registry instead of running a local script
errors:
```
npm error could not determine executable to run
verbose stack Error: could not determine executable to run
verbose stack     at getBinFromManifest (/home/sprite/.nvm/versions/node/v24.12.0/lib/node_modules/npm/node_modules/libnpmexec/lib/get-bin-from-manifest.js:17:23)
http fetch GET 200 https://registry.npmjs.org/start 133ms (cache revalidated)
verbose pkgid start@5.1.0
```
reproduction: Run `npx start` from /home/sprite/podedit project root
started: Worked in Phase 2, stopped working since then

## Eliminated

## Evidence

- timestamp: 2026-01-23T00:01:00Z
  checked: git history and current project structure
  found: No package.json exists in project, never has existed per git log
  implication: This is a static HTML project, not a Node.js/npm project

- timestamp: 2026-01-23T00:02:00Z
  checked: Phase 2 documentation files for dev server instructions
  found: Multiple references to `npx serve .` in 02-01-PLAN.md and 02-02-PLAN.md
  implication: The correct command was `npx serve .`, not `npx start`

- timestamp: 2026-01-23T00:03:00Z
  checked: tested `npx serve@latest --version`
  found: npx successfully fetches and runs serve package (v14.2.5)
  implication: `npx serve .` is the working command for this project

## Resolution

root_cause: User misremembered the command. This project never used `npx start`. The correct command documented in Phase 2 is `npx serve .`. The command `npx start` tries to run a nonexistent npm package called "start" from the registry, which has no executable binary, causing the error "could not determine executable to run".

fix: Created package.json with "start" script that runs "serve .", and added README.md documenting both `npm start` and `npx serve .` commands. Now both commands work.

verification: Tested `npm start` successfully starts serve on localhost:3000 and serves index.html. Original command `npx serve .` also still works.

files_changed:
- /home/sprite/podedit/package.json (created)
- /home/sprite/podedit/README.md (created)

root_cause:
fix:
verification:
files_changed: []
