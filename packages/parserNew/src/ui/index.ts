import type { IconMetadata, PluginMessage } from '../types';

interface State {
    icons: IconMetadata[];
    issues: number;
    source: string;
    loading: boolean;
    completed: number;
    total: number;
    error: string;
    query: string;
}

const state: State = {
    icons: [],
    issues: 0,
    source: '',
    loading: true,
    completed: 0,
    total: 0,
    error: '',
    query: '',
};

const app = document.getElementById('app');

if (!app) {
    throw new Error('UI root was not found');
}

const send = (type: 'parse-icons' | 'close') => {
    parent.postMessage({ pluginMessage: { type } }, '*');
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

const matchesQuery = (icon: IconMetadata, query: string) =>
    [icon.name, icon.originalName, icon.category, icon.group, icon.variant, String(icon.size)]
        .join(' ')
        .toLocaleLowerCase()
        .includes(query);

const makeButton = (label: string, onClick: () => void, primary = false) => {
    const button = document.createElement('button');
    button.textContent = label;
    button.className = primary ? 'primary' : '';
    button.onclick = onClick;
    return button;
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
    subtitle.textContent = state.source || 'Selection or current page';
    heading.append(title, subtitle);
    header.append(heading, makeButton('Parse again', () => send('parse-icons')));

    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = 'Search by name, category, group or variant';
    search.value = state.query;
    search.oninput = () => {
        state.query = search.value;
        render();
        const nextSearch = app.querySelector('input');
        if (nextSearch instanceof HTMLInputElement) {
            nextSearch.focus();
            nextSearch.setSelectionRange(state.query.length, state.query.length);
        }
    };
    toolbar.append(search);

    const content = document.createElement('section');
    content.className = 'content';

    const normalizedQuery = state.query.trim().toLocaleLowerCase();
    const filteredIcons = normalizedQuery ? state.icons.filter((icon) => matchesQuery(icon, normalizedQuery)) : state.icons;

    if (state.loading) {
        const status = document.createElement('div');
        status.className = 'status';
        const statusInner = document.createElement('div');
        const text = document.createElement('p');
        text.textContent = state.total === 0 ? 'Looking for icon components…' : `Exporting SVG ${state.completed}/${state.total}`;
        const progress = document.createElement('div');
        progress.className = 'progress';
        const progressValue = document.createElement('span');
        progressValue.style.width = `${state.total === 0 ? 0 : (state.completed / state.total) * 100}%`;
        progress.append(progressValue);
        statusInner.append(text, progress);
        status.append(statusInner);
        content.append(status);
    } else if (state.error) {
        const status = document.createElement('div');
        status.className = 'status';
        status.textContent = state.error;
        content.append(status);
    } else if (filteredIcons.length === 0) {
        const status = document.createElement('div');
        status.className = 'status';
        status.textContent = state.icons.length === 0
            ? 'No COMPONENT or INSTANCE nodes found. Select an icon frame or open an icon page and parse again.'
            : 'No icons match the search.';
        content.append(status);
    } else {
        const grid = document.createElement('div');
        grid.className = 'grid';

        filteredIcons.forEach((icon) => {
            const card = document.createElement('article');
            card.className = 'card';
            card.title = icon.originalName;

            const preview = document.createElement('div');
            preview.className = 'preview';
            const image = document.createElement('img');
            image.alt = icon.name;
            image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(icon.svg)}`;
            preview.append(image);

            const name = document.createElement('div');
            name.className = 'name';
            name.textContent = icon.name;
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
    summary.textContent = `${filteredIcons.length} of ${state.icons.length} icons`;
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
    const downloadButton = makeButton(
        'Download JSON',
        () => downloadText('figma-icons.json', getJson(), 'application/json'),
        true,
    );
    copyButton.disabled = state.icons.length === 0 || state.loading;
    downloadButton.disabled = state.icons.length === 0 || state.loading;
    actions.append(copyButton, downloadButton, makeButton('Close', () => send('close')));
    footer.append(summary, actions);

    shell.append(header, toolbar, content, footer);
    app.append(shell);
};

window.onmessage = (event: MessageEvent<{ pluginMessage?: PluginMessage }>) => {
    const message = event.data.pluginMessage;
    if (!message) return;

    if (message.type === 'parse-start') {
        state.loading = true;
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
        state.loading = false;
        state.icons = message.payload.icons;
        state.issues = message.payload.issues.length;
        state.source = message.payload.source;
    } else if (message.type === 'parse-error') {
        state.loading = false;
        state.error = message.payload.message;
    }

    render();
};

render();
