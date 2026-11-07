/**
 * Pure helpers for the subfolder block: hidden-folder matching, ordering and counts.
 * Works on a minimal folder shape so it runs against Obsidian's TFolder or test fixtures.
 */

export interface FileLike {
    name: string;
    path: string;
    extension: string;
    stat?: { mtime: number; ctime?: number };
}

export interface FolderLike {
    name: string;
    path: string;
    parent: FolderLike | null;
    children: Array<FolderLike | FileLike>;
}

export function isFolderLike(node: FolderLike | FileLike): node is FolderLike {
    return Array.isArray((node as FolderLike).children);
}

function casefold(value: string): string {
    return value.toLocaleLowerCase();
}

/** Name pattern with an optional leading or trailing `*`, as Notebook Navigator supports */
function matchesNamePattern(name: string, pattern: string): boolean {
    const p = casefold(pattern.trim());
    const n = casefold(name);
    if (!p || !n) {
        return false;
    }
    if (!p.includes('*')) {
        return n === p;
    }
    if (p.endsWith('*') && !p.startsWith('*')) {
        return n.startsWith(p.slice(0, -1));
    }
    if (p.startsWith('*') && !p.endsWith('*')) {
        return n.endsWith(p.slice(1));
    }
    return n === p;
}

function escapeRegex(value: string): string {
    return value.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

/** Path pattern starting with `/`; `*` matches one path segment. Matches the folder and its descendants. */
function matchesPathPattern(folderPath: string, pattern: string): boolean {
    const p = casefold(pattern.trim()).replace(/\/+$/, '');
    if (!p.startsWith('/') || p === '/') {
        return false;
    }
    const target = casefold(folderPath.startsWith('/') ? folderPath : `/${folderPath}`);
    const source = p
        .split('/')
        .map(part => (part === '*' ? '[^/]+' : escapeRegex(part).replace(/\*/g, '[^/]*')))
        .join('/');
    return new RegExp(`^${source}(?:/.*)?$`).test(target);
}

/** Approximates Notebook Navigator's hidden-folder rules for one folder (not its ancestors) */
export function isFolderHiddenByPatterns(folder: { name: string; path: string }, patterns: readonly string[]): boolean {
    if (patterns.length === 0) {
        return false;
    }
    return patterns.some(pattern =>
        pattern.trim().startsWith('/') ? matchesPathPattern(folder.path, pattern) : matchesNamePattern(folder.name, pattern)
    );
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export interface ChildOrder {
    /** Manual order (child names) Notebook Navigator stores for this parent */
    manual: readonly string[];
    /** Alphabetical direction for children not in the manual order */
    descending: boolean;
}

/** Visible child folders in the order Notebook Navigator shows them in the tree */
export function getVisibleChildFolders(parent: FolderLike, hiddenPatterns: readonly string[], order: ChildOrder): FolderLike[] {
    const children = parent.children.filter(isFolderLike).filter(child => !isFolderHiddenByPatterns(child, hiddenPatterns));

    const manualIndex = new Map<string, number>();
    order.manual.forEach((name, i) => {
        if (!manualIndex.has(name)) {
            manualIndex.set(name, i);
        }
    });

    return children.sort((a, b) => {
        const ia = manualIndex.get(a.name);
        const ib = manualIndex.get(b.name);
        if (ia !== undefined && ib !== undefined) {
            return ia - ib;
        }
        if (ia !== undefined) {
            return -1;
        }
        if (ib !== undefined) {
            return 1;
        }
        const cmp = collator.compare(a.name, b.name);
        return order.descending ? -cmp : cmp;
    });
}

export const NOTE_EXTENSIONS = new Set(['md']);

/** Notes in the folder and all of its visible descendants */
export function countNotesRecursive(folder: FolderLike, hiddenPatterns: readonly string[]): number {
    let count = 0;
    const stack: FolderLike[] = [folder];
    while (stack.length > 0) {
        const current = stack.pop() as FolderLike;
        for (const child of current.children) {
            if (isFolderLike(child)) {
                if (!isFolderHiddenByPatterns(child, hiddenPatterns)) {
                    stack.push(child);
                }
            } else if (NOTE_EXTENSIONS.has(child.extension.toLowerCase())) {
                count++;
            }
        }
    }
    return count;
}

/** Ancestor chain from the vault root down to `folder`, inclusive */
export function folderChain(folder: FolderLike): FolderLike[] {
    const chain: FolderLike[] = [];
    let current: FolderLike | null = folder;
    while (current) {
        chain.unshift(current);
        current = current.parent;
    }
    return chain;
}
