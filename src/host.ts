import { Menu, setIcon, TFile, TFolder, type App } from 'obsidian';
import type { ControllerHost } from './core/controller';
import { previewFromMarkdown, type ListAppearance, type NoteSort } from './core/boxList';
import type { ChildOrder, FolderLike } from './core/folderData';
import { getStrings, type Strings } from './i18n';
import { NN_PLUGIN_ID, NN_VIEW_TYPE, SEL } from './selectors';
import type { CompanionSettings } from './settings';

/* Minimal shapes of the Notebook Navigator objects we touch. Public API members are marked. */

interface NNFolderMeta {
    color?: string | null;
    icon?: string | null;
}

export interface NNApi {
    /** Public */
    selection?: { getNavItem?: () => { type?: string; folder?: TFolder | null } | null };
    /** Public */
    navigation?: { navigateToFolder?: (folder: TFolder | string) => Promise<boolean> };
    /** Public */
    metadata?: { getFolderMeta?: (folder: TFolder) => NNFolderMeta | null };
    /** Public */
    on?: (event: string, callback: (data: unknown) => void) => unknown;
    /** Public */
    off?: (ref: unknown) => void;
}

interface NNPlugin {
    api?: NNApi | null;
    /** Internal */
    settings?: {
        vaultProfile?: string;
        vaultProfiles?: Array<{ id?: string; hiddenFolders?: string[] }>;
        folderChildOrder?: Record<string, string[]>;
        folderSortOrder?: string;
        folderTreeSortOverrides?: Record<string, string>;
        showFilePreview?: boolean;
        previewRows?: number;
        showFileDate?: boolean;
        dateFormat?: string;
        timeFormat?: string;
        defaultFolderSort?: string;
        folderSortOverrides?: Record<string, string>;
        alphabeticalDateMode?: string;
        folderAppearances?: Record<string, { mode?: string; previewRows?: number; showDate?: boolean } | undefined>;
    };
    /** Internal */
    getUXPreferences?: () => { showHiddenItems?: boolean; includeDescendantNotes?: boolean };
}

interface NNView {
    containerEl: HTMLElement;
    /** Internal: same as the public navigateToFolder but lets us control focus */
    navigateToFolder?: (folder: TFolder, options?: { skipFocus?: boolean; preserveNavigationFocus?: boolean }) => boolean;
}

const PROVIDER_PREFIX = /^(ph|bi|fas|far|fab|mi|ra|si|lucide)[-:]/i;

export class ObsidianHost implements ControllerHost {
    readonly strings: Strings = getStrings();

    constructor(
        private app: App,
        private settingsRef: () => CompanionSettings,
        private saveCollapsed: (collapsed: boolean) => void
    ) {}

    getNNPlugin(): NNPlugin | null {
        const plugins = (this.app as unknown as { plugins?: { plugins?: Record<string, unknown> } }).plugins?.plugins;
        return (plugins?.[NN_PLUGIN_ID] as NNPlugin | undefined) ?? null;
    }

    getApi(): NNApi | null {
        return this.getNNPlugin()?.api ?? null;
    }

    getSettings(): CompanionSettings {
        return this.settingsRef();
    }

    now(): number {
        return Date.now();
    }

    private getViews(): NNView[] {
        return this.app.workspace.getLeavesOfType(NN_VIEW_TYPE).map(leaf => leaf.view as unknown as NNView);
    }

    getRoots(): HTMLElement[] {
        return this.getViews().map(view => view.containerEl);
    }

    getSelectedFolderPath(): string | null {
        const item = this.getApi()?.selection?.getNavItem?.();
        if (!item) {
            return null;
        }
        if (item.type !== undefined && item.type !== 'folder') {
            return null;
        }
        return item.folder?.path ?? null;
    }

    getFolder(path: string): FolderLike | null {
        const folder = path === '/' ? this.app.vault.getRoot() : this.app.vault.getFolderByPath(path);
        return (folder as unknown as FolderLike | null) ?? null;
    }

    private getFolderMeta(path: string): NNFolderMeta | null {
        const folder = path === '/' ? this.app.vault.getRoot() : this.app.vault.getFolderByPath(path);
        if (!folder) {
            return null;
        }
        try {
            return this.getApi()?.metadata?.getFolderMeta?.(folder) ?? null;
        } catch {
            return null;
        }
    }

    getFolderColor(path: string): string | null {
        return this.getFolderMeta(path)?.color ?? null;
    }

    getFolderIcon(path: string): string | null {
        return this.getFolderMeta(path)?.icon ?? null;
    }

    getHiddenFolderPatterns(): string[] {
        const plugin = this.getNNPlugin();
        try {
            if (plugin?.getUXPreferences?.().showHiddenItems) {
                return [];
            }
            const settings = plugin?.settings;
            const profile = settings?.vaultProfiles?.find(p => p.id === settings.vaultProfile) ?? settings?.vaultProfiles?.[0];
            return Array.isArray(profile?.hiddenFolders) ? profile.hiddenFolders : [];
        } catch {
            return [];
        }
    }

    getChildOrder(parentPath: string): ChildOrder {
        const settings = this.getNNPlugin()?.settings;
        const manual = settings?.folderChildOrder?.[parentPath];
        const direction = settings?.folderTreeSortOverrides?.[parentPath] ?? settings?.folderSortOrder;
        return { manual: Array.isArray(manual) ? manual : [], descending: direction === 'alpha-desc' };
    }

    renderIcon(el: HTMLElement, icon: string | null, fallback: string): void {
        el.replaceChildren();
        const value = icon?.trim() ?? '';
        if (value && !/^[\x20-\x7e]+$/.test(value)) {
            // Emoji or other non-ASCII icon
            el.textContent = value;
            el.classList.add('nnc-emoji-icon');
            return;
        }
        if (value && !PROVIDER_PREFIX.test(value)) {
            setIcon(el, value);
            if (el.childElementCount > 0) {
                return;
            }
        }
        setIcon(el, fallback);
    }

    getIncludeDescendants(): boolean {
        try {
            return Boolean(this.getNNPlugin()?.getUXPreferences?.().includeDescendantNotes);
        } catch {
            return false;
        }
    }

    /** Notebook Navigator's list appearance for a folder (falls back to its defaults) */
    getListAppearance(folderPath: string): ListAppearance {
        const settings = this.getNNPlugin()?.settings;
        const known: NoteSort[] = ['modified-desc', 'modified-asc', 'created-desc', 'created-asc', 'title-asc', 'title-desc'];
        const raw = settings?.folderSortOverrides?.[folderPath] ?? settings?.defaultFolderSort ?? 'modified-desc';
        const normalized = raw.replace(/^filename-/, 'title-');
        const sort: NoteSort = (known as string[]).includes(normalized) ? (normalized as NoteSort) : 'modified-desc';
        const dateField = sort.startsWith('created') || (sort.startsWith('title') && settings?.alphabeticalDateMode === 'created') ? 'ctime' : 'mtime';
        // Per-folder appearance from its list header menu: compact mode, preview rows (0 = none), date
        const appearance = settings?.folderAppearances?.[folderPath];
        const compact = appearance?.mode === 'compact';
        const rowsOverride = typeof appearance?.previewRows === 'number' ? appearance.previewRows : undefined;
        return {
            showPreview: !compact && (settings?.showFilePreview ?? true) && rowsOverride !== 0,
            previewRows: Math.max(1, Math.min(5, rowsOverride && rowsOverride > 0 ? rowsOverride : (settings?.previewRows ?? 2))),
            showDate: !compact && (appearance?.showDate ?? settings?.showFileDate ?? true),
            sort,
            dateField
        };
    }

    async readPreview(path: string): Promise<string> {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (!(file instanceof TFile)) {
            return '';
        }
        return previewFromMarkdown(await this.app.vault.cachedRead(file));
    }

    getActiveFilePath(): string | null {
        return this.app.workspace.getActiveFile()?.path ?? null;
    }

    openFile(path: string, newTab: boolean): void {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) {
            void this.app.workspace.getLeaf(newTab ? 'tab' : false).openFile(file);
        }
    }

    showFileMenu(event: MouseEvent, path: string): void {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (!file) {
            return;
        }
        const menu = new Menu();
        this.app.workspace.trigger('file-menu', menu, file, 'file-explorer-context-menu');
        menu.showAtMouseEvent(event);
    }

    /** Same formats as Notebook Navigator: time for today, its date format otherwise */
    formatDate(timestamp: number): string {
        if (!timestamp) {
            return '';
        }
        const settings = this.getNNPlugin()?.settings;
        const date = new Date(timestamp);
        const isToday = date.toDateString() === new Date().toDateString();
        const momentFn = (window as unknown as { moment?: (d: Date) => { format(f: string): string } }).moment;
        const format = isToday ? (settings?.timeFormat ?? 'h:mm a') : (settings?.dateFormat ?? 'MMM D, YYYY');
        if (momentFn) {
            return momentFn(date).format(format);
        }
        return isToday ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : date.toLocaleDateString();
    }

    showBackButton(): boolean {
        return this.settingsRef().backButton;
    }

    isCollapsed(): boolean {
        return this.settingsRef().subfoldersCollapsed;
    }

    setCollapsed(collapsed: boolean): void {
        this.saveCollapsed(collapsed);
    }

    navigateFromList(root: HTMLElement, path: string): void {
        void this.navigate(root, path);
    }

    private async navigate(root: HTMLElement, path: string): Promise<void> {
        const folder = path === '/' ? this.app.vault.getRoot() : this.app.vault.getFolderByPath(path);
        if (!folder) {
            return;
        }
        const view = this.getViews().find(v => v.containerEl === root);
        const navPane = root.querySelector<HTMLElement>(SEL.navPane);
        const listPane = root.querySelector<HTMLElement>(SEL.listPane);
        const dualPane = Boolean(navPane && listPane && navPane.offsetWidth > 0 && listPane.offsetWidth > 0);

        let ok = false;
        if (typeof view?.navigateToFolder === 'function') {
            // Dual pane: keep focus where the click happened. Single pane: stay on the list view.
            ok = view.navigateToFolder(folder, dualPane ? { skipFocus: true } : { preserveNavigationFocus: false }) !== false;
        }
        if (!ok) {
            ok = (await this.getApi()?.navigation?.navigateToFolder?.(folder)) ?? false;
        }
        if (ok && dualPane) {
            this.expandFolderRow(root, folder.path);
        }
    }

    /** Notebook Navigator expands the ancestors; expand the target itself too, by its arrow */
    private expandFolderRow(root: HTMLElement, path: string, attempt = 0): void {
        const rows = root.querySelectorAll<HTMLElement>(`${SEL.navScroller} ${SEL.navRow}.${SEL.folderClass}`);
        let row: HTMLElement | null = null;
        rows.forEach(candidate => {
            if (!row && candidate.dataset.path === path && !candidate.classList.contains(SEL.shortcutClass)) {
                row = candidate;
            }
        });
        if (!row) {
            if (attempt < 30) {
                window.requestAnimationFrame(() => this.expandFolderRow(root, path, attempt + 1));
            }
            return;
        }
        const target: HTMLElement = row;
        if (target.getAttribute('aria-expanded') === 'false') {
            target.querySelector<HTMLElement>(SEL.chevron)?.click();
        }
    }
}
