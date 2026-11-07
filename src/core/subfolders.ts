import { SEL } from '../selectors';
import type { Strings } from '../i18n';
import { countNotesRecursive, getVisibleChildFolders, type ChildOrder, type FolderLike } from './folderData';

const BLOCK_CLASS = 'nnc-subfolders';

export interface SubfolderHost {
    strings: Strings;
    getFolder(path: string): FolderLike | null;
    getHiddenFolderPatterns(): string[];
    getChildOrder(parentPath: string): ChildOrder;
    getFolderColor(path: string): string | null;
    getFolderIcon(path: string): string | null;
    /** Renders an icon id (Lucide slug, emoji, ...) into `el`; falls back to a folder icon */
    renderIcon(el: HTMLElement, icon: string | null, fallback: string): void;
    navigateFromList(root: HTMLElement, path: string): void;
    /** Show the "up one level" button */
    showBackButton(): boolean;
    isCollapsed(): boolean;
    setCollapsed(collapsed: boolean): void;
}

export interface SubfolderOptions {
    /** Plan 2 shows the subfolders as boxes below, so only the bar is kept here */
    hideFolderList: boolean;
}

export function removeSubfolders(root: HTMLElement): void {
    root.querySelectorAll(`.${BLOCK_CLASS}`).forEach(el => el.remove());
}

/**
 * Renders the subfolder block between the list pane header and the virtualized list.
 * It sits outside the virtual list on purpose: the list's keyboard navigation, selection and
 * scroll math never see it. Notebook Navigator's own header is left as it is.
 */
export function applySubfolders(
    root: HTMLElement,
    host: SubfolderHost,
    enabled: boolean,
    selectedPath: string | null,
    version: number,
    options: SubfolderOptions = { hideFolderList: false }
): void {
    const listPane = root.querySelector<HTMLElement>(SEL.listPane);
    const chrome = listPane?.querySelector<HTMLElement>(`:scope > ${SEL.listChrome}`) ?? null;
    let block = listPane?.querySelector<HTMLElement>(`:scope > .${BLOCK_CLASS}`) ?? null;
    const folder = enabled && selectedPath !== null ? host.getFolder(selectedPath) : null;

    if (!listPane || !chrome || !folder) {
        block?.remove();
        return;
    }

    const key = `${folder.path}|${version}|${host.isCollapsed() ? 1 : 0}|${host.showBackButton() ? 1 : 0}|${options.hideFolderList ? 1 : 0}`;
    if (block && block.dataset.key === key) {
        if (block.previousElementSibling !== chrome) {
            chrome.after(block);
        }
        return;
    }

    const hidden = host.getHiddenFolderPatterns();
    const children = options.hideFolderList ? [] : getVisibleChildFolders(folder, hidden, host.getChildOrder(folder.path));
    const parent = host.showBackButton() ? folder.parent : null;

    // Nothing to show: no back button and no subfolders
    if (!parent && children.length === 0) {
        block?.remove();
        return;
    }

    if (!block) {
        block = createDiv();
        block.className = BLOCK_CLASS;
    }
    if (block.previousElementSibling !== chrome) {
        chrome.after(block);
    }
    block.dataset.key = key;
    renderBlock(block, root, host, parent, children, hidden);
}

function renderBlock(
    block: HTMLElement,
    root: HTMLElement,
    host: SubfolderHost,
    parent: FolderLike | null,
    children: FolderLike[],
    hidden: string[]
): void {
    const s = host.strings;
    // Keyboard users who drilled in keep focus inside the block after it re-renders
    const hadFocus = block.contains(block.ownerDocument.activeElement);
    if (hadFocus) {
        window.requestAnimationFrame(() => {
            const target = block.querySelector<HTMLElement>('.nnc-sf-row') ?? block.querySelector<HTMLElement>('.nnc-sf-back');
            target?.focus();
        });
    }
    block.replaceChildren();

    const collapsed = host.isCollapsed();
    const bar = createDiv();
    bar.className = 'nnc-sf-bar';

    // The Up button always keeps its slot, so the Folders toggle never shifts when Up is off or at the root
    const back = createEl('button');
    back.type = 'button';
    back.className = 'nnc-sf-back';
    const backIcon = createSpan();
    backIcon.className = 'nnc-sf-back-icon';
    host.renderIcon(backIcon, 'chevron-left', 'chevron-left');
    const backLabel = createSpan();
    backLabel.textContent = s.backShort;
    back.append(backIcon, backLabel);
    if (parent) {
        back.setAttribute('aria-label', s.back);
        back.addEventListener('click', () => host.navigateFromList(root, parent.path));
    } else {
        back.classList.add('is-placeholder');
        back.disabled = true;
        back.tabIndex = -1;
        back.setAttribute('aria-hidden', 'true');
    }
    bar.appendChild(back);

    if (children.length > 0) {
        const toggle = createEl('button');
        toggle.type = 'button';
        toggle.className = 'nnc-sf-toggle';
        toggle.setAttribute('aria-expanded', String(!collapsed));
        toggle.setAttribute('aria-label', collapsed ? s.expandFolders : s.collapseFolders);
        const chevron = createSpan();
        chevron.className = 'nnc-sf-toggle-icon';
        host.renderIcon(chevron, 'chevron-right', 'chevron-right');
        const title = createSpan();
        title.textContent = `${s.folders} · ${children.length}`;
        toggle.append(chevron, title);
        toggle.addEventListener('click', () => host.setCollapsed(!collapsed));
        bar.appendChild(toggle);
    }
    block.appendChild(bar);

    if (children.length === 0 || collapsed) {
        return;
    }

    const list = createDiv();
    list.className = 'nnc-sf-list';
    list.setAttribute('role', 'list');

    for (const child of children) {
        const row = createEl('button');
        row.type = 'button';
        row.className = 'nnc-sf-row';
        row.setAttribute('role', 'listitem');
        row.dataset.path = child.path;

        const icon = createSpan();
        icon.className = 'nnc-sf-icon';
        const color = host.getFolderColor(child.path);
        if (color) {
            icon.setCssProps({ '--nnc-sf-icon-color': color });
        }
        host.renderIcon(icon, host.getFolderIcon(child.path), 'folder');

        const text = createSpan();
        text.className = 'nnc-sf-text';
        const name = createSpan();
        name.className = 'nnc-sf-name';
        name.textContent = child.name;
        const meta = createSpan();
        meta.className = 'nnc-sf-meta';
        const subCount = getVisibleChildFolders(child, hidden, { manual: [], descending: false }).length;
        const noteCount = countNotesRecursive(child, hidden);
        meta.textContent = subCount > 0 ? `${s.subfolderCount(subCount)} · ${s.noteCount(noteCount)}` : s.noteCount(noteCount);
        text.append(name, meta);

        const arrow = createSpan();
        arrow.className = 'nnc-sf-arrow';
        host.renderIcon(arrow, 'chevron-right', 'chevron-right');

        row.append(icon, text, arrow);
        row.addEventListener('click', () => host.navigateFromList(root, child.path));
        list.appendChild(row);
    }
    block.appendChild(list);
}
