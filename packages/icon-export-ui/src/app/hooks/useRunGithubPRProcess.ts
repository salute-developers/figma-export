import { Octokit } from 'octokit';
import { useCallback, useState } from 'react';

import {
    createBlob,
    createBranch,
    createCommit,
    createPullRequest,
    createTree,
    getCurrentSha,
    updateCommit,
} from '../api/githubFilesFetcher';

interface RunProcessGithubPR {
    owner: string;
    repo: string;
    branchName: string;
}

interface CreatPR {
    commitMessage: string;
    prTitle: string;
    filesTree: Record<string, string>;
    token?: string;
}

const saveMetaData =
    (octokit: Octokit, owner: string, repo: string) =>
    <T>(fn: (...args: any[]) => Promise<T>) =>
    (...args: any[]) =>
        fn(octokit, owner, repo, ...args);

/**
 * Хук для запуска процесса создания пул реквеста в GitHub. Возвращает:
 * step - текущий шаг, отражающий процесс создания,
 * onCreatePullRequest - метод для создания процесса пул реквеста
 */
export const useRunGithubPRProcess = ({ owner, repo, branchName }: RunProcessGithubPR) => {
    const [step, setStep] = useState<number | undefined>();

    const onCreatePullRequest = useCallback(
        async ({ commitMessage, prTitle, filesTree, token }: CreatPR) => {
            const octokit = new Octokit({
                auth: token,
            });

            const withMetaData = saveMetaData(octokit, owner, repo);

            if (branchName !== 'master' && branchName !== 'dev') {
                setStep(0);
                await withMetaData(createBranch)(branchName);
            }

            setStep(1);
            const { commitSha, treeSha } = await withMetaData(getCurrentSha)(branchName);

            setStep(2);
            const filesPaths = Object.keys(filesTree);
            const filesSource = Object.values(filesTree);
            const filesBlobs = await Promise.all(filesSource.map(withMetaData(createBlob)));

            setStep(3);
            const { sha: newTreeSha } = await withMetaData(createTree)(filesBlobs, filesPaths, treeSha);
            setStep(4);
            const { sha: newCommitSha } = await withMetaData(createCommit)(commitMessage, newTreeSha, commitSha);

            setStep(5);
            await withMetaData(updateCommit)(branchName, newCommitSha);

            let pullRequest;
            if (branchName !== 'master' && branchName !== 'dev') {
                setStep(6);
                pullRequest = await withMetaData(createPullRequest)(branchName, prTitle);
            }

            setStep(7);
            return pullRequest;
        },
        [branchName, owner, repo],
    );

    return [step, onCreatePullRequest] as const;
};
