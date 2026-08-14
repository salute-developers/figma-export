import { createIconsPullRequest } from '../github';
import type { GitHubSession, IconMetadata, PluginMessage, UIMessage } from '../types';

interface State {
    icons: IconMetadata[];
    issues: number;
    source: string;
    indexing: boolean;
    parsing: boolean;
    publishing: boolean;
    completed: number;
    total: number;
    indexTotal: number;
    scope: 'selection' | 'sources';
    searchQuery: string;
    missingNames: string[];
    hasSearched: boolean;
    token: string;
    commitMessage: string;
    pullRequestTitle: string;
    progressMessage: string;
    error: string;
    pullRequestUrl: string;
    githubSession: GitHubSession | null;
}

const state: State = {
    icons: [],
    issues: 0,
    source: '',
    indexing: true,
    parsing: false,
    publishing: false,
    completed: 0,
    total: 0,
    indexTotal: 0,
    scope: 'sources',
    searchQuery: '',
    missingNames: [],
    hasSearched: false,
    token: '',
    commitMessage: '',
    pullRequestTitle: '',
    progressMessage: '',
    error: '',
    pullRequestUrl: '',
    githubSession: null,
};

const app = document.getElementById('app');

if (!app) {
    throw new Error('UI root was not found');
}

const send = (message: UIMessage) => {
    parent.postMessage({ pluginMessage: message }, '*');
};

const downloadText = (fileName: string, content: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
};

const copyText = async (content: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
        return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = content;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
};

const getJson = () => JSON.stringify(state.icons, null, 2);

const runSearch = () => {
    if (!state.searchQuery.split(',').some((name) => name.trim())) {
        state.error = 'Enter one or more icon names separated by commas';
        render();
        return;
    }

    state.error = '';
    state.pullRequestUrl = state.githubSession ? state.githubSession.pullRequestUrl : '';
    state.progressMessage = '';
    state.icons = [];
    state.missingNames = [];
    state.hasSearched = true;
    state.parsing = true;
    send({ type: 'search-icons', payload: { query: state.searchQuery } });
    render();
};

const makeButton = (label: string, onClick: () => void, primary = false) => {
    const button = document.createElement('button');
    button.textContent = label;
    button.className = primary ? 'primary' : '';
    button.onclick = onClick;
    return button;
};

const makeField = (
    labelText: string,
    value: string,
    onInput: (value: string) => void,
    options: { type?: string; placeholder?: string; disabled?: boolean } = {},
) => {
    const label = document.createElement('label');
    label.className = 'field';
    const caption = document.createElement('span');
    caption.textContent = labelText;
    const input = document.createElement('input');
    input.type = options.type || 'text';
    input.value = value;
    input.placeholder = options.placeholder || '';
    input.disabled = state.publishing || Boolean(options.disabled);
    input.oninput = () => onInput(input.value);
    label.append(caption, input);
    return label;
};

const publishAllIcons = async () => {
    if (!state.token.trim()) {
        state.error = 'Enter a GitHub token';
        render();
        return;
    }

    state.publishing = true;
    state.error = '';
    state.pullRequestUrl = '';
    state.progressMessage = 'Starting…';
    send({ type: 'set-token', payload: { token: state.token.trim() } });
    render();

    try {
        const result = await createIconsPullRequest({
            token: state.token.trim(),
            icons: state.icons,
            commitMessage: state.commitMessage.trim() || undefined,
            pullRequestTitle: state.pullRequestTitle.trim() || undefined,
            session: state.githubSession,
            onProgress: (message) => {
                state.progressMessage = message;
                render();
            },
        });
        state.githubSession = result.session;
        state.pullRequestUrl = result.session.pullRequestUrl;
        state.progressMessage = result.createdPullRequest
            ? `Created PR #${result.session.pullRequestNumber}: ${result.fileCount} files in one commit`
            : `Added commit to PR #${result.session.pullRequestNumber}: ${result.fileCount} files`;
        send({ type: 'save-github-session', payload: result.session });
    } catch (error) {
        state.error = error instanceof Error ? error.message : String(error);
        state.progressMessage = '';
        state.pullRequestUrl = state.githubSession ? state.githubSession.pullRequestUrl : '';
    } finally {
        state.publishing = false;
        render();
    }
};

const render = () => {
    app.replaceChildren();

    const shell = document.createElement('main');
    shell.className = 'app';

    const header = document.createElement('header');
    header.className = 'header';
    const heading = document.createElement('div');
    const title = document.createElement('h1');
    title.textContent = 'parserNew';
    const subtitle = document.createElement('p');
    subtitle.textContent = state.source || 'Loading icon sources…';
    heading.append(title, subtitle);
    const parseButton = makeButton('Reload scope', () => send({ type: 'reload-index' }));
    parseButton.disabled = state.indexing || state.parsing || state.publishing;
    header.append(heading, parseButton);

    const searchPanel = document.createElement('section');
    searchPanel.className = 'search-panel';
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.value = state.searchQuery;
    searchInput.placeholder = 'ArrowDown, ArrowDownBold, ChevronLeft';
    searchInput.disabled = state.indexing || state.parsing || state.publishing;
    searchInput.oninput = () => {
        state.searchQuery = searchInput.value;
    };
    searchInput.onkeydown = (event) => {
        if (event.key === 'Enter') runSearch();
    };
    const searchButton = makeButton('Search', runSearch, true);
    searchButton.disabled = state.indexing || state.parsing || state.publishing;
    const searchHint = document.createElement('span');
    searchHint.textContent = state.scope === 'selection'
        ? 'Exact icon names, separated by commas. Search is limited to the selected group.'
        : 'Exact icon names, separated by commas. Search runs across 16×16, 24×24 and 36×36.';
    searchPanel.append(searchInput, searchButton, searchHint);

    const githubPanel = document.createElement('section');
    githubPanel.className = 'github-panel';
    const githubHeader = document.createElement('div');
    githubHeader.className = 'github-header';
    const githubTitle = document.createElement('strong');
    githubTitle.textContent = state.githubSession ? 'Add commit to GitHub pull request' : 'Create GitHub pull request';
    const githubTarget = document.createElement('span');
    githubTarget.textContent = state.githubSession
        ? `PR #${state.githubSession.pullRequestNumber} · ${state.githubSession.branchName}`
        : 'salute-developers/plasma · dev';
    githubHeader.append(githubTitle, githubTarget);
    if (state.githubSession) {
        const newPullRequestButton = makeButton('Start new PR', () => {
            state.githubSession = null;
            state.pullRequestUrl = '';
            state.progressMessage = '';
            state.error = '';
            send({ type: 'clear-github-session' });
            render();
        });
        newPullRequestButton.disabled = state.publishing;
        githubHeader.append(newPullRequestButton);
    }

    const fields = document.createElement('div');
    fields.className = 'fields';
    fields.append(
        makeField('GitHub token', state.token, (value) => {
            state.token = value;
        }, { type: 'password', placeholder: 'github_pat_… or ghp_…' }),
        makeField('Commit message', state.commitMessage, (value) => {
            state.commitMessage = value;
        }, { placeholder: `feat(sdds-icons): Add ${state.icons.length} icons` }),
        makeField('PR title', state.pullRequestTitle, (value) => {
            state.pullRequestTitle = value;
        }, {
            placeholder: state.githubSession
                ? `Already using PR #${state.githubSession.pullRequestNumber}`
                : `feat(sdds-icons): Add ${state.icons.length} icons`,
            disabled: Boolean(state.githubSession),
        }),
    );

    const publishRow = document.createElement('div');
    publishRow.className = 'publish-row';
    const publishStatus = document.createElement('div');
    publishStatus.className = 'publish-status';
    if (state.error) {
        publishStatus.classList.add('error');
        publishStatus.textContent = state.error;
    } else if (state.pullRequestUrl) {
        const link = document.createElement('a');
        link.href = state.pullRequestUrl;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.textContent = state.progressMessage || (state.githubSession
            ? `Open PR #${state.githubSession.pullRequestNumber}`
            : 'Open pull request');
        publishStatus.append(link);
    } else {
        publishStatus.textContent = state.progressMessage || (state.githubSession
            ? `The full result will be added as a new commit to PR #${state.githubSession.pullRequestNumber}.`
            : 'All parsed icons will be added in one commit.');
    }
    const publishButton = makeButton(
        state.publishing
            ? state.githubSession
                ? 'Adding commit…'
                : 'Creating PR…'
            : state.githubSession
              ? `Add commit with all ${state.icons.length} icons`
              : `Create PR with all ${state.icons.length} icons`,
        () => {
            publishAllIcons().catch((error) => {
                state.error = error instanceof Error ? error.message : String(error);
                state.publishing = false;
                render();
            });
        },
        true,
    );
    publishButton.disabled = state.indexing || state.parsing || state.publishing || state.icons.length === 0;
    publishRow.append(publishStatus, publishButton);
    githubPanel.append(githubHeader, fields, publishRow);

    const content = document.createElement('section');
    content.className = 'content';

    if (state.indexing || state.parsing) {
        const status = document.createElement('div');
        status.className = 'status';
        const statusInner = document.createElement('div');
        const text = document.createElement('p');
        text.textContent = state.indexing
            ? 'Indexing icon scope…'
            : state.total === 0
              ? 'Searching icon components…'
              : `Exporting SVG ${state.completed}/${state.total}`;
        const progress = document.createElement('div');
        progress.className = 'progress';
        const progressValue = document.createElement('span');
        progressValue.style.width = `${state.indexing || state.total === 0 ? 0 : (state.completed / state.total) * 100}%`;
        progress.append(progressValue);
        statusInner.append(text, progress);
        status.append(statusInner);
        content.append(status);
    } else if (!state.hasSearched) {
        const status = document.createElement('div');
        status.className = 'status';
        status.textContent = `Indexed ${state.indexTotal} icons. Enter an exact icon name or several names separated by commas.`;
        content.append(status);
    } else if (state.icons.length === 0) {
        const status = document.createElement('div');
        status.className = 'status';
        status.textContent = state.missingNames.length > 0
            ? `No icons found: ${state.missingNames.join(', ')}`
            : 'No icons found for this query.';
        content.append(status);
    } else {
        if (state.missingNames.length > 0) {
            const missing = document.createElement('div');
            missing.className = 'missing';
            missing.textContent = `Not found: ${state.missingNames.join(', ')}`;
            content.append(missing);
        }
        const grid = document.createElement('div');
        grid.className = 'grid';

        state.icons.forEach((icon) => {
            const card = document.createElement('article');
            card.className = 'card';
            card.title = icon.originalName;

            const preview = document.createElement('div');
            preview.className = 'preview';
            const image = document.createElement('img');
            image.alt = icon.originalName;
            image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(icon.svg)}`;
            preview.append(image);

            const name = document.createElement('div');
            name.className = 'name';
            name.textContent = icon.originalName;
            const meta = document.createElement('div');
            meta.className = 'meta';
            meta.textContent = `${icon.size}px · ${icon.variant}`;
            const path = document.createElement('div');
            path.className = 'meta';
            path.textContent = [icon.category, icon.group].filter(Boolean).join(' / ');

            card.append(preview, name, meta, path);
            card.ondblclick = () => downloadText(`${icon.originalName}.svg`, icon.svg, 'image/svg+xml');
            grid.append(card);
        });

        content.append(grid);
    }

    const footer = document.createElement('footer');
    footer.className = 'footer';
    const summary = document.createElement('div');
    summary.className = 'summary';
    summary.textContent = `${state.icons.length} icons`;
    if (state.issues > 0) {
        const issues = document.createElement('span');
        issues.className = 'issues';
        issues.textContent = ` · ${state.issues} export errors`;
        summary.append(issues);
    }
    const actions = document.createElement('div');
    actions.className = 'actions';
    const copyButton = makeButton('Copy JSON', () => {
        copyText(getJson()).catch((error) => {
            state.error = error instanceof Error ? error.message : String(error);
            render();
        });
    });
    const downloadButton = makeButton('Download JSON', () =>
        downloadText('figma-icons.json', getJson(), 'application/json'),
    );
    copyButton.disabled = state.icons.length === 0 || state.indexing || state.parsing;
    downloadButton.disabled = state.icons.length === 0 || state.indexing || state.parsing;
    actions.append(copyButton, downloadButton, makeButton('Close', () => send({ type: 'close' })));
    footer.append(summary, actions);

    shell.append(header, searchPanel, githubPanel, content, footer);
    app.append(shell);
};

window.onmessage = (event: MessageEvent<{ pluginMessage?: PluginMessage }>) => {
    const message = event.data.pluginMessage;
    if (!message) return;

    if (message.type === 'index-start') {
        state.indexing = true;
        state.parsing = false;
        state.error = '';
        state.icons = [];
        state.missingNames = [];
        state.hasSearched = false;
        state.source = `Loading ${message.payload.sourceCount} icon sources…`;
    } else if (message.type === 'index-ready') {
        state.indexing = false;
        state.parsing = false;
        state.indexTotal = message.payload.total;
        state.source = message.payload.source;
        state.scope = message.payload.scope;
    } else if (message.type === 'parse-start') {
        state.indexing = false;
        state.parsing = true;
        state.hasSearched = true;
        state.error = '';
        state.icons = [];
        state.issues = 0;
        state.completed = 0;
        state.total = message.payload.total;
        state.source = message.payload.source;
    } else if (message.type === 'parse-progress') {
        state.completed = message.payload.completed;
        state.total = message.payload.total;
    } else if (message.type === 'parse-result') {
        state.parsing = false;
        state.icons = message.payload.icons;
        state.issues = message.payload.issues.length;
        state.source = message.payload.source;
        state.missingNames = message.payload.missingNames;
        state.error = '';
    } else if (message.type === 'parse-error') {
        state.indexing = false;
        state.parsing = false;
        state.error = message.payload.message;
    } else if (message.type === 'token' && message.payload.token) {
        state.token = message.payload.token;
    } else if (message.type === 'github-session') {
        state.githubSession = message.payload;
        state.pullRequestUrl = message.payload ? message.payload.pullRequestUrl : '';
    }

    render();
};

send({ type: 'get-token' });
send({ type: 'get-github-session' });
render();
