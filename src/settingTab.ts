import { PluginSettingTab, Setting, type App } from 'obsidian';
import type NNCompanionPlugin from './main';
import type { CompanionSettings } from './settings';

type BooleanKey = { [K in keyof CompanionSettings]: CompanionSettings[K] extends boolean ? K : never }[keyof CompanionSettings];

export class CompanionSettingTab extends PluginSettingTab {
    constructor(
        app: App,
        private plugin: NNCompanionPlugin
    ) {
        super(app, plugin);
    }

    private toggle(name: string, desc: string, key: BooleanKey): Setting {
        return new Setting(this.containerEl)
            .setName(name)
            .setDesc(desc)
            .addToggle(toggle =>
                toggle.setValue(this.plugin.settings[key]).onChange(async value => {
                    this.plugin.settings[key] = value;
                    await this.plugin.saveSettings();
                })
            );
    }

    display(): void {
        const { containerEl } = this;
        const s = this.plugin.host.strings.settings;
        containerEl.empty();

        if (!this.plugin.host.getNNPlugin()) {
            containerEl.createEl('p', { text: s.nnMissing, cls: 'mod-warning' });
        }

        new Setting(containerEl).setName(s.treeHeading).setHeading();
        this.toggle(s.guides, s.guidesDesc, 'indentGuides');

        new Setting(containerEl).setName(s.locateHeading).setDesc(s.locateDesc).setHeading();
        this.toggle(s.marquee, s.marqueeDesc, 'marquee');
        this.toggle(s.corners, s.cornersDesc, 'corners');
        this.toggle(s.autoFade, s.autoFadeDesc, 'autoFade');

        new Setting(containerEl).setName(s.listHeading).setHeading();
        this.toggle(s.subfolders, s.subfoldersDesc, 'subfolders');
        this.toggle(s.backButton, s.backButtonDesc, 'backButton');
        new Setting(containerEl)
            .setName(s.groups)
            .setDesc(s.groupsDesc)
            .addToggle(toggle =>
                toggle.setValue(this.plugin.settings.descendantGroups).onChange(async value => {
                    this.plugin.settings.descendantGroups = value;
                    await this.plugin.saveSettings();
                    this.display(); // the preview switch below depends on this one
                })
            );
        const groupsOn = this.plugin.settings.descendantGroups;
        new Setting(containerEl)
            .setName(s.hidePreview)
            .setDesc(groupsOn ? s.hidePreviewDesc : `${s.hidePreviewDesc} ${s.hidePreviewNeedsGroups}`)
            .setDisabled(!groupsOn)
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.hidePreview)
                    .setDisabled(!groupsOn)
                    .onChange(async value => {
                        this.plugin.settings.hidePreview = value;
                        await this.plugin.saveSettings();
                    })
            );

        const stats = this.plugin.getPerfStats();
        new Setting(containerEl).setName(s.perfHeading).setDesc(s.perfDesc(stats.load, stats.max, stats.last)).setHeading();
    }
}
