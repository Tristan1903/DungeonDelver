/**
 * DungeonDelver Sync Behavior
 *
 * ## Sync Architecture
 *
 * Two sync systems operate independently:
 *
 * 1. **WebSocket Sync** (real-time, session-level)
 *    - Relays state between DM and Player devices on the same LAN
 *    - No persistence — ephemeral room-based broadcast
 *    - Uses `utils/syncEngine.ts` client + `server/sync-server.js`
 *    - DM runs server with `npm run sync-server` on port 3001
 *    - Sync UI at `/dm/sync`
 *
 * 2. **Supabase Sync** (persistent, campaign-level)
 *    - Stores characters, sessions, encounters, storylines, notes
 *    - Each row identified by UUID, belongs to a campaign
 *    - Last-write-wins for characters (version field for conflict detection)
 *    - Supabase client at `utils/supabase.ts`
 *    - Tables created via Supabase dashboard SQL editor
 *
 * ## Conflict Rules
 *
 * | Entity      | Strategy      | Details |
 * |-------------|---------------|---------|
 * | Character   | Last-write-wins | `version` field compared; higher wins |
 * | Session     | Last-write-wins | `updated_at` timestamp |
 * | Encounter   | Merge          | Combatants array merged by UUID |
 * | Storyline   | Last-write-wins | `updated_at` timestamp |
 * | Note        | Last-write-wins | `created_at` + `author` for dedup |
 *
 * ## Offline Mode
 *
 * - All data is stored in localStorage (primary source of truth)
 * - Supabase sync is opt-in via the Sync page (`/dm/sync`)
 * - When offline, reads and writes go to localStorage only
 * - On reconnect, a full sync is triggered:
 *   1. Push local changes (local version > remote version)
 *   2. Pull remote changes (remote version > local version)
 *   3. Conflicts resolved per above rules
 *
 * ## Troubleshooting
 *
 * - **WebSocket won't connect**: Ensure `server/sync-server.js` is running
 * - **Supabase auth errors**: Check `.local.env` has valid credentials
 * - **Data not syncing**: Open browser console and check `dd-*` localStorage keys
 */
export {};
