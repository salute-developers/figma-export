import parserTypeScript from 'prettier/parser-babel';
import prettier from 'prettier/standalone';
import type { Options } from 'prettier';

import { FilesPayloadResponse, IconComponents, IconPayload } from '../../types';
import { getIconAsset, getIconComponent, getIconSource, getIndexSource } from '../../source';
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

export const getFilesPath = (iconName?: string, iconSize?: number) => ({
    iconSourceExport: 'packages/plasma-icons/src/scalable/index.ts',
    iconSourceImport16: 'packages/plasma-icons/src/scalable/Icon.assets.16/index.ts',
    iconSourceImport24: 'packages/plasma-icons/src/scalable/Icon.assets.24/index.ts',
    iconSourceImport36: 'packages/plasma-icons/src/scalable/Icon.assets.36/index.ts',
    iconAsset: `packages/plasma-icons/src/scalable/Icon.assets.${iconSize}/${iconName}.tsx`,
    iconComponent: `packages/plasma-icons/src/scalable/Icons/Icon${iconName}.tsx`,
});

export const getFilesPayload = (iconsMetaData: IconPayload[], ...args: string[]): FilesPayloadResponse => {
    let [iconSourceExport, iconSourceImport16, iconSourceImport24, iconSourceImport36] = args;

    const iconsComponents = iconsMetaData.map(({ size, name = 'IconName', svg }) => {
        iconSourceExport = getIndexSource(iconSourceExport, name);

        if (size === 16) {
            iconSourceImport16 = getIconSource(iconSourceImport16, name);
        }
        if (size === 24) {
            iconSourceImport24 = getIconSource(iconSourceImport24, name);
        }
        if (size === 36) {
            iconSourceImport36 = getIconSource(iconSourceImport36, name);
        }

        return {
            iconSize: size,
            iconName: name,
            iconAsset: prettify(getIconAsset(svg, name)),
            iconComponent: prettify(getIconComponent(name)),
        };
    });

    return {
        iconsComponents,
        iconSourceExport,
        iconSourceImport16,
        iconSourceImport24,
        iconSourceImport36,
    };
};

export const getGitHubData = async (token?: string, owner = 'salute-developers', repo = 'plasma') =>
    getFilesSource(
        owner,
        repo,
        [
            getFilesPath().iconSourceExport,
            getFilesPath().iconSourceImport16,
            getFilesPath().iconSourceImport24,
            getFilesPath().iconSourceImport36,
        ],
        token,
    );

export const getFlatIconFiles = (iconsComponents: IconComponents[]) =>
    iconsComponents.reduce((acc: Record<string, string>, { iconAsset, iconComponent, iconName, iconSize }) => {
        acc[getFilesPath(iconName).iconComponent] = iconComponent;
        acc[getFilesPath(iconName, iconSize).iconAsset] = iconAsset;

        return acc;
    }, {});

export const getFilesTree = ({
    iconSourceExport,
    iconSourceImport16,
    iconSourceImport24,
    iconSourceImport36,
    iconsComponents,
}: FilesPayloadResponse) => {
    const iconFiles = getFlatIconFiles(iconsComponents);

    return {
        [getFilesPath().iconSourceExport]: iconSourceExport,
        [getFilesPath().iconSourceImport16]: iconSourceImport16,
        [getFilesPath().iconSourceImport24]: iconSourceImport24,
        [getFilesPath().iconSourceImport36]: iconSourceImport36,
        ...iconFiles,
    };
};
