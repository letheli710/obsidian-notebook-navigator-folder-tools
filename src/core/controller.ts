import { ARRIVAL_WINDOW_MS, AUTO_FADE_MS, type CompanionSettings } from '../settings';
import { applyGuides, removeGuides } from './guides';
import { applyLocate, removeLocate, type Arrival } from './locate';
import { applyBoxList, removeBoxList, type BoxListHost } from './boxList';
import { applySubfolders, removeSubfolders, type SubfolderHost } from './subfolders';

export interface ControllerHost extends SubfolderHost, BoxListHost {
    /** Notebook Navigator's "show notes from subfolders" is on */
    getIncludeDescendants(): boolean;
    getSettings(): CompanionSettings;
    /** Container elements of every open Notebook Navigator view */
    getRoots(): HTMLElement[];
    /** Selected folder path, or null when a tag/property (or nothing) is selected */
    getSelectedFolderPath(): string | null;
    now(): number;
}

const OBSERVE_OPTIONS: MutationObserverInit = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'aria-expanded', 'data-path', 'data-level']
};

/**
 * Watches Notebook Navigator's DOM and keeps the decorations in sync.
 * All writes happen with the observer disconnected, so our own changes never re-trigger it.
 */
export class Controller {
    private observers = new Map<HTMLElement, MutationObserver>();
    private frame = 0;
    private arrival: Arrival = { path: null, at: 0 };
    private timers: number[] = [];
    private version = 0;
    private running = false;
    /** Duration of decoration passes, for the settings page */
    readonly stats = { last: 0, max: 0 };

    constructor(private host: ControllerHost) {}

    start(): void {
        this.running = true;
        this.syncRoots();
        this.schedule();
    }

    stop(): void {
        this.running = false;
        if (this.frame) {
            window.cancelAnimationFrame(this.frame);
            this.frame = 0;
        }
        this.clearTimers();
        this.observers.forEach((observer, root) => {
            observer.disconnect();
            removeGuides(root);
            root.removeAttribute('data-nnc-guides');
            removeLocate(root);
            removeSubfolders(root);
            removeBoxList(root);
        });
        this.observers.clear();
    }

    /** Attach to new navigator views and drop closed ones */
    syncRoots(): void {
        if (!this.running) {
            return;
        }
        const roots = new Set(this.host.getRoots());
        this.observers.forEach((observer, root) => {
            if (!roots.has(root) || !root.isConnected) {
                observer.disconnect();
                this.observers.delete(root);
            }
        });
        roots.forEach(root => {
            if (!this.observers.has(root)) {
                const observer = new MutationObserver(() => this.schedule());
                observer.observe(root, OBSERVE_OPTIONS);
                this.observers.set(root, observer);
            }
        });
    }

    /** Re-render the subfolder block (vault or folder metadata changed) */
    invalidate(): void {
        this.version++;
        this.schedule();
    }

    schedule(): void {
        if (!this.running || this.frame) {
            return;
        }
        this.frame = window.requestAnimationFrame(() => {
            this.frame = 0;
            this.run();
        });
    }

    private clearTimers(): void {
        this.timers.forEach(id => window.clearTimeout(id));
        this.timers = [];
    }

    private run(): void {
        const settings = this.host.getSettings();
        const selected = this.host.getSelectedFolderPath();
        const now = this.host.now();

        if (selected !== this.arrival.path) {
            this.arrival = { path: selected, at: now };
            this.clearTimers();
            this.timers.push(window.setTimeout(() => this.schedule(), ARRIVAL_WINDOW_MS + 20));
            if (settings.autoFade) {
                this.timers.push(window.setTimeout(() => this.schedule(), AUTO_FADE_MS + 20));
            }
        }

        const started = performance.now();
        this.observers.forEach((observer, root) => {
            observer.disconnect();
            try {
                // Marks the view so CSS can hide Notebook Navigator's own guides while ours are on
                root.toggleAttribute('data-nnc-guides', settings.indentGuides);
                applyGuides(root, settings.indentGuides);
                applyLocate(root, settings, this.arrival, now, path => this.host.getFolderColor(path));
                const grouped = settings.descendantGroups && selected !== null && this.host.getIncludeDescendants();
                applyBoxList(root, this.host, grouped, selected, this.version, settings.hidePreview);
                applySubfolders(root, this.host, settings.subfolders, selected, this.version, { hideFolderList: grouped });
            } catch (error) {
                console.error('[nn-companion] decoration failed', error);
            } finally {
                observer.takeRecords();
                observer.observe(root, OBSERVE_OPTIONS);
            }
        });
        this.stats.last = performance.now() - started;
        this.stats.max = Math.max(this.stats.max, this.stats.last);
    }

    /** Settings changed: restart fade timing relative to the last arrival */
    onSettingsChanged(): void {
        const settings = this.host.getSettings();
        this.clearTimers();
        if (settings.autoFade && this.arrival.path !== null) {
            const remaining = this.arrival.at + AUTO_FADE_MS - this.host.now();
            if (remaining > 0) {
                this.timers.push(window.setTimeout(() => this.schedule(), remaining + 20));
            }
        }
        this.invalidate();
    }
}
