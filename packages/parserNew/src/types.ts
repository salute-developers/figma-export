export type IconVariant = 'regular' | 'bold' | 'outline' | 'outline-bold' | 'fill';

export interface ParsedIconName {
    name: string;
    variant: IconVariant;
}

export interface IconMetadata extends ParsedIconName {
    id: string;
    originalName: string;
    componentKey?: string;
    size: number;
    category: string;
    group: string;
    page: string;
    svg: string;
}

export interface ParseIssue {
    nodeId?: string;
    nodeName?: string;
    message: string;
}

export type PluginMessage =
    | { type: 'parse-start'; payload: { total: number; source: string } }
    | { type: 'parse-progress'; payload: { completed: number; total: number } }
    | { type: 'parse-result'; payload: { icons: IconMetadata[]; issues: ParseIssue[]; source: string } }
    | { type: 'parse-error'; payload: { message: string } };

export type UIMessage = { type: 'parse-icons' } | { type: 'close' };
