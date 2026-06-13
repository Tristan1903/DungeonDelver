// =============================================================================
// 📘 FILE: utils/formatters.ts
// =============================================================================
// 🎯 PURPOSE: String formatting utilities — cleans up D&D monster/spell data
//    entries by stripping markup tags, source suffixes, and formatting nested
//    entry structures into readable text.
//
// 🧠 REACT CONCEPT: Data Transformation Layer
//    Raw D&D data from JSON files has special markup like `{@atk mw}` or
//    `|phb` suffixes. These are great for the source data format but terrible
//    for display. This file "cleans" that data into human-readable text.
//
//    💡 This is a form of the "Adapter" pattern — transform data from one
//    format to another without changing the source or the display component.
//
// 🔧 HOW TO ALTER:
//    - Add new markup tag handling: add a new case in the regex replacement
//    - Change formatting style: modify the join() separators
//    - Add new cleanString rules: add more regex replacements
// =============================================================================

// 🧠 formatEntries — Recursively converts D&D JSON entry structures to text.
//    Entries can be strings, arrays of strings/objects, or objects with
//    type/entry/entries fields. This handles ALL of those cases recursively.
export const formatEntries = (entries: any): string => {
    if (!entries) return "";
    let text = "";
    if (typeof entries === 'string') {
        text = entries;
    } else if (Array.isArray(entries)) {
        // 🧠 Array entries: could be strings, objects (lists, nested), or mixed.
        //    Uses recursion for nested entries.
        text = entries.map(e => {
            if (typeof e === 'string') return e;
            if (typeof e === 'object') {
                if (e.type === 'list' && e.items) return e.items.join(", ");
                return formatEntries(e.entries || e.entry || "");
            }
            return "";
        }).join("\n\n");  // Double newline = paragraph break
    } else if (typeof entries === 'object') {
        text = (entries.name ? `**${entries.name}**: ` : "") +
            formatEntries(entries.entry || entries.entries || "");
    }
    return cleanString(text);
};

// 🧠 cleanString — The main markup stripper. Removes:
//    1. "(a)", "(b)" prefixes (from D&D entry formatting)
//    2. {@tag} patterns (the 5e JSON tools markup language)
//    3. |source suffixes (e.g., "diplomat's pack|phb" → "diplomat's pack")
//    4. Bare mw/rw/melee/ranged attack tags
export const cleanString = (str: string): string => {
    if (!str || typeof str !== 'string') return str;
    let cleaned = str.replace(/^\s*\([a-z]\)\s*/i, '');
    // 🧠 {@tag content|source} → extracts the display text before the first |
    //    E.g., {@atk mw} → "" (empty, atk tags are removed entirely)
    //    {@i fireball|PHB} → "fireball" (italic tag, extract content)
    cleaned = cleaned.replace(/\{@\w+(?:\s[^}]*)?\}/g, (match) => {
        const inner = match.slice(2, -1);
        const parts = inner.split(/\s+/);
        const tag = parts[0];
        const content = parts.slice(1).join(' ');
        if (!content) return '';
        if (tag === '@atk') return '';
        const segments = content.split('|');
        return segments[0].replace(/.*=/, '').trim();
    });
    cleaned = cleaned.replace(/\|(\w+)\s*$/g, '');  // Strip trailing |source
    cleaned = cleaned.split('|')[0];                  // Take text before any |
    // Strip melee/ranged attack tags left as raw text
    cleaned = cleaned.replace(/^mw,rw\s+/i, '');
    cleaned = cleaned.replace(/^mw\s+/i, '');
    cleaned = cleaned.replace(/^rw\s+/i, '');
    cleaned = cleaned.replace(/^md\s+/i, '');
    cleaned = cleaned.replace(/^rd\s+/i, '');
    return cleaned.trim();
};

// 🧠 formatValue — Converts any data type to a display string.
//    Objects get formatted as "key: value, key: value".
//    Uses .average for dice formulas (pre-computed average).
export const formatValue = (data: any): string => {
    if (!data) return "N/A";
    if (typeof data === 'object' && !Array.isArray(data)) {
        return Object.entries(data).map(([key, val]) => `${key}: ${val}`).join(", ");
    }
    if (data.average) return data.average.toString();
    return data.toString();
};
