# DungeonDelver — System Test Matrix

> Milestone 0 deliverable: function-by-function regression test coverage.
> Use this document to validate each system before and after every milestone change.

---

## 1. Character System

### 1.1 Creation Wizard (`components/CharacterWizard.tsx`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 1.1.1 | Full create flow | Click through all 6 steps: Class → Species → Background → Abilities → Equipment → Spells | Character saved to localStorage with `dd-char-{uuid}` key; registry entry created | |
| 1.1.2 | Ability rolling modes | Try 4d6-drop-lowest, Standard Array, Point Buy | Correct stat arrays produced; point buy enforces 27-point budget | |
| 1.1.3 | Starting gold shop | Enter gold-buy mode; equip items from shop; verify gold deducted | Items appear in inventory with `shop-` id prefix; remaining gold in `currency.gp` | |
| 1.1.4 | Equipment pack expand | Select a starting pack (e.g., Explorer's Pack) | Pack items expand into individual `InventoryItem` entries, not a single pack item | |
| 1.1.5 | Subclass at level 1 | Choose Cleric, Sorcerer, Warlock | Subclass picker appears in creation flow | |
| 1.1.6 | Cancel/back navigation | Use browser back or wizard back button | Wizard preserves state; no partial character saved | |
| 1.1.7 | Error state | Submit empty name; enter negative stats | Name required validation; ability scores floor at 3 | |

### 1.2 Level-Up Wizard (`components/LevelUpWizard.tsx`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 1.2.1 | Single class level-up | Level from 1→2 as Fighter | HP increases (rolled or average); features added; proficiency bonus check at level 5 | |
| 1.2.2 | Multiclass level-up | Level from 1→2, pick a second class | Class picker shown; stat prerequisites enforced (min 13) | |
| 1.2.3 | ASI/Feat at level 4 | Level to 4 (any class) | ASI options appear: +2, +1+1, or Take a Feat; feat browser shows General/Origin feats | |
| 1.2.4 | Feat ability boost | Take a feat that grants +1 STR | Ability score correctly increased | |
| 1.2.5 | HP roll vs average | Roll HP vs take average | Average calculated correctly (die half + 1); roll uses `rollDice` | |
| 1.2.6 | Subclass at class level 3 | Level Fighter to 3 | Subclass picker appears for Fighter | |
| 1.2.7 | Confirm phase | Review changes then confirm | Summary shown; confirm writes character; cancel discards | |
| 1.2.8 | Class resource update | Level Barbarian → rage count increases | `resources` updated with new max for rage | |
| 1.2.9 | Spell slot update | Level Wizard → spell slots increase | `spellSlots` updated; used slots clamped to new max | |

### 1.3 Character Sheet (`app/character-sheet/page.tsx`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 1.3.1 | Actions tab | View actions tab for martial character | Weapon attacks listed with attack/damage buttons | |
| 1.3.2 | Spells tab | View spells tab for caster | Prepared/known spells listed; slot trackers shown | |
| 1.3.3 | Cast a spell | Click a spell, select slot level | Slot deducted; spell cast animation plays (if GIF available); concentration tracked | |
| 1.3.4 | Upcast a spell | Cast a spell at higher level | Upcast picker shows available slots above minimum level | |
| 1.3.5 | Concentration header | Cast a concentration spell | Yellow "Concentrating on {spell}" bar persists across all tabs | |
| 1.3.6 | Concentration break | Take damage while concentrating | Modal prompts: Auto-Roll, Lost, Held; failure clears concentration | |
| 1.3.7 | Inventory tab | View inventory, equip/unequip items | Items listed; Equip shows slot picker; Unequip returns to backpack | |
| 1.3.8 | Paper doll | Equip items to body slots | Items appear on paper doll diagram; slot labels match | |
| 1.3.9 | Armor AC | Equip chain mail (HA) | AC calculated as base 18 (no Dex bonus); set bonus checks material match | |
| 1.3.10 | Weight class | Over-encumber character | Load indicator shows Light/Medium/Heavy; speed penalties applied via `computeLoad` | |
| 1.3.11 | Features tab | View features | All class/racial features listed with level and source | |
| 1.3.12 | Weapon masteries | View fighter with mastery weapons | Mastery badges shown on weapon cards | |
| 1.3.13 | Background tab | View background fields | Personality Traits, Ideals, Bonds, Flaws, Backstory editable | |
| 1.3.14 | Notes auto-save | Type in notes field, wait 500ms | "Saved" indicator appears; localStorage updated | |
| 1.3.15 | Error Boundary | Force render error in any tab | Error boundary catches it; other tabs still functional | |
| 1.3.16 | Campaign modules | Enable Piety module; view character sheet | Piety section appears with deity/score | |

### 1.4 Spellcasting Engine (`utils/spellcastingEngine.ts`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 1.4.1 | Single-class slots | Wizard level 5 → slot computation | `spellSlots`: 4/3/2 (levels 1/2/3) | |
| 1.4.2 | Multiclass slots | Wizard 3 / Cleric 2 → combined caster level 5 | Same as pure level 5 full caster slots | |
| 1.4.3 | Half-caster slots | Paladin 5 → caster level 2 (5÷2=2) | `spellSlots`: 3 (level 1 only) | |
| 1.4.4 | Third-caster slots | Fighter (Eldritch Knight) 5 → caster level 1 (5÷3=1) | `spellSlots`: 2 (level 1 only) | |
| 1.4.5 | Pact magic | Warlock 5 → pact slots | `spellSlots[pact.level]` = {max: 2, used: 0}; short rest resets | |
| 1.4.6 | Prepared count | Cleric with 18 WIS at level 5 | Prepared spells = 5 (level) + 4 (WIS mod) = 9 | |
| 1.4.7 | Save DC | Wizard 5 with 18 INT | DC = 8 + 3 (prof) + 4 (INT) = 15 | |

---

## 2. Combat Tracker (`app/combat/page.tsx`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 2.1 | Add combatants | Add PCs and monsters manually | Entries appear in initiative order; roll initiative button works | |
| 2.2 | Pending encounter | Push from Monster Manager + Party page | sessionStorage `pendingEncounter` + `pendingPcCombatants` loaded | |
| 2.3 | Initiative sorting | Add 5 combatants with rolled initiative | Sorted descending by initiative; ties broken by Dex | |
| 2.4 | Damage/heal | Click damage button, enter type | HP decreases; type resistance halves, vulnerability doubles, immunity blocks | |
| 2.5 | Resistance badges | Monster has fire resistance → take fire damage | Green "Resist" badge shown; damage halved | |
| 2.6 | Conditions | Apply Prone, Stunned, Poisoned | Condition badges shown; speed effects applied via `getEffectsFromConditions` | |
| 2.7 | Auto-roll action | Click "Attack" or action button on combatant card | `rollActionSimple` runs; result rolled damage shown; dice log entry created | |
| 2.8 | Concentration prompt | Damage a concentrating creature | Modal appears: Auto-Roll, Lost, Held; on fail, concentration dropped | |
| 2.9 | XP award | End combat → calculate XP | XP totals match CR-based values from `CR_XP` table; difficulty bar shows estimate | |
| 2.10 | Tauri save/load | Save encounter file; reload | State serialized; reimport restores exact state | |
| 2.11 | Roll log | Observe dice rolls during combat | Timestamped entries in right sidebar dice log | |

---

## 3. Library (`app/library/page.tsx`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 3.1 | Items tab | Browse items | All items from `items.json` + `items-base.json` listed; search filters by name | |
| 3.2 | Spells tab | Browse spells | Spells from all sources; XPHB (2024) shown first; source filter works | |
| 3.3 | Monsters tab | Browse monsters by CR/type | Filter by CR range, type, name; statblock modal shows full data | |
| 3.4 | Races tab | Browse races | Race entries shown with traits | |
| 3.5 | Homebrew badge | Create homebrew item → view in library | "Homebrew" badge shown; appears alongside core items | |
| 3.6 | Spell search | Search "fire" | Matches "Fire Bolt", "Fireball", "Burning Hands", etc. | |

---

## 4. DM Tools

### 4.1 DM Command Hub (`/dm`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 4.1.1 | Status cards | View hub | Active session, storyline load, subsystem count all display correctly | |
| 4.1.2 | Workflow links | Click links in Primary Workflow panel | Navigate to correct DM pages | |
| 4.1.3 | Toolbox links | Click links in Toolbox panel | Navigate to correct DM tool pages | |

### 4.2 Party Management (`/dm/party`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 4.2.1 | Character list | View party page | All characters loaded from registry displayed | |
| 4.2.2 | Roll initiative | Click Roll Initiative | `rollD20WithAdvantage` called per character | |
| 4.2.3 | Push to combat | Select characters, push | `pendingPcCombatants` set in sessionStorage; dedup prevents duplicates | |

### 4.3 NPC Generator (`/dm/npcs`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 4.3.1 | Generate NPCs | Select species, click Generate | NPC with name, stats, personality traits created | |
| 4.3.2 | Batch generation | Set count to 10, generate | 10 NPCs generated; all unique names | |
| 4.3.3 | Save/load | Save NPC, reload page | NPC appears in saved list | |
| 4.3.4 | Filter by species | Filter saved list by species | Only matching NPCs shown | |

### 4.4 Influence & Social Tracker (`/dm/influence`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 4.4.1 | Add social NPC | Add NPC with initial disposition | Disposition slider at correct tier | |
| 4.4.2 | Adjust disposition | Move slider up/down | DC updates (15/20/25/30); reaction roll available | |
| 4.4.3 | Reaction roll | Click reaction roll | 2d6 roll displayed; result modifier applied | |
| 4.4.4 | Group management | Create group with members | Group view shows aggregated disposition | |

### 4.5 Random Tables (`/dm/tables`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 4.5.1 | Roll on data table | Select a table from loaded data, click roll | Random entry selected; result displayed | |
| 4.5.2 | Custom table CRUD | Create table with entries, save | Custom table appears in list; persist across reloads | |
| 4.5.3 | Roll history | Roll multiple times | History shows past results | |

### 4.6 Monster Manager (`/dm/monsters`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 4.6.1 | Browse bestiary | Open monster manager | All bestiary sources loaded; monsters listed | |
| 4.6.2 | Filter by CR/type | Set CR range 0-5, type "dragon" | Filtered list matches criteria | |
| 4.6.3 | Statblock viewer | Click a monster | Full statblock modal with actions, traits, spells | |
| 4.6.4 | Push to combat | Select monsters, push | `pendingEncounter` set in sessionStorage | |
| 4.6.5 | Action roll buttons | Click an action in statblock | `rollActionSimple` called; damage displayed | |

### 4.7 DM Screen (`/dm/screen`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 4.7.1 | Full page screen | Navigate to `/dm/screen` | Complete DM Screen panel displayed | |
| 4.7.2 | Floating panel | Toggle DM Screen from any DM page | Slide-out panel shows conditions, DCs, cover, light, exhaustion, travel | |
| 4.7.3 | Conditions reference | Click a condition | Description and mechanical effects shown | |

### 4.8 Session & Encounter Prep (`/dm/session`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 4.8.1 | Create session | Create new session with name/date | Session appears in session list | |
| 4.8.2 | Add encounter | Add encounter to session | Encounter appears in session timeline | |
| 4.8.3 | Journal entry | Write session journal entry | Entry persisted in `dd-sessions` | |
| 4.8.4 | Difficulty estimate | Add monsters to encounter | Difficulty bar shows Easy/Medium/Hard/Deadly | |

### 4.9 Zone Combat (`/dm/zone-combat`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 4.9.1 | Zone layout presets | Switch between Melee/Near/Far, Close/Distant, etc. | Grid re-renders with correct zone labels | |
| 4.9.2 | Drag combatants | Drag a combatant between zones | Combatant moves to new zone | |
| 4.9.3 | Initiative tracking | Roll initiative for zone combatants | Order displayed; turn tracker works | |
| 4.9.4 | Combat log | Perform attacks/heals | Entries logged with timestamps | |

### 4.10 Quest & Storyline Tracker (`/dm/quests`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 4.10.1 | Create quest | Create quest with name, description, status | Quest appears in active list | |
| 4.10.2 | Add objectives | Add objectives with completion status | Objectives shown; completion checkbox toggles status | |
| 4.10.3 | Quest status | Cycle through Active/Complete/Failed | Quest moves to correct list | |

### 4.11 Lore & Journal (`/dm/journal`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 4.11.1 | Markdown editor | Write markdown content | Text rendered; preview shows formatting | |
| 4.11.2 | Save/load | Save entry; reload page | Entry restored from localStorage | |
| 4.11.3 | Obsidian vault | Open from vault; save to vault | Tauri dialog opens; file read/write succeeds | |

### 4.12 Magic Items (`/dm/items`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 4.12.1 | Obscure item | Assign item with fake name | Item shows in character sheet with fake name | |
| 4.12.2 | Identify item | Click Identify on obscured item | True name revealed in character sheet; fake name removed | |
| 4.12.3 | Manage tab | View all obscured items | List with status badges (hidden/revealed) | |

### 4.13 Homebrew Editor (`/dm/homebrew`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 4.13.1 | Create item | Fill item form, save | Item appears in homebrew list | |
| 4.13.2 | Create monster | Fill monster form, save | Monster appears in homebrew list | |
| 4.13.3 | Create spell | Fill spell form, save | Spell appears in homebrew list | |
| 4.13.4 | Export JSON | Click Export | JSON file downloaded with all homebrew content | |
| 4.13.5 | Import JSON | Click Import; select file | Content loaded; appears in homebrew list | |

### 4.14 World Calendar (`/dm/calendar`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 4.14.1 | Calendar switch | Switch between Harptos, Gregorian, Exandria, etc. | Month/day/year display updates; leap year rules applied | |
| 4.14.2 | Add event | Click a date, add event | Event appears on calendar day | |
| 4.14.3 | Moon phases | View calendar with moon phases | Phase displayed per day | |
| 4.14.4 | Season display | View months | Correct season shown per month | |

### 4.15 Multi-Player Sync (`/dm/sync`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 4.15.1 | Host a room | Click Host | Server connection established; status shows "connected" | |
| 4.15.2 | Join a room | Enter server URL + room name | Connection established; client count updates | |
| 4.15.3 | Chat message | Send chat message | Message appears for all connected clients | |
| 4.15.4 | State broadcast | Update state on one client | State change received by other clients | |
| 4.15.5 | Reconnect | Kill server; restart | Auto-reconnect fires; status cycles through connecting→connected | |

### 4.16 Optional Subsystems (`/dm/modules`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 4.16.1 | Enable module | Toggle a module ON | Module appears in enabled list; character sheet shows section if applicable | |
| 4.16.2 | Preset packs | Apply "Classic DMG" preset | Madness, Honor/Sanity, Gritty Realism, Hero Points enabled | |
| 4.16.3 | Configure module | Open config for Piety; set deity name | Config saved; appears in `dd-campaign-config`; character sheet reflects change | |
| 4.16.4 | Import malformed JSON | Import corrupt campaign file | `normalizeImportedCampaign` falls back to defaults; health check shows warnings | |
| 4.16.5 | Export campaign | Click Export | JSON downloaded; reimport restores exact state | |
| 4.16.6 | Reset defaults | Click Reset | All config cleared; defaults restored | |
| 4.16.7 | Campaign linking | Set campaign name; create character with matching `campaignName` | Character inherits module config | |

### 4.17 Obsidian Sync (`/dm/obsidian`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 4.17.1 | Vault path selection | Click Browse; select folder | Path saved to localStorage; character list refreshes | |
| 4.17.2 | Sync All to Vault | Click Sync All | All characters written as `.md` files with YAML frontmatter + wiki-links | |
| 4.17.3 | Push single character | Character has "Local Newer" status → click Push | That character's `.md` updated | |
| 4.17.4 | Import All from Vault | Click Import All | Characters with matching names updated; new `.md` files create new characters | |
| 4.17.5 | Pull single character | Character has "MD Newer" status → click Pull | That character updated from `.md` | |
| 4.17.6 | Conflict detection | Edit both local and `.md` → versions diverge | Status shows "Conflict"; Diff button shows field-by-field comparison | |
| 4.17.7 | Conflict resolution | Click Diff → Keep Local or Keep Obsidian | Selected version saved; backup created | |
| 4.17.8 | Wiki links in markdown | Sync a character with spells → open `.md` in Obsidian | Spells appear as `[[Fire Bolt]]` wiki-links | |
| 4.17.9 | Version tracking | Repeatedly sync same character | `_version` increments; `last_sync` timestamp updates | |

---

## 5. Player Hub (`/hub`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 5.1 | Active storylines | View hub | Active quests shown with objective counts | |
| 5.2 | Current session | DM has active session | Session name + date shown | |
| 5.3 | Quick actions | Click Character Sheet, Notes, Library links | Navigate correctly | |
| 5.4 | Storyline board | Click into a storyline | Objectives displayed | |
| 5.5 | Session feed | DM adds session entries | Recent entries shown (last 6, newest first) | |

---

## 6. Party Stash (`/party-stash`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 6.1 | Add item to stash | Enter item name/value, click Add | Item appears in stash list | |
| 6.2 | Transfer to character | Select character, transfer item | Item removed from stash; appears in character inventory | |
| 6.3 | Mule Nearby toggle | Toggle Mule Nearby on | Weight class calculation includes stash items | |
| 6.4 | Persistence | Reload page | All stash items restored from `dd-party-stash` | |

---

## 7. VTT (`/vtt`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 7.1 | Token placement | Tokens auto-placed from pending encounter | Each token on grid at distinct position | |
| 7.2 | Drag token | Click and drag a token | Snaps to grid; position saved in state | |
| 7.3 | Select tool | Click token with Select tool | Token highlighted with gold border; info panel shows HP/AC | |
| 7.4 | Measure tool | Click Measure; click two points | Yellow dashed line drawn; distance in feet shown in toolbar | |
| 7.5 | Fog of war | Click Fog; enable fog; click to reveal areas | Black overlay with circular reveals at click points | |
| 7.6 | Right-click menu | Right-click token | Menu: Damage 5, Heal 5, Toggle PC/Monster, Remove | |
| 7.7 | HP bar | Damage a token | HP bar shrinks; color changes green→yellow→red | |
| 7.8 | GM Overlay | Enable GM overlay; view token | Tooltip shows HP/AC/type for all tokens | |
| 7.9 | Add token | Click + Token | Generic token added at default position | |

---

## 8. Notes & Messages (`/notes`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 8.1 | Messages tab | Select from/to; type message; click Send | Message appears in sorted list (newest first) | |
| 8.2 | Personal notes tab | Switch to Personal; type notes | Saved to `dd-notes-content`; persists on reload | |
| 8.3 | Session notes tab | Switch to Session; type session recap | Saved to `dd-notes-content`; separate from personal notes | |
| 8.4 | Pinned note | Type in pinned field | One-line reminder persists | |

---

## 9. Cards / Handouts / QR

### 9.1 Cards (`/cards`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 9.1.1 | Browse all cards | Open `/cards` | Grid of spell GIFs displayed; Cantrips through Level 3 | |
| 9.1.2 | Filter by level | Select Level 1 filter | Only Level 1 spells shown | |
| 9.1.3 | Lightbox view | Click a card | Full-size modal with GIF animation; close on click | |
| 9.1.4 | Deck of Many Things | Select Decks filter | 23 card GIFs shown | |

### 9.2 Handouts (`/handouts`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 9.2.1 | Select spells | Search and select 3 spells | Spells appear in preview grid | |
| 9.2.2 | Select items | Search and select 2 items | Items appear in preview grid | |
| 9.2.3 | Print preview | Click Print | Browser print dialog opens with A4/2-column layout | |

### 9.3 QR Codes (`/qr`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 9.3.1 | Text input | Type text; click Generate | QR code rendered | |
| 9.3.2 | Lore presets | Select a preset (e.g., Map Location) | Pre-filled text; QR generated | |
| 9.3.3 | Download PNG | Click Download | PNG file downloaded | |

---

## 10. Dice Rolling (`utils/rollEngine.ts`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 10.1 | `rollD20` | Call `rollD20()` | Result 1-20 | |
| 10.2 | `rollD20WithAdvantage` | Call with advantage | Two rolls; higher used; both shown | |
| 10.3 | `rollD20WithDisadvantage` | Call with disadvantage | Two rolls; lower used; both shown | |
| 10.4 | `rollDice("3d6")` | Call with formula | Three 1-6 rolls; total returned | |
| 10.5 | `rollDice("2d8+4")` | Call with modifier formula | Two rolls + 4; total returned | |
| 10.6 | Roll log subscription | Any roll via `rollEngine` | Entry added to roll log; subscriber pattern fires | |

---

## 11. Command Palette (`Ctrl+K`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 11.1 | Open palette | Press Ctrl+K | Overlay opens with search input focused | |
| 11.2 | Search pages | Type "character" | Character Sheet page entry appears | |
| 11.3 | Search characters | Type character name | Character entry appears (if any exist) | |
| 11.4 | Navigate with keyboard | Arrow-down to select; Enter to navigate | Navigates to selected route | |
| 11.5 | Recent items | Open palette; navigate to a page; reopen | Recently visited items shown | |
| 11.6 | Close palette | Press Escape | Palette closes | |

---

## 12. Deep Links (`dd-app://`)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 12.1 | Character deep link | Click `dd-app://character/{uuid}` | Navigates to character sheet for that UUID | |
| 12.2 | Spell deep link | Click `dd-app://spell/Fireball` | Navigates to library with Fireball search | |
| 12.3 | Malformed link | Navigate to `/handle?url=invalid` | Shows "Invalid deep link" message | |

---

## 13. Role System (Milestone 1+)

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 13.1 | Role toggle | Switch from Player to DM | Nav shows DM pages; role persists on reload | |
| 13.2 | DM nav visibility | Player role → view sidebar | DM pages hidden | |
| 13.3 | Player nav visibility | DM role → view sidebar | All pages visible (player + DM) | |
| 13.4 | Route access | Player role → navigate to `/dm/party` | Redirected or 404 (not implemented yet) | |

---

## 14. Deep Storage & Persistence

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 14.1 | Character save/load | Create character; reload page | Character appears in registry; full state restored | |
| 14.2 | JSON export | Click Export on character sheet | `.json` file downloaded with full Character object | |
| 14.3 | JSON import | Click Import; select valid `.json` | Character loaded; added to registry | |
| 14.4 | Auto-migration | Load character saved under old `dd-char-{name}` key | Migrated to `dd-char-{uuid}` key; old key removed | |
| 14.5 | Campaign config | Save subsystem config; reload | Config restored from `dd-campaign-config` | |
| 14.6 | Party stash persistence | Add stash items; reload | Items restored from `dd-party-stash` | |
| 14.7 | Session persistence | Create sessions; reload | Sessions restored from `dd-sessions` | |

---

## 15. Build & Packaging

| # | Test Case | Steps | Expected | Pass |
|---|-----------|-------|----------|------|
| 15.1 | `npm run build` | Run in project root | Compiles; TypeScript passes; all pages generated | |
| 15.2 | Tauri build (desktop) | Run `npx tauri build` | Desktop binary produced; icons correct | |
