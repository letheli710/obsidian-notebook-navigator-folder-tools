/**
 * While Notebook Navigator's "show notes from subfolders" is on, its list body is hidden and this list
 * is shown instead: the selected folder's own notes first, then one group per direct subfolder, marked
 * by a quiet left bracket with the folder name on its top arm. Notes from deeper folders sit in their
 * group with the folder path in the metadata line. Rows follow Notebook Navigator's layout.
 *
 * Cost control: notes are rendered in batches as the list scrolls, previews are read only for rows
 * that come into view, and previews are cached by file modification time.
 */
import { SEL } from '../selectors';
import type { Strings } from '../i18n';
import { getVisibleChildFolders, isFolderHiddenByPatterns, isFolderLike, NOTE_EXTENSIONS, type ChildOrder, type FileLike, type FolderLike } from './folderData';

const LIST_CLASS = 'nnc-boxlist';
const PANE_ATTR = 'data-nnc-boxlist';
const BATCH_SIZE = 120;

export type NoteSort = 'modified-desc' | 'modified-asc' | 'created-desc' | 'created-asc' | 'title-asc' | 'title-desc';

export interface ListAppearance {
    showPreview: boolean;
    previewRows: number;
    showDate: boolean;
    sort: NoteSort;
    /** Which timestamp the date shows */
    dateField: 'mtime' | 'ctime';
}

export interface BoxListHost {
    strings: Strings;
    getFolder(path: string): FolderLike | null;
    getHiddenFolderPatterns(): string[];
    getChildOrder(parentPath: string): ChildOrder;
    getFolderColor(path: string): string | null;
    navigateFromList(root: HTMLElement, path: string): void;
    getActiveFilePath(): string | null;
    openFile(path: string, newTab: boolean): void;
    showFileMenu(event: MouseEvent, path: string): void;
    getListAppearance(folderPath: string): ListAppearance;
    formatDate(timestamp: number): string;
    readPreview(path: string): Promise<string>;
    renderIcon(el: HTMLElement, icon: string | null, fallback: string): void;
}

interface NoteEntry {
    file: FileLike;
    /** Folder path inside the group, empty when the note sits directly in the group folder */
    relPath: string;
}

interface Group {
    folder: FolderLike;
    notes: NoteEntry[];
    isOwn: boolean;
}

/** Per-list state that survives re-renders of the same folder */
interface ListState {
    groups: Group[];
    rendered: number;
    total: number;
    observer: IntersectionObserver | null;
    moreObserver: IntersectionObserver | null;
}

const states = new WeakMap<HTMLElement, ListState>();
const previewCache = new Map<string, { mtime: number; text: string }>();

export function removeBoxList(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>(`.${LIST_CLASS}`).forEach(el => {
        disconnect(el);
        el.remove();
    });
    root.querySelectorAll(`[${PANE_ATTR}]`).forEach(el => el.removeAttribute(PANE_ATTR));
}

function disconnect(list: HTMLElement): void {
    const state = states.get(list);
    state?.observer?.disconnect();
    state?.moreObserver?.disconnect();
    states.delete(list);
}

function collectNotes(folder: FolderLike, hidden: readonly string[], rel: string[], out: NoteEntry[]): void {
    for (const child of folder.children) {
        if (isFolderLike(child)) {
            if (!isFolderHiddenByPatterns(child, hidden)) {
                collectNotes(child, hidden, [...rel, child.name], out);
            }
        } else if (NOTE_EXTENSIONS.has(child.extension.toLowerCase())) {
            out.push({ file: child, relPath: rel.join(' / ') });
        }
    }
}

const titleOf = (file: FileLike) => file.name.replace(/\.md$/i, '');
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function sortNotes(notes: NoteEntry[], sort: NoteSort): void {
    const time = (n: NoteEntry, field: "mtime" | "ctime") => n.file.stat?.[field] ?? 0;
    const compare: Record<NoteSort, (a: NoteEntry, b: NoteEntry) => number> = {
        'modified-desc': (a, b) => time(b, 'mtime') - time(a, 'mtime'),
        'modified-asc': (a, b) => time(a, 'mtime') - time(b, 'mtime'),
        'created-desc': (a, b) => time(b, 'ctime') - time(a, 'ctime'),
        'created-asc': (a, b) => time(a, 'ctime') - time(b, 'ctime'),
        'title-asc': (a, b) => collator.compare(titleOf(a.file), titleOf(b.file)),
        'title-desc': (a, b) => collator.compare(titleOf(b.file), titleOf(a.file))
    };
    notes.sort(compare[sort]);
}

function buildGroups(host: BoxListHost, folder: FolderLike, appearance: ListAppearance): Group[] {
    const hidden = host.getHiddenFolderPatterns();
    const groups: Group[] = [];
    const own: NoteEntry[] = folder.children
        .filter((c): c is FileLike => !isFolderLike(c) && NOTE_EXTENSIONS.has(c.extension.toLowerCase()))
        .map(file => ({ file, relPath: '' }));
    if (own.length > 0) {
        groups.push({ folder, notes: own, isOwn: true });
    }
    for (const child of getVisibleChildFolders(folder, hidden, host.getChildOrder(folder.path))) {
        const notes: NoteEntry[] = [];
        collectNotes(child, hidden, [], notes);
        if (notes.length > 0) {
            groups.push({ folder: child, notes, isOwn: false });
        }
    }
    groups.forEach(group => sortNotes(group.notes, appearance.sort));
    return groups;
}

export function applyBoxList(
    root: HTMLElement,
    host: BoxListHost,
    enabled: boolean,
    basePath: string | null,
    version: number,
    hidePreview: boolean
): void {
    const listPane = root.querySelector<HTMLElement>(SEL.listPane);
    const panel = listPane?.querySelector<HTMLElement>(`:scope > ${SEL.listPanel}`) ?? null;
    let list = listPane?.querySelector<HTMLElement>(`:scope > .${LIST_CLASS}`) ?? null;
    const folder = enabled && basePath !== null ? host.getFolder(basePath) : null;

    if (!listPane || !panel || !folder) {
        if (list) {
            disconnect(list);
            list.remove();
        }
        listPane?.removeAttribute(PANE_ATTR);
        return;
    }

    if (!list) {
        list = createDiv();
        list.className = LIST_CLASS;
        list.setAttribute('role', 'list');
    }
    if (list.nextElementSibling !== panel) {
        panel.before(list);
    }
    if (!listPane.hasAttribute(PANE_ATTR)) {
        listPane.setAttribute(PANE_ATTR, '');
    }

    const appearance = host.getListAppearance(folder.path);
    const showPreview = appearance.showPreview && !hidePreview;
    const active = host.getActiveFilePath() ?? '';
    const contentKey = `${folder.path}|${version}|${showPreview ? appearance.previewRows : 0}|${appearance.showDate ? 1 : 0}|${appearance.sort}`;

    // Only the highlighted note changed: update it in place
    if (list.dataset.key === contentKey) {
        if (list.dataset.active !== active) {
            list.dataset.active = active;
            list.querySelectorAll<HTMLElement>('.nnc-bl-note.is-active').forEach(el => el.classList.remove('is-active'));
            list.querySelectorAll<HTMLElement>('.nnc-bl-note').forEach(el => {
                if (el.dataset.path === active) {
                    el.classList.add('is-active');
                }
            });
        }
        return;
    }

    const sameFolder = list.dataset.folder === folder.path;
    const scrollTop = sameFolder ? list.scrollTop : 0;
    list.dataset.key = contentKey;
    list.dataset.folder = folder.path;
    list.dataset.active = active;
    renderList(list, root, host, folder, appearance, showPreview, active, sameFolder ? (states.get(list)?.rendered ?? 0) : 0);
    list.scrollTop = scrollTop;
}

function renderList(
    list: HTMLElement,
    root: HTMLElement,
    host: BoxListHost,
    folder: FolderLike,
    appearance: ListAppearance,
    showPreview: boolean,
    active: string,
    keepRendered: number
): void {
    disconnect(list);
    list.replaceChildren();
    list.style.setProperty('--nnc-preview-rows', String(appearance.previewRows));

    const groups = buildGroups(host, folder, appearance);
    const total = groups.reduce((sum, g) => sum + g.notes.length, 0);
    if (total === 0) {
        const empty = createDiv();
        empty.className = 'nnc-boxlist-empty';
        empty.textContent = host.strings.noNotes;
        list.appendChild(empty);
        return;
    }

    // Previews are read only when a row scrolls into view
    const observer = showPreview
        ? new IntersectionObserver(
              entries => {
                  for (const entry of entries) {
                      if (!entry.isIntersecting) {
                          continue;
                      }
                      const row = entry.target as HTMLElement;
                      observer?.unobserve(row);
                      void fillPreview(row, host);
                  }
              },
              { root: list, rootMargin: '200px 0px' }
          )
        : null;

    const state: ListState = { groups, rendered: 0, total, observer, moreObserver: null };
    states.set(list, state);

    const containers = new Map<Group, HTMLElement>();
    const containerFor = (group: Group): HTMLElement => {
        let container = containers.get(group);
        if (container) {
            return container;
        }
        container = createDiv();
        if (group.isOwn) {
            container.className = 'nnc-bl-own';
        } else {
            const color = host.getFolderColor(group.folder.path);
            container.className = `nnc-bl-group${color ? ' has-color' : ''}`;
            if (color) {
                container.style.setProperty('--nnc-box-color', color);
            }
            const label = createEl('button');
            label.type = 'button';
            label.className = 'nnc-bl-label';
            label.textContent = group.folder.name;
            label.setAttribute('aria-label', host.strings.enterFolder(group.folder.name));
            label.addEventListener('click', () => host.navigateFromList(root, group.folder.path));
            container.appendChild(label);
        }
        list.appendChild(container);
        containers.set(group, container);
        return container;
    };

    // Flat cursor over all notes, so batches can stop in the middle of a group
    const flat: Array<{ group: Group; note: NoteEntry }> = [];
    groups.forEach(group => group.notes.forEach(note => flat.push({ group, note })));

    const sentinel = createDiv();
    sentinel.className = 'nnc-bl-more';

    const renderBatch = (count: number) => {
        const end = Math.min(flat.length, state.rendered + count);
        for (let i = state.rendered; i < end; i++) {
            const { group, note } = flat[i];
            const row = buildRow(note, host, appearance, showPreview, active);
            containerFor(group).appendChild(row);
            observer?.observe(row);
        }
        state.rendered = end;
        if (state.rendered < flat.length) {
            list.appendChild(sentinel);
        } else {
            sentinel.remove();
            state.moreObserver?.disconnect();
        }
    };

    renderBatch(Math.max(BATCH_SIZE, keepRendered));
    if (state.rendered < flat.length) {
        state.moreObserver = new IntersectionObserver(
            entries => {
                if (entries.some(e => e.isIntersecting)) {
                    renderBatch(BATCH_SIZE);
                }
            },
            { root: list, rootMargin: '400px 0px' }
        );
        state.moreObserver.observe(sentinel);
    }
}

function buildRow(
    note: NoteEntry,
    host: BoxListHost,
    appearance: ListAppearance,
    showPreview: boolean,
    active: string
): HTMLElement {
    const { file, relPath } = note;
    const row = createDiv();
    row.className = `nnc-bl-note${file.path === active ? ' is-active' : ''}`;
    row.setAttribute('role', 'listitem');
    row.tabIndex = 0;
    row.dataset.path = file.path;
    row.dataset.mtime = String(file.stat?.mtime ?? 0);

    const title = createDiv();
    title.className = 'nnc-bl-title';
    title.textContent = titleOf(file);
    row.appendChild(title);

    if (showPreview) {
        const preview = createDiv();
        preview.className = 'nnc-bl-preview';
        const cached = previewCache.get(file.path);
        if (cached && cached.mtime === (file.stat?.mtime ?? 0)) {
            preview.textContent = cached.text;
            row.dataset.previewDone = '1';
        }
        row.appendChild(preview);
    }

    const timestamp = file.stat?.[appearance.dateField] ?? 0;
    const dateText = appearance.showDate && timestamp ? host.formatDate(timestamp) : '';
    if (dateText || relPath) {
        const meta = createDiv();
        meta.className = 'nnc-bl-meta';
        if (dateText) {
            const date = createSpan();
            date.textContent = dateText;
            meta.appendChild(date);
        }
        if (relPath) {
            // A folder icon and its own color keep the path apart from the date
            const path = createSpan();
            path.className = 'nnc-bl-path';
            const icon = createSpan();
            icon.className = 'nnc-bl-path-icon';
            host.renderIcon(icon, 'folder', 'folder');
            const label = createSpan();
            label.className = 'nnc-bl-path-label';
            label.textContent = relPath;
            path.append(icon, label);
            meta.appendChild(path);
        }
        row.appendChild(meta);
    }

    const open = (event: MouseEvent | KeyboardEvent) => host.openFile(file.path, event.ctrlKey || event.metaKey);
    row.addEventListener('click', open);
    row.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            open(event);
        }
    });
    row.addEventListener('contextmenu', event => {
        event.preventDefault();
        host.showFileMenu(event, file.path);
    });
    return row;
}

async function fillPreview(row: HTMLElement, host: BoxListHost): Promise<void> {
    if (row.dataset.previewDone) {
        return;
    }
    row.dataset.previewDone = '1';
    const path = row.dataset.path ?? '';
    const target = row.querySelector<HTMLElement>('.nnc-bl-preview');
    if (!target) {
        return;
    }
    try {
        const text = await host.readPreview(path);
        target.textContent = text;
        const mtimeAttr = Number(row.dataset.mtime ?? 0);
        previewCache.set(path, { mtime: mtimeAttr, text });
    } catch {
        // File vanished or unreadable: leave the preview empty
    }
}

/** Plain-text preview from note content, roughly like Notebook Navigator's default preview rules */
export function previewFromMarkdown(content: string, maxLength = 300): string {
    let text = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
    text = text.replace(/```[\s\S]*?```/g, ' ').replace(/~~~[\s\S]*?~~~/g, ' ');
    text = text.replace(/<!--[\s\S]*?-->/g, ' ').replace(/%%[\s\S]*?%%/g, ' ');
    text = text.replace(/\$\$[\s\S]*?\$\$/g, ' ');
    const lines = text
        .split(/\r?\n/)
        .filter(line => !/^\s*#{1,6}\s/.test(line))
        .map(line =>
            line
                .replace(/<[^>]+>/g, '')
                .replace(/!\[\[[^\]]*\]\]/g, '')
                .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
                .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
                .replace(/\[\[([^\]]+)\]\]/g, '$1')
                .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
                .replace(/^\s*>\s?(\[![^\]]*\][+-]?\s*)?/, '')
                .replace(/^\s*([-*+]|\d+\.)\s+(\[.\]\s+)?/, '')
                .replace(/[*_~`=]{1,3}/g, '')
                .trim()
        )
        .filter(Boolean);
    const joined = lines.join(' ').replace(/\s+/g, ' ').trim();
    return joined.length > maxLength ? `${joined.slice(0, maxLength)}…` : joined;
}
