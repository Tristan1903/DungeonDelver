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

    // Remove the source/book info from items (e.g., "greataxe|phb" -> "greataxe")
    let cleaned = str.split('|')[0];

    // Strip (a), (b), (c) prefixes with extra safety for leading spaces
    cleaned = cleaned.replace(/^\s*\([a-z]\)\s*/i, '');

    // Handle the standard {@tag ...} patterns
    return cleaned.replace(/\{@(\w+)\s?([^}]+)?\}/g, (match, tag, content) => {
        if (!content) return "";
        const parts = content.split('|');
        // Always take the first part for items/names
        return parts[0].replace(/.*=/, '').trim();
    }).trim();
};

export const formatValue = (data: any): string => {
    if (!data) return "N/A";
    if (typeof data === 'object' && !Array.isArray(data)) {
        return Object.entries(data).map(([key, val]) => `${key}: ${val}`).join(", ");
    }
    if (data.average) return data.average.toString();
    return data.toString();
};