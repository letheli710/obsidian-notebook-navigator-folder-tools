/**
 * Every Notebook Navigator DOM name this plugin relies on.
 *
 * None of these are part of Notebook Navigator's public API. If an upstream update renames one of
 * them, the matching feature stops working (Notebook Navigator itself is unaffected); fix it here.
 */
export const NN_PLUGIN_ID = 'notebook-navigator';
export const NN_VIEW_TYPE = 'notebook-navigator';

export const SEL = {
    /** Left pane root */
    navPane: '.nn-navigation-pane',
    /** Scroll container that holds the virtualized folder tree */
    navScroller: '.nn-navigation-pane-scroller',
    /** Virtual row wrapper, carries data-index */
    virtualNavItem: '.nn-virtual-nav-item',
    /** Any navigation row */
    navRow: '.nn-navitem',
    /** Folder row class (carries data-path, data-level, aria-expanded) */
    folderClass: 'nn-folder',
    /** Shortcut rows reuse nav row styling but are not part of the tree */
    shortcutClass: 'nn-shortcut-item',
    selectedClass: 'nn-selected',
    chevron: '.nn-navitem-chevron',
    icon: '.nn-navitem-icon',
    /** Upstream's own indent guides (hidden while ours are on) */
    upstreamGuide: '.nn-navitem-indent-guide',
    /** Right pane root and its header block; the subfolder block goes right after the header */
    listPane: '.nn-list-pane',
    listChrome: '.nn-list-pane-chrome',
    /** List pane body (hidden by plan 2 while it shows its own list) */
    listPanel: '.nn-list-pane-panel',
    listScroller: '.nn-list-pane-scroller',
    listVirtualContainer: '.nn-virtual-container',
    /** Virtual list row wrapper, carries data-index */
    listVirtualItem: '.nn-virtual-item',
    listGroupHeader: '.nn-list-group-header',
    listGroupHeaderPath: '.nn-list-group-header-path',
    listGroupHeaderText: '.nn-list-group-header-text',
    listGroupHeaderSpacer: '.nn-list-group-header-spacer',
    pinnedHeaderClass: 'nn-pinned-section-header',
    /** Note row (carries data-path) */
    listFile: '.nn-file'
} as const;
