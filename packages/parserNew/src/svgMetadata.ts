export interface ComponentInformationMetadata {
    aliases?: string[];
    category?: string;
    source?: string;
    size?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeString = (value: unknown): string | undefined => {
    if (typeof value !== 'string' && typeof value !== 'number') return undefined;

    const normalized = String(value).trim();
    return normalized || undefined;
};

const normalizeAliases = (value: unknown): string[] => {
    const aliases = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];

    return Array.from(
        new Set(
            aliases
                .map((alias) => normalizeString(alias))
                .filter((alias): alias is string => Boolean(alias)),
        ),
    );
};

const toMetadata = (value: Record<string, unknown>): ComponentInformationMetadata => {
    const aliases = normalizeAliases(value.aliases);
    const category = normalizeString(value.category);
    const source = normalizeString(value.source);
    const size = normalizeString(value.size);

    return {
        ...(aliases.length > 0 ? { aliases } : {}),
        ...(category ? { category } : {}),
        ...(source ? { source } : {}),
        ...(size ? { size } : {}),
    };
};

const parseJsonMetadata = (description: string): ComponentInformationMetadata | null => {
    try {
        const parsed: unknown = JSON.parse(description);
        return isRecord(parsed) ? toMetadata(parsed) : {};
    } catch (_error) {
        return null;
    }
};

const escapeXmlText = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

export const parseComponentInformation = (description: string): ComponentInformationMetadata => {
    const trimmedDescription = description.trim();
    if (!trimmedDescription) return {};

    const jsonMetadata = parseJsonMetadata(trimmedDescription);
    if (jsonMetadata) return jsonMetadata;

    const fields = new Map<string, string>();

    trimmedDescription
        .replace(/\s+/g, ' ')
        .split(';')
        .forEach((part) => {
            const separatorIndex = part.indexOf(':');
            if (separatorIndex === -1) return;

            const key = part.slice(0, separatorIndex).trim().toLocaleLowerCase();
            const value = part.slice(separatorIndex + 1).trim();
            if (key && value) fields.set(key, value);
        });

    return toMetadata({
        aliases: fields.get('aliases'),
        category: fields.get('category') || fields.get('source category'),
        source: fields.get('source'),
        size: fields.get('size'),
    });
};

export const addComponentInformationMetadata = (
    svg: string,
    information: ComponentInformationMetadata,
): string => {
    if (Object.keys(information).length === 0) return svg;

    const metadataElement = `<metadata>${escapeXmlText(
        JSON.stringify(information),
    )}</metadata>`;
    const svgOpeningTag = /<svg\b[^>]*>/i;

    if (!svgOpeningTag.test(svg)) {
        throw new Error('Exported SVG does not contain a root <svg> element');
    }

    return svg.replace(svgOpeningTag, (openingTag) => `${openingTag}\n${metadataElement}`);
};
