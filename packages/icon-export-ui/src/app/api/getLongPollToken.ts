export const sleep = async (seconds: number) => new Promise((r) => setTimeout(r, seconds));

interface TokenResponse {
    token: string;
}

export const getLongPollToken = async (
    url: string,
    pluginClientId: string,
    seconds: number,
): Promise<TokenResponse> => {
    try {
        const response = await fetch(`${url}/${pluginClientId}`);

        return await response.json();
    } catch (error) {
        await sleep(seconds);

        return getLongPollToken(url, pluginClientId, seconds);
    }
};
