# DungeonDelver Final Phase Test Matrix

This document tracks **system-by-system, function-level** test coverage for the final execution phase (Milestones m0–m5).

## Systems

- **Character Wizard**
- **Character Sheet**
- **Combat Tracker**
- **DM Tools (Hub, Modules, Prep, Logs)**
- **Player Hub**
- **Notes & Journal**
- **VTT**
- **Sync (localStorage, Tauri, Supabase)**

## Milestone 0 — Stability + Test-Document Foundation

### DM Tools — Campaign Modules

- **Files**
  - `utils/campaignEngine.ts`
  - `components/modules/ModulePanel.tsx`
  - `app/dm/modules/page.tsx`

- **Key Functions / Responsibilities**
  - `loadCampaignConfig()`: Load stored campaign configuration with safe defaults.
  - `saveCampaignConfig()`: Persist campaign configuration to storage.
  - `getModuleConfig()`: Merge module config with `MODULE_CONFIG_DEFAULTS`.
  - `updateModuleConfig()`: Update a single module configuration immutably.
  - `ModulePanel`: Render toggle-able module list and per-module config panels.

- **Regression Checks**
  - Opening `/dm/modules` never throws at runtime (including when `localStorage` contains malformed or partial `moduleConfig` entries).
  - Toggling any module ON/OFF updates `enabledModules` and persists cleanly.
  - Expanding each module’s **Configure** panel works without errors, even after importing an older or hand-edited JSON file.
  - Exported JSON can be re-imported without causing crashes in module config UIs.

- **Manual Test Script**
  1. Start the app and navigate to `/dm/modules`.
  2. Toggle every module ON, then click **Configure** for each.
  3. Edit at least one field in every config component and confirm no errors.
  4. Export JSON, hard-reload the app, then import the same JSON.
  5. Re-open every module config; verify fields load and can be edited without crashes.

## Placeholder Sections for Later Milestones

The sections below are placeholders and will be filled in as milestones are implemented.

### Milestone 1 — App Shell, Roles, Main UI

_(To be populated when M1 implementation is in place.)_

### Milestone 2 — Player Hub, Notes, Sheet Visuals

_(To be populated when M2 implementation is in place.)_

### Milestone 3 — DM Screen, Storylines, Lore/Journal, Obsidian

_(To be populated when M3 implementation is in place.)_

### Milestone 4 — Combat Tracker, VTT, Mobile

_(To be populated when M4 implementation is in place.)_

### Milestone 5 — Supabase Sync, Cleanup, Docs

_(To be populated when M5 implementation is in place.)_

