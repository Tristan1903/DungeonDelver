# React Learning Walkthrough — DungeonDelver

A guided tour of all 145 files with educational comment headers, ordered from simplest concepts to most advanced.

---

## Phase 0 — Getting Started (2 files)

Begin here to understand the app shell and how React renders into the DOM.

| # | File | What you'll learn |
|---|------|-------------------|
| 1 | `app/layout.tsx` | Root layout, `<html>`/`<body>` wrappers, metadata, font loading |
| 2 | `app/page.tsx` | Entry point — redirect logic, simple client component |

---

## Phase 1 — TypeScript Foundation (8 files)

Pure TypeScript files with no JSX. These teach types, pure functions, and data modeling.

| # | File | What you'll learn |
|---|------|-------------------|
| 3 | `lib/campaign.ts` | TypeScript interfaces, union types, optional fields |
| 4 | `lib/character.ts` | Complex type modeling (nested objects, discriminated unions) |
| 5 | `lib/utils.ts` | Generic utility functions, type guards |
| 6 | `utils/styles.ts` | Style constants as JS objects, CSSProperties type |
| 7 | `utils/imgPaths.ts` | String manipulation, data maps, path helpers |
| 8 | `utils/rollEngine.ts` | Pure random number generation, dice rolling math |
| 9 | `utils/dataLoader.ts` | Async data fetching, caching, Promise patterns |
| 10 | `utils/formatters.ts` | String formatting, regex, functional helpers |

---

## Phase 2 — Simple Components (10 files)

Small, focused components. Learn props, JSX, conditional rendering.

| # | File | What you'll learn |
|---|------|-------------------|
| 11 | `components/ui/index.ts` | Barrel exports, re-exporting |
| 12 | `components/ui/separator.tsx` | Minimal component, inline styles |
| 13 | `components/ui/progress.tsx` | CSS width binding, aria attributes |
| 14 | `components/ui/hp-bar.tsx` | Dynamic styling from props, color thresholds |
| 15 | `components/ui/badge.tsx` | Polymorphic `render` prop, `useRender` |
| 16 | `components/ui/input.tsx` | Forwarding refs with `React.forwardRef` |
| 17 | `components/ui/textarea.tsx` | Forwarded refs on textarea |
| 18 | `components/ui/select.tsx` | Custom select with forwarded ref |
| 19 | `components/ui/toggle.tsx` | `useRender` + toggle state via render prop |
| 20 | `components/ui/input-group.tsx` | Composing small UI pieces, layout containers |

---

## Phase 3 — Compound UI Components (8 files)

More advanced UI components using @base-ui/react compound primitives.

| # | File | What you'll learn |
|---|------|-------------------|
| 21 | `components/ui/button.tsx` | `cva` (class-variance-authority), variant/size props |
| 22 | `components/ui/card.tsx` | Compound card pattern (Card, CardHeader, CardContent) |
| 23 | `components/ui/tabs.tsx` | Compound tabs (Tabs, TabList, Tab, TabPanel) |
| 24 | `components/ui/tooltip.tsx` | Portal + Floating UI + animation states |
| 25 | `components/ui/dialog.tsx` | Modal dialog with Portal, backdrop, esc-to-close |
| 26 | `components/ui/dropdown-menu.tsx` | Popover menu, keyboard navigation |
| 27 | `components/ui/navigation-menu.tsx` | Responsive nav with submenus, viewport animation |
| 28 | `components/ui/scroll-area.tsx` | Custom scrollbar with thumb drag + auto-hide |

---

## Phase 4 — Context & Providers (3 files)

Learn React Context for global state.

| # | File | What you'll learn |
|---|------|-------------------|
| 29 | `components/Providers.tsx` | Wrapping children with context providers |
| 30 | `context/RoleContext.tsx` | `createContext`, `useContext` hook, provider pattern |
| 31 | `context/RollLogContext.tsx` | Context with dispatch methods, subscriber pattern |

---

## Phase 5 — Basic Modal / Detail Components (8 files)

All follow the same inline modal pattern — great for recognizing repetition and consistency.

| # | File | What you'll learn |
|---|------|-------------------|
| 32 | `components/ErrorBoundary.tsx` | Error boundary + fallback UI |
| 33 | `components/BackgroundDetail.tsx` | Inline modal, stopPropagation, conditional rendering |
| 34 | `components/RaceDetail.tsx` | Same modal pattern, data formatting helpers |
| 35 | `components/ItemDetail.tsx` | Same modal pattern, conditional sections |
| 36 | `components/SpellDetail.tsx` | Same modal pattern, helper functions |
| 37 | `components/MonsterDetail.tsx` | Data-driven sections (traits/actions/reactions mapped from arrays) |
| 38 | `components/HandoutCard.tsx` | Presentational components, formatting helpers |
| 39 | `components/LibrarySidebar.tsx` | `usePathname` for active nav highlighting |

---

## Phase 6 — Forms & Controlled Components (5 files)

Learn controlled inputs, form validation, and state management.

| # | File | What you'll learn |
|---|------|-------------------|
| 40 | `components/DmPasswordPanel.tsx` | Controlled form with validation + feedback messages |
| 41 | `components/DmAuthGate.tsx` | Authentication gate, protected content pattern |
| 42 | `components/DmScreenPanel.tsx` | Complex state form, conditional sections |
| 43 | `components/PantheonConfig.tsx` | Multi-step form, sub-components, inline modals |
| 44 | `components/ShopModal.tsx` | `useMemo` for filtered/sorted lists, cart state, buy flow |

---

## Phase 7 — Effects & Refs (4 files)

Learn `useEffect` for side effects and `useRef` for DOM access and stale closure prevention.

| # | File | What you'll learn |
|---|------|-------------------|
| 45 | `components/GmOverlayToggle.tsx` | Click-outside detection, effect cleanup, external store subscription |
| 46 | `components/SpellCastAnimation.tsx` | `useRef` for latest callback, timer cleanup, animation states |
| 47 | `components/CommandPalette.tsx` | Global keyboard events, `useRef` for DOM focus, filtered search |
| 48 | `components/AppShell.tsx` | Responsive layout, hamburger menu, bottom nav |

---

## Phase 8 — Wizards & Complex Composition (5 files)

Large, multi-step components that compose many React patterns together.

| # | File | What you'll learn |
|---|------|-------------------|
| 49 | `components/SpellSelectionView.tsx` | `useMemo` filtering, controlled toggle, props drilling, modal-in-modal |
| 50 | `components/CampaignModulesCharacterSheet.tsx` | Controlled components, conditional rendering, many sub-sections |
| 51 | `components/CharacterWizard.tsx` | Multi-step wizard, linear flow, state management |
| 52 | `components/LevelUpWizard.tsx` | Complex state across steps, multiclass logic |
| 53 | `components/CampaignWizard.tsx` | Campaign creation flow, campaign config state |

---

## Phase 9 — Utility Libraries (20 files)

Plain TypeScript utilities. These teach data manipulation, localStorage, and game logic.

| # | File | What you'll learn |
|---|------|-------------------|
| 54 | `utils/characterProgression.ts` | Lookup tables, XP thresholds, class progression maps |
| 55 | `utils/spellcastingEngine.ts` | Spell slot math (multi-class), prepared/known logic |
| 56 | `utils/levelingEngine.ts` | Feature unlocking, ASI/feat selection logic |
| 57 | `utils/campaignEngine.ts` | Campaign config, deity lookups, module health checks |
| 58 | `utils/campaignStorage.ts` | `campaignKey()` — scoped localStorage keys |
| 59 | `utils/storageEngine.ts` | Generic CRUD wrapper around localStorage |
| 60 | `utils/stashEngine.ts` | Shared item pool, transfer between characters |
| 61 | `utils/characterEngine.ts` | Character save/load, stat calculations |
| 62 | `utils/gmOverlayEngine.ts` | Singleton store with subscriber pattern |
| 63 | `utils/commandPaletteEngine.ts` | Search index building, fuzzy matching |
| 64 | `utils/influenceEngine.ts` | Faction/reputation system, points-based |
| 65 | `utils/cardEngine.ts` | Spell GIF path resolution, resource mapping |
| 66 | `utils/libraryHelpers.tsx` | 5e data formatting (CR, speed, AC, time, range, etc.) |
| 67 | `utils/homebrewEngine.ts` | Custom content creation and merging |
| 68 | `utils/classResources.ts` | Per-class resource tracking (ki, rage, etc.) |
| 69 | `utils/classThemes.ts` | Theming constants per class |
| 70 | `utils/activeEffects.ts` | Active effect tracking (conditions, buffs) |
| 71 | `utils/actionRoller.ts` | Combat action resolution |
| 72 | `utils/resourceEngine.ts` | Resource pool management (HP, spell slots, etc.) |
| 73 | `utils/tableEngine.ts` | Random table rolling with weight support |

---

## Phase 10 — Advanced Utilities (10 files)

More complex utilities involving async, conflict resolution, external integrations.

| # | File | What you'll learn |
|---|------|-------------------|
| 74 | `utils/weaponMasteries.ts` | Weapon mastery properties, data maps |
| 75 | `utils/calendarEngine.ts` | In-game calendar with date math |
| 76 | `utils/npcGenerator.ts` | Procedural NPC generation, template filling |
| 77 | `utils/markdownEngine.ts` | Markdown↔JSON conversion, YAML frontmatter |
| 78 | `utils/deepLinkEngine.ts` | URL scheme generation, cross-app linking |
| 79 | `utils/conflictEngine.ts` | Diff/merge/backup for Obsidian sync |
| 80 | `utils/sync/syncModels.ts` | TypeScript models for Supabase sync |
| 81 | `utils/sync/syncBehavior.ts` | Sync CRUD logic, conflict resolution |
| 82 | `utils/syncEngine.ts` | WebSocket + Supabase sync orchestration |
| 83 | `utils/supabase.ts` | Supabase client initialization, auth helpers |

---

## Phase 11 — Zone Combat & Obscured Items (3 files)

Specialized domain logic.

| # | File | What you'll learn |
|---|------|-------------------|
| 84 | `utils/zoneCombatEngine.ts` | Zone-based combat grid logic |
| 85 | `utils/obscuredItemsEngine.ts` | Fog-of-war for items (reveal/hide) |

---

## Phase 12 — Module Config Components (18 files)

Small, single-concept configuration panels. Each wraps a single game mechanic toggle or numeric value as a controlled component, demonstrating focused component design and game-system abstraction.

| # | File | Game mechanic concept |
|---|------|----------------------|
| 86 | `components/modules/configs/CampaignRacePresetSelector.tsx` | Preset race picker for campaign character creation |
| 87 | `components/modules/configs/DarkGifts.tsx` | Ravenloft dark gift assignment |
| 88 | `components/modules/configs/Defiling.tsx` | Dark Sun arcane defiling checks |
| 89 | `components/modules/configs/EpicBoons.tsx` | Epic boon selection at high levels |
| 90 | `components/modules/configs/GrittyRealism.tsx` | Alternative rest variant rules |
| 91 | `components/modules/configs/GroupPatrons.tsx` | Shared party patron mechanics |
| 92 | `components/modules/configs/HeroPoints.tsx` | Hero point inspiration economy |
| 93 | `components/modules/configs/HonorSanity.tsx` | Alternative ability scores (honor + sanity) |
| 94 | `components/modules/configs/Isekai.tsx` | Isekai reincarnation / genre crossover rules |
| 95 | `components/modules/configs/Madness.tsx` | Long-term / indefinite madness effects |
| 96 | `components/modules/configs/Piety.tsx` | Divine favor tracking (Mythic Odysseys) |
| 97 | `components/modules/configs/Renown.tsx` | Faction renown and rank progression |
| 98 | `components/modules/configs/ShipMorale.tsx` | Naval morale and crew cohesion |
| 99 | `components/modules/configs/Sidekicks.tsx` | Sidekick class/level management |
| 100 | `components/modules/configs/Siege.tsx` | Siege equipment and fortification rules |
| 101 | `components/modules/configs/StressFear.tsx` | Stress/fear mechanics (Van Richten's) |
| 102 | `components/modules/configs/SupernaturalRegions.tsx` | Regional magical effects and hazards |
| 103 | `components/modules/configs/Transformations.tsx` | Lycanthropy / vampirism template application |

---

## Phase 13 — Module Container (1 file)

Wraps the config components into a collapsible module panel.

| # | File | What you'll learn |
|---|------|-------------------|
| 104 | `components/modules/ModulePanel.tsx` | Collapsible card container, dynamic config rendering by module key |

---

## Phase 14 — App Route Pages (8 files)

Thin page shells that compose larger components. Each is a standalone route under the app directory — minimal wrapper logic, mostly layout delegation.

| # | File | What you'll learn |
|---|------|-------------------|
| 105 | `app/cards/page.tsx` | Cards hub — choose between class, spell, or monster cards |
| 106 | `app/combat/page.tsx` | Combat tracker — initiative order, HP management, turn flow |
| 107 | `app/handouts/page.tsx` | Handout manager — image/file display for player handouts |
| 108 | `app/handle/page.tsx` | Handle page — player-facing companion app entry |
| 109 | `app/hub/page.tsx` | Main hub — role-based navigation to all app sections |
| 110 | `app/notes/page.tsx` | Notes panel — markdown notes with categories and search |
| 111 | `app/party-stash/page.tsx` | Party stash — shared item pool with add/withdraw |
| 112 | `app/qr/page.tsx` | QR code — character sharing via QR display |

---

## Phase 15 — Character Sheet Pages (2 files)

Thin pages wrapping the character sheet and level-up wizard.

| # | File | What you'll learn |
|---|------|-------------------|
| 113 | `app/character-sheet/page.tsx` | Character sheet — read-only view of a loaded character |
| 114 | `app/character-sheet/level-up/page.tsx` | Level-up wizard — multiclass/ASI/feat selection workflow |

---

## Phase 16 — Library Pages (9 files)

Read-only browse/display pages with search, filtering, and detail modals.

| # | File | What you'll learn |
|---|------|-------------------|
| 115 | `app/library/page.tsx` | Library hub — grid of source icons linking to each category |
| 116 | `app/library/backgrounds/page.tsx` | Background browser — searchable grid with detail modal |
| 117 | `app/library/classes/page.tsx` | Class browser — level features, subclass table, spellcasting |
| 118 | `app/library/items/page.tsx` | Item browser — magic items with search, type filter, detail |
| 119 | `app/library/monsters/page.tsx` | Monster browser — statblocks, CR filter, type filter |
| 120 | `app/library/races/page.tsx` | Race browser — racial traits, subraces, ASI display |
| 121 | `app/library/spells/page.tsx` | Spell browser — level/class/school filters, spell cards |
| 122 | `app/library/[source]/page.tsx` | Source content — renders full source book entries |
| 123 | `app/library/[source]/BookReaderClient.tsx` | Book reader — scroll-spy nav, recursive content rendering |

---

## Phase 17 — DM Layout & Hub (2 files)

Layout shell and navigation hub for the DM section.

| # | File | What you'll learn |
|---|------|-------------------|
| 124 | `app/dm/layout.tsx` | DM layout — slide-out DM Screen, sidebar navigation, bottom bar |
| 125 | `app/dm/page.tsx` | DM hub — grid of tool cards linking to all DM pages |

---

## Phase 18 — DM Tool Pages (19 files)

Full-featured DM tools with complex state management, localStorage persistence, and game logic integration.

| # | File | What you'll learn |
|---|------|-------------------|
| 126 | `app/dm/calendar/page.tsx` | In-game calendar — date display, event tracker, custom calendars |
| 127 | `app/dm/campaigns/page.tsx` | Campaign manager — CRUD, active campaign selection, settings |
| 128 | `app/dm/homebrew/page.tsx` | Homebrew editor — create/edit custom monsters, items, spells |
| 129 | `app/dm/influence/page.tsx` | Influence tracker — faction reputation, NPC relationship tracking |
| 130 | `app/dm/items/page.tsx` | Item shop — player-facing shop with buy/sell, shop inventory |
| 131 | `app/dm/journal/page.tsx` | Campaign journal — session notes, NPC log, quest log |
| 132 | `app/dm/modules/page.tsx` | Module config — toggle campaign modules, configure each module |
| 133 | `app/dm/monsters/page.tsx` | Monster manager — multi-source bestiary, select/push to combat |
| 134 | `app/dm/npcs/page.tsx` | NPC generator — random gen, save/load, batch, species template |
| 135 | `app/dm/obsidian/page.tsx` | Obsidian sync — bidirectional vault sync, conflict diff/merge |
| 136 | `app/dm/party/page.tsx` | Party manager — load characters, initiative roll, push to combat |
| 137 | `app/dm/quests/page.tsx` | Quest tracker — arc-grouped quests, status workflow, modal editor |
| 138 | `app/dm/screen/page.tsx` | DM Screen — thin wrapper for reusable DmScreenPanel component |
| 139 | `app/dm/session/page.tsx` | Session log — encounter log, XP calculator, journal entries |
| 140 | `app/dm/sync/page.tsx` | Multi-user sync — WebSocket broadcast, connection status, chat |
| 141 | `app/dm/tables/page.tsx` | Random tables — browse data tables, custom tables, roll history |
| 142 | `app/dm/zone-combat/page.tsx` | Zone combat — drag-to-move zones, HP, conditions, combat log |

---

## Phase 19 — Redundant Style Files (3 files)

Files that exist in multiple locations for historical reasons.

| # | File | What you'll learn |
|---|------|-------------------|
| 143 | `utils/styles.ts` | (already listed at #6) |
| 144 | `utils/tableEngine.ts` | (already listed at #73) |
| 145 | `utils/calendarEngine.ts` | (already listed at #75) |

---

## Status

**142 unique files commented** ✓ — every component, utility, lib, context, provider, config, and app page in the project now has an educational header explaining its purpose and the React concept it teaches.
