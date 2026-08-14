import { buildPullRequestFiles, getIconNames } from './githubPayload';
import type { GitHubSession, IconMetadata } from './types';

interface GitHubRequestOptions {
    method?: 'GET' | 'POST' | 'PATCH';
    body?: unknown;
    accept?: string;
}

interface PublishIconsOptions {
    token: string;
    icons: IconMetadata[];
    owner?: string;
    repo?: string;
    baseBranch?: string;
    commitMessage?: string;
    pullRequestTitle?: string;
    session?: GitHubSession | null;
    onProgress?: (message: string) => void;
}

interface PublishIconsResult {
    session: GitHubSession;
    fileCount: number;
    createdPullRequest: boolean;
}

const API_ROOT = 'https://api.github.com';
const MAX_BRANCH_UPDATE_ATTEMPTS = 3;

class GitHubApiError extends Error {
    constructor(
        message: string,
        readonly status: number,
    ) {
        super(`GitHub API: ${message}`);
        this.name = 'GitHubApiError';
    }
}

const githubRequest = async <T>(path: string, token: string, options: GitHubRequestOptions = {}): Promise<T> => {
    const response = await fetch(`${API_ROOT}${path}`, {
        method: options.method || 'GET',
        headers: {
            Accept: options.accept || 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    if (!response.ok) {
        let message = `${response.status} ${response.statusText}`;
        try {
            const payload = (await response.json()) as { message?: string };
            if (payload.message) message = payload.message;
        } catch (error) {
            // The HTTP status remains the most useful fallback for non-JSON errors.
        }
        throw new GitHubApiError(message, response.status);
    }

    if (options.accept && options.accept.includes('raw')) {
        return (await response.text()) as unknown as T;
    }

    return (await response.json()) as T;
};

const encodePath = (value: string) => value.split('/').map(encodeURIComponent).join('/');

const createBranchName = () =>
    `icon-parser-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const isNonFastForwardError = (error: unknown) =>
    error instanceof GitHubApiError && error.status === 422 && /not a fast forward/i.test(error.message);

const addCommitToBranch = async ({
    repositoryPath,
    branchName,
    token,
    files,
    commitMessage,
    onProgress,
}: {
    repositoryPath: string;
    branchName: string;
    token: string;
    files: Record<string, string>;
    commitMessage: string;
    onProgress: (message: string) => void;
}) => {
    for (let attempt = 1; attempt <= MAX_BRANCH_UPDATE_ATTEMPTS; attempt += 1) {
        const currentRef = await githubRequest<{ object: { sha: string } }>(
            `${repositoryPath}/git/ref/heads/${encodePath(branchName)}`,
            token,
        );
        const currentCommit = await githubRequest<{ tree: { sha: string } }>(
            `${repositoryPath}/git/commits/${currentRef.object.sha}`,
            token,
        );

        onProgress(`Preparing ${Object.keys(files).length} files…`);
        const tree = await githubRequest<{ sha: string }>(`${repositoryPath}/git/trees`, token, {
            method: 'POST',
            body: {
                base_tree: currentCommit.tree.sha,
                tree: Object.entries(files).map(([path, content]) => ({
                    path,
                    mode: '100644',
                    type: 'blob',
                    content,
                })),
            },
        });

        const commit = await githubRequest<{ sha: string }>(`${repositoryPath}/git/commits`, token, {
            method: 'POST',
            body: { message: commitMessage, tree: tree.sha, parents: [currentRef.object.sha] },
        });

        try {
            await githubRequest(`${repositoryPath}/git/refs/heads/${encodePath(branchName)}`, token, {
                method: 'PATCH',
                body: { sha: commit.sha },
            });
            return;
        } catch (error) {
            if (!isNonFastForwardError(error)) throw error;
            if (attempt === MAX_BRANCH_UPDATE_ATTEMPTS) {
                throw new Error('The PR branch kept changing while the commit was prepared. Try adding the commit again.');
            }
            onProgress(`The PR branch changed. Rebuilding the commit on the latest version (${attempt + 1}/${MAX_BRANCH_UPDATE_ATTEMPTS})…`);
        }
    }
};

export const createIconsPullRequest = async ({
    token,
    icons,
    owner = 'salute-developers',
    repo = 'plasma',
    baseBranch = 'dev',
    commitMessage = `feat(sdds-icons): Add ${icons.length} icons`,
    pullRequestTitle = `feat(sdds-icons): Add ${icons.length} icons`,
    session = null,
    onProgress = () => undefined,
}: PublishIconsOptions): Promise<PublishIconsResult> => {
    if (icons.length === 0) throw new Error('There are no parsed icons to publish');
    if (!token.trim()) throw new Error('GitHub token is required');

    const targetOwner = session ? session.owner : owner;
    const targetRepo = session ? session.repo : repo;
    const targetBaseBranch = session ? session.baseBranch : baseBranch;
    const branchName = session ? session.branchName : createBranchName();
    const repositoryPath = `/repos/${encodeURIComponent(targetOwner)}/${encodeURIComponent(targetRepo)}`;

    if (session) {
        onProgress(`Checking PR #${session.pullRequestNumber}…`);
        const pullRequest = await githubRequest<{ state: string; head: { ref: string } }>(
            `${repositoryPath}/pulls/${session.pullRequestNumber}`,
            token,
        );
        if (pullRequest.state !== 'open' || pullRequest.head.ref !== branchName) {
            throw new Error(`PR #${session.pullRequestNumber} is no longer open. Start a new PR session.`);
        }
    }

    const files = buildPullRequestFiles(icons);

    if (!session) {
        onProgress('Reading the base branch…');
        const baseRef = await githubRequest<{ object: { sha: string } }>(
            `${repositoryPath}/git/ref/heads/${encodePath(targetBaseBranch)}`,
            token,
        );
        onProgress('Creating a branch…');
        await githubRequest(`${repositoryPath}/git/refs`, token, {
            method: 'POST',
            body: { ref: `refs/heads/${branchName}`, sha: baseRef.object.sha },
        });
    }

    onProgress(session ? 'Adding a commit to the existing PR…' : 'Creating one commit for the full icon list…');
    await addCommitToBranch({
        repositoryPath,
        branchName,
        token,
        files,
        commitMessage,
        onProgress,
    });

    let nextSession = session;
    if (!nextSession) {
        onProgress('Opening the pull request…');
        const iconNames = getIconNames(icons);
        const pullRequest = await githubRequest<{ number: number; html_url: string }>(`${repositoryPath}/pulls`, token, {
            method: 'POST',
            body: {
                title: pullRequestTitle,
                head: branchName,
                base: targetBaseBranch,
                body: `Added ${iconNames.length} icons:\n\n${iconNames.map((name) => `- ${name}`).join('\n')}`,
            },
        });
        nextSession = {
            targetPackage: 'sdds-icons',
            owner: targetOwner,
            repo: targetRepo,
            baseBranch: targetBaseBranch,
            branchName,
            pullRequestNumber: pullRequest.number,
            pullRequestUrl: pullRequest.html_url,
        };
    }

    onProgress(session ? `Commit added to PR #${nextSession.pullRequestNumber}` : 'Pull request created');
    return {
        session: nextSession,
        fileCount: Object.keys(files).length,
        createdPullRequest: !session,
    };
};
