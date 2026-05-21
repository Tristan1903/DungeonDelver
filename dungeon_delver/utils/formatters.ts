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

export const cleanString = (str: string): string => {
    if (!str || typeof str !== 'string') return str;

    // Apply regex repeatedly to handle nested tags
    let result = str;
    let previousResult = '';
    
    // Keep applying the regex until no more changes (handles nested tags)
    while (result !== previousResult) {
        previousResult = result;
        result = result.replace(/\{@(\w+)\s?([^}]+)?\}/g, (match, tag, content) => {
            if (!content) return "";

            const tagLower = tag.toLowerCase();

            // 1. HIDDEN METADATA: Explicitly kill these tags
            const tagsToHide = ['variantrule', 'note', 'info', 'book', 'link', '5etools', 'source', 'prerequisite'];
            if (tagsToHide.includes(tagLower)) return "";

            // 2. MECHANICAL SHORTHAND
            if (tagLower === 'recharge') return `(Recharge ${content})`;
            if (tagLower === 'dc') return `DC ${content}`;
            if (tagLower === 'h') return "Hit: ";

            // 3. PIPES (|): Fix for the 'p' has any type error
            const parts = content.split('|');
            if (parts.length > 1) {
                const technicalKeywords = ['xphb', 'phb', 'mm', 'vgm', 'tce', 'xge', 'class=', 'item=', 'optfeature=', 'ability='];

                // Note the (p: string) below - this fixes your TypeScript error
                const cleanParts = parts.filter((p: string) =>
                    !technicalKeywords.some(tk => p.toLowerCase().includes(tk))
                );

                return cleanParts.length > 0 ? cleanParts[0] : parts[0];
            }

            return content;
        });
    }
    
    return result
        .replace(/\s\s+/g, ' ') // Remove double spaces
        .trim();
};

export const formatValue = (data: any): string => {
    if (!data) return "N/A";
    if (typeof data === 'object' && !Array.isArray(data)) {
        return Object.entries(data).map(([key, val]) => `${key}: ${val}`).join(", ");
    }
    if (data.average) return data.average.toString();
    return data.toString();
};