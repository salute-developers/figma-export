export interface SelectItem {
    value: string;
    label: string;
}

export interface FormPayload {
    iconsMetaData: IconPayload[];
    commitType: string;
    commitMessage: string;
    pullRequestHeader: string;
}

export interface IconPayload {
    size: number;
    svg: string;
    name: string;
    category: string;
}

export interface TokenPayloadRequest {
    token: string;
}

export type TokenPayloadResponse = TokenPayloadRequest;

export interface IconComponents {
    iconAsset: string;
    iconComponent: string;
    iconName: string;
    iconSize: number;
}

export interface FilesPayloadResponse {
    iconSourceExport: string;
    iconSourceComponent: string;
    iconSourceImport16: string;
    iconSourceImport24: string;
    iconSourceImport36: string;
    iconsComponents: IconComponents[];
}

export type MessageType = 'export-start' | 'cancel' | 'update-icon-data' | 'export-done' | 'set-token' | 'token';

export interface UIMessage<T = unknown> {
    type: MessageType;
    payload: T;
}

export interface PluginMessage<T> {
    pluginMessage: UIMessage<T>;
}

export interface GitCreateBlobResponse {
    url?: string;
    sha?: string | null;
    path?: string;
    mode?: '100644' | '100755' | '040000' | '160000' | '120000';
    type?: 'tree' | 'blob' | 'commit';
}
