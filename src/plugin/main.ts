import { getExportSvg } from '../source/iconAsset';
import type {
    UIMessage,
    IconPayload,
    TokenPayloadResponse,
    TokenPayloadRequest,
    SearchIconPayload,
    PluginSession,
} from '../types';
import { camelize, upperFirstLetter } from '../utils';

const STORAGE_KEYS = {
    TOKEN: 'access-token',
    SESSION: 'plugin-session',
} as const;

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

/**
 * Извлекает чистое имя иконки без размера и префиксов
 * Например: "24_ShareScreenOutline" -> "ShareScreenOutline"
 */
const extractIconName = (name: string): string => {
    const trimmedName = name.replace(/\s/g, '');
    const [size, category, nameWithSize] = trimmedName.split('/');

    if (!size || !category || !nameWithSize) {
        const last = camelize(trimmedName).split('/').slice(-1)[0];

        const withoutPrefix = last
            .trim()
            .replace(/^(\s*)[a-zA-Z_]+(\d\d)/g, '')
            .replace(/\s/g, '');

        return upperFirstLetter(withoutPrefix);
    }

    // Убираем размер из начала: "24_ShareScreenOutline" -> "ShareScreenOutline"
    return upperFirstLetter(nameWithSize.split('_').slice(-1)[0]);
};

/**
 * Находит все компоненты иконок на страницах с размерами 16, 24, 36
 */
const findAllIconComponents = (): (ComponentNode | InstanceNode)[] => {
    const allNodes: (ComponentNode | InstanceNode)[] = [];

    const targetPages = ['16×16 [xsmall]', '24×24 [small]', '36×36 [medium]'];

    figma.root.children.forEach((page) => {
        if (!targetPages.includes(page.name)) {
            return;
        }

        // Ищем компоненты напрямую на странице
        const componentsOnPage = page.findAllWithCriteria({
            types: ['COMPONENT', 'INSTANCE'],
        });

        allNodes.push(...componentsOnPage);
    });

    return allNodes;
};

/**
 * Находит все размеры для указанных иконок по их именам
 */
const findAllSizesForIcons = async (selections: readonly SceneNode[]): Promise<IconPayload[]> => {
    // Собираем имена выбранных иконок
    const selectedIconNames = new Set<string>();

    for (const selection of selections) {
        if (selection.type === 'COMPONENT' || selection.type === 'INSTANCE') {
            const iconName = extractIconName(selection.name);

            selectedIconNames.add(iconName);
        } else if (selection.type === 'FRAME') {
            // Если выбран фрейм, берем все иконки внутри
            const nodes = (selection as FrameNode).findAllWithCriteria({
                types: ['COMPONENT', 'INSTANCE'],
            });

            nodes.forEach((node) => {
                const iconName = extractIconName(node.name);

                selectedIconNames.add(iconName);
            });
        }
    }

    return findIconsByNames(selectedIconNames);
};

/**
 * Находит все размеры иконок по списку имен
 */
const findIconsByNames = async (iconNames: Set<string>): Promise<IconPayload[]> => {
    if (iconNames.size === 0) {
        return [];
    }

    // Находим все компоненты на странице
    const allComponents = findAllIconComponents();

    // Фильтруем только те, что совпадают по имени
    const matchingNodes: (ComponentNode | InstanceNode)[] = [];
    const targetSizes = [16, 24, 36];

    allComponents.forEach((node) => {
        const iconName = extractIconName(node.name);
        const normalizedName = getNormalizedName(node.name);

        if (iconNames.has(iconName)) {
            // Проверяем, что размер один из нужных (16, 24, 36)
            const size = typeof normalizedName === 'string' ? Math.round(node.width) : Number(normalizedName.size);

            if (targetSizes.includes(size)) {
                matchingNodes.push(node);
            }
        }
    });

    return await Promise.all(matchingNodes.map(getNames));
};

const sendMetaDataInfo = async (selections: readonly SceneNode[]) => {
    let iconsMetaData: IconPayload[] = [];

    if (selections.length === 0) {
        // Если ничего не выбрано, возвращаем пустой массив
        iconsMetaData = [];
    } else {
        // Находим все размеры для выбранных иконок
        iconsMetaData = await findAllSizesForIcons(selections);
    }

    const payload: UIMessage<IconPayload[]> = {
        type: 'update-icon-data',
        payload: iconsMetaData,
    };
    figma.ui.postMessage(payload);
};

const sendAccessToken = async () => {
    const token = await figma.clientStorage.getAsync(STORAGE_KEYS.TOKEN);

    const payload: UIMessage<TokenPayloadResponse> = {
        type: 'token',
        payload: {
            token,
        },
    };
    figma.ui.postMessage(payload);
};

const sendSessionData = async () => {
    const sessionData = await figma.clientStorage.getAsync(STORAGE_KEYS.SESSION);

    const payload: UIMessage<PluginSession | null> = {
        type: 'session-data',
        payload: sessionData || null,
    };
    figma.ui.postMessage(payload);
};

const main = async (selections: readonly SceneNode[], uiSetting: ShowUIOptions) => {
    figma.showUI(__html__, uiSetting);

    figma.on('run', async () => {
        await sendMetaDataInfo(selections);
        await sendAccessToken();
        await sendSessionData();
    });

    figma.ui.on('message', async (msg: UIMessage) => {
        if (msg.type === 'cancel') {
            figma.closePlugin();
        }
    });

    figma.ui.on('message', async (msg: UIMessage<TokenPayloadRequest>) => {
        if (msg.type === 'set-token') {
            await figma.clientStorage.setAsync(STORAGE_KEYS.TOKEN, msg.payload.token);
        }
    });

    // Получить текущую сессию из clientStorage
    figma.ui.on('message', async (msg: UIMessage) => {
        if (msg.type === 'get-session') {
            await sendSessionData();
        }
    });

    // Сохранить сессию в clientStorage
    figma.ui.on('message', async (msg: UIMessage<PluginSession>) => {
        if (msg.type === 'save-session') {
            await figma.clientStorage.setAsync(STORAGE_KEYS.SESSION, msg.payload);
            figma.ui.postMessage({
                type: 'session-saved',
                payload: { success: true },
            });
        }
    });

    // Очистить сессию из clientStorage
    figma.ui.on('message', async (msg: UIMessage) => {
        if (msg.type === 'clear-session') {
            await figma.clientStorage.deleteAsync(STORAGE_KEYS.SESSION);
            figma.ui.postMessage({
                type: 'session-saved',
                payload: { success: true },
            });
        }
    });

    // INFO: Поиск иконки по названию во всех доступных размерах
    figma.ui.on('message', async (msg: UIMessage<SearchIconPayload>) => {
        if (msg.type !== 'search-icon') {
            return;
        }

        const iconName = msg.payload.iconName.trim();

        if (!iconName) {
            const payload: UIMessage<IconPayload[]> = {
                type: 'update-icon-data',
                payload: [],
            };

            figma.ui.postMessage(payload);

            return;
        }

        const iconNames = new Set<string>([upperFirstLetter(iconName)]);

        const iconsMetaData = await findIconsByNames(iconNames);

        const payload: UIMessage<IconPayload[]> = {
            type: 'update-icon-data',
            payload: iconsMetaData,
        };

        figma.ui.postMessage(payload);
    });
};

main(selectionNode, defaultSetting);
