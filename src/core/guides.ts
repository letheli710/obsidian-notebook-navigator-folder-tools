import { SEL } from '../selectors';
import { computeGuideLevels, type GuideRowInfo } from './guideModel';

const GUIDES_CLASS = 'nnc-guides';
const DEFAULT_INDENT = 16;

interface MeasuredRow {
    info: GuideRowInfo;
    el: HTMLElement;
    /** Chevron center, relative to the row's left edge */
    chevronCenterX: number;
}

function parsePx(value: string): number | null {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : null;
}

function estimateIndent(rows: MeasuredRow[]): number {
    // Two rows on different levels give the indent directly, independent of theme or mobile tweaks
    for (let i = 0; i < rows.length; i++) {
        for (let j = i + 1; j < rows.length; j++) {
            const a = rows[i];
            const b = rows[j];
            if (a.info.level !== b.info.level) {
                const indent = (a.chevronCenterX - b.chevronCenterX) / (a.info.level - b.info.level);
                if (indent > 0 && indent < 200) {
                    return indent;
                }
            }
        }
    }
    const first = rows[0];
    if (first) {
        const fromVar = parsePx(getComputedStyle(first.el).getPropertyValue('--nn-setting-nav-indent'));
        if (fromVar !== null && fromVar > 0) {
            return fromVar;
        }
    }
    return DEFAULT_INDENT;
}

export function removeGuides(root: HTMLElement): void {
    root.querySelectorAll(`.${GUIDES_CLASS}`).forEach(el => el.remove());
}

function collectRows(scroller: HTMLElement): { infos: GuideRowInfo[]; elements: Map<number, HTMLElement> } {
    const infos: GuideRowInfo[] = [];
    const elements = new Map<number, HTMLElement>();

    scroller.querySelectorAll<HTMLElement>(SEL.virtualNavItem).forEach(wrapper => {
        const index = Number(wrapper.dataset.index);
        const row = wrapper.querySelector<HTMLElement>(SEL.navRow);
        if (!Number.isFinite(index) || !row) {
            return;
        }
        const isFolder =
            row.classList.contains(SEL.folderClass) &&
            !row.classList.contains(SEL.shortcutClass) &&
            row.dataset.path !== undefined &&
            row.dataset.level !== undefined;
        if (!isFolder) {
            return;
        }
        infos.push({ index, isFolder, level: Number(row.dataset.level) });
        elements.set(index, row);
    });

    return { infos, elements };
}

/**
 * Draws indent guides into each mounted folder row. Rows are recycled by the virtual list, so this
 * runs again whenever rows mount; each row keeps a signature and is only rewritten when it changes.
 */
export function applyGuides(root: HTMLElement, enabled: boolean): void {
    const scroller = root.querySelector<HTMLElement>(SEL.navScroller);
    if (!scroller) {
        return;
    }
    if (!enabled) {
        removeGuides(scroller);
        return;
    }

    const { infos, elements } = collectRows(scroller);
    const levelsByIndex = computeGuideLevels(infos);

    // Read phase: measure every folder row before writing anything
    const measured: MeasuredRow[] = [];
    for (const info of infos) {
        const el = elements.get(info.index);
        if (!el) {
            continue;
        }
        const rowRect = el.getBoundingClientRect();
        if (rowRect.height === 0) {
            continue; // Pane hidden (e.g. single-pane list view)
        }
        const chevronRect = el.querySelector<HTMLElement>(SEL.chevron)?.getBoundingClientRect();
        if (!chevronRect || chevronRect.width === 0) {
            continue;
        }
        measured.push({ info, el, chevronCenterX: chevronRect.left + chevronRect.width / 2 - rowRect.left });
    }
    const indent = estimateIndent(measured);

    // Write phase
    const touched = new Set<HTMLElement>();
    for (const row of measured) {
        const levels = levelsByIndex.get(row.info.index);
        if (!levels || levels.length === 0) {
            continue;
        }
        touched.add(row.el);
        writeRowGuides(row, levels, indent);
    }

    scroller.querySelectorAll<HTMLElement>(`.${GUIDES_CLASS}`).forEach(container => {
        const owner = container.parentElement;
        if (!owner || !touched.has(owner)) {
            container.remove();
        }
    });
}

function writeRowGuides(row: MeasuredRow, levels: number[], indent: number): void {
    // Center each line on the ancestor's arrow, like Obsidian's own file explorer
    const xs = levels.map(level => Math.round(row.chevronCenterX - (row.info.level - level) * indent - 0.5));
    const signature = xs.join(',');

    let container = row.el.querySelector<HTMLElement>(`:scope > .${GUIDES_CLASS}`);
    if (container && container.dataset.sig === signature) {
        return;
    }
    if (!container) {
        container = createSpan();
        container.className = GUIDES_CLASS;
        container.setAttribute('aria-hidden', 'true');
        row.el.prepend(container);
    }
    container.dataset.sig = signature;
    container.replaceChildren(
        ...xs.map(x => {
            const line = createSpan();
            line.className = 'nnc-guide';
            line.setCssProps({ '--nnc-guide-x': `${x}px` });
            return line;
        })
    );
}
