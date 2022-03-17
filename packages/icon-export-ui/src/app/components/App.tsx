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
import { getFilesSource } from '../api/githubFilesFetcher';
import { getSalt } from '../../utils';
import { useRunGithubPRProcess } from '../hooks/useRunGithubPRProcess';

import { AuthWait } from './authWait/AuthWait';
import { PullRequestProcess } from './pullRequestProcess/PullRequestProcess';

import { Footer, Form, Header } from '.';

const StyledRoot = styled.div`
    padding: 6px 12px;
`;

const filesPath = (name?: string) => ({
    IconSource: 'packages/plasma-icons/src/Icon.tsx',
    IndexSource: 'packages/plasma-icons/src/index.ts',
    IconComponent: `packages/plasma-icons/src/Icons/Icon${name}.tsx`,
    IconAsset: `packages/plasma-icons/src/Icon.assets/${name}.tsx`,
});

/**
 * UI окно плагина.
 */
const App = () => {
    const [token, setToken, getToken] = useGithubAuth();
    const [pullRequestLink, setPullRequestLink] = useState<string | undefined>();
    const [dataForm, setDataForm] = useState<FormPayload>();
    const [iconMetaData, setIconMetaData] = useState<IconPayload>({
        size: 16,
    });
    const [step, createGithubPR] = useRunGithubPRProcess({
        owner: 'neretin-trike', // ToDo: поменять на sberdevices
        repo: 'plasma',
        branchName: `icon-export-${getSalt()}`,
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
                const { iconAsset, iconComponent, iconSource, indexSource } = payload as FilesPayloadResponse;

                if (!dataForm) {
                    return;
                }

                const { iconName, commitMessage, commitType, pullRequestHeader } = dataForm;

                const filesTree = {
                    [filesPath().IconSource]: iconSource,
                    [filesPath().IndexSource]: indexSource,
                    [filesPath(iconName).IconComponent]: iconComponent,
                    [filesPath(iconName).IconAsset]: iconAsset,
                };

                const result = await createGithubPR({
                    commitMessage: `${commitType}(plasma-icon): ${commitMessage}`,
                    prTitle: `${commitType}(plasma-icon): ${pullRequestHeader}`,
                    token,
                    filesTree,
                });

                setPullRequestLink(result?.data.html_url);
            }
        },
        [setToken, getToken, token, dataForm, createGithubPR],
    );

    const onSubmit = useCallback(
        async (data: FormPayload) => {
            const [iconSource, indexSource] = await getFilesSource(
                'neretin-trike', // ToDo: поменять на sberdevices
                'plasma',
                [filesPath().IconSource, filesPath().IndexSource],
                token,
            );

            if (!iconSource || !indexSource) {
                getToken();
                return;
            }

            setDataForm(data);

            const payload: PluginMessage<FilesPayloadRequest> = {
                pluginMessage: { type: 'export-start', payload: { ...data, iconSource, indexSource } },
            };
            // eslint-disable-next-line no-restricted-globals
            parent.postMessage(payload, '*');
        },
        [getToken, token],
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
            <Form onSubmit={onSubmit} iconMetaData={iconMetaData} />
            <Footer />
        </StyledRoot>
    );
};

export default App;
