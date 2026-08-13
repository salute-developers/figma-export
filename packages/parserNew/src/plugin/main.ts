import { classifyIcon, parseIconName } from '../parser';
import type { AncestorDescriptor } from '../parser';
import type { IconMetadata, ParseIssue, PluginMessage, UIMessage } from '../types';

declare const __html__: string;

type IconNode = ComponentNode | InstanceNode;

const UI_OPTIONS: ShowUIOptions = {
    title: 'parserNew',
    width: 760,
    height: 620,
};

const EXPORT_BATCH_SIZE = 24;

const postMessage = (message: PluginMessage) => figma.ui.postMessage(message);

const hasChildren = (node: BaseNode): node is BaseNode & ChildrenMixin => 'children' in node;

const collectIconNodes = (roots: readonly SceneNode[]): IconNode[] => {
    const icons = new Map<string, IconNode>();

    const visit = (node: SceneNode) => {
        if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
            icons.set(node.id, node);
            return;
        }

        if (hasChildren(node)) {
            node.children.forEach(visit);
        }
    };

    roots.forEach(visit);

    return Array.from(icons.values());
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
        svg: bytesToString(svgBytes),
    };
};

const parseCurrentContext = async () => {
    const selection = figma.currentPage.selection;
    const roots = selection.length > 0 ? selection : figma.currentPage.children;
    const source = selection.length > 0 ? `Selection (${selection.length})` : `Page: ${figma.currentPage.name}`;
    const nodes = collectIconNodes(roots);
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
        [left.category, left.group, left.name, left.variant, left.size]
            .join('\u0000')
            .localeCompare([right.category, right.group, right.name, right.variant, right.size].join('\u0000')),
    );

    postMessage({ type: 'parse-result', payload: { icons, issues, source } });
};

figma.showUI(__html__, UI_OPTIONS);

figma.ui.onmessage = (message: UIMessage) => {
    if (message.type === 'close') {
        figma.closePlugin();
        return;
    }

    if (message.type === 'parse-icons') {
        parseCurrentContext().catch((error) => {
            postMessage({
                type: 'parse-error',
                payload: { message: error instanceof Error ? error.message : String(error) },
            });
        });
    }
};

parseCurrentContext().catch((error) => {
    postMessage({
        type: 'parse-error',
        payload: { message: error instanceof Error ? error.message : String(error) },
    });
});
