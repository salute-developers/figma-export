import { getExportSvg } from '../source/iconAsset';
import type { UIMessage, IconPayload, TokenPayloadResponse, TokenPayloadRequest } from '../types';
import { camelize, upperFirstLetter } from '../utils';

const selectionNode = figma.currentPage.selection;

const defaultSetting = {
    title: 'Icon exporter plugin',
    height: 410,
    width: 700,
};

/**
 * Получить имя, размер и категорию из полного имени
 * Example:
 * 24 / Operation / 24_ShareScreenOutline - новый формат
 * Player / ic_36_pause_outline - старый формат
 */
const getNormalizedName = (name: string) => {
    const trimmedName = name.replace(/\s/g, '');
    // в новом формате
    const [size, category, nameWithSize] = trimmedName.split('/');

    if (!size || !category || !nameWithSize) {
        const last = camelize(trimmedName).split('/').slice(-1)[0];
        const withoutPrefix = last
            .trim()
            .replace(/^(\s*)[a-zA-Z_]+(\d\d)/g, '') // убирает все символы и размер перед названием: ic36pauseOutline -> pauseOutline
            .replace(/\s/g, '');
        return upperFirstLetter(withoutPrefix);
    }

    return {
        size,
        category,
        name: upperFirstLetter(nameWithSize.split('_').slice(-1)[0]), // убирает размер перед названием
    };
};

const getNames = async (node: ComponentNode | InstanceNode) => {
    const { width, name: nodeName } = node;

    const normalizedName = getNormalizedName(nodeName);
    const svg = await getExportSvg(node);

    const isString = typeof normalizedName === 'string';

    return {
        size: isString ? Math.round(width) : Number(normalizedName.size),
        category: isString ? 'Other' : normalizedName.category,
        name: isString ? normalizedName : normalizedName.name,
        svg,
    };
};

const sendMetaDataInfo = async (selections: readonly SceneNode[]) => {
    const iconsMetaData = await Promise.all(
        selections.map(async (selection) => {
            const { type } = selection;

            if (type !== 'FRAME') {
                return [];
            }

            const nodes = (selection as FrameNode).findAllWithCriteria({
                types: ['COMPONENT', 'INSTANCE'],
            });

            return await Promise.all(nodes.map(getNames));
        }),
    );

    const payload: UIMessage<IconPayload[]> = {
        type: 'update-icon-data',
        payload: iconsMetaData.flat(),
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
