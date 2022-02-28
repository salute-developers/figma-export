import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import { useGithubAuth } from '../hooks/useGithubAuth';
import {
    FilesPayloadRequest,
    FilesPayloadResponse,
    FormPayload,
    IconPayload,
    PluginMessage,
    TokenPayloadRequest,
    TokenPayloadResponse,
} from '../../types';
import { getFilesSourceFromGH } from '../api/githubFilesFetcher';

import { AuthWait } from './authWait/AuthWait';

import { Footer, Form, Header } from '.';

const StyledRoot = styled.div`
    padding: 6px 12px;
`;

/**
 * UI окно плагина.
 */
const App = () => {
    const [token, setToken, getToken] = useGithubAuth();
    const [iconMetaData, setIconMetaData] = useState<IconPayload>({
        size: 16,
    });

    const onMessage = useCallback(
        async (event: MessageEvent<PluginMessage<FilesPayloadResponse | IconPayload | TokenPayloadResponse>>) => {
            const { type, payload } = event.data.pluginMessage;

            if (type === 'update-size' && 'size' in payload) {
                setIconMetaData((prevState) => ({
                    ...prevState,
                    size: payload.size,
                }));
                return;
            }

            if (type === 'token' && 'token' in payload) {
                if (payload.token) {
                    setToken(payload.token);
                    return;
                }
                getToken();
                return;
            }

            if (type === 'export-done') {
                // eslint-disable-next-line no-console
                console.log('payload', payload);
            }
        },
        [setToken, getToken],
    );

    useEffect(() => {
        window.addEventListener('message', onMessage);

        return () => {
            window.removeEventListener('message', onMessage);
        };
    }, [onMessage]);

    if (token) {
        const payload: PluginMessage<TokenPayloadRequest> = {
            pluginMessage: { type: 'set-token', payload: { token } },
        };
        // eslint-disable-next-line no-restricted-globals
        parent.postMessage(payload, '*');
    }

    const onSubmit = useCallback(
        async (data: FormPayload) => {
            const [iconSource, indexSource] = await getFilesSourceFromGH(
                'salute-developers',
                'plasma',
                ['packages/plasma-icons/src/Icon.tsx', 'packages/plasma-icons/src/index.ts'],
                token,
            );

            if (!iconSource || !indexSource) {
                getToken();
                return;
            }

            const payload: PluginMessage<FilesPayloadRequest> = {
                pluginMessage: { type: 'export-start', payload: { ...data, iconSource, indexSource } },
            };
            // eslint-disable-next-line no-restricted-globals
            parent.postMessage(payload, '*');
        },
        [getToken, token],
    );

    return (
        <StyledRoot>
            {token ? (
                <>
                    <Header />
                    <Form onSubmit={onSubmit} iconMetaData={iconMetaData} />
                    <Footer />
                </>
            ) : (
                <AuthWait />
            )}
        </StyledRoot>
    );
};

export default App;
