# План реализации: Аккумуляция иконок и отложенная публикация PR

## 🎯 Цель

Изменить механику работы плагина:

-   **Текущая**: каждый поиск → новая ветка → коммит → PR
-   **Новая**: накопление результатов локально → одна ветка → N коммитов → PR по требованию → возможность продолжения работы с PR

---

## 📋 Общая архитектура

### Фаза 1: Накопление (кнопка "Добавить иконку")

```
Поиск иконки → Заполнение формы → "Добавить иконку"
    ↓
Проверка на дубликаты (по имени иконки)
    ↓
Сохранение в Figma clientStorage (НЕ GitHub)
    ↓
Обновление UI (список накопленных иконок)
    ↓
Кнопка "Добавить иконку" становится disabled (предотвращение множественных нажатий)
```

### Фаза 2: Публикация (кнопка "Create PR")

```
Чтение из clientStorage
    ↓
Создание ветки от "dev" в GitHub (если еще не создана)
    ↓
Применение НОВЫХ коммитов (только unpublished)
    ↓
Создание Pull Request (или добавление в существующий)
    ↓
Пометка коммитов как published (НЕ удаление из storage)
    ↓
Сохранение PR URL и номера в сессии
```

### Фаза 3: Продолжение работы (после создания PR)

```
Сессия остается активной
    ↓
Можно добавлять новые иконки
    ↓
При повторном "Create PR" - добавляются в ТУ ЖЕ ветку
    ↓
Новые коммиты автоматически появляются в открытом PR
```

---

## 🔧 Технические изменения

### 1. Типы данных (src/types.ts)

#### Добавить новые интерфейсы:

```typescript
// Данные одного коммита для накопления
export interface AccumulatedCommit {
    message: string; // "feat: Add icon ShareScreen"
    filesTree: Record<string, string>; // Готовое дерево файлов
    iconNames: string[]; // ["ShareScreen"]
    sizes: number[]; // [24, 36]
    timestamp: number; // Date.now()
    published: boolean; // ← НОВОЕ: опубликован ли коммит в GitHub
}

// Сессия плагина в clientStorage
export interface PluginSession {
    branchName: string; // "icon-export-abc123"
    baseBranch: string; // "dev"
    commits: AccumulatedCommit[]; // Накопленные коммиты
    createdAt: number; // Время создания сессии
    pullRequestNumber?: number; // ← НОВОЕ: номер PR если создан
    pullRequestUrl?: string; // ← НОВОЕ: URL PR
    branchCreated: boolean; // ← НОВОЕ: создана ли ветка в GitHub
}

// Новый тип сообщений плагина
export type PluginMessage<T = unknown> =
    | { type: 'update-icon-data'; payload: IconPayload[] }
    | { type: 'token'; payload: TokenPayloadResponse }
    | { type: 'session-data'; payload: PluginSession | null } // ← НОВОЕ
    | { type: 'session-saved'; payload: { success: boolean } }; // ← НОВОЕ

// Новый тип UI сообщений
export type UIMessage<T = unknown> =
    | { type: 'search-icon'; payload: SearchIconPayload }
    | { type: 'get-token'; payload: Record<string, never> }
    | { type: 'set-token'; payload: { token: string } }
    | { type: 'get-session'; payload: Record<string, never> } // ← НОВОЕ
    | { type: 'save-session'; payload: PluginSession } // ← НОВОЕ
    | { type: 'clear-session'; payload: Record<string, never> }; // ← НОВОЕ
```

---

### 2. Plugin (src/plugin/main.ts)

#### Константы для работы с хранилищем:

```typescript
const STORAGE_KEYS = {
    TOKEN: 'github-token',
    SESSION: 'plugin-session', // ← НОВОЕ
} as const;
```

#### Новые обработчики сообщений:

```typescript
// Получить текущую сессию из clientStorage
figma.ui.on('message', async (msg: UIMessage) => {
    if (msg.type === 'get-session') {
        const sessionData = await figma.clientStorage.getAsync(STORAGE_KEYS.SESSION);
        figma.ui.postMessage({
            type: 'session-data',
            payload: sessionData || null,
        });
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
```

---

### 3. Hook для работы с сессией (src/app/hooks/usePluginSession.ts)

#### НОВЫЙ ФАЙЛ - создать:

```typescript
import { useCallback, useEffect, useState } from 'react';
import type { PluginSession, AccumulatedCommit } from '../../types';

// Генерация уникального имени ветки
const generateBranchName = () => {
    const randomId = Math.random().toString(36).substring(2, 15);
    return `icon-export-${randomId}`;
};

export const usePluginSession = () => {
    const [session, setSession] = useState<PluginSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Загрузить сессию при монтировании
    useEffect(() => {
        const loadSession = async () => {
            parent.postMessage({ pluginMessage: { type: 'get-session', payload: {} } }, '*');
        };

        const handleMessage = (event: MessageEvent) => {
            const { type, payload } = event.data.pluginMessage;

            if (type === 'session-data') {
                if (payload) {
                    setSession(payload);
                } else {
                    // Нет сохраненной сессии - создаем новую
                    const newSession: PluginSession = {
                        branchName: generateBranchName(),
                        baseBranch: 'dev',
                        commits: [],
                        createdAt: Date.now(),
                    };
                    setSession(newSession);
                }
                setIsLoading(false);
            }
        };

        window.addEventListener('message', handleMessage);
        loadSession();

        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Добавить коммит в сессию
    const addCommit = useCallback(
        (commit: AccumulatedCommit) => {
            if (!session) return;

            // ← НОВОЕ: Проверка на дубликаты (по именам иконок)
            const existingIconNames = new Set(session.commits.flatMap((c) => c.iconNames));

            const duplicates = commit.iconNames.filter((name) => existingIconNames.has(name));

            if (duplicates.length > 0) {
                console.warn('Иконки уже добавлены:', duplicates);
                throw new Error(`Иконки уже добавлены: ${duplicates.join(', ')}`);
            }

            const updatedSession: PluginSession = {
                ...session,
                commits: [...session.commits, commit],
            };

            setSession(updatedSession);

            // Сохранить в clientStorage
            parent.postMessage({ pluginMessage: { type: 'save-session', payload: updatedSession } }, '*');
        },
        [session],
    );

    // Удалить коммит по индексу
    const removeCommit = useCallback(
        (index: number) => {
            if (!session) return;

            const updatedSession: PluginSession = {
                ...session,
                commits: session.commits.filter((_, i) => i !== index),
            };

            setSession(updatedSession);

            parent.postMessage({ pluginMessage: { type: 'save-session', payload: updatedSession } }, '*');
        },
        [session],
    );

    // ← ИЗМЕНЕНО: Пометить коммиты как опубликованные (вместо clearSession)
    const markCommitsAsPublished = useCallback(
        (prNumber: number, prUrl: string) => {
            if (!session) return;

            const updatedSession: PluginSession = {
                ...session,
                commits: session.commits.map((commit) => ({
                    ...commit,
                    published: true, // Помечаем все как опубликованные
                })),
                pullRequestNumber: prNumber,
                pullRequestUrl: prUrl,
                branchCreated: true,
            };

            setSession(updatedSession);

            parent.postMessage({ pluginMessage: { type: 'save-session', payload: updatedSession } }, '*');
        },
        [session],
    );

    // ← НОВОЕ: Начать новую сессию (кнопка "Новая ветка")
    const startNewSession = useCallback(() => {
        const newSession: PluginSession = {
            branchName: generateBranchName(),
            baseBranch: 'dev',
            commits: [],
            createdAt: Date.now(),
            branchCreated: false,
        };

        setSession(newSession);

        parent.postMessage({ pluginMessage: { type: 'save-session', payload: updatedSession } }, '*');
    }, []);

    // ← НОВОЕ: Получить неопубликованные коммиты
    const getUnpublishedCommits = useCallback(() => {
        if (!session) return [];
        return session.commits.filter((commit) => !commit.published);
    }, [session]);

    return {
        session,
        isLoading,
        addCommit,
        removeCommit,
        markCommitsAsPublished, // ← ИЗМЕНЕНО
        startNewSession, // ← НОВОЕ
        getUnpublishedCommits, // ← НОВОЕ
    };
};
```

---

### 4. Обновить useRunGithubPRProcess (src/app/hooks/useRunGithubPRProcess.ts)

#### Изменить интерфейс и логику:

```typescript
import type { AccumulatedCommit } from '../../types';

interface RunProcessGithubPR {
    owner: string;
    repo: string;
    branchName: string;
    baseBranch: string; // ← ДОБАВИТЬ
}

interface CreatePR {
    commits: AccumulatedCommit[]; // ← ИЗМЕНИТЬ: вместо filesTree (только unpublished)
    prTitle: string;
    prDescription?: string;
    token?: string;
    branchExists: boolean; // ← НОВОЕ: существует ли ветка в GitHub
    prExists: boolean; // ← НОВОЕ: существует ли PR
    existingPrNumber?: number; // ← НОВОЕ: номер существующего PR
    existingPrUrl?: string; // ← НОВОЕ: URL существующего PR
}

export const useRunGithubPRProcess = ({ owner, repo, branchName, baseBranch }: RunProcessGithubPR) => {
    const [step, setStep] = useState<number | undefined>();

    const onCreatePullRequest = useCallback(
        async ({ commits, prTitle, prDescription, token, branchExists }: CreatePR) => {
            const octokit = new Octokit({ auth: token });
            const withMetaData = saveMetaData(octokit, owner, repo);

            // STEP 0: Создать ветку от baseBranch (dev) ТОЛЬКО если не существует
            setStep(0);
            if (!branchExists) {
                await withMetaData(createBranch)(branchName, baseBranch);
            }

            // Получить текущее состояние ветки (новой или существующей)
            let { commitSha, treeSha } = await withMetaData(getCurrentSha)(branchName);

            // STEP 1-5: Применить каждый коммит последовательно
            for (let i = 0; i < commits.length; i++) {
                const commit = commits[i];

                setStep(1 + i * 4); // Прогресс для каждого коммита

                // 1. Создать blobs для файлов
                const filesPaths = Object.keys(commit.filesTree);
                const filesSource = Object.values(commit.filesTree);
                const filesBlobs = await Promise.all(filesSource.map(withMetaData(createBlob)));

                // 2. Создать tree
                const { sha: newTreeSha } = await withMetaData(createTree)(filesBlobs, filesPaths, treeSha);

                // 3. Создать commit
                const { sha: newCommitSha } = await withMetaData(createCommit)(commit.message, newTreeSha, commitSha);

                // 4. Обновить ветку
                await withMetaData(updateCommit)(branchName, newCommitSha);

                // Обновить для следующего коммита
                commitSha = newCommitSha;
                treeSha = newTreeSha;
            }

            // STEP 6: Создать Pull Request (ТОЛЬКО если еще не создан)
            setStep(6);
            let pullRequestResponse;

            if (!prExists) {
                const { data } = await withMetaData(createPullRequest)(branchName, baseBranch, prTitle, prDescription);
                pullRequestResponse = data;
            } else {
                // PR уже существует, коммиты автоматически добавлены в него
                pullRequestResponse = { number: existingPrNumber, html_url: existingPrUrl };
            }

            // STEP 7: Готово
            setStep(7);

            return pullRequestResponse;
        },
        [branchName, baseBranch, owner, repo],
    );

    return [step, onCreatePullRequest] as const;
};
```

#### Раскомментировать createBranch:

```typescript
// src/app/api/githubFilesFetcher.ts:81-88
// Убрать комментарии с функции createBranch
```

#### Раскомментировать createPullRequest:

```typescript
// src/app/api/githubFilesFetcher.ts:90-100
// Убрать комментарии с функции createPullRequest
```

---

### 5. Компонент списка накопленных иконок (src/app/components/accumulatedIcons/AccumulatedIconsList.tsx)

#### НОВЫЙ ФАЙЛ - создать:

```tsx
import React from 'react';
import type { AccumulatedCommit } from '../../../types';

interface AccumulatedIconsListProps {
    commits: AccumulatedCommit[];
    onRemove: (index: number) => void;
}

export const AccumulatedIconsList: React.FC<AccumulatedIconsListProps> = ({ commits, onRemove }) => {
    if (commits.length === 0) {
        return null;
    }

    // ← НОВОЕ: Разделяем на опубликованные и новые
    const publishedCommits = commits.filter((c) => c.published);
    const unpublishedCommits = commits.filter((c) => !c.published);

    return (
        <div className="accumulated-icons">
            <h3>Добавленные иконки ({commits.length}):</h3>

            {/* ← НОВОЕ: Опубликованные иконки */}
            {publishedCommits.length > 0 && (
                <div className="published-section">
                    <h4>✓ Опубликованные ({publishedCommits.length}):</h4>
                    <ul className="icons-list published">
                        {publishedCommits.map((commit, index) => (
                            <li key={commit.timestamp} className="icon-item published">
                                <div className="icon-info">
                                    <strong>{commit.iconNames.join(', ')}</strong>
                                    <span className="sizes">Размеры: {commit.sizes.join(', ')}</span>
                                    <span className="message">{commit.message}</span>
                                </div>
                                {/* Опубликованные нельзя удалить */}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ← НОВОЕ: Неопубликованные иконки */}
            {unpublishedCommits.length > 0 && (
                <div className="unpublished-section">
                    <h4>⏳ Новые ({unpublishedCommits.length}):</h4>
                    <ul className="icons-list unpublished">
                        {unpublishedCommits.map((commit) => {
                            // Находим индекс в полном массиве для удаления
                            const originalIndex = commits.findIndex((c) => c.timestamp === commit.timestamp);

                            return (
                                <li key={commit.timestamp} className="icon-item unpublished">
                                    <div className="icon-info">
                                        <strong>{commit.iconNames.join(', ')}</strong>
                                        <span className="sizes">Размеры: {commit.sizes.join(', ')}</span>
                                        <span className="message">{commit.message}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onRemove(originalIndex)}
                                        className="remove-button"
                                    >
                                        Удалить
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
};
```

---

### 6. Обновить App.tsx (src/app/components/App.tsx)

#### Основные изменения:

```tsx
import { usePluginSession } from '../hooks/usePluginSession';
import { AccumulatedIconsList } from './accumulatedIcons/AccumulatedIconsList';
import type { AccumulatedCommit } from '../../types';

export const App: FC = () => {
    // ДОБАВИТЬ: Hook для работы с сессией
    const {
        session,
        isLoading: sessionLoading,
        addCommit,
        removeCommit,
        markCommitsAsPublished, // ← ИЗМЕНЕНО
        startNewSession, // ← НОВОЕ
        getUnpublishedCommits, // ← НОВОЕ
    } = usePluginSession();

    // ← НОВОЕ: State для контроля disabled кнопки
    const [isAddingIcon, setIsAddingIcon] = useState(false);

    // ИЗМЕНИТЬ: Использовать branchName и baseBranch из сессии
    const [step, createPullRequest] = useRunGithubPRProcess({
        owner: 'salute-developers',
        repo: 'plasma',
        branchName: session?.branchName || '',
        baseBranch: session?.baseBranch || 'dev',
    });

    // ДОБАВИТЬ: Обработчик "Добавить иконку"
    const onAddIcon = useCallback(
        async ({ iconsMetaData, commitMessage }: { iconsMetaData: IconPayload[]; commitMessage: string }) => {
            if (!session) return;

            // ← НОВОЕ: Блокируем кнопку
            setIsAddingIcon(true);
            setIsLoading(true);

            try {
                // 1. Получить текущие файлы из GitHub (Icon.tsx)
                const githubData = await getGitHubData(token);
                const iconSourceComponent = githubData?.[getFilesPath().iconSourceComponent] || '';

                // 2. Трансформировать результаты поиска в filesTree
                const filesPayload = getFilesPayload(iconsMetaData, iconSourceComponent);
                const filesTree = getFilesTree(filesPayload);

                // 3. Создать объект коммита
                const commit: AccumulatedCommit = {
                    message: commitMessage,
                    filesTree,
                    iconNames: iconsMetaData.map((icon) => icon.name),
                    sizes: [...new Set(iconsMetaData.map((icon) => icon.size))],
                    timestamp: Date.now(),
                    published: false, // ← НОВОЕ: Изначально не опубликован
                };

                // 4. Добавить в сессию (с проверкой на дубликаты)
                addCommit(commit);

                // 5. Очистить форму
                setIconsMetaData([]);
            } catch (error) {
                console.error('Ошибка при добавлении иконки:', error);
                // ← НОВОЕ: Показать ошибку пользователю (например, дубликат)
                alert(error.message);
            } finally {
                setIsLoading(false);
                // ← НОВОЕ: Разблокируем кнопку
                setIsAddingIcon(false);
            }
        },
        [session, token, addCommit],
    );

    // ИЗМЕНИТЬ: Обработчик "Create PR"
    const onCreatePR = useCallback(
        async ({ pullRequestHeader }: { pullRequestHeader: string }) => {
            if (!session) return;

            // ← ИЗМЕНЕНО: Получаем только неопубликованные коммиты
            const unpublishedCommits = getUnpublishedCommits();

            if (unpublishedCommits.length === 0) {
                alert('Нет новых иконок для публикации');
                return;
            }

            setIsLoading(true);

            try {
                // ← ИЗМЕНЕНО: Описание только с новыми иконками
                const newIconNames = unpublishedCommits.flatMap((c) => c.iconNames);
                const prDescription = session.pullRequestNumber
                    ? `Добавлены новые иконки:\n${newIconNames.map((name) => `- ${name}`).join('\n')}`
                    : `Добавлены иконки:\n${newIconNames.map((name) => `- ${name}`).join('\n')}`;

                // Запустить процесс создания/обновления PR
                const prResponse = await createPullRequest({
                    commits: unpublishedCommits, // ← ИЗМЕНЕНО: только неопубликованные
                    prTitle: pullRequestHeader,
                    prDescription,
                    token,
                    branchExists: session.branchCreated, // ← НОВОЕ
                    prExists: !!session.pullRequestNumber, // ← НОВОЕ
                    existingPrNumber: session.pullRequestNumber, // ← НОВОЕ
                    existingPrUrl: session.pullRequestUrl, // ← НОВОЕ
                });

                // ← ИЗМЕНЕНО: Пометить коммиты как опубликованные (НЕ удалять)
                markCommitsAsPublished(prResponse.number, prResponse.html_url);

                // Показать успех
                alert(`PR ${session.pullRequestNumber ? 'обновлен' : 'создан'}: ${prResponse.html_url}`);
            } catch (error) {
                console.error('Ошибка при создании PR:', error);
                alert(`Ошибка: ${error.message}`);
            } finally {
                setIsLoading(false);
            }
        },
        [session, token, createPullRequest, getUnpublishedCommits, markCommitsAsPublished],
    );

    // ДОБАВИТЬ: Отображение загрузки сессии
    if (sessionLoading) {
        return <div>Загрузка...</div>;
    }

    return (
        <div className="app">
            {/* ДОБАВИТЬ: Отображение информации о сессии */}
            {session && (
                <div className="session-info">
                    <p>
                        Текущая ветка: <code>{session.branchName}</code>
                    </p>
                    {session.pullRequestNumber && (
                        <p>
                            PR:{' '}
                            <a href={session.pullRequestUrl} target="_blank">
                                #{session.pullRequestNumber}
                            </a>{' '}
                            (опубликовано: {session.commits.filter((c) => c.published).length}, новых:{' '}
                            {session.commits.filter((c) => !c.published).length})
                        </p>
                    )}
                </div>
            )}

            {/* Форма поиска и добавления иконки */}
            <Form
                iconsMetaData={iconsMetaData}
                setIconsMetaData={setIconsMetaData}
                onSubmit={onAddIcon} // ← ИЗМЕНИТЬ
                isLoading={isLoading || isAddingIcon} // ← ИЗМЕНЕНО: добавлен isAddingIcon
                buttonText="Добавить иконку" // ← ИЗМЕНИТЬ текст кнопки
            />

            {/* ДОБАВИТЬ: Список накопленных иконок */}
            {session && session.commits.length > 0 && (
                <AccumulatedIconsList commits={session.commits} onRemove={removeCommit} />
            )}

            {/* ИЗМЕНЕНО: Кнопка Create PR (показывать только если есть unpublished коммиты) */}
            {session && getUnpublishedCommits().length > 0 && (
                <div className="create-pr-section">
                    <input
                        type="text"
                        placeholder="PR Title"
                        value={prTitle}
                        onChange={(e) => setPrTitle(e.target.value)}
                    />
                    <button onClick={() => onCreatePR({ pullRequestHeader: prTitle })} disabled={isLoading || !prTitle}>
                        {session.pullRequestNumber ? 'Обновить PR' : 'Create PR'}
                    </button>
                </div>
            )}

            {/* НОВОЕ: Кнопка "Начать новую ветку" */}
            {session && session.pullRequestNumber && (
                <div className="new-branch-section">
                    <button onClick={startNewSession} disabled={isLoading}>
                        Начать новую ветку
                    </button>
                </div>
            )}

            {/* Прогресс создания PR */}
            {step !== undefined && <PullRequestProcess step={step} />}
        </div>
    );
};
```

---

### 7. Обновить Form.tsx (src/app/components/form/Form.tsx)

#### Изменения:

```tsx
interface FormProps {
    iconsMetaData: IconPayload[];
    setIconsMetaData: Dispatch<SetStateAction<IconPayload[]>>;
    onSubmit: (data: { iconsMetaData: IconPayload[]; commitMessage: string }) => void; // ← ИЗМЕНИТЬ
    isLoading: boolean;
    buttonText: string; // ← ДОБАВИТЬ
}

export const Form: FC<FormProps> = ({
    iconsMetaData,
    setIconsMetaData,
    onSubmit,
    isLoading,
    buttonText = 'Добавить иконку', // ← ДОБАВИТЬ
}) => {
    // Убрать pullRequestHeader из state (не нужен для "Добавить иконку")
    const [state, setState] = useState({
        commitType: 'feat',
        commitMessage: 'Add icon `IconNameTest`',
    });

    const onSubmitForm = useCallback(
        async (event: FormEvent) => {
            event.preventDefault();

            // Формируем полное сообщение коммита
            const fullCommitMessage = `${state.commitType}(plasma-icons): ${state.commitMessage}`;

            onSubmit({
                iconsMetaData,
                commitMessage: fullCommitMessage,
            });
        },
        [onSubmit, state, iconsMetaData],
    );

    return (
        <form onSubmit={onSubmitForm}>
            {/* Поля формы */}

            <button type="submit" disabled={isLoading || iconsMetaData.length === 0}>
                {buttonText}
            </button>
        </form>
    );
};
```

---

### 8. Обновить PullRequestProcess.tsx (src/app/components/pullRequestProcess/PullRequestProcess.tsx)

#### Добавить шаг "Создание ветки":

```tsx
export const PullRequestProcess: FC<PullRequestProcessProps> = ({ step }) => (
    <div className="pull-request-process">
        <Step step={step} progress={0} description="Создание ветки от dev" /> {/* ← ДОБАВИТЬ */}
        <Step step={step} progress={1} description="Получение состояния ветки" />
        <Step step={step} progress={2} description="Создание blobs" />
        <Step step={step} progress={3} description="Создание tree" />
        <Step step={step} progress={4} description="Создание commit" />
        <Step step={step} progress={5} description="Обновление ветки" />
        <Step step={step} progress={6} description="Создание Pull Request" />
        <Step step={step} progress={7} description="Готово!" /> {/* ← ДОБАВИТЬ */}
    </div>
);
```

---

## 🎨 UI/UX изменения

### Новый флоу:

#### Состояние 1: Начало работы (нет PR)

```
┌─────────────────────────────────────────┐
│ Текущая ветка: icon-export-abc123       │
├─────────────────────────────────────────┤
│ [Поиск иконки]                          │
│ [Поле: commit message]                  │
│ [Кнопка: Добавить иконку] (disabled при клике) │
├─────────────────────────────────────────┤
│ Добавленные иконки (3):                 │
│                                         │
│ ⏳ Новые (3):                           │
│   • ShareScreen (24, 36) [Удалить]     │
│   • Download (16, 24, 36) [Удалить]    │
│   • Upload (24) [Удалить]              │
├─────────────────────────────────────────┤
│ [Поле: PR Title]                        │
│ [Кнопка: Create PR]                     │
└─────────────────────────────────────────┘
```

#### Состояние 2: После создания PR

```
┌─────────────────────────────────────────┐
│ Текущая ветка: icon-export-abc123       │
│ PR: #123 (опубликовано: 3, новых: 0)   │
├─────────────────────────────────────────┤
│ [Поиск иконки]                          │
│ [Поле: commit message]                  │
│ [Кнопка: Добавить иконку]               │
├─────────────────────────────────────────┤
│ Добавленные иконки (3):                 │
│                                         │
│ ✓ Опубликованные (3):                   │
│   • ShareScreen (24, 36)               │
│   • Download (16, 24, 36)              │
│   • Upload (24)                        │
├─────────────────────────────────────────┤
│ [Кнопка: Начать новую ветку]           │
└─────────────────────────────────────────┘
```

#### Состояние 3: Продолжение работы (добавление в PR)

```
┌─────────────────────────────────────────┐
│ Текущая ветка: icon-export-abc123       │
│ PR: #123 (опубликовано: 3, новых: 2)   │
├─────────────────────────────────────────┤
│ [Поиск иконки]                          │
│ [Поле: commit message]                  │
│ [Кнопка: Добавить иконку]               │
├─────────────────────────────────────────┤
│ Добавленные иконки (5):                 │
│                                         │
│ ✓ Опубликованные (3):                   │
│   • ShareScreen (24, 36)               │
│   • Download (16, 24, 36)              │
│   • Upload (24)                        │
│                                         │
│ ⏳ Новые (2):                           │
│   • Settings (16, 24) [Удалить]        │
│   • Profile (24, 36) [Удалить]         │
├─────────────────────────────────────────┤
│ [Поле: PR Title]                        │
│ [Кнопка: Обновить PR]                   │
│ [Кнопка: Начать новую ветку]           │
└─────────────────────────────────────────┘
```

---

## ✅ Чеклист выполнения

### Этап 1: Типы и инфраструктура

-   [ ] Обновить `src/types.ts` (добавить `AccumulatedCommit`, `PluginSession`, новые message types)
-   [ ] Добавить константы `STORAGE_KEYS` в `src/plugin/main.ts`

### Этап 2: Plugin-side (Figma)

-   [ ] Добавить обработчик `get-session` в `src/plugin/main.ts`
-   [ ] Добавить обработчик `save-session` в `src/plugin/main.ts`
-   [ ] Добавить обработчик `clear-session` в `src/plugin/main.ts`

### Этап 3: UI hooks

-   [ ] Создать `src/app/hooks/usePluginSession.ts`
    -   [ ] `loadSession` при монтировании
    -   [ ] `addCommit` - добавление в сессию
    -   [ ] `removeCommit` - удаление из сессии
    -   [ ] `clearSession` - очистка после PR

### Этап 4: GitHub API

-   [ ] Раскомментировать `createBranch` в `src/app/api/githubFilesFetcher.ts`
-   [ ] Раскомментировать `createPullRequest` в `src/app/api/githubFilesFetcher.ts`
-   [ ] Обновить `useRunGithubPRProcess.ts`:
    -   [ ] Добавить параметр `baseBranch`
    -   [ ] Изменить `CreatePR` interface (commits вместо filesTree)
    -   [ ] Реализовать Step 0: создание ветки
    -   [ ] Реализовать цикл применения коммитов
    -   [ ] Реализовать Step 6-7: создание PR

### Этап 5: UI компоненты

-   [ ] Создать `src/app/components/accumulatedIcons/AccumulatedIconsList.tsx`
-   [ ] Обновить `src/app/components/App.tsx`:
    -   [ ] Добавить `usePluginSession` hook
    -   [ ] Создать `onAddIcon` handler
    -   [ ] Изменить `onCreatePR` handler
    -   [ ] Добавить отображение имени ветки
    -   [ ] Добавить `<AccumulatedIconsList />`
    -   [ ] Добавить секцию "Create PR"
-   [ ] Обновить `src/app/components/form/Form.tsx`:
    -   [ ] Изменить props interface
    -   [ ] Убрать `pullRequestHeader` из state
    -   [ ] Изменить `onSubmitForm`
    -   [ ] Добавить prop `buttonText`
-   [ ] Обновить `src/app/components/pullRequestProcess/PullRequestProcess.tsx`:
    -   [ ] Добавить Step 0 (создание ветки)
    -   [ ] Добавить Step 7 (готово)

### Этап 6: Стили (опционально)

-   [ ] Добавить стили для `.session-info`
-   [ ] Добавить стили для `.accumulated-icons`
-   [ ] Добавить стили для `.create-pr-section`

### Этап 7: Тестирование

-   [ ] Запустить плагин, проверить создание новой сессии
-   [ ] Добавить 2-3 иконки, проверить сохранение в clientStorage
-   [ ] Закрыть и открыть плагин, проверить восстановление сессии
-   [ ] Удалить иконку из списка
-   [ ] Создать PR, проверить:
    -   [ ] Ветка создана от dev
    -   [ ] Все коммиты применены
    -   [ ] PR создан
    -   [ ] Сессия очищена
-   [ ] Проверить новую сессию после создания PR

---

## 🚨 Важные моменты

### 1. Порядок применения коммитов

Коммиты должны применяться **последовательно**, каждый следующий использует SHA предыдущего:

```typescript
let currentCommitSha = initialCommitSha;
let currentTreeSha = initialTreeSha;

for (const commit of commits) {
  // Создать новый tree НА ОСНОВЕ предыдущего
  const newTree = await createTree(..., currentTreeSha);

  // Создать новый commit С РОДИТЕЛЕМ = предыдущий commit
  const newCommit = await createCommit(..., newTree.sha, currentCommitSha);

  // Обновить для следующей итерации
  currentCommitSha = newCommit.sha;
  currentTreeSha = newTree.sha;
}
```

### 2. Проверка дубликатов

При добавлении иконки проверяем, что такая иконка еще не добавлена:

```typescript
const existingIconNames = new Set(session.commits.flatMap((c) => c.iconNames));
const duplicates = commit.iconNames.filter((name) => existingIconNames.has(name));

if (duplicates.length > 0) {
    throw new Error(`Иконки уже добавлены: ${duplicates.join(', ')}`);
}
```

### 3. Disabled состояние кнопки "Добавить иконку"

Кнопка блокируется во время выполнения запроса:

```typescript
// Перед началом
setIsAddingIcon(true);

// После завершения (в finally)
setIsAddingIcon(false);

// В компоненте
<button disabled={isLoading || isAddingIcon}>Добавить иконку</button>;
```

### 4. Сохранение состояния после создания PR

После создания PR:

-   **НЕ удаляем** коммиты из storage
-   **Помечаем** их как `published: true`
-   **Сохраняем** PR номер и URL
-   **Разрешаем** продолжить работу

### 5. Продолжение работы с существующим PR

При повторном нажатии "Create PR":

-   **Не создаем** новую ветку (используем существующую)
-   **Не создаем** новый PR (коммиты автоматически добавятся в открытый)
-   **Публикуем** только unpublished коммиты
-   **Обновляем** кнопку: "Create PR" → "Обновить PR"

### 6. Конфликты с базовой веткой

Если за время накопления коммитов ветка `dev` ушла вперед:

-   При первом создании PR: ветка создается от текущего HEAD dev
-   При добавлении коммитов: они добавляются поверх существующих
-   **Конфликты**: GitHub покажет их в PR, разрешаются вручную

### 7. Обработка ошибок

При создании PR может произойти ошибка на любом шаге:

-   **НЕ помечать** коммиты как published при ошибке
-   **НЕ удалять** сессию при ошибке
-   **Показать** пользователю ошибку через alert
-   **Дать** возможность повторить

### 8. Лимиты clientStorage

Figma clientStorage имеет ограничения:

-   Размер одного значения: ~1MB
-   При большом количестве иконок может переполниться
-   **Решение**: Ограничить максимум 10-20 иконок за сессию
-   **Альтернатива**: Кнопка "Начать новую ветку" для сброса

---

## 📝 Дополнительные улучшения (опционально)

### Фича 1: Редактирование коммитов

Позволить редактировать commit message после добавления:

```tsx
<AccumulatedIconsList
    commits={commits}
    onRemove={removeCommit}
    onEdit={editCommit} // ← новый prop
/>
```

### Фича 2: Превью изменений

Показывать какие файлы будут изменены/добавлены:

```
ShareScreen:
  + packages/plasma-icons/src/scalable/Icon.svg.24/ShareScreen.svg
  + packages/plasma-icons/src/scalable/Icon.svg.36/ShareScreen.svg
  ~ packages/plasma-icons/src/scalable/Icon.tsx (modified)
```

### Фича 3: Очистка старых сессий

Автоматически удалять сессии старше 7 дней:

```typescript
useEffect(() => {
    if (session && Date.now() - session.createdAt > 7 * 24 * 60 * 60 * 1000) {
        clearSession();
    }
}, [session]);
```

### Фича 4: Экспорт/импорт сессии

Позволить сохранить сессию в JSON и импортировать:

```tsx
<button onClick={exportSession}>Экспорт</button>
<button onClick={importSession}>Импорт</button>
```

---

## 🔗 Связанные файлы

### Основные файлы для изменения:

-   `src/types.ts` - типы данных
-   `src/plugin/main.ts` - обработчики clientStorage
-   `src/app/hooks/usePluginSession.ts` - **НОВЫЙ ФАЙЛ**
-   `src/app/hooks/useRunGithubPRProcess.ts` - логика создания PR
-   `src/app/api/githubFilesFetcher.ts` - раскомментировать функции
-   `src/app/components/App.tsx` - основная логика UI
-   `src/app/components/form/Form.tsx` - форма добавления
-   `src/app/components/accumulatedIcons/AccumulatedIconsList.tsx` - **НОВЫЙ ФАЙЛ**
-   `src/app/components/pullRequestProcess/PullRequestProcess.tsx` - обновить шаги

### Вспомогательные файлы:

-   `src/app/components/utils.ts` - утилиты (без изменений)
-   `src/app/hooks/useGithubAuth.ts` - аутентификация (без изменений)

---

## 🎯 Критерии успеха

### Основные требования:

✅ Плагин создает уникальную ветку при запуске  
✅ Кнопка "Добавить иконку" накапливает результаты локально  
✅ Данные сохраняются в Figma clientStorage  
✅ При переоткрытии плагина сессия восстанавливается  
✅ Список накопленных иконок отображается в UI  
✅ Можно удалить иконку из списка (только unpublished)  
✅ Кнопка "Create PR" создает ветку в GitHub только при клике  
✅ Все коммиты применяются последовательно  
✅ PR создается с правильным title и description  
✅ Никаких мусорных веток в GitHub до явного Create PR

### Новые требования:

✅ **Проверка дубликатов**: невозможно добавить иконку с тем же именем дважды  
✅ **Disabled кнопка**: кнопка "Добавить иконку" блокируется после нажатия  
✅ **Сохранение после PR**: после создания PR сессия НЕ удаляется  
✅ **Пометка published**: опубликованные коммиты помечаются как published  
✅ **Продолжение работы**: можно добавлять новые иконки после создания PR  
✅ **Обновление PR**: новые коммиты автоматически добавляются в существующий PR  
✅ **Разделение в UI**: опубликованные и новые иконки показываются отдельно  
✅ **Невозможность удаления**: опубликованные иконки нельзя удалить  
✅ **Кнопка "Обновить PR"**: текст кнопки меняется при наличии существующего PR  
✅ **Новая ветка**: кнопка "Начать новую ветку" для создания новой сессии

---

## 📚 Полезные ссылки

-   [Figma Plugin API - clientStorage](https://www.figma.com/plugin-docs/api/figma-clientStorage/)
-   [GitHub API - Git Database](https://docs.github.com/en/rest/git)
-   [Octokit.js Documentation](https://octokit.github.io/rest.js/)

TODO: Когда добавляем commit в уже существующую ветку затирает icon.tsx ???
