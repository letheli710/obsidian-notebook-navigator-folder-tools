import { getLanguage } from 'obsidian';

const zh = {
    back: '返回上一层',
    backShort: '上一层',
    noNotes: '没有笔记',
    thisFolder: '当前文件夹',
    enterFolder: (name: string) => `进入 ${name}`,
    folders: '文件夹',
    expandFolders: '展开文件夹列表',
    collapseFolders: '收起文件夹列表',
    subfolderCount: (n: number) => `${n} 个文件夹`,
    noteCount: (n: number) => `${n} 篇笔记`,
    settings: {
        nnMissing: '没有检测到 Notebook Navigator。请先安装并启用它,本插件只是在它上面做增强。',
        treeHeading: '左栏',
        guides: '层级线',
        guidesDesc: '和 Obsidian 自带文件列表一样的竖线:每个展开的文件夹画一条线,从第一个子文件夹一直到最后一个,颜色和粗细跟随主题。开启后,文件夹行上不再显示 Notebook Navigator 自带的缩进参考线。',
        locateHeading: '定位效果(左栏选中的文件夹)',
        locateDesc: '两个效果可以任意组合。都关时,选中行完全是 Notebook Navigator 原版的样子。',
        marquee: '彩色跑马灯',
        marqueeDesc: '选中行外围一圈流动的彩虹边框。',
        corners: '四角锁定',
        cornersDesc: '到达新文件夹时四个角从外侧收拢到位,之后持续轻微呼吸。',
        autoFade: '自动淡出',
        autoFadeDesc: '开:到达 5 秒后效果淡出,只留下加深的底色。关:效果一直显示。',
        listHeading: '右栏',
        subfolders: '显示子文件夹',
        subfoldersDesc: '在笔记列表上方显示当前文件夹的子文件夹,点击即进入,左栏同步展开并定位。只在文件夹视图生效。',
        backButton: '返回上一层按钮',
        backButtonDesc: '在子文件夹上方显示「上一层」按钮,点击回到父文件夹。',
        groups: '子文件夹笔记按文件夹分组',
        groupsDesc: '打开 Notebook Navigator 的「显示子文件夹的笔记」时,把笔记按第一层子文件夹分组,每组左侧一个方括号,文件夹名写在括号顶上。更深层的笔记在所属的组里,下方小字写出路径。这时右栏换成插件绘制的列表:预览、日期、排序跟随 Notebook Navigator 的设置(包括右栏「外观」菜单里对单个文件夹的设置);没有它的键盘上下选择、多选和拖拽。',
        hidePreview: '分组列表隐藏预览',
        hidePreviewDesc: '只作用于上面这个分组列表(Notebook Navigator 打开「显示子文件夹的笔记」时出现)。打开后每篇笔记只显示标题、日期和路径。Notebook Navigator 自己的列表不受影响,它的预览请在它的设置或右栏「外观」菜单里调。',
        hidePreviewNeedsGroups: '需要先打开上面的「子文件夹笔记按文件夹分组」。',
        perfHeading: '性能',
        perfDesc: (load: string, max: string, last: string) => `插件加载 ${load} ms;界面更新最长 ${max} ms,最近一次 ${last} ms。`
    }
};

type Strings = typeof zh;

const en: Strings = {
    back: 'Up one level',
    backShort: 'Up',
    noNotes: 'No notes',
    thisFolder: 'This folder',
    enterFolder: (name: string) => `Open ${name}`,
    folders: 'Folders',
    expandFolders: 'Expand folder list',
    collapseFolders: 'Collapse folder list',
    subfolderCount: (n: number) => `${n} folder${n === 1 ? '' : 's'}`,
    noteCount: (n: number) => `${n} note${n === 1 ? '' : 's'}`,
    settings: {
        nnMissing: 'Notebook Navigator was not found. Install and enable it first; this plugin only adds to it.',
        treeHeading: 'Navigation pane',
        guides: 'Indent guides',
        guidesDesc:
            "Lines like Obsidian's own file explorer: each expanded folder gets one line from its first subfolder to its last, in the theme's guide color and width. Hides Notebook Navigator's own indent guides on folder rows while on.",
        locateHeading: 'Locate effect (selected folder)',
        locateDesc: 'The two effects combine freely. With both off the selected row looks exactly like stock Notebook Navigator.',
        marquee: 'Rainbow marquee',
        marqueeDesc: 'A flowing rainbow ring around the selected row.',
        corners: 'Corner lock',
        cornersDesc: 'On arrival four corners close in on the row, then breathe gently.',
        autoFade: 'Auto fade',
        autoFadeDesc: 'On: the effects fade 5 seconds after arriving, leaving the darker background. Off: they stay.',
        listHeading: 'List pane',
        subfolders: 'Show subfolders',
        subfoldersDesc:
            'Lists the current folder’s subfolders above the notes. Click one to enter it; the navigation pane follows. Folder view only.',
        backButton: 'Up one level button',
        backButtonDesc: 'Shows an "Up" button above the subfolders that returns to the parent folder.',
        groups: 'Group notes from subfolders',
        groupsDesc: "While Notebook Navigator shows notes from subfolders, group them by direct subfolder with a left bracket and the folder name on top. Deeper notes stay in their group with the path underneath. The list is drawn by this plugin and follows Notebook Navigator's preview, date and sort settings (including per-folder appearance); no keyboard navigation, multi-select or drag.",
        hidePreview: 'Hide previews in the grouped list',
        hidePreviewDesc: "Only affects the grouped list above (shown while Notebook Navigator shows notes from subfolders): each note shows just title, date and path. Notebook Navigator's own list is not affected; set its previews in its settings or its list appearance menu.",
        hidePreviewNeedsGroups: 'Turn on grouping above first.',
        perfHeading: 'Performance',
        perfDesc: (load: string, max: string, last: string) => `Plugin load ${load} ms; slowest UI update ${max} ms, latest ${last} ms.`
    }
};

/** Strings in Obsidian's interface language: Chinese for zh/zh-TW, English otherwise */
export function getStrings(): Strings {
    return getLanguage().toLowerCase().startsWith('zh') ? zh : en;
}

export type { Strings };
