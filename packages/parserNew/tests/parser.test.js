const assert = require('node:assert/strict');
const test = require('node:test');

const { classifyIcon, getIconSearchKey, parseIconName, parseIconSearchQuery } = require('../.test-build/parser');
const { buildPullRequestFiles } = require('../.test-build/githubPayload');
const { createIconsPullRequest } = require('../.test-build/github');

test('parses variants used by the reference icon library', () => {
    assert.deepEqual(parseIconName('ArrowDown'), { name: 'ArrowDown', variant: 'regular' });
    assert.deepEqual(parseIconName('ArrowDownBold'), { name: 'ArrowDown', variant: 'bold' });
    assert.deepEqual(parseIconName('ArrowWideDownOutline'), { name: 'ArrowWideDown', variant: 'outline' });
    assert.deepEqual(parseIconName('ArrowWideDownOutlineBold'), {
        name: 'ArrowWideDown',
        variant: 'outline-bold',
    });
    assert.deepEqual(parseIconName('ArrowWideDownFill'), { name: 'ArrowWideDown', variant: 'fill' });
});

test('normalizes slash-based and legacy icon names', () => {
    assert.deepEqual(parseIconName('24 / Operation / 24_share_screen_outline'), {
        name: 'ShareScreen',
        variant: 'outline',
    });
    assert.deepEqual(parseIconName('Player / ic_36_pause_outline'), {
        name: 'Pause',
        variant: 'outline',
    });
});

test('parses comma-separated icon search and removes duplicates', () => {
    assert.deepEqual(parseIconSearchQuery(' ArrowDown, ArrowDownBold, arrowdown, , Chevron Left '), [
        'ArrowDown',
        'ArrowDownBold',
        'Chevron Left',
    ]);
    assert.equal(getIconSearchKey('Chevron Left'), getIconSearchKey('ChevronLeft'));
});

test('extracts category and group from the reference frame hierarchy', () => {
    assert.deepEqual(
        classifyIcon(
            [
                { name: 'Navigation & Movement', width: 700 },
                { name: 'Icons', width: 700 },
                { name: 'Arrow', width: 652 },
                { name: 'Arrow', width: 568 },
            ],
            'ArrowDownBold',
            16,
        ),
        { category: 'Navigation & Movement', group: 'Arrow' },
    );
});

test('removes a compact icon-family wrapper from the group path', () => {
    assert.deepEqual(
        classifyIcon(
            [
                { name: 'Navigation & Movement', width: 700 },
                { name: 'Icons', width: 700 },
                { name: 'Chevron', width: 652 },
                { name: 'ChevronCircleDown', width: 64 },
            ],
            'ChevronCircleDownOutlineBold',
            16,
        ),
        { category: 'Navigation & Movement', group: 'Chevron' },
    );
});

test('builds one PR file map for the complete icon list and preserves variants', () => {
    const icon = (originalName, variant, svg) => ({
        id: originalName,
        originalName,
        name: 'ArrowDown',
        variant,
        size: 16,
        category: 'Navigation & Movement',
        group: 'Arrow',
        page: '16×16',
        svg,
    });

    const files = buildPullRequestFiles([
        icon('ArrowDown', 'regular', '<svg id="regular"/>'),
        icon('ArrowDownBold', 'bold', '<svg id="bold"/>'),
    ]);

    assert.equal(files['packages/sdds-icons/svg/16/ArrowDown.svg'], '<svg id="regular"/>');
    assert.equal(files['packages/sdds-icons/svg/16/ArrowDownBold.svg'], '<svg id="bold"/>');
    assert.equal(Object.keys(files).length, 2);
});

test('rebuilds a commit on the latest PR head after a non-fast-forward response', async () => {
    const originalFetch = global.fetch;
    const requests = [];
    const responses = [
        { state: 'open', head: { ref: 'icon-parser-existing' } },
        { object: { sha: 'old-head' } },
        { tree: { sha: 'old-tree' } },
        { sha: 'first-tree' },
        { sha: 'first-commit' },
        { message: 'Update is not a fast forward', status: 422 },
        { object: { sha: 'latest-head' } },
        { tree: { sha: 'latest-tree' } },
        { sha: 'second-tree' },
        { sha: 'second-commit' },
        {},
    ];

    global.fetch = async (url, options = {}) => {
        requests.push({ url, options });
        const response = responses.shift();
        const status = response.status || 200;
        return {
            ok: status >= 200 && status < 300,
            status,
            statusText: status === 422 ? 'Unprocessable Entity' : 'OK',
            json: async () => response,
            text: async () => JSON.stringify(response),
        };
    };

    try {
        const result = await createIconsPullRequest({
            token: 'test-token',
            icons: [{
                id: 'ArrowDown',
                originalName: 'ArrowDown',
                name: 'ArrowDown',
                variant: 'regular',
                size: 16,
                category: 'Navigation & Movement',
                group: 'Arrow',
                page: '16×16',
                svg: '<svg/>',
            }],
            session: {
                targetPackage: 'sdds-icons',
                owner: 'salute-developers',
                repo: 'plasma',
                baseBranch: 'dev',
                branchName: 'icon-parser-existing',
                pullRequestNumber: 123,
                pullRequestUrl: 'https://github.com/salute-developers/plasma/pull/123',
            },
        });

        const commitRequests = requests.filter(({ url }) => url.endsWith('/git/commits') && !url.includes('/git/commits/'));
        assert.equal(commitRequests.length, 2);
        assert.deepEqual(JSON.parse(commitRequests[1].options.body).parents, ['latest-head']);
        assert.equal(result.createdPullRequest, false);
        assert.equal(responses.length, 0);
    } finally {
        global.fetch = originalFetch;
    }
});
