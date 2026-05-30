<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Structure
- **Next.js 16.2.6** + TypeScript, Turbopack, Tailwind (minimal)
- Inline styles throughout, dark theme, CSS variables in `globals.css`
- App Router with `'use client'` on all interactive pages
- Tauri v2 for desktop, with browser localStorage fallback

## Build & Test
- `npm run build` (compiles + typechecks) — always run after changes
- `npm run dev` for dev server
- `npm run sync-server` for WebSocket sync relay
- No test framework configured

## Key Conventions
- `DataEngine.loadLocalJson(path)` fetches from `public/data/`
- XPHB (2024) is always preferred over legacy sources in data lookups
- Characters: `dd-char-{uuid}` in localStorage (global across campaigns), registry at `dungeon-delver-character-registry`
- All campaign-scoped keys use `campaignKey(base)` from `utils/campaignStorage.ts` → `dd-{campaignId}-{base}`
- Active campaign stored at `dd-active-campaign`, campaign registry at `dd-campaign-registry`
- Campaign selector in sidebar of AppShell
- Party push to combat via `pendingEncounter` / `pendingPcCombatants` in sessionStorage
- Use `rollD20`, `rollD20WithAdvantage`, `rollDice` from `rollEngine.ts` for all random rolls
- Monster data may have object `type` with nested `choose` — handle with `getTypeLabel`
- Monster speed may have `choose` fields — handle with special-case in `formatSpeed`
- Entry text tags like `{@atk mw,rw}` and raw `mw,rw`/`mw`/`rw` prefixes are stripped in `formatters.ts:cleanString`

## Progress

## Campaign System
- Campaigns stored at `dd-campaign-registry`, active campaign at `dd-active-campaign`
- All campaign-scoped localStorage keys use `campaignKey(base, overrideId?)` → `dd-{campaignId}-{base}`
- `getActiveModules(char)` now reads config by `char.campaignId` directly (no name-based matching)
- Characters have `campaignId` (UUID) + `campaignName` (display name), auto-linked via `CampaignSelector`
- `enabledModules` field removed from Character interface (source of truth is campaign config)
- `ModuleData.transformations` added for per-character transformation tier tracking

### Done (all current features)
- **Character Creation Wizard** — Linear hub flow (Class→Species→Background→Abilities→Equipment→Spells), ability rolling (4d6/standard/point buy), UUID-based storage
- **Level-Up Wizard** — Standalone `/character-sheet/level-up?id=<uuid>` route, multiclass support (prereq 13), ASI (+2/+1+1/feat), feat browser with search/filter, feature pick descriptions, HP average vs rolled, confirm phase, per-class HP display
- **Character Sheet** — 6 tabs (Actions/Spells/Inventory/Features/Background/Notes), weapon attacks, spellcasting with slots, concentration (persistent header), paper doll with 15 slots, weight class system, armor AC (LA/MA/HA + Dex cap + set bonus), campaign module integration, Honor/Sanity stats, Gritty Realism rest confirmation, notes auto-save (500ms debounce), multiclass class banner (all classes as ghost icons, per-class border colors)
- **Combat Tracker** — Redesigned UI with CSS variables, monster grouping (×N with pooled HP), HP bars, condition badges with mechanical-effect bolding, collapsible monster browser, encounter difficulty/XP header, damage calculator bar
- **Library** — Item, spell, monster, race, background browsing with search
- **DM Hub** — Party Management (lobby, rollD20 initiative, multi-push, dedup), Monster Manager, Campaign Modules (15 modules with health checks + schema normalization), Session Logs, improved Quest/Storyline Tracker (arcs, grouping, colors), upgraded Lore & Journal (6 entry types, templates, backlinks, vault import/export)
- **Party Stash** — Shared item pool via localStorage, transfer to/from characters, Mule Nearby toggle
- **Player Hub** — Quick actions, storyline board, session feed panel, role-aware
- **Dice Rolling** — `rollD20`, `rollD20WithAdvantage`, `rollDice`, `AdvantageMode`, roll log with subscriber pattern
- **Spellcasting** — Single-class and multiclass slots per 2024 rules, upcast casting, prepared vs known, concentration checks
- **Multiclassing** — Per-class levels, namespaced resources, combined caster level, 2024 prerequisites
- **Equipment & Inventory** — Paper doll, weight class system, armor AC model, item enrichment, starting gold shop
- **Storage** — localStorage primary, Tauri file dialogs for import/export, auto-migration from old keys
- **Obsidian Integration** — char↔Markdown conversion, YAML frontmatter, wiki-links, deep links, conflict engine (diff/merge/backup), vault sync UI, vault scanner with auto-discovery
- **Responsive AppShell** — Three breakpoints, hamburger menu, bottom nav, role-filtered nav, mobile dice log sheet
- **VTT** — Tactical grid map, token drag, measure tool, fog of war (save/load), background image layer, combatant sync, editable tokens, expanded context menu
- **Supabase Sync** — Client at `utils/supabase.ts`, sync models for characters/sessions/encounters/storylines/notes, WebSocket relay `server/sync-server.js`, sync behavior docs at `utils/sync/syncBehavior.ts`
- **Dead Code Cleanup** — Removed `calculateModifier`, `SAVING_THROW_MAP`, duplicate `getAbilityModifier` in `levelingEngine.ts`, `StatPicker` component, all Capacitor packages/configs/android scaffold

### Known Issues
- Monster type can be `{type: {choose: [...]}}` — `getTypeLabel` unwraps to first option
- Monster speed can include `choose` field — `formatSpeed` handles with special case
- Supabase sync needs table creation in Supabase dashboard (run SQL from docs) before it can write
- Build succeeds with no errors
