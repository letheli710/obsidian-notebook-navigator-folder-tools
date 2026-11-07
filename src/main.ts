import { Plugin, TFolder, type TAbstractFile } from 'obsidian';
import { Controller } from './core/controller';
import { ObsidianHost, type NNApi } from './host';
import { CompanionSettingTab } from './settingTab';
import { DEFAULT_SETTINGS, type CompanionSettings } from './settings';

export default class NNCompanionPlugin extends Plugin {
    settings: CompanionSettings = { ...DEFAULT_SETTINGS };
    host!: ObsidianHost;
    private controller!: Controller;
    private boundApi: NNApi | null = null;
    private apiRefs: unknown[] = [];
    private loadMs = 0;
    private modifyTimer = 0;

    async onload(): Promise<void> {
        const loadStarted = performance.now();
        await this.loadSettings();

        this.host = new ObsidianHost(
            this.app,
            () => this.settings,
            collapsed => {
                this.settings.subfoldersCollapsed = collapsed;
                void this.saveData(this.settings);
                this.controller.invalidate();
            }
        );
        this.controller = new Controller(this.host);
        this.addSettingTab(new CompanionSettingTab(this.app, this));

        this.app.workspace.onLayoutReady(() => {
            this.bindApi();
            this.controller.start();
        });

        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                this.controller.syncRoots();
                this.controller.schedule();
            })
        );
        this.registerEvent(this.app.workspace.on('css-change', () => this.controller.schedule()));
        this.registerDomEvent(window, 'resize', () => this.controller.schedule());

        const onVaultChange = (file: TAbstractFile) => {
            if (file instanceof TFolder || file.path.toLowerCase().endsWith('.md')) {
                this.controller.invalidate();
            }
        };
        this.registerEvent(this.app.vault.on('create', onVaultChange));
        this.registerEvent(this.app.vault.on('delete', onVaultChange));
        this.registerEvent(this.app.vault.on('rename', onVaultChange));
        // Saves happen every few seconds while typing: refresh once things settle, and only for notes
        this.registerEvent(
            this.app.vault.on('modify', file => {
                if (!file.path.toLowerCase().endsWith('.md')) {
                    return;
                }
                window.clearTimeout(this.modifyTimer);
                this.modifyTimer = window.setTimeout(() => this.controller.invalidate(), 1500);
            })
        );
        this.registerEvent(this.app.workspace.on('file-open', () => this.controller.schedule()));

        // Notebook Navigator may load after us, or be reloaded or toggled: rebind when its API changes
        this.registerInterval(
            window.setInterval(() => {
                this.bindApi();
                this.controller.syncRoots();
            }, 2000)
        );
        this.loadMs = performance.now() - loadStarted;
    }

    onunload(): void {
        window.clearTimeout(this.modifyTimer);
        this.unbindApi();
        this.controller?.stop();
    }

    getPerfStats(): { load: string; max: string; last: string } {
        const fmt = (n: number) => n.toFixed(1);
        return { load: fmt(this.loadMs), max: fmt(this.controller.stats.max), last: fmt(this.controller.stats.last) };
    }

    private bindApi(): void {
        const api = this.host.getApi();
        if (api === this.boundApi) {
            return;
        }
        this.unbindApi();
        this.boundApi = api;
        if (!api?.on) {
            return;
        }
        const schedule = () => this.controller.schedule();
        this.apiRefs = [
            api.on('nav-item-changed', schedule),
            api.on('storage-ready', () => this.controller.invalidate()),
            api.on('folder-changed', () => this.controller.invalidate())
        ];
        this.controller.invalidate();
    }

    private unbindApi(): void {
        const api = this.boundApi;
        if (api?.off) {
            this.apiRefs.forEach(ref => {
                try {
                    api.off?.(ref);
                } catch {
                    // Notebook Navigator already unloaded
                }
            });
        }
        this.apiRefs = [];
        this.boundApi = null;
    }

    async loadSettings(): Promise<void> {
        const data = (await this.loadData()) as Partial<CompanionSettings> | null;
        this.settings = { ...DEFAULT_SETTINGS, ...(data ?? {}) };
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
        this.controller.onSettingsChanged();
    }
}
