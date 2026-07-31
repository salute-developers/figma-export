import { Octokit } from 'octokit';
import { useCallback, useState } from 'react';

import type { AccumulatedCommit } from '../../types';
import {
    createBlob,
    createBranch,
    createCommit,
    createPullRequest,
    createTree,
    getCurrentSha,
    updateCommit,
} from '../api/githubFilesFetcher';

export interface CommitWithFiles extends AccumulatedCommit {
    filesTree: Record<string, string>;
}

interface RunProcessGithubPR {
    owner: string;
    repo: string;
    branchName: string;
    baseBranch: string;
}

interface CreatePR {
    commits: CommitWithFiles[];
    prTitle: string;
    prDescription?: string;
    token?: string;
    branchExists: boolean;
    prExists: boolean;
    existingPrNumber?: number;
    existingPrUrl?: string;
}

interface PullRequestResponse {
    number: number;
    html_url: string;
}

const saveMetaData =
    (octokit: Octokit, owner: string, repo: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <T>(fn: (...args: any[]) => Promise<T>) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (...args: any[]) =>
        fn(octokit, owner, repo, ...args);

/**
 * Хук для запуска процесса создания пул реквеста в GitHub. Возвращает:
 * step - текущий шаг, отражающий процесс создания,
 * onCreatePullRequest - метод для создания процесса пул реквеста
 */
export const useRunGithubPRProcess = ({ owner, repo, branchName, baseBranch }: RunProcessGithubPR) => {
    const [step, setStep] = useState<number | undefined>();

    const onCreatePullRequest = useCallback(
        async ({
            commits,
            prTitle,
            prDescription,
            token,
            branchExists,
            prExists,
            existingPrNumber,
            existingPrUrl,
        }: CreatePR): Promise<PullRequestResponse> => {
            const octokit = new Octokit({
                auth: token,
            });

            const withMetaData = saveMetaData(octokit, owner, repo);

            // STEP 0: Создать ветку от baseBranch (dev) ТОЛЬКО если не существует
            setStep(0);
            if (!branchExists) {
                await withMetaData(createBranch)(branchName, baseBranch);
            }

            // Получить текущее состояние ветки (новой или существующей)
            setStep(1);
            let { commitSha, treeSha } = await withMetaData(getCurrentSha)(branchName);

            // STEP 2-5: Применить каждый коммит последовательно
            for (let i = 0; i < commits.length; i++) {
                const commit = commits[i];

                // 2. Создать blobs для файлов
                setStep(2);
                const filesPaths = Object.keys(commit.filesTree);
                const filesSource = Object.values(commit.filesTree);
                const filesBlobs = await Promise.all(filesSource.map(withMetaData(createBlob)));

                // 3. Создать tree
                setStep(3);
                const { sha: newTreeSha } = await withMetaData(createTree)(filesBlobs, filesPaths, treeSha);

                // 4. Создать commit
                setStep(4);
                const { sha: newCommitSha } = await withMetaData(createCommit)(commit.message, newTreeSha, commitSha);

                // 5. Обновить ветку
                setStep(5);
                await withMetaData(updateCommit)(branchName, newCommitSha);

                // Обновить для следующего коммита
                commitSha = newCommitSha;
                treeSha = newTreeSha;
            }

            // STEP 6: Создать Pull Request (ТОЛЬКО если еще не создан)
            setStep(6);
            let pullRequestResponse: PullRequestResponse;

            if (!prExists) {
                const { data } = await withMetaData(createPullRequest)(branchName, baseBranch, prTitle, prDescription);
                pullRequestResponse = {
                    number: data.number,
                    html_url: data.html_url,
                };
            } else {
                // PR уже существует, коммиты автоматически добавлены в него
                pullRequestResponse = {
                    number: existingPrNumber!,
                    html_url: existingPrUrl!,
                };
            }

            // STEP 7: Готово
            setStep(7);

            return pullRequestResponse;
        },
        [branchName, baseBranch, owner, repo],
    );

    return [step, onCreatePullRequest] as const;
};
