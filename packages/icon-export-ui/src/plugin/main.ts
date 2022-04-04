import { getExportSvg } from '../source/iconAsset';
import type { UIMessage, IconPayload, TokenPayloadResponse, TokenPayloadRequest } from '../types';
import { camelize, upperFirstLetter } from '../utils';

const selectionNode = figma.currentPage.selection;

const defaultSetting = {
    title: 'Icon exporter plugin',
    height: 410,
    width: 700,
};

const getNormalizedName = (name: string) => {
    const secondPart = camelize(name).split('/')[1] || camelize(name);
    const withoutPrefix = secondPart
        .trim()
        .replace(/^(\s*)[a-zA-Z_]+(\d\d)/g, '')
        .replace(/\s/g, '');
    return upperFirstLetter(withoutPrefix);
};

const sendMetaDataInfo = async (selections: readonly SceneNode[]) => {
    const iconsMetaData = await Promise.all(
        selections.map(async (selection) => {
            const { width, name } = selection;

            const normalizedName = getNormalizedName(name);
            const svg = await getExportSvg(selection);

            return {
                size: Math.round(width),
                name: normalizedName,
                svg,
            };
        }),
    );

    const payload: UIMessage<IconPayload[]> = {
        type: 'update-icon-data',
        payload: iconsMetaData,
    };
    figma.ui.postMessage(payload);
};

const sendAccessToken = async () => {
    const token = await figma.clientStorage.getAsync('access-token');

    const payload: UIMessage<TokenPayloadResponse> = {
        type: 'token',
        payload: {
            token,
        },
    };
    figma.ui.postMessage(payload);
};

const main = async (selections: readonly SceneNode[], uiSetting: ShowUIOptions) => {
    figma.showUI(__html__, uiSetting);

    figma.on('run', async () => {
        await sendMetaDataInfo(selections);
        await sendAccessToken();
    });

    figma.ui.on('message', async (msg: UIMessage) => {
        if (msg.type === 'cancel') {
            figma.closePlugin();
        }
    });

    figma.ui.on('message', async (msg: UIMessage<TokenPayloadRequest>) => {
        if (msg.type === 'set-token') {
            await figma.clientStorage.setAsync('access-token', msg.payload.token);
        }
    });
};

main(selectionNode, defaultSetting);
