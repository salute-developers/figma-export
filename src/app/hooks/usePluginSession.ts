import { useCallback, useEffect, useState } from 'react';

import type { PluginSession, AccumulatedCommit, PluginMessage } from '../../types';

// Генерация уникального имени ветки
const generateBranchName = () => {
    const randomId = Math.random().toString(36).substring(2, 15);
    return `icon-export-${randomId}`;
};

interface UsePluginSessionReturn {
    session: PluginSession | null;
    isLoading: boolean;
    addCommit: (commit: AccumulatedCommit) => void;
    removeCommit: (index: number) => void;
    markCommitsAsPublished: (prNumber: number, prUrl: string) => void;
    startNewSession: () => void;
    getUnpublishedCommits: () => AccumulatedCommit[];
}

export const usePluginSession = (): UsePluginSessionReturn => {
    const [session, setSession] = useState<PluginSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Загрузить сессию при монтировании
    useEffect(() => {
        const handleMessage = (event: MessageEvent<PluginMessage<PluginSession | null>>) => {
            const { type, payload } = event.data.pluginMessage || {};

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
                        branchCreated: false,
                    };
                    setSession(newSession);
                }
                setIsLoading(false);
            }
        };

        window.addEventListener('message', handleMessage);

        // Запрашиваем сессию
        // eslint-disable-next-line no-restricted-globals
        parent.postMessage({ pluginMessage: { type: 'get-session', payload: {} } }, '*');

        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Сохранить сессию в clientStorage
    const saveSession = useCallback((updatedSession: PluginSession) => {
        // eslint-disable-next-line no-restricted-globals
        parent.postMessage({ pluginMessage: { type: 'save-session', payload: updatedSession } }, '*');
    }, []);

    // Добавить коммит в сессию
    const addCommit = useCallback(
        (commit: AccumulatedCommit) => {
            if (!session) return;

            // Проверка на дубликаты (по именам иконок)
            const existingIconNames = new Set(session.commits.flatMap((c) => c.iconNames));

            const duplicates = commit.iconNames.filter((name) => existingIconNames.has(name));

            if (duplicates.length > 0) {
                throw new Error(`Иконки уже добавлены: ${duplicates.join(', ')}`);
            }

            const updatedSession: PluginSession = {
                ...session,
                commits: [...session.commits, commit],
            };

            setSession(updatedSession);
            saveSession(updatedSession);
        },
        [session, saveSession],
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
            saveSession(updatedSession);
        },
        [session, saveSession],
    );

    // Пометить коммиты как опубликованные
    const markCommitsAsPublished = useCallback(
        (prNumber: number, prUrl: string) => {
            if (!session) return;

            const updatedSession: PluginSession = {
                ...session,
                commits: session.commits.map((commit) => ({
                    ...commit,
                    published: true,
                })),
                pullRequestNumber: prNumber,
                pullRequestUrl: prUrl,
                branchCreated: true,
            };

            setSession(updatedSession);
            saveSession(updatedSession);
        },
        [session, saveSession],
    );

    // Начать новую сессию
    const startNewSession = useCallback(() => {
        const newSession: PluginSession = {
            branchName: generateBranchName(),
            baseBranch: 'dev',
            commits: [],
            createdAt: Date.now(),
            branchCreated: false,
        };

        setSession(newSession);
        saveSession(newSession);
    }, [saveSession]);

    // Получить неопубликованные коммиты
    const getUnpublishedCommits = useCallback(() => {
        if (!session) return [];
        return session.commits.filter((commit) => !commit.published);
    }, [session]);

    return {
        session,
        isLoading,
        addCommit,
        removeCommit,
        markCommitsAsPublished,
        startNewSession,
        getUnpublishedCommits,
    };
};
