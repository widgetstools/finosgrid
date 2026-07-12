// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — AG selection option normalization (row + cell)                    ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

/** Synthetic column id for dedicated selection checkboxes (AG-style). */
export const SELECTION_COL_ID = "ag-Grid-SelectionColumn";

/**
 * @typedef {'singleRow'|'multiRow'} RowSelectionMode
 * @typedef {'selectionColumn'|'autoGroupColumn'} CheckboxLocation
 * @typedef {'self'|'descendants'|'filteredDescendants'} GroupSelects
 * @typedef {'all'|'filtered'|'currentPage'} SelectAllMode
 *
 * @typedef {object} RowSelectionOptions
 * @property {RowSelectionMode} mode
 * @property {boolean|Function} checkboxes
 * @property {CheckboxLocation} checkboxLocation
 * @property {boolean|'enableSelection'|'enableDeselection'} enableClickSelection
 * @property {((node: any) => boolean)|undefined} isRowSelectable
 * @property {boolean} hideDisabledCheckboxes
 * @property {boolean} copySelectedRows
 * @property {boolean} enableSelectionWithoutKeys
 * @property {'self'|'detail'} masterSelects
 * @property {boolean} [headerCheckbox]
 * @property {SelectAllMode} [selectAll]
 * @property {GroupSelects} [groupSelects]
 * @property {boolean} [ctrlASelectsRows]
 */

/**
 * Normalize AG `rowSelection` (legacy string or modern object) → options or null.
 * @param {any} raw
 * @returns {RowSelectionOptions|null}
 */
export function normalizeRowSelection(raw) {
    if (raw == null || raw === false) return null;
    /** @type {Partial<RowSelectionOptions> & { mode?: string }} */
    let partial = {};
    if (raw === true) {
        partial = { mode: "singleRow" };
    } else if (typeof raw === "string") {
        if (raw === "single" || raw === "singleRow") partial = { mode: "singleRow" };
        else if (raw === "multiple" || raw === "multiRow")
            partial = { mode: "multiRow" };
        else return null;
    } else if (typeof raw === "object") {
        partial = { ...raw };
        if (partial.mode === "single") partial.mode = "singleRow";
        if (partial.mode === "multiple") partial.mode = "multiRow";
    } else {
        return null;
    }
    if (partial.mode !== "singleRow" && partial.mode !== "multiRow") {
        return null;
    }
    /** @type {RowSelectionOptions} */
    const opts = {
        mode: partial.mode,
        checkboxes: partial.checkboxes ?? true,
        checkboxLocation: partial.checkboxLocation ?? "selectionColumn",
        enableClickSelection: partial.enableClickSelection ?? false,
        isRowSelectable: partial.isRowSelectable,
        hideDisabledCheckboxes: partial.hideDisabledCheckboxes ?? false,
        copySelectedRows: partial.copySelectedRows ?? false,
        enableSelectionWithoutKeys: partial.enableSelectionWithoutKeys ?? false,
        masterSelects: partial.masterSelects ?? "self",
    };
    if (opts.mode === "multiRow") {
        opts.headerCheckbox = partial.headerCheckbox ?? true;
        opts.selectAll = partial.selectAll ?? "all";
        opts.groupSelects = partial.groupSelects ?? "self";
        opts.ctrlASelectsRows = partial.ctrlASelectsRows ?? false;
    }
    return opts;
}

/**
 * @typedef {object} CellSelectionOptions
 * @property {true} enabled
 * @property {boolean} suppressMultiRanges
 * @property {boolean} enableHeaderHighlight
 * @property {boolean} enableColumnSelection
 * @property {{ mode: 'fill'|'range', [k: string]: any }|undefined} handle
 */

/**
 * Normalize AG `cellSelection` / legacy `enableRangeSelection`.
 * @param {any} raw
 * @param {any} [legacyEnableRangeSelection]
 * @returns {CellSelectionOptions|null}
 */
export function normalizeCellSelection(raw, legacyEnableRangeSelection) {
    let value = raw;
    if (value == null && legacyEnableRangeSelection) value = true;
    if (value == null || value === false) return null;
    if (value === true) {
        return {
            enabled: true,
            suppressMultiRanges: false,
            enableHeaderHighlight: false,
            enableColumnSelection: false,
            handle: undefined,
        };
    }
    if (typeof value !== "object") return null;
    return {
        enabled: true,
        suppressMultiRanges: !!value.suppressMultiRanges,
        enableHeaderHighlight: !!value.enableHeaderHighlight,
        enableColumnSelection: !!value.enableColumnSelection,
        handle: value.handle,
    };
}

/**
 * Whether a dedicated selection column should be prepended.
 * @param {RowSelectionOptions|null} opts
 */
export function wantsSelectionColumn(opts) {
    if (!opts) return false;
    if (opts.checkboxLocation !== "selectionColumn") return false;
    if (opts.checkboxes === false) return false;
    return true;
}
