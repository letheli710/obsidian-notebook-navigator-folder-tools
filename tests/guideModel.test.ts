import { describe, expect, it } from 'vitest';
import { computeGuideLevels, type GuideRowInfo } from '../src/core/guideModel';

function folder(index: number, level: number): GuideRowInfo {
    return { index, isFolder: true, level };
}

describe('computeGuideLevels', () => {
    // 20 Projects (expanded)
    //   Obsidian 插件 (expanded)
    //     Design
    //     Research
    //   个人网站
    // 30 Areas
    const rows: GuideRowInfo[] = [folder(0, 0), folder(1, 1), folder(2, 2), folder(3, 2), folder(4, 1), folder(5, 0)];

    it('draws one full-height line per ancestor through every descendant row', () => {
        const levels = computeGuideLevels(rows);
        expect(levels.get(1)).toEqual([0]);
        expect(levels.get(2)).toEqual([0, 1]);
        // The last child keeps the parent line at full height, so it reaches the next sibling (个人网站)
        expect(levels.get(3)).toEqual([0, 1]);
        expect(levels.get(4)).toEqual([0]);
    });

    it('draws nothing on top-level rows', () => {
        const levels = computeGuideLevels(rows);
        expect(levels.has(0)).toBe(false);
        expect(levels.has(5)).toBe(false);
    });

    it('ignores rows that are not folders', () => {
        const levels = computeGuideLevels([{ index: 0, isFolder: false, level: 2 }]);
        expect(levels.size).toBe(0);
    });
});
