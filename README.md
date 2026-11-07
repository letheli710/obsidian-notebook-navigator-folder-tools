# Notebook Navigator Folder Tools

Add subfolder drill-down to the Notebook Navigator list pane, plus folder tree indent guides, a locate effect for the selected folder, and grouping of subfolder notes.

A companion for [Notebook Navigator](https://github.com/johansan/notebook-navigator). Notebook Navigator itself is never modified; turn this off any time to get the stock look back.

> Not affiliated with Notebook Navigator or its author.

![Subfolders in the list pane and the navigation pane following along](assets/demo.gif)

[中文说明](#中文说明)

## Features

### Subfolders in the list pane

Click a subfolder to open it. The folder tree follows along, and **Up** goes back.

Notebook Navigator's list pane normally shows only notes, so going into a subfolder means going back to the folder tree. This plugin lists the current folder's subfolders at the top of the list pane, each with its counts of folders and notes. Clicking one opens it right there, while the folder tree on the left expands to it, selects it and scrolls it into view, so both panes always agree on where you are. **Up** takes you back one level and keeps its place even in a top-level folder, so the buttons never jump under your mouse. **Folders · N** collapses the list when you want more room for notes and remembers your choice. Hidden folders, folder order, colors and icons all follow your Notebook Navigator settings.

![Subfolders in the list pane](assets/subfolders.png)

### Notes from subfolders, grouped

With "Show notes from subfolders" on, notes are grouped by subfolder. Deeper notes show their path.

Notebook Navigator's "Show notes from subfolders" puts every note from every subfolder into one long list, so it is hard to tell where a note lives. With this feature the folder's own notes come first, followed by one group per direct subfolder, marked by a quiet bracket with the folder name on top (click the name to open that folder). Notes from deeper folders stay in their group with a small path chip such as `Wireframes`, and groups only take a color if you colored that folder. Note rows follow Notebook Navigator's own preview, date format and sort order. **Hide previews in the grouped list** gives a denser list with only title, date and path, and affects only this grouped list. Large folders are drawn in batches as you scroll, and previews are read only for notes you see.

![Notes from subfolders grouped by folder](assets/grouped-notes.png)

### Indent guides

Lines in the folder tree, styled like Obsidian's file explorer.

In a deep folder tree it is easy to lose track of which folder a row belongs to. Each expanded folder gets a solid vertical line from its first child to its last, exactly like the guides in Obsidian's built-in file explorer. The lines use your theme's guide color and width, so they match light and dark themes, and Notebook Navigator's own guides on folder rows are hidden while this is on so you never see two sets.

![Indent guides](assets/indent-guides.png)

### Find the selected folder

A rainbow outline and closing-in corners, easy to spot among colored folders. Each can be turned off.

When folders have their own colors, the normal selection highlight blends in and it is hard to see which folder is open. The **rainbow marquee** draws a slowly flowing rainbow outline around the selected row, and the **corner lock** brings four corner marks in on the folder when you arrive, then lets them breathe gently. Each has its own switch; with both off the row looks exactly like stock Notebook Navigator. **Auto fade** hides the effects 5 seconds after you arrive, if you only want a quick "you are here", and both effects respect the system "reduce motion" setting.

![Locate effect](assets/locate.png)

## Installation

1. Install and enable **Notebook Navigator** first.
2. In Obsidian, open **Settings → Community plugins → Browse**, search for **Notebook Navigator Folder Tools**, install and enable it.

Manual install: download `main.js`, `manifest.json` and `styles.css` from the [latest release](https://github.com/letheli710/obsidian-notebook-navigator-folder-tools/releases/latest) into `<your vault>/.obsidian/plugins/notebook-navigator-folder-tools/`, then enable the plugin in Settings.

## Settings

| Setting | Default | What it does |
| --- | --- | --- |
| Indent guides | On | Lines under expanded folders in the folder tree. Hides Notebook Navigator's own guides on folder rows while on. |
| Rainbow marquee | On | Flowing outline around the selected folder. |
| Corner lock | On | Corner marks that close in on arrival, then breathe gently. |
| Auto fade | Off | Fades the two effects 5 seconds after arriving at a folder. |
| Show subfolders | On | Subfolders above the notes in the list pane. |
| Up one level button | On | Button above the subfolders that goes to the parent folder. |
| Group notes from subfolders | On | Groups notes by subfolder while "Show notes from subfolders" is on. |
| Hide previews in the grouped list | Off | Only title, date and path in the grouped list. Notebook Navigator's own list is not affected. |

## FAQ

### How do I show subfolders in the Notebook Navigator list pane?

Install this plugin. The list pane then lists the current folder's subfolders above the notes, and clicking one enters it.

### How do I add indent guides to Notebook Navigator like Obsidian's file explorer?

Turn on "Indent guides" (on by default). Each expanded folder gets a line in the same style as the built-in file explorer.

### How can I see which subfolder a note comes from when "Show notes from subfolders" is on?

Keep "Group notes from subfolders" on. Notes are grouped by direct subfolder, and deeper notes show their folder path.

### Can I navigate down into folders from the list pane (drill-down navigation)?

Yes. Click a subfolder in the list pane to go into it; use "Up" to go back. The navigation pane follows along.

### The selected folder is hard to spot among colored folders. Can it stand out more?

Yes: the rainbow marquee and corner lock make the selected folder obvious. Turn either off in settings.

### Does it slow down Obsidian?

No. It starts after the workspace is ready and only touches rows on screen. The settings tab shows its measured load time.

### Does it change Notebook Navigator or my notes?

No. It only adds to what you see, and never changes Notebook Navigator's files, its settings or your notes.

## Compatibility and limitations

- Needs Notebook Navigator and Obsidian 1.8.7+. Tested on desktop with Notebook Navigator 3.5; less tested on mobile.
- A big Notebook Navigator update may break a feature until this plugin catches up. Please [open an issue](https://github.com/letheli710/obsidian-notebook-navigator-folder-tools/issues) if that happens.
- The grouped list shows Markdown notes only, without keyboard navigation, multi-select or drag and drop.
- Indent guides assume a left-to-right layout.

## Development

```bash
npm install
npm run dev     # rebuild main.js on change
npm run build   # type check and production build
npm run lint    # the same lint rules as the Obsidian plugin review
npm test        # unit tests
```

All Notebook Navigator interface names this plugin relies on are in `src/selectors.ts`.

## 中文说明

[Notebook Navigator](https://github.com/johansan/notebook-navigator) 的非官方配套插件,不修改 Notebook Navigator,关掉即恢复原样。

**右栏显示子文件夹**:点击进入下一层,左栏同步展开;「Up」返回上一层。

Notebook Navigator 的右栏原本只列笔记,想进子文件夹得回到左栏去点。现在右栏顶部会列出当前文件夹的子文件夹,并显示各自包含多少文件夹和笔记。点击就在右栏进入,同时左栏自动展开到这个文件夹、选中并滚动到可见位置,两栏始终一致。「Up」返回上一层,在顶层文件夹也保留位置,按钮不会跳来跳去。「Folders · N」可以收起子文件夹列表给笔记腾地方,并记住你的选择。隐藏文件夹、排序、颜色和图标都沿用 Notebook Navigator 的设置。

**子文件夹笔记分组**:开启「显示子文件夹的笔记」时按子文件夹分组,深层笔记标出路径。

Notebook Navigator 的「显示子文件夹的笔记」会把所有子文件夹的笔记混成一长串,看不出笔记在哪。开启分组后,当前文件夹自己的笔记在最前,后面每个直接子文件夹一组,左侧一个淡淡的方括号,文件夹名在上方,点名字可以进入该文件夹。更深层的笔记留在所属的组里,带路径小标签;只有你给文件夹设了颜色,分组才带颜色。笔记行沿用 Notebook Navigator 的预览、日期格式和排序。「分组列表中隐藏预览」只显示标题、日期和路径,只影响这个分组列表。大文件夹边滚动边分批绘制,预览只读取看得见的笔记。

**层级线**:文件夹树的竖线,和 Obsidian 自带文件列表一样。

文件夹层级一深,就容易看不清某一行属于哪个文件夹。每个展开的文件夹会从第一个子项到最后一个子项画一条实线,和 Obsidian 自带文件列表一样,颜色和粗细跟随主题;开启时会隐藏 Notebook Navigator 自己在文件夹行上的层级线,避免出现两套线。

**定位效果**:彩虹边框和四角收拢,彩色文件夹里一眼找到当前位置,可分别关闭。

给文件夹设了颜色以后,普通的选中高亮会和颜色混在一起。彩虹跑马灯是选中行外圈缓缓流动的彩虹边框,四角收拢是到达时四个角向文件夹收拢、之后轻轻呼吸。两个效果可以分别开关,都关掉就和原版 Notebook Navigator 完全一样。「自动淡出」让效果在到达 5 秒后消失;系统开启「减少动态效果」时动画会自动减弱。

中文界面下设置页为中文。

## License

[MIT](LICENSE)
