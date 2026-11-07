import { SEL } from '../selectors';
import { ARRIVAL_WINDOW_MS, AUTO_FADE_MS } from '../settings';

const FX_CLASS = 'nnc-fx';
const ROW_ATTR = 'data-nnc-fx';

export interface LocateOptions {
    marquee: boolean;
    corners: boolean;
    autoFade: boolean;
}

export interface Arrival {
    path: string | null;
    at: number;
}

function cleanupRow(row: HTMLElement): void {
    row.querySelector(`:scope > .${FX_CLASS}`)?.remove();
    row.removeAttribute(ROW_ATTR);
}

export function removeLocate(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>(`[${ROW_ATTR}]`).forEach(cleanupRow);
}

function createFx(): HTMLElement {
    const fx = createSpan();
    fx.className = FX_CLASS;
    fx.setAttribute('aria-hidden', 'true');

    const bg = createSpan();
    bg.className = 'nnc-fx-bg';
    const glow = createSpan();
    glow.className = 'nnc-fx-glow';
    const ring = createSpan();
    ring.className = 'nnc-fx-ring';
    const corners = createSpan();
    corners.className = 'nnc-fx-corners';
    for (let i = 0; i < 4; i++) {
        corners.appendChild(createEl('i'));
    }
    fx.append(bg, glow, ring, corners);
    return fx;
}

/** Folder color as Notebook Navigator rendered it on the row's icon, if any */
function readRowColor(row: HTMLElement): string | null {
    const icon = row.querySelector<HTMLElement>(SEL.icon);
    const color = icon?.style.color;
    return color ? color : null;
}

/**
 * Decorates the selected folder row with the locate effect.
 * With both effects off nothing is injected and the row keeps the stock look.
 */
export function applyLocate(
    root: HTMLElement,
    options: LocateOptions,
    arrival: Arrival,
    now: number,
    getFolderColor: (path: string) => string | null
): void {
    const scroller = root.querySelector<HTMLElement>(SEL.navScroller);
    if (!scroller) {
        return;
    }
    const enabled = options.marquee || options.corners;

    let selected: HTMLElement | null = null;
    if (enabled) {
        scroller.querySelectorAll<HTMLElement>(`${SEL.navRow}.${SEL.folderClass}.${SEL.selectedClass}`).forEach(row => {
            if (!selected && !row.classList.contains(SEL.shortcutClass) && row.dataset.path !== undefined) {
                selected = row;
            }
        });
    }

    scroller.querySelectorAll<HTMLElement>(`[${ROW_ATTR}]`).forEach(row => {
        if (row !== selected) {
            cleanupRow(row);
        }
    });

    if (!selected) {
        return;
    }
    const row: HTMLElement = selected;
    const path = row.dataset.path ?? '';

    let fx = row.querySelector<HTMLElement>(`:scope > .${FX_CLASS}`);
    if (!fx || fx.dataset.path !== path) {
        fx?.remove();
        fx = createFx();
        fx.dataset.path = path;
        if (arrival.path === path && now - arrival.at < ARRIVAL_WINDOW_MS) {
            fx.classList.add('nnc-arrive');
        }
        row.prepend(fx);
    }
    if (!row.hasAttribute(ROW_ATTR)) {
        row.setAttribute(ROW_ATTR, '');
    }

    fx.classList.toggle('nnc-m', options.marquee);
    fx.classList.toggle('nnc-c', options.corners);

    const shouldFade = options.autoFade && arrival.path === path && now - arrival.at >= AUTO_FADE_MS;
    if (shouldFade && !fx.classList.contains('nnc-faded')) {
        // A row mounted after the fade time skips the fade transition
        const late = now - arrival.at >= AUTO_FADE_MS + 800;
        fx.classList.toggle('nnc-notrans', late);
        fx.classList.add('nnc-faded');
    } else if (!shouldFade && fx.classList.contains('nnc-faded')) {
        fx.classList.remove('nnc-faded', 'nnc-notrans');
    }

    const color = readRowColor(row) ?? getFolderColor(path) ?? '';
    if (fx.dataset.color !== color) {
        fx.dataset.color = color;
        if (color) {
            fx.style.setProperty('--nnc-fc', color);
        } else {
            fx.style.removeProperty('--nnc-fc');
        }
    }
}
