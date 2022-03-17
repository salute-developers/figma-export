import { useCallback, useState } from 'react';
import { v4 as uuid } from 'uuid';

import { getLongPollToken } from '../api/githubAuth';

const APPLICATION_CLIENT_ID = 'a088429392f35252cbc7';
const AUTH_SERVER_URL = 'https://github-auth.prom.app.sberdevices.ru';

const GITHUB_AUTH_API_URL = 'https://github.com/login/oauth/authorize';
const FETCH_DELAY = 1_500;

/**
 * Хук для получения токена доступа через GithubAPI. Возвращает:
 * token - токен доступа к API,
 * onSetToken - метод для установки токена снаружи,
 * onGetToken - метод для получения токена
 */
export const useGithubAuth = () => {
    const [token, setToken] = useState<string | undefined>();

    const onSetToken = useCallback((value?: string) => setToken(value), []);

    const onGetToken = useCallback(() => {
        const pluginClientId = uuid();
        const redirectUri = `${AUTH_SERVER_URL}/auth/${pluginClientId}`;
        window.open(
            `${GITHUB_AUTH_API_URL}?client_id=${APPLICATION_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=public_repo`,
        );

        const fetchData = async () => {
            const response = await getLongPollToken(`${AUTH_SERVER_URL}/token`, pluginClientId, FETCH_DELAY);
            setToken(response.token);
        };

        fetchData();
    }, []);

    return [token, onSetToken, onGetToken] as const;
};
