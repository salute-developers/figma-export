import { insertString, lowerFirstLetter } from '../utils';

const EXPORT_ICON_SET_OBJECT_LINE = 'export const iconSet';

const getStartIndex = (source: string, text: string) => source.search(text);

const getEndIndex = (source: string, index: number) => source.substring(index).search('}');

const addToIconSet = (source: string, index: number, iconName: string) =>
    insertString(source, index, `    ${lowerFirstLetter(iconName)}: ${iconName},\n`);

const getIconImport = (iconName: string) => `import { ${iconName} } from './${iconName}';\n`;

/**
 * Функция модификации файла `/icon.ts`. Здесь вставляется сгенерированный импорт иконки,
 * и добавляется её компонент в общий список иконок
 */
export default (source: string, iconName: string) => {
    if (source.includes(`{ ${iconName} }`)) {
        return source;
    }

    const index = source.search(EXPORT_ICON_SET_OBJECT_LINE) - 1;
    const newSource = insertString(source, index, getIconImport(iconName));

    const startIndex = getStartIndex(newSource, EXPORT_ICON_SET_OBJECT_LINE);
    const endIndex = getEndIndex(newSource, startIndex);

    return addToIconSet(newSource, startIndex + endIndex, iconName);
};
