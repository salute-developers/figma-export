import type { IconMetadata } from './types';

const sanitizeIconName = (name: string) =>
    name
        .replace(/\./g, '_')
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
        .replace(/\s+/g, '');

const getIconExportName = (icon: IconMetadata) => sanitizeIconName(icon.originalName || icon.name);

export const buildPullRequestFiles = (icons: IconMetadata[]): Record<string, string> => {
    const files: Record<string, string> = {};

    icons.forEach((icon) => {
        const iconName = getIconExportName(icon);
        files[`packages/sdds-icons/svg/${icon.size}/${iconName}.svg`] = icon.svg;
    });

    return files;
};

export const getIconNames = (icons: IconMetadata[]) =>
    Array.from(new Set(icons.map(getIconExportName))).sort((left, right) => left.localeCompare(right));
