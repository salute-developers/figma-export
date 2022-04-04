import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import { useGithubAuth } from '../hooks/useGithubAuth';
import type {
    FilesPayloadResponse,
    FormPayload,
    IconPayload,
    PluginMessage,
    TokenPayloadRequest,
    TokenPayloadResponse,
} from '../../types';
import { useRunGithubPRProcess } from '../hooks/useRunGithubPRProcess';
import { getSalt } from '../../utils';

import { AuthWait } from './authWait/AuthWait';
import { PullRequestProcess } from './pullRequestProcess/PullRequestProcess';
import { getFilesPayload, getFilesTree, getGitHubData } from './utils';

import { Footer, Form, Header } from '.';

const StyledRoot = styled.div`
    padding: 6px 12px;
`;

/**
 * UI окно плагина.
 */
const App = () => {
    const [token, setToken, getToken] = useGithubAuth();
    const [pullRequestLink, setPullRequestLink] = useState<string | undefined>();
    const [iconsMetaData, setIconsMetaData] = useState<IconPayload[]>([]);
    const [step, createPullRequest] = useRunGithubPRProcess({
        owner: 'salute-developers',
        repo: 'plasma',
        branchName: `icon-export-${getSalt()}`,
    });

    const onMessage = useCallback(
        async (event: MessageEvent<PluginMessage<FilesPayloadResponse | IconPayload[] | TokenPayloadResponse>>) => {
            const { type, payload } = event.data.pluginMessage;

            if (type === 'update-icon-data' && Array.isArray(payload)) {
                setIconsMetaData(payload);
                return;
            }

            if (type === 'token' && 'token' in payload) {
                if (payload.token) {
                    setToken(payload.token);
                    return;
                }
                getToken();
            }
        },
        [setToken, getToken],
    );

    const onSubmit = useCallback(
        async ({ commitMessage, commitType, pullRequestHeader, iconsMetaData: newIconsMetaData }: FormPayload) => {
            const githubData = await getGitHubData(token);

            if (githubData.some((item) => !item)) {
                getToken();
                return;
            }

            const filesPayload = getFilesPayload(newIconsMetaData, ...githubData);

            const filesTree = getFilesTree(filesPayload);

            const result = await createPullRequest({
                commitMessage: `${commitType}(plasma-icons): ${commitMessage}`,
                prTitle: `${commitType}(plasma-icons): ${pullRequestHeader}`,
                filesTree,
                token,
            });

            setPullRequestLink(result?.data.html_url);
        },
        [getToken, token, createPullRequest],
    );

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

    if (token === undefined) {
        return (
            <StyledRoot>
                <AuthWait />
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

    return (
        <StyledRoot>
            <Header />
            <Form onSubmit={onSubmit} iconsMetaData={iconsMetaData} />
            <Footer />
        </StyledRoot>
    );
};

export default App;
