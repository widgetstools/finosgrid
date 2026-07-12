// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — cell / range selection controller (AG CellSelectionModule subset) ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

/**
 * @typedef {object} CellRange
 * @property {{ rowIndex: number }} startRow
 * @property {{ rowIndex: number }} endRow
 * @property {string[]} columns
 * @property {string} [startColumn]
 */

/**
 * @param {object} [options]
 * @param {() => import('./selection_options.js').CellSelectionOptions|null} [options.getOptions]
 * @param {(e: { cellRanges: CellRange[] }) => void} [options.onCellSelectionChanged]
 * @param {(e: any) => void} [options.onCellSelectionDeleteStart]
 * @param {(e: any) => void} [options.onCellSelectionDeleteEnd]
 */
export function createCellSelectionController({
    getOptions,
    onCellSelectionChanged,
    onCellSelectionDeleteStart,
    onCellSelectionDeleteEnd,
} = {}) {
    /** @type {CellRange[]} */
    let ranges = [];
    /** @type {{ rowIndex: number, colId: string }|null} */
    let anchor = null;
    /** @type {{ rowIndex: number, colId: string }|null} */
    let focus = null;

    function opts() {
        return getOptions?.() || null;
    }

    function enabled() {
        return !!opts()?.enabled;
    }

    function emit() {
        onCellSelectionChanged?.({ cellRanges: getCellRanges() });
    }

    function normalizeRange(range) {
        const r0 = Math.min(range.startRow.rowIndex, range.endRow.rowIndex);
        const r1 = Math.max(range.startRow.rowIndex, range.endRow.rowIndex);
        const cols = (range.columns || []).slice();
        return {
            startRow: { rowIndex: r0 },
            endRow: { rowIndex: r1 },
            columns: cols,
            startColumn: range.startColumn || cols[0],
        };
    }

    function getCellRanges() {
        return ranges.map((r) => ({
            startRow: { ...r.startRow },
            endRow: { ...r.endRow },
            columns: r.columns.slice(),
            startColumn: r.startColumn,
        }));
    }

    /**
     * @param {Partial<CellRange>} range
     */
    function addCellRange(range) {
        if (!enabled()) return;
        const next = normalizeRange({
            startRow: range.startRow || { rowIndex: 0 },
            endRow: range.endRow || range.startRow || { rowIndex: 0 },
            columns: range.columns || [],
            startColumn: range.startColumn,
        });
        if (opts()?.suppressMultiRanges) ranges = [next];
        else ranges.push(next);
        focus = {
            rowIndex: next.endRow.rowIndex,
            colId: next.columns[next.columns.length - 1] || next.startColumn,
        };
        if (!anchor && next.columns[0]) {
            anchor = {
                rowIndex: next.startRow.rowIndex,
                colId: next.columns[0],
            };
        }
        emit();
    }

    function clearCellSelection() {
        if (!ranges.length && !focus && !anchor) return;
        ranges = [];
        anchor = null;
        focus = null;
        emit();
    }

    /**
     * @param {{ rowIndex: number, colId: string }} from
     * @param {{ rowIndex: number, colId: string }} to
     * @param {{ columns: string[], additive?: boolean }} ctx
     */
    function setRangeFromCells(from, to, ctx) {
        if (!enabled()) return;
        const ordered = ctx.columns || [];
        const i0 = ordered.indexOf(from.colId);
        const i1 = ordered.indexOf(to.colId);
        if (i0 < 0 || i1 < 0) return;
        const lo = Math.min(i0, i1);
        const hi = Math.max(i0, i1);
        const columns = ordered.slice(lo, hi + 1);
        const next = normalizeRange({
            startRow: { rowIndex: from.rowIndex },
            endRow: { rowIndex: to.rowIndex },
            columns,
            startColumn: from.colId,
        });
        anchor = { ...from };
        focus = { ...to };
        if (ctx.additive && !opts()?.suppressMultiRanges) {
            // Update the in-progress additive range instead of stacking one per move
            if (ranges.length) ranges[ranges.length - 1] = next;
            else ranges = [next];
        } else {
            ranges = [next];
        }
        emit();
    }

    /**
     * @param {number} rowIndex
     * @param {string} colId
     */
    function isCellInSelection(rowIndex, colId) {
        for (const r of ranges) {
            const r0 = Math.min(r.startRow.rowIndex, r.endRow.rowIndex);
            const r1 = Math.max(r.startRow.rowIndex, r.endRow.rowIndex);
            if (rowIndex < r0 || rowIndex > r1) continue;
            if (r.columns.includes(colId)) return true;
        }
        return false;
    }

    /**
     * @param {string} colId
     * @param {{ rowCount: number, clearOthers?: boolean, additive?: boolean }} ctx
     */
    function selectColumn(colId, ctx) {
        if (!enabled() || !opts()?.enableColumnSelection) return;
        const next = normalizeRange({
            startRow: { rowIndex: 0 },
            endRow: { rowIndex: Math.max(0, (ctx.rowCount || 1) - 1) },
            columns: [colId],
            startColumn: colId,
        });
        if (ctx.additive && !opts()?.suppressMultiRanges && !ctx.clearOthers) {
            ranges.push(next);
        } else {
            ranges = [next];
        }
        anchor = { rowIndex: 0, colId };
        focus = { rowIndex: next.endRow.rowIndex, colId };
        emit();
    }

    /**
     * Extend existing primary range to a new cell (Shift+arrow / Shift+click).
     * @param {{ rowIndex: number, colId: string }} cell
     * @param {{ columns: string[] }} ctx
     */
    function extendToCell(cell, ctx) {
        if (!enabled()) return;
        if (!anchor) {
            setRangeFromCells(cell, cell, ctx);
            return;
        }
        setRangeFromCells(anchor, cell, { ...ctx, additive: false });
    }

    function getAnchor() {
        return anchor ? { ...anchor } : null;
    }

    function setAnchor(cell) {
        anchor = cell ? { ...cell } : null;
    }

    function getFocus() {
        return focus ? { ...focus } : null;
    }

    function setFocus(cell) {
        focus = cell ? { ...cell } : null;
    }

    /**
     * Edge flags for painting range borders on a cell.
     * @param {number} rowIndex
     * @param {string} colId
     * @returns {{ top: boolean, bottom: boolean, left: boolean, right: boolean }|null}
     */
    function getRangeEdgeFlags(rowIndex, colId) {
        for (const r of ranges) {
            if (!r.columns.includes(colId)) continue;
            const r0 = Math.min(r.startRow.rowIndex, r.endRow.rowIndex);
            const r1 = Math.max(r.startRow.rowIndex, r.endRow.rowIndex);
            if (rowIndex < r0 || rowIndex > r1) continue;
            const ci = r.columns.indexOf(colId);
            return {
                top: rowIndex === r0,
                bottom: rowIndex === r1,
                left: ci === 0,
                right: ci === r.columns.length - 1,
            };
        }
        return null;
    }

    /**
     * Delete-key clear — emits delete events; caller applies value clears.
     * @returns {CellRange[]} ranges that were cleared
     */
    function beginDelete() {
        if (!ranges.length) return [];
        onCellSelectionDeleteStart?.({ cellRanges: getCellRanges() });
        const snapshot = getCellRanges();
        return snapshot;
    }

    function endDelete() {
        onCellSelectionDeleteEnd?.({ cellRanges: getCellRanges() });
    }

    return {
        getCellRanges,
        addCellRange,
        clearCellSelection,
        setRangeFromCells,
        isCellInSelection,
        selectColumn,
        extendToCell,
        getAnchor,
        setAnchor,
        getFocus,
        setFocus,
        getRangeEdgeFlags,
        beginDelete,
        endDelete,
        enabled,
    };
}
