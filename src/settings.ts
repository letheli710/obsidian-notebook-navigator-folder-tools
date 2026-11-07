export interface CompanionSettings {
    /** Indent guides in the folder tree, styled like Obsidian's file explorer */
    indentGuides: boolean;
    /** Rainbow marquee ring around the selected folder */
    marquee: boolean;
    /** Corner brackets that lock in on arrival and then breathe */
    corners: boolean;
    /** Fade the marquee and corners 5 seconds after arriving at a folder */
    autoFade: boolean;
    /** Subfolder block in the list pane */
    subfolders: boolean;
    /** "Up one level" button above the subfolders */
    backButton: boolean;
    /** While Notebook Navigator shows notes from subfolders, group them by direct subfolder (our own list) */
    descendantGroups: boolean;
    /** Hide note previews in the grouped list only (Notebook Navigator's own list is not affected) */
    hidePreview: boolean;
    /** Collapsed state of the subfolder list (remembered) */
    subfoldersCollapsed: boolean;
}

export const DEFAULT_SETTINGS: CompanionSettings = {
    indentGuides: true,
    marquee: true,
    corners: true,
    autoFade: false,
    subfolders: true,
    backButton: true,
    descendantGroups: true,
    hidePreview: false,
    subfoldersCollapsed: false
};

/** Fixed delay before the locate effect fades when auto fade is on */
export const AUTO_FADE_MS = 5000;
/** Window after an arrival in which a freshly mounted selected row plays the corner lock-in */
export const ARRIVAL_WINDOW_MS = 700;
