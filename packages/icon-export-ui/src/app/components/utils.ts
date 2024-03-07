import parserTypeScript from 'prettier/parser-babel';
import prettier from 'prettier/standalone';
import type { Options } from 'prettier';

import { FilesPayloadResponse, IconComponents, IconPayload } from '../../types';
import { getIconCategories, getIconSvg } from '../../source';
import { getFilesSource } from '../api/githubFilesFetcher';

const prettierSetting: Options = {
    parser: 'babel',
    plugins: [parserTypeScript],
    arrowParens: 'always',
    printWidth: 120,
    jsxBracketSameLine: false,
    jsxSingleQuote: false,
    endOfLine: 'auto',
    semi: true,
    singleQuote: true,
    tabWidth: 4,
    trailingComma: 'all',
};

export const prettify = (source: string) => prettier.format(source, prettierSetting);

// Эскпортируем svg и информацию по категориям
export const getFilesPath = (iconName?: string, iconSize?: number) => ({
    iconSourceComponent: 'packages/plasma-icons/src/scalable/Icon.tsx',
    iconSvgAsset: `packages/plasma-icons/src/scalable/Icon.svg.${iconSize}/${iconName}.svg`,
});

export const getFilesPayload = (iconsMetaData: IconPayload[], ...args: string[]): FilesPayloadResponse => {
    let [iconSourceComponent] = args;

    const iconsComponents = iconsMetaData.map(({ size, name = 'IconName', category, svg }) => {
        iconSourceComponent = getIconCategories(iconSourceComponent, name, category);

        return {
            iconSize: size,
            iconName: name,
            iconSvgAsset: getIconSvg(svg),
        };
    });

    return {
        iconsComponents,
        iconSourceComponent,
    };
};

export const getGitHubData = async (token?: string, owner = 'salute-developers', repo = 'plasma') =>
    getFilesSource(owner, repo, [getFilesPath().iconSourceComponent], token);

export const getFlatIconFiles = (iconsComponents: IconComponents[]) =>
    iconsComponents.reduce((acc: Record<string, string>, { iconSvgAsset, iconName, iconSize }) => {
        acc[getFilesPath(iconName, iconSize).iconSvgAsset] = iconSvgAsset;

        return acc;
    }, {});

export const getFilesTree = ({ iconSourceComponent, iconsComponents }: FilesPayloadResponse) => {
    const iconFiles = getFlatIconFiles(iconsComponents);

    return {
        [getFilesPath().iconSourceComponent]: iconSourceComponent,
        ...iconFiles,
    };
};
