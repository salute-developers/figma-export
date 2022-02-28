export interface SelectItem {
    value: string;
    label: string;
}

export interface FormPayload {
    category: string;
    iconName: string;
    commitType: string;
    commitMessage: string;
    pullRequestHeader: string;
}

export interface IconPayload {
    size?: number;
    svg?: string;
}

export interface TokenPayloadRequest {
    token: string;
}

export type TokenPayloadResponse = TokenPayloadRequest;

export interface FilesPayloadRequest extends FormPayload, Omit<FilesPayloadResponse, 'iconAsset' | 'iconComponent'> {}

export interface FilesPayloadResponse {
    iconAsset: string;
    iconComponent: string;
    indexSource: string;
    iconSource: string;
}

export type MessageType =
    | 'export-start'
    | 'create-pr-done'
    | 'cancel'
    | 'update-size'
    | 'export-done'
    | 'set-token'
    | 'token';

export interface UIMessage<T> {
    type: MessageType;
    payload: T;
}

export interface PluginMessage<T> {
    pluginMessage: UIMessage<T>;
}
