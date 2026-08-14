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

export interface IconSourceInfo {
    id: string;
    name: string;
    iconCount: number;
}

export interface GitHubSession {
    targetPackage: 'sdds-icons';
    owner: string;
    repo: string;
    baseBranch: string;
    branchName: string;
    pullRequestNumber: number;
    pullRequestUrl: string;
}

export type PluginMessage =
    | { type: 'index-start'; payload: { sourceCount: number } }
    | {
          type: 'index-ready';
          payload: { total: number; source: string; sources: IconSourceInfo[]; scope: 'selection' | 'sources' };
      }
    | { type: 'parse-start'; payload: { total: number; source: string } }
    | { type: 'parse-progress'; payload: { completed: number; total: number } }
    | {
          type: 'parse-result';
          payload: { icons: IconMetadata[]; issues: ParseIssue[]; source: string; missingNames: string[] };
      }
    | { type: 'parse-error'; payload: { message: string } }
    | { type: 'token'; payload: { token?: string } }
    | { type: 'github-session'; payload: GitHubSession | null };

export type UIMessage =
    | { type: 'reload-index' }
    | { type: 'search-icons'; payload: { query: string } }
    | { type: 'close' }
    | { type: 'get-token' }
    | { type: 'set-token'; payload: { token: string } }
    | { type: 'get-github-session' }
    | { type: 'save-github-session'; payload: GitHubSession }
    | { type: 'clear-github-session' };
