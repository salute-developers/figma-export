import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { Button, TextField } from '@salutejs/plasma-web';

import { useGithubAuth } from '../hooks/useGithubAuth';
import { usePluginSession } from '../hooks/usePluginSession';
import type {
    FilesPayloadResponse,
    IconPayload,
    PluginMessage,
    SearchIconPayload,
    TokenPayloadRequest,
    TokenPayloadResponse,
    AccumulatedCommit,
} from '../../types';
import { useRunGithubPRProcess } from '../hooks/useRunGithubPRProcess';

import { PullRequestProcess } from './pullRequestProcess/PullRequestProcess';
import { AccumulatedIconsList } from './accumulatedIcons/AccumulatedIconsList';
import { getFilesPayload, getFilesTree, getGitHubData } from './utils';

import { Header, Form, IconSearch } from '.';

const StyledRoot = styled.div`
    padding: 6px 12px;
`;

const StyledSessionInfo = styled.div`
    background: #f0f4f8;
    border-radius: 4px;
    padding: 8px 12px;
    margin-bottom: 12px;
    font-size: 12px;

    code {
        background: #e0e6ed;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: monospace;
    }

    a {
        color: #0066cc;
        text-decoration: none;

        &:hover {
            text-decoration: underline;
        }
    }
`;

const StyledSessionStats = styled.span`
    color: #666;
    margin-left: 8px;
`;

const StyledCreatePRSection = styled.div`
    margin-top: 16px;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #fafafa;
`;

const StyledPRTitle = styled.div`
    margin-bottom: 12px;
`;

const StyledFooter = styled.div`
    display: flex;
    justify-content: space-between;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid #eee;
`;

const StyledNewBranchSection = styled.div`
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid #eee;
`;

const StyledTokenSection = styled.div`
    margin-bottom: 12px;
    padding: 8px 12px;
    background: #fff8e1;
    border: 1px solid #ffe082;
    border-radius: 4px;
`;

const StyledTokenRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: flex-end;
`;

const StyledTokenInput = styled.div`
    flex: 1;
`;

const StyledTokenStatus = styled.div<{ $hasToken: boolean }>`
    font-size: 11px;
    margin-top: 4px;
    color: ${({ $hasToken }) => ($hasToken ? '#4caf50' : '#ff9800')};
`;

/**
 * UI окно плагина.
 */
const App = () => {
    const [token, setToken, getToken] = useGithubAuth();
    const [pullRequestLink, setPullRequestLink] = useState<string | undefined>();
    const [iconsMetaData, setIconsMetaData] = useState<IconPayload[]>([]);
    const [isAddingIcon, setIsAddingIcon] = useState(false);
    const [prTitle, setPrTitle] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [tokenInput, setTokenInput] = useState('');

    // Hook для работы с сессией
    const {
        session,
        isLoading: sessionLoading,
        addCommit,
        removeCommit,
        markCommitsAsPublished,
        startNewSession,
        getUnpublishedCommits,
    } = usePluginSession();

    const [step, createPullRequest] = useRunGithubPRProcess({
        owner: 'salute-developers',
        repo: 'plasma',
        branchName: session?.branchName || '',
        baseBranch: session?.baseBranch || 'dev',
    });

    const onMessage = useCallback(
        async (event: MessageEvent<PluginMessage<FilesPayloadResponse | IconPayload[] | TokenPayloadResponse>>) => {
            const { type, payload } = event.data.pluginMessage || {};

            if (type === 'update-icon-data' && Array.isArray(payload)) {
                setIconsMetaData(payload);
                return;
            }

            if (type === 'token' && payload && 'token' in payload) {
                if (payload.token) {
                    setToken(payload.token);
                    return;
                }
                getToken();
            }
        },
        [setToken, getToken],
    );

    const onSearch = useCallback((iconName: string) => {
        const payload: PluginMessage<SearchIconPayload> = {
            pluginMessage: { type: 'search-icon', payload: { iconName } },
        };
        // eslint-disable-next-line no-restricted-globals
        parent.postMessage(payload, '*');
    }, []);

    // Обработчик "Добавить иконку"
    const onAddIcon = useCallback(
        ({
            iconsMetaData: newIconsMetaData,
            commitMessage,
        }: {
            iconsMetaData: IconPayload[];
            commitMessage: string;
        }) => {
            if (!session) return;

            setIsAddingIcon(true);
            setError(null);

            try {
                const commit: AccumulatedCommit = {
                    message: commitMessage,
                    iconsMetaData: newIconsMetaData,
                    iconNames: [...new Set(newIconsMetaData.map((icon) => icon.name))],
                    sizes: [...new Set(newIconsMetaData.map((icon) => icon.size))],
                    timestamp: Date.now(),
                    published: false,
                };

                addCommit(commit);
                setIconsMetaData([]);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                setError(errorMessage);
            } finally {
                setIsAddingIcon(false);
            }
        },
        [session, addCommit],
    );

    // Обработчик "Create PR"
    const onCreatePR = useCallback(async () => {
        if (!session || !token) return;

        const unpublishedCommits = getUnpublishedCommits();

        if (unpublishedCommits.length === 0) {
            setError('No new icons to publish');
            return;
        }

        setError(null);

        try {
            // 1. Скачать Icon.tsx из dev один раз
            const [iconSourceComponent] = await getGitHubData(token);

            if (!iconSourceComponent) {
                getToken();
                return;
            }

            // 2. Последовательно формировать filesTree для каждого коммита
            let currentIconSource = iconSourceComponent;

            const commitsWithFiles = unpublishedCommits.map((commit) => {
                const filesPayload = getFilesPayload(commit.iconsMetaData, currentIconSource);
                currentIconSource = filesPayload.iconSourceComponent;
                const filesTree = getFilesTree(filesPayload);
                return { ...commit, filesTree };
            });

            // 3. Описание только с новыми иконками
            const newIconNames = unpublishedCommits.flatMap((c) => c.iconNames);
            const prDescription = session.pullRequestNumber
                ? `Added new icons:\n${newIconNames.map((name) => `- ${name}`).join('\n')}`
                : `Added icons:\n${newIconNames.map((name) => `- ${name}`).join('\n')}`;

            // 4. Запустить процесс создания/обновления PR
            const prResponse = await createPullRequest({
                commits: commitsWithFiles,
                prTitle: prTitle || `feat(plasma-icons): Add icons ${newIconNames.join(', ')}`,
                prDescription,
                token,
                branchExists: session.branchCreated,
                prExists: !!session.pullRequestNumber,
                existingPrNumber: session.pullRequestNumber,
                existingPrUrl: session.pullRequestUrl,
            });

            // 5. Пометить коммиты как опубликованные
            markCommitsAsPublished(prResponse.number, prResponse.html_url);

            // Показать ссылку
            setPullRequestLink(prResponse.html_url);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
        }
    }, [session, token, prTitle, createPullRequest, getUnpublishedCommits, markCommitsAsPublished, getToken]);

    // Обработчик "Cancel"
    const onCancel = useCallback(() => {
        // eslint-disable-next-line no-restricted-globals
        parent.postMessage({ pluginMessage: { type: 'cancel' } }, '*');
    }, []);

    // Обработчик сохранения токена
    const onSaveToken = useCallback(() => {
        if (tokenInput.trim()) {
            setToken(tokenInput.trim());
            setTokenInput('');
        }
    }, [tokenInput, setToken]);

    // Обработчик "Начать новую ветку"
    const onStartNewSession = useCallback(() => {
        startNewSession();
        setPullRequestLink(undefined);
        setPrTitle('');
    }, [startNewSession]);

    useEffect(() => {
        window.addEventListener('message', onMessage);

        return () => {
            window.removeEventListener('message', onMessage);
        };
    }, [onMessage]);

    useEffect(() => {
        if (token) {
            const payload: PluginMessage<TokenPayloadRequest> = {
                pluginMessage: { type: 'set-token', payload: { token } },
            };
            // eslint-disable-next-line no-restricted-globals
            parent.postMessage(payload, '*');
        }
    }, [token]);

    if (sessionLoading) {
        return (
            <StyledRoot>
                <div>Loading session...</div>
            </StyledRoot>
        );
    }

    if (step !== undefined) {
        return (
            <StyledRoot>
                <PullRequestProcess step={step} pullRequestLink={pullRequestLink} />
            </StyledRoot>
        );
    }

    const unpublishedCommits = getUnpublishedCommits();
    const publishedCount = session?.commits.filter((c) => c.published).length || 0;

    return (
        <StyledRoot>
            <Header />

            {/* Информация о сессии */}
            {session && (
                <StyledSessionInfo>
                    <div>
                        Branch: <code>{session.branchName}</code>
                    </div>
                    {session.pullRequestNumber && (
                        <div>
                            PR:{' '}
                            <a href={session.pullRequestUrl} target="_blank" rel="noreferrer">
                                #{session.pullRequestNumber}
                            </a>
                            <StyledSessionStats>
                                (published: {publishedCount}, new: {unpublishedCommits.length})
                            </StyledSessionStats>
                        </div>
                    )}
                </StyledSessionInfo>
            )}

            {/* Секция токена */}
            <StyledTokenSection>
                <StyledTokenRow>
                    <StyledTokenInput>
                        <TextField
                            label="GitHub Token"
                            value={tokenInput}
                            onChange={(e) => setTokenInput(e.target.value)}
                            placeholder="ghp_xxxxxxxxxxxx"
                            type="password"
                        />
                    </StyledTokenInput>
                    <Button view="secondary" onClick={onSaveToken} disabled={!tokenInput.trim()}>
                        Save
                    </Button>
                    <Button view="secondary" onClick={getToken}>
                        OAuth
                    </Button>
                </StyledTokenRow>
                <StyledTokenStatus $hasToken={!!token}>
                    {token ? `Token set (${token.substring(0, 7)}...)` : 'No token set'}
                </StyledTokenStatus>
            </StyledTokenSection>

            {/* Поиск иконок */}
            <IconSearch onSearch={onSearch} />

            {/* Форма добавления иконки */}
            <Form onSubmit={onAddIcon} iconsMetaData={iconsMetaData} isLoading={isAddingIcon} buttonText="Add Icon" />

            {/* Отображение ошибки */}
            {error && <div style={{ color: 'red', marginTop: '8px', fontSize: '12px' }}>Error: {error}</div>}

            {/* Список накопленных иконок */}
            {session && session.commits.length > 0 && (
                <AccumulatedIconsList commits={session.commits} onRemove={removeCommit} />
            )}

            {/* Секция создания PR */}
            {unpublishedCommits.length > 0 && (
                <StyledCreatePRSection>
                    <StyledPRTitle>
                        <TextField
                            label="PR Title"
                            value={prTitle}
                            onChange={(e) => setPrTitle(e.target.value)}
                            placeholder={`feat(plasma-icons): Add icons...`}
                        />
                    </StyledPRTitle>
                    <Button view="primary" onClick={onCreatePR} disabled={isAddingIcon}>
                        {session?.pullRequestNumber ? 'Update PR' : 'Create PR'}
                    </Button>
                </StyledCreatePRSection>
            )}

            {/* Кнопка "Начать новую ветку" */}
            {session?.pullRequestNumber && (
                <StyledNewBranchSection>
                    <Button view="secondary" onClick={onStartNewSession}>
                        Start New Branch
                    </Button>
                </StyledNewBranchSection>
            )}

            {/* Footer с Cancel */}
            <StyledFooter>
                <Button view="secondary" onClick={onCancel}>
                    Cancel
                </Button>
            </StyledFooter>
        </StyledRoot>
    );
};

export default App;
