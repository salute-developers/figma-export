import { insertString, lowerFirstLetter } from '../utils';

const CATEGORIES_OBJECT_LINE = 'export const iconSectionsSet = {';

const getStartIndex = (source: string, text: string) => source.search(text);

const getEndIndex = (source: string, index: number) => source.substring(index).search('};');

const getCategoryEndIndex = (source: string, index: number) => source.substring(index).search('    },');

const addToIconCategory = (source: string, index: number, iconName: string) =>
    insertString(source, index, `        ${lowerFirstLetter(iconName)}: '${iconName}',\n`);

const addToCategories = (source: string, start: number, iconName: string, category: string) => {
    let newSource = source;
    let end = start + getEndIndex(newSource, start);
    let categories = source.substring(start, end);
    let categoryStart = getStartIndex(categories, `    ${category}: {`);

    if (categoryStart === -1) {
        newSource = createIconCategory(source, end, category);
        end = start + getEndIndex(newSource, start);
        categories = newSource.substring(start, end);
        categoryStart = getStartIndex(categories, `    ${category}: {`);
    }
    const categoryEnd = getCategoryEndIndex(categories, categoryStart);

    return addToIconCategory(newSource, start + categoryStart + categoryEnd, iconName);
};

const createIconCategories = (source: string, index: number) =>
    insertString(source, index, `\n\n${CATEGORIES_OBJECT_LINE}\n};\n`);

const createIconCategory = (source: string, index: number, category: string) =>
    insertString(source, index, `    ${category}: {\n    },\n`);

/**
 * Функция модификации файла `/Icon.tsx`. Здесь вставляется сгенерированный импорт иконки,
 * и добавляется её компонент в список иконок по категориям
 */
export default (source: string, iconName: string, category: string) => {
    if (source.includes(`'${iconName}'`)) {
        return source;
    }

    let newSource = source;

    let startIndexCategories = getStartIndex(newSource, CATEGORIES_OBJECT_LINE);
    if (startIndexCategories === -1) {
        newSource = createIconCategories(newSource, newSource.lastIndexOf('\n'));
        startIndexCategories = getStartIndex(newSource, CATEGORIES_OBJECT_LINE);
    }

    return addToCategories(newSource, startIndexCategories, iconName, category);
};
