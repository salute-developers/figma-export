import { getIconAsset, getIconComponent, getIconSource, getIndexSource } from '../source';
import type {
    FilesPayloadResponse,
    FilesPayloadRequest,
    UIMessage,
    IconPayload,
    TokenPayloadRequest,
    TokenPayloadResponse,
} from '../types';

const selectionNode = figma.currentPage.selection[0];

const defaultSetting = {
    title: 'Icon exporter plugin',
    height: 638,
    width: 372,
};

const sendMetaDataInfo = (selection: SceneNode) => {
    const { width, height } = selection;

    const supportSizes = [16, 24, 36, 48, 56, 64];

    if (width !== height || !supportSizes.includes(width)) {
        figma.closePlugin(`Please select icon with correct size: ${supportSizes}. Current size: ${width}x${height}`);
        return;
    }

    const payload: UIMessage<IconPayload> = {
        type: 'update-size',
        payload: { size: width },
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

const main = async (selection: SceneNode, uiSetting: ShowUIOptions) => {
    figma.showUI(__html__, uiSetting);

    figma.on('run', async () => {
        sendMetaDataInfo(selection);
        await sendAccessToken();
    });

    figma.ui.on('message', async (msg: UIMessage<FilesPayloadRequest>) => {
        if (msg.type === 'export-start') {
            const { iconName, iconSource, indexSource, category } = msg.payload;

            const payload: UIMessage<FilesPayloadResponse> = {
                type: 'export-done',
                payload: {
                    iconAsset: await getIconAsset(selection, iconName),
                    iconComponent: getIconComponent(iconName),
                    indexSource: getIndexSource(indexSource, iconName),
                    iconSource: getIconSource(iconSource, category, iconName),
                },
            };
            figma.ui.postMessage(payload);
        }

        if (msg.type === 'create-pr-done') {
            figma.closePlugin();
        }

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
