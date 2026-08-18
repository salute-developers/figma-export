export interface ComponentInformationMetadata {
    aliases?: string[];
    sourceCategory?: string;
    source?: string;
    size?: number;
}

const escapeXmlText = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

export const parseComponentInformation = (description: string): ComponentInformationMetadata => {
    const fields = new Map<string, string>();

    description
        .replace(/\s+/g, ' ')
        .split(';')
        .forEach((part) => {
            const separatorIndex = part.indexOf(':');
            if (separatorIndex === -1) return;

            const key = part.slice(0, separatorIndex).trim().toLocaleLowerCase();
            const value = part.slice(separatorIndex + 1).trim();
            if (key && value) fields.set(key, value);
        });

    const aliases = Array.from(
        new Set(
            (fields.get('aliases') || '')
                .split(',')
                .map((alias) => alias.trim())
                .filter(Boolean),
        ),
    );
    const sourceCategory = fields.get('source category');
    const source = fields.get('source');
    const rawSize = fields.get('size');
    const parsedSize = rawSize === undefined ? undefined : Number(rawSize);

    return {
        ...(aliases.length > 0 ? { aliases } : {}),
        ...(sourceCategory ? { sourceCategory } : {}),
        ...(source ? { source } : {}),
        ...(parsedSize !== undefined && Number.isFinite(parsedSize) ? { size: parsedSize } : {}),
    };
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
