/**
 * Pure model for the indent guides. No DOM access, so it can be unit tested.
 *
 * Drawn like Obsidian's own file explorer: each expanded folder owns one solid line that runs from
 * the top of its first child to the bottom of its last descendant. In a virtual list every row
 * draws its own slice, so a visible folder row at level L draws one full-height segment for each
 * expanded ancestor level 0..L-1. Consecutive slices join into one continuous line.
 */

export interface GuideRowInfo {
    /** Virtual list index */
    index: number;
    /** True for folder tree rows; other rows (tags, headers, spacers) get no guides */
    isFolder: boolean;
    level: number;
}

/** Ancestor levels whose line passes through each folder row, keyed by virtual index */
export function computeGuideLevels(rows: readonly GuideRowInfo[]): Map<number, number[]> {
    const result = new Map<number, number[]>();
    for (const row of rows) {
        if (!row.isFolder || row.level <= 0) {
            continue;
        }
        result.set(
            row.index,
            Array.from({ length: row.level }, (_, k) => k)
        );
    }
    return result;
}
