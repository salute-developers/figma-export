import { Octokit } from 'octokit';

import { GitCreateBlobResponse } from '../../types';

const isStringArray = (array: unknown[]): array is string[] => array.every((item) => typeof item === 'string');

export const getCurrentSha = async (octokit: Octokit, owner: string, repo: string, branchName: string) => {
    const { data: refData } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branchName}`,
    });

    const { data: commitData } = await octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: refData.object.sha,
    });

    return {
        commitSha: refData.object.sha,
        treeSha: commitData.tree.sha,
    };
};

export const createBlob = async (octokit: Octokit, owner: string, repo: string, content: string) =>
    (
        await octokit.rest.git.createBlob({
            owner,
            repo,
            content,
            encoding: 'utf-8',
        })
    ).data;

export const createTree = async (
    octokit: Octokit,
    owner: string,
    repo: string,
    blobs: GitCreateBlobResponse[],
    paths: string[],
    parentTreeSha: string,
) => {
    const tree = blobs.map(
        ({ sha }, index): GitCreateBlobResponse => ({
            path: paths[index],
            mode: '100644',
            type: 'blob',
            sha,
        }),
    );

    const { data } = await octokit.rest.git.createTree({
        owner,
        repo,
        tree,
        base_tree: parentTreeSha,
    });

    return data;
};

export const createCommit = async (
    octokit: Octokit,
    owner: string,
    repo: string,
    message: string,
    currentTreeSha: string,
    currentCommitSha: string,
) =>
    (
        await octokit.rest.git.createCommit({
            owner,
            repo,
            message,
            tree: currentTreeSha,
            parents: [currentCommitSha],
        })
    ).data;

export const updateCommit = async (octokit: Octokit, owner: string, repo: string, branchName: string, sha: string) =>
    octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${branchName}`,
        sha,
    });

export const createBranch = async (octokit: Octokit, owner: string, repo: string, branchName: string) => {
    const { commitSha } = await getCurrentSha(octokit, owner, repo, 'master');

    await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: commitSha,
    });
};

export const createPullRequest = async (
    octokit: Octokit,
    owner: string,
    repo: string,
    branchName: string,
    title: string,
) =>
    octokit.rest.pulls.create({
        owner,
        repo,
        base: 'refs/heads/master',
        head: `refs/heads/${branchName}`,
        title,
    });

export const getFilesSource = async (
    owner: string,
    repo: string,
    paths: string[],
    token?: string,
): Promise<string[]> => {
    const octokit = new Octokit({
        auth: token,
    });

    const getFileSource = async (path: string) => {
        try {
            const result = await octokit.rest.repos.getContent({
                headers: {
                    accept: 'application/vnd.github.v3.raw',
                },
                owner,
                repo,
                path,
            });

            return result.data;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
        }
    };

    const filesSources = await Promise.all(paths.map(getFileSource));

    return isStringArray(filesSources) ? filesSources : [];
};
