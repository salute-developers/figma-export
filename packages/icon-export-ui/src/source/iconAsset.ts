import { camelize, compose, removeLineBreak } from '../utils';

const getSvgContent = (source: string) => (/<svg(.*?)>(.*?)<\/svg>/gm.exec(source) || [])[2];

const getViewBox = (source: string) => (/viewBox="(.*?)"/gm.exec(source) || [])[1];

const removeFillOpacity = (source: string) => source.replace(/fill-opacity="(.*?)"/gm, '');

const setFillCurrentColor = (source: string) => source.replace(/fill="(.*?)"/gm, 'fill="currentColor"');

const convertCSSProperty = (source: string) =>
    source.replace(
        /([a-zA-Z-]*):(.*)/g,
        (...match) => `${camelize(match[1])}: ${Number.isNaN(Number(match[2])) ? `'${match[2]}'` : match[2]}`,
    );

const getCSSProperties = (source: string) => source.split(';').map(convertCSSProperty).join(',');

const convertInlineStyleToObject = (source: string) =>
    source.replace(/style="(.*?)"/gm, (_, group) => `style={{ ${getCSSProperties(group)} }}`);

const camelizeAttributes = (source: string) => source.replace(/([\w-]+)=/g, camelize);

/**
 * Здесь экспортируется svg иконки.
 */
export const getExportSvg = async (selection: SceneNode) => {
    const svgSource = await selection.exportAsync({
        format: 'SVG',
    });

    return String.fromCharCode.apply(null, Array.from(svgSource));
};

/**
 * Функция генерации файла `/Icon.assets/<Name>.tsx`. Здесь экспортируется иконка из figma
 * и возвращается svg компонент иконки.
 */
export default (source: string, iconName: string) => {
    const viewBox = getViewBox(source);
    const svgContent = compose(
        removeLineBreak,
        getSvgContent,
        setFillCurrentColor,
        removeFillOpacity,
        convertInlineStyleToObject,
        camelizeAttributes,
    )(source);

    return `import React from 'react';

import { IconProps } from '../IconRoot';

export const ${iconName}: React.FC<IconProps> = (props) => (
    <svg width="100%" viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        ${svgContent}
    </svg>
);
`;
};
