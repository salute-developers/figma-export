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
    iconName: string;
    iconSize: number;
    iconSvgAsset: string;
}

export interface FilesPayloadResponse {
    iconSourceComponent: string;
    iconsComponents: IconComponents[];
}

export interface SearchIconPayload {
    iconName: string;
}

export type MessageType =
    | 'export-start'
    | 'cancel'
    | 'update-icon-data'
    | 'export-done'
    | 'set-token'
    | 'token'
    | 'search-icon'
    | 'get-session'
    | 'save-session'
    | 'clear-session'
    | 'session-data'
    | 'session-saved';

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

// Данные одного коммита для накопления
export interface AccumulatedCommit {
    message: string; // "feat(plasma-icons): Add icon ShareScreen"
    iconsMetaData: IconPayload[]; // Сырые данные иконок для отложенного формирования filesTree
    iconNames: string[]; // ["ShareScreen"]
    sizes: number[]; // [24, 36]
    timestamp: number; // Date.now()
    published: boolean; // Опубликован ли коммит в GitHub
}

// Сессия плагина в clientStorage
export interface PluginSession {
    branchName: string; // "icon-export-abc123"
    baseBranch: string; // "dev"
    commits: AccumulatedCommit[]; // Накопленные коммиты
    createdAt: number; // Время создания сессии
    pullRequestNumber?: number; // Номер PR если создан
    pullRequestUrl?: string; // URL PR
    branchCreated: boolean; // Создана ли ветка в GitHub
}

// Типы сообщений для работы с сессией
export type SessionMessageType = 'get-session' | 'save-session' | 'clear-session' | 'session-data' | 'session-saved';
