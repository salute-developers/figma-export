import type { IconVariant, ParsedIconName } from './types';

export interface AncestorDescriptor {
    name: string;
    width?: number;
}

export interface IconClassification {
    category: string;
    group: string;
}

const GENERIC_CONTAINER_NAMES = new Set(['icons', 'icon', 'components', 'component', 'content', 'grid', 'list']);

const VARIANT_SUFFIXES: Array<{ suffix: string; variant: IconVariant }> = [
    { suffix: 'OutlineBold', variant: 'outline-bold' },
    { suffix: 'Outline', variant: 'outline' },
    { suffix: 'Fill', variant: 'fill' },
    { suffix: 'Bold', variant: 'bold' },
];

const compact = (value: string) => value.replace(/[\s/_-]+/g, '').toLocaleLowerCase();

const toPascalCase = (value: string) =>
    value
        .trim()
        .replace(/^(?:ic[\s_-]*)?\d{1,3}[\s_-]*/i, '')
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1))
        .join('');

export const parseIconName = (originalName: string): ParsedIconName => {
    const lastSegment = originalName.split('/').pop() || originalName;
    const normalizedName = toPascalCase(lastSegment);

    for (const { suffix, variant } of VARIANT_SUFFIXES) {
        if (normalizedName.length > suffix.length && normalizedName.endsWith(suffix)) {
            return {
                name: normalizedName.slice(0, -suffix.length),
                variant,
            };
        }
    }

    return { name: normalizedName, variant: 'regular' };
};

export const classifyIcon = (
    ancestors: AncestorDescriptor[],
    originalName: string,
    iconWidth: number,
): IconClassification => {
    const meaningful: AncestorDescriptor[] = [];

    ancestors.forEach((ancestor) => {
        const normalized = compact(ancestor.name);

        if (!normalized || GENERIC_CONTAINER_NAMES.has(normalized)) {
            return;
        }

        const previous = meaningful[meaningful.length - 1];
        if (previous && compact(previous.name) === normalized) {
            return;
        }

        meaningful.push(ancestor);
    });

    if (meaningful.length === 0) {
        return { category: 'Uncategorized', group: '' };
    }

    const category = meaningful[0].name;
    const originalCompact = compact(originalName);
    const groups = meaningful.slice(1).filter((ancestor) => {
        const isSmallWrapper = ancestor.width !== undefined && ancestor.width <= iconWidth * 6;
        return !(isSmallWrapper && originalCompact.startsWith(compact(ancestor.name)));
    });

    return {
        category,
        group: groups.map((group) => group.name).join(' / '),
    };
};
