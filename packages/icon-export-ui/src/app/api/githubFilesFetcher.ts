import { Octokit } from 'octokit';

const isStringArray = (array: unknown[]): array is string[] => array.every((item) => typeof item === 'string');

export const getFilesSourceFromGH = async (
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
