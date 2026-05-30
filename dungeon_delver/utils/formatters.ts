export const formatEntries = (entries: any): string => {
    if (!entries) return "";

    let text = "";
    if (typeof entries === 'string') {
        text = entries;
    } else if (Array.isArray(entries)) {
        text = entries.map(e => {
            if (typeof e === 'string') return e;
            if (typeof e === 'object') {
                // Handle lists inside entries
                if (e.type === 'list' && e.items) return e.items.join(", ");
                // Handle nested entries (like "Core Ranger Traits")
                return formatEntries(e.entries || e.entry || "");
            }
            return "";
        }).join("\n\n"); // Use double newline for paragraphs
    } else if (typeof entries === 'object') {
        text = (entries.name ? `**${entries.name}**: ` : "") +
            formatEntries(entries.entry || entries.entries || "");
    }

    return cleanString(text);
};


// utils/formatters.ts

// utils/formatters.ts

export const cleanString = (str: string): string => {
    if (!str || typeof str !== 'string') return str;

    // Strip (a), (b), (c) prefixes with extra safety for leading spaces
    let cleaned = str.replace(/^\s*\([a-z]\)\s*/i, '');

    // Strip bare {@tag} and {@tag ...} patterns (including {@h}, {@atk mw}, etc.)
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

    // Strip bare |source suffix from strings (e.g., "diplomat's pack|phb" -> "diplomat's pack")
    cleaned = cleaned.replace(/\|(\w+)\s*$/g, '');
    cleaned = cleaned.split('|')[0];

    // Strip melee/ranged attack tags left as raw text (mw,rw, mw, rw, md, rd)
    cleaned = cleaned.replace(/^mw,rw\s+/i, '');
    cleaned = cleaned.replace(/^mw\s+/i, '');
    cleaned = cleaned.replace(/^rw\s+/i, '');
    cleaned = cleaned.replace(/^md\s+/i, '');
    cleaned = cleaned.replace(/^rd\s+/i, '');

    return cleaned.trim();
};

export const formatValue = (data: any): string => {
    if (!data) return "N/A";
    if (typeof data === 'object' && !Array.isArray(data)) {
        return Object.entries(data).map(([key, val]) => `${key}: ${val}`).join(", ");
    }
    if (data.average) return data.average.toString();
    return data.toString();
};