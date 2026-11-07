import { describe, expect, it } from 'vitest';
import {
    countNotesRecursive,
    folderChain,
    getVisibleChildFolders,
    isFolderHiddenByPatterns,
    type FileLike,
    type FolderLike
} from '../src/core/folderData';

function makeFolder(path: string, parent: FolderLike | null): FolderLike {
    const name = path === '/' ? '' : path.split('/').pop()!;
    const f: FolderLike = { name, path, parent, children: [] };
    parent?.children.push(f);
    return f;
}

function makeFile(parent: FolderLike, name: string): FileLike {
    const path = parent.path === '/' ? name : `${parent.path}/${name}`;
    const file: FileLike = { name, path, extension: name.split('.').pop()! };
    parent.children.push(file);
    return file;
}

const root = makeFolder('/', null);
const school = makeFolder('School', root);
const week10 = makeFolder('School/Week 10', school);
const week2 = makeFolder('School/Week 2', school);
const assets = makeFolder('School/assets', school);
makeFolder('School/Archive', school);
makeFile(school, 'index.md');
makeFile(week2, 'a.md');
makeFile(week2, 'b.md');
makeFile(week2, 'pic.png');
makeFile(week10, 'c.md');
makeFile(assets, 'd.md');
const deep = makeFolder('School/Week 2/Lab', week2);
makeFile(deep, 'e.md');

describe('isFolderHiddenByPatterns', () => {
    it('supports exact, prefix and suffix name patterns, case-insensitively', () => {
        expect(isFolderHiddenByPatterns(assets, ['Assets'])).toBe(true);
        expect(isFolderHiddenByPatterns(assets, ['ass*'])).toBe(true);
        expect(isFolderHiddenByPatterns(assets, ['*ets'])).toBe(true);
        expect(isFolderHiddenByPatterns(assets, ['asset'])).toBe(false);
    });

    it('supports path patterns that also hide descendants', () => {
        expect(isFolderHiddenByPatterns(week2, ['/School/Week 2'])).toBe(true);
        expect(isFolderHiddenByPatterns(deep, ['/School/Week 2'])).toBe(true);
        expect(isFolderHiddenByPatterns(week10, ['/School/Week 2'])).toBe(false);
        expect(isFolderHiddenByPatterns(week10, ['/School/*'])).toBe(true);
    });
});

describe('getVisibleChildFolders', () => {
    it('sorts naturally, so Week 2 comes before Week 10', () => {
        const names = getVisibleChildFolders(school, [], { manual: [], descending: false }).map(f => f.name);
        expect(names).toEqual(['Archive', 'assets', 'Week 2', 'Week 10']);
    });

    it('honours descending order and hidden folders', () => {
        const names = getVisibleChildFolders(school, ['assets'], { manual: [], descending: true }).map(f => f.name);
        expect(names).toEqual(['Week 10', 'Week 2', 'Archive']);
    });

    it('puts manually ordered folders first, the rest alphabetically after', () => {
        const names = getVisibleChildFolders(school, [], { manual: ['Week 10', 'Missing'], descending: false }).map(f => f.name);
        expect(names).toEqual(['Week 10', 'Archive', 'assets', 'Week 2']);
    });
});

describe('countNotesRecursive', () => {
    it('counts markdown notes in all visible descendants', () => {
        expect(countNotesRecursive(week2, [])).toBe(3);
        expect(countNotesRecursive(school, [])).toBe(6);
        expect(countNotesRecursive(school, ['assets'])).toBe(5);
    });
});

describe('folderChain', () => {
    it('lists ancestors from the root down', () => {
        expect(folderChain(deep).map(f => f.path)).toEqual(['/', 'School', 'School/Week 2', 'School/Week 2/Lab']);
    });
});
