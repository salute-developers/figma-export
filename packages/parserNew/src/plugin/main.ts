import { classifyIcon, getIconSearchKey, parseIconName, parseIconSearchQuery } from '../parser';
import { addComponentInformationMetadata, parseComponentInformation } from '../svgMetadata';
import type { AncestorDescriptor } from '../parser';
import type { IconMetadata, IconSourceInfo, ParseIssue, PluginMessage, UIMessage } from '../types';

declare const __html__: string;

type IconNode = ComponentNode | InstanceNode;

const UI_OPTIONS: ShowUIOptions = {
    title: 'parserNew',
    width: 760,
    height: 680,
};

const ICON_SOURCES = [
    { id: '25:2', expectedName: '16×16' },
    { id: '109:8872', expectedName: '24×24' },
    { id: '145:1331', expectedName: '36×36' },
] as const;

const EXPORT_BATCH_SIZE = 24;
const TOKEN_STORAGE_KEY = 'github-access-token';
const GITHUB_SESSION_STORAGE_KEY = 'github-pull-request-session';

let indexedIcons: IconNode[] = [];
let indexedSources: IconSourceInfo[] = [];
let indexInitialized = false;

const postMessage = (message: PluginMessage) => figma.ui.postMessage(message);
const getNodeByIdAsync = (id: string) =>
    (figma as unknown as { getNodeByIdAsync(nodeId: string): Promise<BaseNode | null> }).getNodeByIdAsync(id);

const hasChildren = (node: BaseNode): node is BaseNode & ChildrenMixin => 'children' in node;

const collectIconNodes = (roots: readonly SceneNode[]): IconNode[] => {
    const icons = new Map<string, IconNode>();

    const visit = (node: SceneNode) => {
        if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
            icons.set(node.id, node);
            return;
        }

        if (hasChildren(node)) node.children.forEach(visit);
    };

    roots.forEach(visit);
    return Array.from(icons.values());
};

const getSelectionLabel = (selection: readonly SceneNode[], iconCount: number): string => {
    const visibleNames = selection.slice(0, 3).map((node) => node.name || node.type);
    const remainingCount = selection.length - visibleNames.length;
    const suffix = remainingCount > 0 ? `, +${remainingCount} more` : '';

    return `Selected: ${visibleNames.join(', ')}${suffix} (${iconCount} ${iconCount === 1 ? 'icon' : 'icons'})`;
};

const getAncestors = (node: SceneNode): AncestorDescriptor[] => {
    const ancestors: AncestorDescriptor[] = [];
    let parent = node.parent;

    while (parent && parent.type !== 'PAGE' && parent.type !== 'DOCUMENT') {
        if ('width' in parent) {
            ancestors.unshift({ name: parent.name, width: parent.width });
        }
        parent = parent.parent;
    }

    return ancestors;
};

const getPageName = (node: BaseNode): string => {
    let current: BaseNode | null = node;

    while (current && current.type !== 'PAGE') {
        current = current.parent;
    }

    return current && current.type === 'PAGE' ? current.name : figma.currentPage.name;
};

const bytesToString = (bytes: Uint8Array): string => {
    let result = '';

    for (let offset = 0; offset < bytes.length; offset += 8192) {
        result += String.fromCharCode.apply(null, Array.from(bytes.slice(offset, offset + 8192)));
    }

    return result;
};

const getComponentKey = (node: IconNode): string | undefined => {
    if (node.type === 'COMPONENT') {
        return node.key || undefined;
    }

    return node.mainComponent && node.mainComponent.key ? node.mainComponent.key : undefined;
};

const getComponentInformation = (node: IconNode) => {
    const component = node.type === 'COMPONENT' ? node : node.mainComponent;
    if (!component) return {};

    const componentSet = component.parent && component.parent.type === 'COMPONENT_SET'
        ? component.parent
        : null;
    const description = component.description.trim() || (componentSet ? componentSet.description.trim() : '');

    return parseComponentInformation(description);
};

const exportIcon = async (node: IconNode): Promise<IconMetadata> => {
    const originalName = node.name;
    const size = Math.round(node.width);
    const parsedName = parseIconName(originalName);
    const classification = classifyIcon(getAncestors(node), originalName, size);
    const svgBytes = await node.exportAsync({ format: 'SVG' });

    return {
        id: node.id,
        originalName,
        componentKey: getComponentKey(node),
        name: parsedName.name,
        variant: parsedName.variant,
        size,
        category: classification.category,
        group: classification.group,
        page: getPageName(node),
        svg: addComponentInformationMetadata(bytesToString(svgBytes), getComponentInformation(node)),
    };
};

const exportIconNodes = async (nodes: IconNode[], source: string, missingNames: string[]) => {
    const icons: IconMetadata[] = [];
    const issues: ParseIssue[] = [];

    postMessage({ type: 'parse-start', payload: { total: nodes.length, source } });

    for (let offset = 0; offset < nodes.length; offset += EXPORT_BATCH_SIZE) {
        const batch = nodes.slice(offset, offset + EXPORT_BATCH_SIZE);
        const results = await Promise.all(
            batch.map(async (node) => {
                try {
                    return { icon: await exportIcon(node), issue: undefined };
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    return {
                        icon: undefined,
                        issue: { nodeId: node.id, nodeName: node.name, message },
                    };
                }
            }),
        );

        results.forEach(({ icon, issue }) => {
            if (icon) icons.push(icon);
            if (issue) issues.push(issue);
        });

        postMessage({
            type: 'parse-progress',
            payload: { completed: Math.min(offset + batch.length, nodes.length), total: nodes.length },
        });
    }

    icons.sort((left, right) =>
        [left.originalName, left.size, left.category]
            .join('\u0000')
            .localeCompare([right.originalName, right.size, right.category].join('\u0000')),
    );

    postMessage({ type: 'parse-result', payload: { icons, issues, source, missingNames } });
};

const loadIconIndex = async () => {
    const selection = figma.currentPage.selection;
    postMessage({
        type: 'index-start',
        payload: { sourceCount: selection.length > 0 ? selection.length : ICON_SOURCES.length },
    });

    if (selection.length > 0) {
        indexedIcons = collectIconNodes(selection);
        indexedSources = [
            { id: figma.currentPage.id, name: figma.currentPage.name, iconCount: indexedIcons.length },
        ];
        indexInitialized = true;
        const source = getSelectionLabel(selection, indexedIcons.length);
        postMessage({
            type: 'index-ready',
            payload: { total: indexedIcons.length, source, sources: indexedSources, scope: 'selection' },
        });
        await exportIconNodes(indexedIcons, source, []);
        return;
    }

    const pages = await Promise.all(
        ICON_SOURCES.map(async ({ id, expectedName }) => {
            const node = await getNodeByIdAsync(id);
            if (!node || node.type !== 'PAGE') {
                throw new Error(`Source page ${expectedName} (${id}) was not found. Open the Icons Figma file.`);
            }

            const icons = node.findAllWithCriteria({ types: ['COMPONENT', 'INSTANCE'] }) as IconNode[];
            return {
                source: { id: node.id, name: node.name, iconCount: icons.length },
                icons,
            };
        }),
    );

    const uniqueIcons = new Map<string, IconNode>();
    pages.forEach(({ icons }) => icons.forEach((icon) => uniqueIcons.set(icon.id, icon)));
    indexedIcons = Array.from(uniqueIcons.values());
    indexedSources = pages.map(({ source }) => source);
    indexInitialized = true;

    const pageNames = indexedSources.map((source) => source.name).join(', ');
    const source = `Sources: ${pageNames} (${indexedIcons.length} icons)`;
    postMessage({
        type: 'index-ready',
        payload: { total: indexedIcons.length, source, sources: indexedSources, scope: 'sources' },
    });
};

const searchAndExportIcons = async (query: string) => {
    if (!indexInitialized) {
        await loadIconIndex();
    }

    const names = parseIconSearchQuery(query);
    const searchKeys = new Set(names.map(getIconSearchKey));
    const nodes = indexedIcons.filter((node) => searchKeys.has(getIconSearchKey(node.name)));
    const foundKeys = new Set(nodes.map((node) => getIconSearchKey(node.name)));
    const missingNames = names.filter((name) => !foundKeys.has(getIconSearchKey(name)));
    const source = `Search: ${names.join(', ')} (${nodes.length} icons)`;
    await exportIconNodes(nodes, source, missingNames);
};

figma.showUI(__html__, UI_OPTIONS);

figma.ui.onmessage = async (message: UIMessage) => {
    if (message.type === 'close') {
        figma.closePlugin();
        return;
    }

    if (message.type === 'reload-index') {
        indexInitialized = false;
        indexedIcons = [];
        indexedSources = [];
        loadIconIndex().catch((error) => {
            postMessage({
                type: 'parse-error',
                payload: { message: error instanceof Error ? error.message : String(error) },
            });
        });
        return;
    }

    if (message.type === 'search-icons') {
        searchAndExportIcons(message.payload.query).catch((error) => {
            postMessage({
                type: 'parse-error',
                payload: { message: error instanceof Error ? error.message : String(error) },
            });
        });
        return;
    }

    if (message.type === 'get-token') {
        const token = await figma.clientStorage.getAsync(TOKEN_STORAGE_KEY);
        postMessage({ type: 'token', payload: { token } });
        return;
    }

    if (message.type === 'set-token') {
        await figma.clientStorage.setAsync(TOKEN_STORAGE_KEY, message.payload.token);
        return;
    }

    if (message.type === 'get-github-session') {
        const session = await figma.clientStorage.getAsync(GITHUB_SESSION_STORAGE_KEY);
        if (session && session.targetPackage !== 'sdds-icons') {
            await figma.clientStorage.deleteAsync(GITHUB_SESSION_STORAGE_KEY);
            postMessage({ type: 'github-session', payload: null });
            return;
        }
        postMessage({ type: 'github-session', payload: session || null });
        return;
    }

    if (message.type === 'save-github-session') {
        await figma.clientStorage.setAsync(GITHUB_SESSION_STORAGE_KEY, message.payload);
        return;
    }

    if (message.type === 'clear-github-session') {
        await figma.clientStorage.deleteAsync(GITHUB_SESSION_STORAGE_KEY);
    }
};

loadIconIndex().catch((error) => {
    postMessage({
        type: 'parse-error',
        payload: { message: error instanceof Error ? error.message : String(error) },
    });
});
