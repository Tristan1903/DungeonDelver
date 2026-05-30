# Anchored Summary

## Goal
- Fix JSX nesting bug in character sheet (line ~931 turbopack error) caused by ability scores + saving throws being placed inside `showSelect` block instead of the character sheet layout, with an extra `</div>` at line 820 that prematurely closed the inner container.

## Constraints & Preferences
- XPHB (2024) source must always be preferred over legacy sources in all data lookups.
- All class unique features (rage, ki, invocations, metamagic, etc.) should be fully implemented.
- Starting equipment pack contents should be expanded into individual items, not kept as a single pack.
- Items start unequipped by default in inventory.
- Only equipped items need paper doll slots; unequipped items live freely in backpack list.
- Party Stash will be a standalone page, not a tab on character sheets.
- Keep pounds for reference; Light/Medium/Heavy per slot for speed/stealth penalties (weight class system replaces pure weight tracking for penalties only).

## Progress
### Done
- Phase 3: **Multi-character save** — Characters auto-saved to localStorage under `dd-char-{name}`. "Save" saves to localStorage; "Export" saves `.json`; "Import" loads `.json` and imports to localStorage. "New Character" auto-saves current character first. Character select shows both localStorage and file-registry characters. Delete removes from both.
- Phase 3: **Actions tab shows spells** — "PREPARED SPELLS" section (prepared casters) or "KNOWN SPELLS" section (known casters) in Actions tab with each spell showing View, Cast (deducts slot), concentration indicator, casting time/range/components.
- Phase 3: **Manage Spells modal** — "Manage Spells" button in GRIMOIRE header opens modal with prepare/unprepare toggles (prepared casters only), inline spell detail, known caster info banner.
- Phase 3: **Cast deducts spell slots** — `castSpell` helper deducts the appropriate slot level for non-cantrips. Cast button shown for all leveled spells; cantrips only if has damage dice.
- Phase 3: **Upcasting** — When Cast clicked and multiple slot levels available, shows level picker pills (L1, L2, ...) with dismiss button.
- Phase 3: **Grayed out expended spells** — Spell cards at 0.4 opacity when all slots at that level are used. Works in both Actions tab and GRIMOIRE.
- Phase 3: **Prepared count validation** — `togglePrepare` prevents exceeding `maxPrepared` and shows "Already at max prepared spells!" warning.
- Phase 3: **Concentration tracker** — Persistent concentration bar in header showing active spell, with CON Save (DC 10), CON Save (half HP), and End Concentration buttons.
- Phase 3: **Batch spell loading** — Added `DataEngine.getSpellsByNames(names)` that filters cached full spell list once.
- Phase 3: **Pact slot display** — Shows `(Pact)` label next to pact slot levels in spell slots display.
- Phase 4: **ASI improvement** — Now supports "+2 to One" or "+1 to Two" stats with mode toggle, stat preview buttons, "Apply ASI" confirm button, and locked summary after confirmation.
- Phase 4: **Level-up intro screen** — Shown before choices; displays "What you'll gain" section listing HP, features, subclass, ASI, spellcasting changes, proficiency bonus. "BEGIN LEVEL UP" button transitions to choices.
- Phase 4: **Feature picks confirmation** — ⓘ button per option opens detail modal (description, type, prerequisite, source). "Confirm Feature Selections" button validates all required picks are filled. After confirmation, section locks with green summary.
- Phase 4: **Feature picks description** — Loads `optionalfeatures.json` on mount, builds name-to-data lookup. Detail modal shows full entry text, feature type (EI/MM/FS), source, and prerequisites.
- Phase 4: **Review Changes summary** — Full-width card at bottom of LevelUpView showing HP gain, ASI changes, new features count, spell slot changes, subclass selection.
- Phase 4: **Create-flow spell limit fix** — `getPreparedCount`, `usesPreparedSpells`, `isSpellcaster` all now handle XPHB's `preparedSpellsProgression` (flat array) in addition to the PHB formula string (`<$level$> + <$wis_mod$>`).
- Phase 4: **Create-flow subclass picker** — For classes with subclass at level 1 (Warlock, Cleric, etc.), now deduplicates subclass options by name (preferring XPHB) before rendering in the modal.
- Bug fix: **Feature picks not saved** — `characterProgression.ts:216` priority order changed from `existingChar.classFeaturePicks || draft` to `draft.classFeaturePicks || existingChar` so accumulated picks (old + new) aren't overwritten by old picks.
- Bug fix: **Feature picks disappearing** — `getAvailablePicks` now receives `oldFeaturePicks` (what character knew before this level) instead of the growing `featurePicks` state, so newly-selected options stay visible as toggled buttons.
- Phase 5: **Schema changes** — Added `slot?: PaperDollSlot`, `weightClass?: WeightClass`, `material?: string` to `InventoryItem`. Added `savingThrowProficiencies?: string[]` to Character. New types: `PaperDollSlot` (15 slots), `WeightClass`, `StashItem`. New helpers: `guessSlot`, `guessWeightClass`, `SLOT_LABELS`, `SLOT_ORDER_LIST`.
- Phase 5: **Paper doll layout** — Replaced sub-tab inventory (equipped/backpack/attunement/other) with a single view: Body silhouette grid (head, face, neck, shoulders, torso, back, wrists, hands, ring1, ring2, waist, feet) + Hotbar row (mainHand, offHand, ranged). Drag-and-drop equip via HTML5 DnD API on slot cells.
- Phase 5: **Backpack grid** — Right panel showing unequipped items with draggable rows, equip button with slot label, drag to paper doll to equip.
- Phase 5: **Weight load indicator** — Uses `computeLoad()` showing Light/Medium/Heavy/Overloaded with speed modifier and stealth disadvantage status, plus pounds bar.
- Phase 5: **Full set AC bonus** — `getLiveStats` now detects if head, torso, hands, feet are all equipped with the same `material`; grants +1 AC.
- Phase 5: **Attunement** — Integrated into inventory tab below paper doll + backpack. Shows attunement slot dots, attuned items list, unattune button.
- Phase 5: **Ability scores section** — 2-column grid (str/dex/con/int/wis/cha) showing stat score, modifier, and click-to-roll. Added above skills in left column.
- Phase 5: **Saving throws section** — 2-column grid showing all 6 saves with proficiency dot, stat name, bonus value. Clickable to roll. Added between ability scores and skills.
- **JSX nesting fix** — Restructured `page.tsx` return to properly wrap left column (stats/saves/skills/passive/hit dice) and right column (tabs/tab content) inside `{!showSelect && (...)}` with a flex row container. All modals and `<CharacterWizard />` are inside the outer fragment after both `showSelect` and `!showSelect` blocks. Fixed missing `SKILL_MAP` export in `characterEngine.ts`.

### In Progress
- None

### Blocked
- None

## Key Decisions
- Character creation wizard uses linear hub flow (Class → Species → Background → Abilities → Equipment → EquipmentDetail → Spells).
- Subclass selection occurs in the Level Wizard at the appropriate level **or** in the creation wizard if the class gets its subclass at level 1.
- Level Wizard is a standalone flow, separate from character creation.
- DM's subsystems (Piety, Renown, Dark Gifts, etc.) will be toggleable modules per campaign.
- Armor AC modeling: `getLiveStats` checks item `type` prefix (LA/MA/HA) for base AC and Dex cap, shields and misc items as bonuses. Full set bonus (+1 AC) if head/torso/hands/feet share same material.
- Spell slots are always recomputed via `buildSpellSlots`; level-up preserves `used` counts clamped to new max.
- Pact magic uses `spellSlots[pact.level]` for slot tracking; short rest resets them.
- Item descriptions: fallback generated from stats when no source `entries` exist.
- Character save uses localStorage (`dd-char-{name}`) as primary store. File `.json` export/import is secondary.
- Spell casting deducts the used spell slot immediately. Upcasting allows picking any available higher slot level.
- Concentration is tracked globally with a persistent header bar visible across all tabs.
- Spells are loaded in batch via `getSpellsByNames()` instead of per-spell calls.
- XPHB class data uses `preparedSpellsProgression` (flat array) for prepared counts, not `preparedSpells` (formula string). Both now supported in `getPreparedCount` and `usesPreparedSpells`.
- Feature pick `getAvailablePicks` filters options against OLD picks only (before this level-up), not the accumulated `featurePicks` state.
- Paper doll system: only equipped items get a body slot; unequipped items float freely in the backpack list. Slot guessed automatically from item type/name via `guessSlot()`.
- Weight class: pounds kept for reference; Light/Medium/Heavy per slot determines speed mods and stealth disadvantage via `computeLoad()`. Heavy Load (3+ heavy) = -5ft speed + stealth disadvantage; Overloaded (all 15 slots filled + back has items) = -10ft.
- Party Stash will be a standalone `/party-stash` page with shared localStorage and a "Mule Nearby" toggle to control withdrawal access.

## Next Steps
1. Phase 5 — Advantage rolling: add `rollD20WithAdvantage` to `rollEngine.ts`, add Normal/Advantage/Disadvantage popover on skill/ability/save click.
2. Phase 5 — Rich roll result display: animated panel with die faces, crit/fumble glow, auto-dismiss, roll history.
3. Phase 5 — Shared Party Stash standalone page (`/party-stash`) with add/take/mule toggle.
4. Phase 7 — Initiative page improvements: party management, conditions affecting stats, HP tracking for PCs.
5. Remaining DM campaign modules (Piety, Renown, Dark Gifts, Sanity, Honor).
6. VTT collaboration (multi-user sync, tokens, fog of war).

## Critical Context
- Build succeeds. No errors.
- `DataEngine.getItems()` merges `entries` from non-XPHB sources into XPHB items during dedup, and generates fallback descriptions for weapons/armor with no source entries.
- `findItemInLibrary` in character sheet returns merged XPHB item with entries fallback from any source.
- Character sheet `enrichInventory` fills missing `entries`, `type`, `modifiers.ac` from library on mount and when loading character files.
- `getLiveStats` in `characterEngine.ts` now handles armor AC by item type prefix (LA/MA/HA), tracks equipped materials for set bonus (+1 AC if head/torso/hands/feet share material).
- `computeLoad(char)` returns `{ label, speedMod, stealthDisadv, color }` based on equipped item weight classes.
- `guessSlot(item)` returns the best-matching paper doll slot from item type prefix or name keywords.
- `guessWeightClass(item)` returns `'heavy'`, `'medium'`, or `'light'` based on armor type prefix or name keywords.
- `getAvailablePicks(className, level, existingPicks)` in `classResources.ts` filters options already in `existingPicks`.

## Relevant Files
- `app/character-sheet/page.tsx`: Character sheet with paper doll inventory, ability scores + saving throws sections. Builds successfully.
- `utils/characterEngine.ts`: `getLiveStats` (armor AC + set bonus), `getProficiencyBonus`, `computeLoad`, `SKILL_MAP`, `SAVING_THROW_MAP`.
- `utils/spellcastingEngine.ts`: `buildSpellSlots`, `getMaxSpellLevel`, `getPreparedCount`, `getSpellSaveDC`.
- `utils/characterProgression.ts`: `finalizeCharacterFromWizard` with `classFeaturePicks` preferring `draft` over `existingChar`.
- `utils/classResources.ts`: `getAvailablePicks`, all class resource/pick definitions.
