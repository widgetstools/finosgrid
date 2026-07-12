// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — body viewport (split pin panes + virtual_mode both on center)     ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import "regular-table";
import {
    AUTO_GROUP_COL_ID,
    formatRowPathLabel,
    isRowPathExpandable,
} from "./row_grouping.js";
import { SELECTION_COL_ID } from "./selection_options.js";
import {
    createDetailRowModel,
    isDetailExpandable,
    isTreeExpandable,
    computeStickyGroupEntries,
    splitStickyTopAndBottom,
    stickyTotalLabel,
    pathKey,
} from "./detail_row_model.js";
import { iconChevronRight, iconChevronDown } from "./icons.js";

/**
 * Split-pane body:
 * - left / right: pinned columns only (`virtual_mode: "vertical"`)
 * - center: unpinned columns (`virtual_mode: "both"`) — true 2D virtualization
 *
 * With row grouping + `enableDetailLeaves` (default on when a table is provided):
 * finest group keys expand to Perspective-filtered detail rows (no group_by).
 *
 * @param {object} options
 * @param {(scrollLeft: number) => void} [options.onScroll]
 * @param {() => void} [options.onDraw]
 * @param {(info: { rowIndex: number, expanded: boolean, detail?: boolean }) => void} [options.onRowGroupOpened]
 * @param {(count: number) => void} [options.onDisplayedRowCount]
 * @param {() => any} [options.getTable]
 * @param {() => Array<[string, string]>} [options.getSort]
 * @param {() => Array<[string, string, any]>} [options.getFilter]
 * @param {boolean} [options.enableDetailLeaves=true]
 * @param {boolean} [options.suppressGroupRowsSticky=false]
 * @param {'top'|'bottom'|null} [options.groupTotalRow='bottom'] AG: subgroup total placement
 * @param {'top'|'bottom'|null} [options.grandTotalRow='bottom'] AG: grand total placement
 * @param {() => any} [options.getRowSelection]
 * @param {() => any} [options.getCellSelection]
 * @param {any} [options.rowSelection]
 * @param {any} [options.cellSelection]
 */
export function createBodyViewport({
    onScroll,
    onDraw,
    onRowGroupOpened,
    onDisplayedRowCount,
    getTable,
    getSort,
    getFilter,
    enableDetailLeaves = true,
    suppressGroupRowsSticky = false,
    groupTotalRow = "bottom",
    grandTotalRow = "bottom",
    getRowSelection,
    getCellSelection,
    rowSelection: rowSelectionCtrl,
    cellSelection: cellSelectionCtrl,
} = {}) {
    const root = document.createElement("div");
    root.className = "fg-shell__body";

    /** @type {string[]} */
    let fields = [];
    /** @type {string[]} */
    let leftFields = [];
    /** @type {string[]} */
    let centerFields = [];
    /** @type {string[]} */
    let rightFields = [];
    /** @type {Record<string, any[]>} */
    let columns = {};
    let numRows = 0;
    /** @type {Record<string, number>} */
    let widths = {};
    /** @type {Record<string, 'left'|'right'|null|undefined>} */
    let pins = {};
    /** @type {any} */
    let engineView = null;
    /** @type {{ getWidth?: Function, getPin?: Function }|null} */
    let layoutApi = null;
    let syncingScroll = false;
    /** @type {Map<string, string>} */
    const prevCellValues = new Map();
    /** @type {string[]} */
    let groupBy = [];
    /** @type {string[]} Perspective value columns (exclude auto-group) */
    let viewFields = [];
    /** Cached paths for the last painted virtual window (decoration) */
    /** @type {{ y0: number, paths: any[], slice: any[] }|null} */
    let rowPathCache = null;
    /** @type {ReturnType<typeof createDetailRowModel>|null} */
    let detailModel = null;
    let stickySuppressed = !!suppressGroupRowsSticky;
    /** @type {'top'|'bottom'|null|undefined} */
    let groupTotalPlacement = groupTotalRow;
    /** @type {'top'|'bottom'|null|undefined} */
    let grandTotalPlacement = grandTotalRow;
    /** @type {string} */
    let stickySignature = "";

    function isSyntheticField(f) {
        return f === AUTO_GROUP_COL_ID || f === SELECTION_COL_ID;
    }

    /** Row model active whenever we have group_by + table (sticky + optional detail). */
    function rowModelActive() {
        return !!getTable?.() && groupBy.length > 0 && !!detailModel;
    }

    function detailLeavesActive() {
        return enableDetailLeaves && rowModelActive();
    }

    function ensureDetailModel() {
        if (!getTable) {
            detailModel = null;
            return null;
        }
        if (!detailModel) {
            detailModel = createDetailRowModel({
                getTable,
                getGroupBy: () => groupBy,
                getViewFields: () => viewFields,
                getSort: getSort || (() => []),
                getFilter: getFilter || (() => []),
            });
        }
        return detailModel;
    }

    /**
     * @param {'left'|'center'|'right'} side
     */
    function makePane(side) {
        const wrap = document.createElement("div");
        wrap.className = `fg-shell__body-pane fg-shell__body-pane--${side}`;
        const table = document.createElement("regular-table");
        table.className = `fg-shell__body-rt fg-shell__body-rt--${side}`;
        // AG: sticky *headers* at top; sticky *totals* at bottom
        const stickyTopEl = document.createElement("div");
        stickyTopEl.className =
            "fg-shell__sticky-groups fg-shell__sticky-groups--top";
        stickyTopEl.style.display = "none";
        const stickyBottomEl = document.createElement("div");
        stickyBottomEl.className =
            "fg-shell__sticky-groups fg-shell__sticky-groups--bottom";
        stickyBottomEl.setAttribute("aria-hidden", "true");
        stickyBottomEl.style.display = "none";
        wrap.append(table, stickyTopEl, stickyBottomEl);

        stickyTopEl.addEventListener("click", async (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            const btn = target.closest?.(".fg-shell__tree-toggle");
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();
            const pathRaw = btn.getAttribute("data-group-path");
            if (pathRaw == null) return;
            let path;
            try {
                path = JSON.parse(pathRaw);
            } catch {
                return;
            }
            await handleGroupToggleByPath(path, btn);
        });

        /** @type {string[]} */
        let paneFields = [];
        let viewColOffset = 0;

        async function dataListener(x0, y0, x1, y1) {
            const nLocal = paneFields.length;
            if (nLocal === 0) {
                return { num_rows: numRows, num_columns: 0, data: [] };
            }
            const lx0 = Math.max(0, Math.min(x0, nLocal));
            const lx1 = Math.max(lx0, Math.min(x1, nLocal));
            const sliceFields = paneFields.slice(lx0, lx1);

            if (engineView && rowModelActive() && detailModel) {
                let num_rows = detailModel.numRows;
                numRows = num_rows;
                if (lx1 <= lx0 || y1 <= y0 || num_rows === 0) {
                    return {
                        num_rows,
                        num_columns: nLocal,
                        data: sliceFields.map(() => []),
                    };
                }
                try {
                    const fetched = await detailModel.fetchWindow(
                        engineView,
                        y0,
                        Math.min(y1, num_rows),
                        fields,
                        AUTO_GROUP_COL_ID,
                    );
                    num_rows = fetched.num_rows;
                    numRows = num_rows;
                    rowPathCache = {
                        y0,
                        paths: fetched.paths,
                        slice: fetched.slice,
                    };
                    return {
                        num_rows,
                        num_columns: nLocal,
                        data: sliceFields.map((f) => {
                            if (f === SELECTION_COL_ID) {
                                return Array(
                                    Math.max(0, Math.min(y1, num_rows) - y0),
                                ).fill("");
                            }
                            if (f === AUTO_GROUP_COL_ID) {
                                return (fetched.paths || []).map((path, i) => {
                                    const row = fetched.slice?.[i];
                                    if (row?.kind === "detail") return "";
                                    return formatRowPathLabel(path);
                                });
                            }
                            return fetched.columns[f] || [];
                        }),
                    };
                } catch {
                    return {
                        num_rows,
                        num_columns: nLocal,
                        data: sliceFields.map(() => []),
                    };
                }
            }

            let num_rows = numRows;
            if (engineView) {
                try {
                    num_rows = await engineView.num_rows();
                    numRows = num_rows;
                } catch {
                    /* mid-replace */
                }
            }

            if (lx1 <= lx0 || y1 <= y0 || num_rows === 0) {
                return {
                    num_rows,
                    num_columns: nLocal,
                    data: sliceFields.map(() => []),
                };
            }

            if (engineView) {
                const sliceReal = sliceFields.filter(
                    (f) => !isSyntheticField(f),
                );
                let start_col = 0;
                let end_col = 1;
                if (sliceReal.length) {
                    const idx = viewFields.indexOf(sliceReal[0]);
                    start_col = idx < 0 ? 0 : idx;
                    end_col = start_col + sliceReal.length;
                } else if (viewFields.length) {
                    start_col = 0;
                    end_col = 1;
                }

                const window = {
                    start_row: y0,
                    end_row: Math.min(y1, num_rows),
                    start_col,
                    end_col: Math.max(start_col + 1, end_col),
                };
                /** @type {Record<string, any[]>} */
                let cols = {};
                try {
                    cols = await engineView.to_columns(window);
                } catch {
                    return {
                        num_rows,
                        num_columns: nLocal,
                        data: sliceFields.map(() => []),
                    };
                }
                if (cols.__ROW_PATH__) {
                    rowPathCache = {
                        y0: window.start_row,
                        paths: cols.__ROW_PATH__,
                        slice: null,
                    };
                }
                return {
                    num_rows,
                    num_columns: nLocal,
                    data: sliceFields.map((f) => {
                        if (f === SELECTION_COL_ID) {
                            return Array(
                                Math.max(0, window.end_row - window.start_row),
                            ).fill("");
                        }
                        if (f === AUTO_GROUP_COL_ID) {
                            const paths = cols.__ROW_PATH__ || [];
                            return paths.map((path) =>
                                formatRowPathLabel(path),
                            );
                        }
                        return cols[f] || [];
                    }),
                };
            }

            return {
                num_rows,
                num_columns: nLocal,
                data: sliceFields.map((f) => {
                    if (f === SELECTION_COL_ID) {
                        return Array(Math.max(0, y1 - y0)).fill("");
                    }
                    const col = columns[f] || [];
                    return col.slice(y0, y1);
                }),
            };
        }

        // Default; reconfigured in configure()
        table.setDataListener(dataListener, { virtual_mode: "both" });

        table.addEventListener("click", async (e) => {
            if (!engineView || !groupBy.length) return;
            const target = /** @type {HTMLElement} */ (e.target);
            const btn = target.closest?.(".fg-shell__tree-toggle");
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();
            const td = btn.closest("td");
            const meta = td ? table.getMeta?.(td) : null;
            if (meta?.y == null) return;
            await handleGroupToggle(meta.y, btn);
        });

        table.addEventListener(
            "scroll",
            () => {
                if (syncingScroll) return;
                syncingScroll = true;
                try {
                    const top = table.scrollTop || 0;
                    for (const other of panes) {
                        if (other.table === table) continue;
                        if (other.wrap.style.display === "none") continue;
                        if (other.table.scrollTop !== top) {
                            other.table.scrollTop = top;
                        }
                    }
                    if (side === "center") {
                        onScroll?.(table.scrollLeft || 0);
                    }
                    void updateStickyGroups();
                } finally {
                    syncingScroll = false;
                }
            },
            { passive: true },
        );

        table.addStyleListener?.(() => {
            applyWidthsToPane(pane);
            decorateTreeCells(pane);
            decorateSelectionUi(pane);
            flashChangedCells(pane);
            onDraw?.();
        });

        const pane = {
            side,
            wrap,
            table,
            stickyTopEl,
            stickyBottomEl,
            /** @deprecated use stickyTopEl */
            get stickyEl() {
                return stickyTopEl;
            },
            get fields() {
                return paneFields;
            },
            /**
             * @param {string[]} nextFields
             * @param {number} offset
             * @param {'both'|'vertical'} virtualMode
             */
            configure(nextFields, offset, virtualMode) {
                paneFields = nextFields.slice();
                viewColOffset = offset;
                void viewColOffset;
                table.setDataListener(dataListener, {
                    virtual_mode: virtualMode,
                });
            },
        };
        return pane;
    }

    const leftPane = makePane("left");
    const centerPane = makePane("center");
    const rightPane = makePane("right");
    const panes = [leftPane, centerPane, rightPane];
    root.append(leftPane.wrap, centerPane.wrap, rightPane.wrap);

    function partitionFields(list) {
        const state = layoutApi;
        const getP = (f) => state?.getPin?.(f) ?? pins[f] ?? null;
        /** @type {string[]} */
        const left = [];
        /** @type {string[]} */
        const center = [];
        /** @type {string[]} */
        const right = [];
        for (const f of list) {
            const p = getP(f);
            if (p === "left") left.push(f);
            else if (p === "right") right.push(f);
            else center.push(f);
        }
        return { left, center, right };
    }

    function paneWidthPx(paneFields) {
        const getW = (f) => layoutApi?.getWidth?.(f) ?? widths[f] ?? 120;
        return paneFields.reduce((sum, f) => sum + getW(f), 0);
    }

    function layoutPanes() {
        viewFields = fields.filter((f) => !isSyntheticField(f));
        const parts = partitionFields(fields);
        leftFields = parts.left;
        centerFields = parts.center;
        rightFields = parts.right;
        const hasPins = leftFields.length > 0 || rightFields.length > 0;

        if (!hasPins) {
            leftPane.wrap.style.display = "none";
            rightPane.wrap.style.display = "none";
            centerPane.wrap.style.display = "";
            centerPane.wrap.style.flex = "1 1 auto";
            centerPane.wrap.style.width = "";
            centerPane.configure(fields, 0, "both");
            return;
        }

        leftPane.wrap.style.display = leftFields.length ? "" : "none";
        rightPane.wrap.style.display = rightFields.length ? "" : "none";
        centerPane.wrap.style.display = "";
        centerPane.wrap.style.flex = "1 1 auto";

        if (leftFields.length) {
            const w = paneWidthPx(leftFields);
            leftPane.wrap.style.flex = `0 0 ${w}px`;
            leftPane.wrap.style.width = `${w}px`;
            leftPane.configure(leftFields, 0, "vertical");
        }

        const centerOffset = viewFields.filter((f) =>
            leftFields.includes(f),
        ).length;
        const centerList =
            centerFields.length > 0
                ? centerFields
                : fields.filter(
                      (f) =>
                          !leftFields.includes(f) && !rightFields.includes(f),
                  );
        centerPane.configure(centerList, centerOffset, "both");

        if (rightFields.length) {
            const w = paneWidthPx(rightFields);
            rightPane.wrap.style.flex = `0 0 ${w}px`;
            rightPane.wrap.style.width = `${w}px`;
            rightPane.configure(
                rightFields,
                centerOffset +
                    centerList.filter((f) => !isSyntheticField(f)).length,
                "vertical",
            );
        }
    }

    /**
     * Clear sticky overlays on all panes.
     */
    function clearStickyGroups() {
        stickySignature = "";
        for (const pane of panes) {
            for (const el of [pane.stickyTopEl, pane.stickyBottomEl]) {
                if (!el) continue;
                el.style.display = "none";
                el.replaceChildren();
            }
        }
    }

    /**
     * Expand / collapse a group (tree or detail) at a virtual row index.
     * Shared by body cells and sticky header toggles.
     * @param {number} virtualY
     * @param {HTMLElement} [btn]
     */
    async function handleGroupToggle(virtualY, btn) {
        if (!engineView || !groupBy.length) return;
        try {
            if (rowModelActive() && detailModel) {
                const vrow = detailModel.getVirtualRow(virtualY);
                if (!vrow || vrow.kind === "detail") return;
                const path = vrow.path || [];
                if (isTreeExpandable(path, groupBy.length)) {
                    const expanded =
                        btn?.getAttribute("aria-expanded") === "true";
                    if (expanded) await engineView.collapse(vrow.groupY);
                    else await engineView.expand(vrow.groupY);
                    await detailModel.rebuild(engineView);
                    numRows = detailModel.numRows;
                    stickySignature = "";
                    onRowGroupOpened?.({
                        rowIndex: virtualY,
                        expanded: !expanded,
                        detail: false,
                    });
                } else if (
                    detailLeavesActive() &&
                    isDetailExpandable(path, groupBy.length)
                ) {
                    const opened = await detailModel.toggleDetail(path);
                    await detailModel.rebuild(engineView);
                    numRows = detailModel.numRows;
                    stickySignature = "";
                    onRowGroupOpened?.({
                        rowIndex: virtualY,
                        expanded: opened,
                        detail: true,
                    });
                }
                await drawAll({ invalid_columns: true });
                return;
            }

            const expanded = btn?.getAttribute("aria-expanded") === "true";
            if (expanded) await engineView.collapse(virtualY);
            else await engineView.expand(virtualY);
            numRows = await engineView.num_rows();
            stickySignature = "";
            onRowGroupOpened?.({
                rowIndex: virtualY,
                expanded: !expanded,
            });
            await drawAll();
        } catch {
            /* view replaced */
        }
    }

    /**
     * Sticky headers store path (stable); resolve current virtual index first.
     * @param {any[]} path
     * @param {HTMLElement} [btn]
     */
    async function handleGroupToggleByPath(path, btn) {
        if (!detailModel?.rowMap?.length) return;
        const key = pathKey(path);
        let virtualY = -1;
        for (let y = 0; y < detailModel.rowMap.length; y++) {
            const r = detailModel.rowMap[y];
            if (r.kind === "group" && pathKey(r.path) === key) {
                virtualY = y;
                break;
            }
        }
        if (virtualY < 0) return;
        await handleGroupToggle(virtualY, btn);
    }

    /**
     * @param {'header'|'total'} mode
     * @param {{ virtualY: number, groupY: number, path: any[], stickyKind?: 'header'|'total' }} entry
     * @param {Record<string, any[]>} cols
     * @param {number} g0
     * @param {string[]} fields
     * @param {(f: string) => number} getW
     */
    function buildStickyRow(mode, entry, cols, g0, fields, getW) {
        const kind = entry.stickyKind || mode;
        const local = entry.groupY - g0;
        const row = document.createElement("div");
        row.className = `fg-shell__sticky-group-row fg-shell__sticky-group-row--${kind}`;
        row.dataset.depth = String(entry.path?.length ?? 0);
        row.dataset.virtualY = String(entry.virtualY);

        for (const f of fields) {
            const cell = document.createElement("div");
            cell.className = "fg-shell__sticky-group-cell";
            const w = getW(f);
            cell.style.flex = `0 0 ${w}px`;
            cell.style.width = `${w}px`;
            if (f === AUTO_GROUP_COL_ID) {
                cell.classList.add("fg-shell__tree-cell");
                const depth = entry.path?.length ?? 0;
                cell.style.paddingLeft = `${8 + depth * 14}px`;
                if (kind === "total") {
                    cell.textContent = stickyTotalLabel(entry.path);
                } else {
                    // Sticky group header: same expand/collapse as body group rows.
                    // Ancestors in the sticky stack are always expanded.
                    const path = entry.path || [];
                    const label = formatRowPathLabel(
                        cols.__ROW_PATH__?.[local] ?? path,
                    );
                    const expandable = isRowPathExpandable(path, groupBy.length, {
                        allowDetailLeaves: detailLeavesActive(),
                    });
                    cell.textContent = "";
                    if (expandable) {
                        const btn = document.createElement("button");
                        btn.type = "button";
                        btn.className = "fg-shell__tree-toggle";
                        btn.setAttribute("aria-expanded", "true");
                        btn.setAttribute(
                            "data-group-path",
                            JSON.stringify(path),
                        );
                        btn.title = isDetailExpandable(path, groupBy.length)
                            ? "Hide rows"
                            : "Collapse";
                        btn.append(iconChevronDown({ size: 12 }));
                        cell.append(btn, document.createTextNode(` ${label}`));
                    } else {
                        cell.append(document.createTextNode(label));
                    }
                }
            } else if (kind === "header") {
                // AG sticky top headers leave value columns blank
                cell.textContent = "";
            } else {
                const v = cols[f]?.[local];
                cell.textContent = v == null || v === "" ? "" : String(v);
            }
            row.appendChild(cell);
        }
        return row;
    }

    /**
     * First visible virtual row index from the center (or any) pane.
     */
    function firstVisibleVirtualY() {
        for (const pane of panes) {
            if (pane.wrap.style.display === "none") continue;
            const td = pane.table.querySelector("tbody td");
            if (!td) continue;
            const meta = pane.table.getMeta?.(td);
            if (meta?.y != null) return meta.y;
        }
        return 0;
    }

    /**
     * AG sticky group rows:
     * - TOP: ancestor group *headers* (labels only; value cols blank)
     * - BOTTOM: subgroup + grand *totals* (Total X + agg values)
     * Leaf / nested rows scroll between them.
     */
    async function updateStickyGroups() {
        if (stickySuppressed || !rowModelActive() || !detailModel || !engineView) {
            clearStickyGroups();
            return;
        }
        const y0 = firstVisibleVirtualY();
        const entries = computeStickyGroupEntries(detailModel.rowMap, y0);
        const { top, bottom } = splitStickyTopAndBottom(entries, {
            groupTotalRow: groupTotalPlacement,
            grandTotalRow: grandTotalPlacement,
        });
        const sig = `t:${top
            .map((e) => `${e.stickyKind}:${pathKey(e.path)}`)
            .join("|")}|b:${bottom
            .map((e) => `${e.stickyKind}:${pathKey(e.path)}`)
            .join("|")}|gtr:${groupTotalPlacement}|gdr:${grandTotalPlacement}`;
        if (sig === stickySignature) {
            syncStickyScrollLeft();
            return;
        }
        stickySignature = sig;

        if (!top.length && !bottom.length) {
            clearStickyGroups();
            return;
        }

        const all = [...top, ...bottom];
        const groupYs = all.map((e) => e.groupY);
        const g0 = Math.min(...groupYs);
        const g1 = Math.max(...groupYs) + 1;
        /** @type {Record<string, any[]>} */
        let cols = {};
        try {
            cols = await engineView.to_columns({
                start_row: g0,
                end_row: g1,
                start_col: 0,
                end_col: Math.max(1, viewFields.length),
            });
        } catch {
            clearStickyGroups();
            return;
        }

        const getW = (f) => layoutApi?.getWidth?.(f) ?? widths[f] ?? 120;

        for (const pane of panes) {
            if (pane.wrap.style.display === "none") continue;

            if (pane.stickyTopEl) {
                if (top.length) {
                    const track = document.createElement("div");
                    track.className = "fg-shell__sticky-groups__track";
                    for (const entry of top) {
                        track.appendChild(
                            buildStickyRow(
                                entry.stickyKind || "header",
                                entry,
                                cols,
                                g0,
                                pane.fields,
                                getW,
                            ),
                        );
                    }
                    pane.stickyTopEl.replaceChildren(track);
                    pane.stickyTopEl.style.display = "block";
                } else {
                    pane.stickyTopEl.style.display = "none";
                    pane.stickyTopEl.replaceChildren();
                }
            }

            if (pane.stickyBottomEl) {
                if (bottom.length) {
                    const track = document.createElement("div");
                    track.className = "fg-shell__sticky-groups__track";
                    for (const entry of bottom) {
                        track.appendChild(
                            buildStickyRow(
                                entry.stickyKind || "total",
                                entry,
                                cols,
                                g0,
                                pane.fields,
                                getW,
                            ),
                        );
                    }
                    pane.stickyBottomEl.replaceChildren(track);
                    pane.stickyBottomEl.style.display = "block";
                } else {
                    pane.stickyBottomEl.style.display = "none";
                    pane.stickyBottomEl.replaceChildren();
                }
            }
        }
        syncStickyScrollLeft();
    }

    function syncStickyScrollLeft() {
        const sl = centerPane.table.scrollLeft || 0;
        for (const el of [
            centerPane.stickyTopEl,
            centerPane.stickyBottomEl,
        ]) {
            const track = el?.querySelector(".fg-shell__sticky-groups__track");
            if (track) track.style.transform = `translateX(${-sl}px)`;
        }
    }

    function setSuppressGroupRowsSticky(next) {
        stickySuppressed = !!next;
        void updateStickyGroups();
    }

    /**
     * @param {'top'|'bottom'|null|undefined} next
     */
    function setGroupTotalRow(next) {
        groupTotalPlacement = next;
        stickySignature = "";
        void updateStickyGroups();
    }

    /**
     * @param {'top'|'bottom'|null|undefined} next
     */
    function setGrandTotalRow(next) {
        grandTotalPlacement = next;
        stickySignature = "";
        void updateStickyGroups();
    }

    /**
     * Paint row selection checkboxes / highlights and cell range highlights.
     * @param {ReturnType<typeof makePane>} pane
     */
    function decorateSelectionUi(pane) {
        const rowOpts = getRowSelection?.() || null;
        const cellOpts = getCellSelection?.() || null;
        const tds = pane.table.querySelectorAll("tbody td");
        const focusCell = cellSelectionCtrl?.getFocus?.() || null;
        const EDGE = [
            "fg-shell__cell--range-top",
            "fg-shell__cell--range-bottom",
            "fg-shell__cell--range-left",
            "fg-shell__cell--range-right",
        ];

        for (const td of tds) {
            const meta = pane.table.getMeta?.(td);
            if (meta?.y == null || meta.x == null) continue;
            const field = pane.fields[meta.x];
            const rowIndex = meta.y;
            if (field) td.dataset.field = field;
            td.dataset.rowIndex = String(rowIndex);
            const selectedRow = !!rowSelectionCtrl?.isIdSelected?.(
                String(rowIndex),
            );

            td.classList.toggle("fg-shell__cell--row-selected", selectedRow);
            td.classList.remove(...EDGE, "fg-shell__cell--range-focus");

            if (cellOpts?.enabled && cellSelectionCtrl) {
                const inRange = cellSelectionCtrl.isCellInSelection(
                    rowIndex,
                    field,
                );
                td.classList.toggle("fg-shell__cell--range-selected", inRange);
                if (inRange) {
                    const edges = cellSelectionCtrl.getRangeEdgeFlags(
                        rowIndex,
                        field,
                    );
                    if (edges?.top) td.classList.add("fg-shell__cell--range-top");
                    if (edges?.bottom)
                        td.classList.add("fg-shell__cell--range-bottom");
                    if (edges?.left)
                        td.classList.add("fg-shell__cell--range-left");
                    if (edges?.right)
                        td.classList.add("fg-shell__cell--range-right");
                }
                const isFocus =
                    !!focusCell &&
                    focusCell.rowIndex === rowIndex &&
                    focusCell.colId === field;
                td.classList.toggle("fg-shell__cell--range-focus", isFocus);
                if (cellOpts.enableHeaderHighlight && inRange) {
                    td.classList.add("fg-shell__cell--header-highlight");
                } else {
                    td.classList.remove("fg-shell__cell--header-highlight");
                }
            } else {
                td.classList.remove(
                    "fg-shell__cell--range-selected",
                    "fg-shell__cell--header-highlight",
                    "fg-shell__cell--range-focus",
                );
            }

            // Selection column checkboxes
            if (field === SELECTION_COL_ID && rowOpts && rowSelectionCtrl) {
                td.classList.add("fg-shell__selection-cell");
                const nodes = rowSelectionCtrl.getRowNodes?.() || [];
                const node = nodes[rowIndex];
                const selectable = node
                    ? rowSelectionCtrl.isSelectable(node)
                    : true;
                const checked = !!rowSelectionCtrl.isIdSelected?.(
                    String(rowIndex),
                );
                const showCb =
                    rowOpts.checkboxes !== false &&
                    (selectable || !rowOpts.hideDisabledCheckboxes);
                if (!showCb) {
                    td.textContent = "";
                    continue;
                }
                let input = td.querySelector("input.fg-shell__selection-cb");
                if (!input) {
                    td.textContent = "";
                    input = document.createElement("input");
                    input.type = "checkbox";
                    input.className = "fg-shell__selection-cb";
                    input.addEventListener("click", (e) => {
                        e.stopPropagation();
                        const n =
                            rowSelectionCtrl.getRowNodes?.()?.[rowIndex];
                        if (!n) return;
                        const multi = rowOpts.mode === "multiRow";
                        n.setSelected(input.checked, !multi);
                    });
                    td.appendChild(input);
                }
                input.checked = checked;
                input.disabled = !selectable;
                // Header-like select-all lives in header; body only row cbs
            } else if (
                field === AUTO_GROUP_COL_ID &&
                rowOpts?.checkboxLocation === "autoGroupColumn" &&
                rowOpts.checkboxes !== false &&
                rowSelectionCtrl
            ) {
                // Inject checkbox before tree toggle if missing
                if (!td.querySelector("input.fg-shell__selection-cb")) {
                    const nodes = rowSelectionCtrl.getRowNodes?.() || [];
                    const node = nodes[rowIndex];
                    if (!node) continue;
                    const selectable = rowSelectionCtrl.isSelectable(node);
                    if (!selectable && rowOpts.hideDisabledCheckboxes) continue;
                    const input = document.createElement("input");
                    input.type = "checkbox";
                    input.className = "fg-shell__selection-cb";
                    input.checked = !!rowSelectionCtrl.isIdSelected?.(
                        String(rowIndex),
                    );
                    input.disabled = !selectable;
                    input.addEventListener("click", (e) => {
                        e.stopPropagation();
                        const n =
                            rowSelectionCtrl.getRowNodes?.()?.[rowIndex];
                        if (!n) return;
                        n.setSelected(
                            input.checked,
                            rowOpts.mode !== "multiRow",
                        );
                    });
                    td.insertBefore(input, td.firstChild);
                }
            }
        }

        // Row click selection (when enabled)
        if (rowOpts?.enableClickSelection || rowOpts?.enableSelectionWithoutKeys) {
            // handled via table click listener below
        }

        updateFillHandle();
    }

    /** @type {{ start: { rowIndex: number, colId: string }, additive: boolean }|null} */
    let rangeDrag = null;

    function cellFromEventTarget(table, target) {
        const td = target?.closest?.("td");
        if (!td) return null;
        const meta = table.getMeta?.(td);
        if (meta?.y == null || meta?.x == null) return null;
        const pane = panes.find((p) => p.table === table);
        if (!pane) return null;
        const colId = pane.fields[meta.x];
        if (!colId || colId === SELECTION_COL_ID) return null;
        return { rowIndex: meta.y, colId, td, pane };
    }

    function orderedDisplayColumns() {
        // Exclude synthetic chrome columns from range math
        return fields.filter(
            (f) => f !== SELECTION_COL_ID && f !== AUTO_GROUP_COL_ID,
        );
    }

    function installSelectionGestures(pane) {
        const table = pane.table;

        table.addEventListener("click", (e) => {
            const rowOpts = getRowSelection?.();
            if (
                rowOpts &&
                (rowOpts.enableClickSelection ||
                    rowOpts.enableSelectionWithoutKeys) &&
                rowSelectionCtrl
            ) {
                if (e.target?.closest?.("input,button,a")) return;
                const hit = cellFromEventTarget(table, e.target);
                if (hit) {
                    const node = rowSelectionCtrl.getRowNodes?.()?.[hit.rowIndex];
                    if (node) rowSelectionCtrl.handleRowClick(node, e);
                }
            }
        });

        table.addEventListener("mousedown", (e) => {
            const cellOpts = getCellSelection?.();
            if (!cellOpts?.enabled || !cellSelectionCtrl) return;
            if (e.button !== 0) return;
            if (e.target?.closest?.("input,button,.fg-shell__fill-handle")) return;
            const hit = cellFromEventTarget(table, e.target);
            if (!hit) return;
            e.preventDefault();
            const additive = !!(e.ctrlKey || e.metaKey);
            if (e.shiftKey) {
                cellSelectionCtrl.extendToCell(hit, {
                    columns: orderedDisplayColumns(),
                });
                refreshSelectionPaint();
                return;
            }
            rangeDrag = { start: hit, additive };
            cellSelectionCtrl.setAnchor(hit);
            cellSelectionCtrl.setRangeFromCells(hit, hit, {
                columns: orderedDisplayColumns(),
                additive,
            });
            refreshSelectionPaint();
        });

        table.addEventListener("mousemove", (e) => {
            if (!rangeDrag || !cellSelectionCtrl) return;
            const hit = cellFromEventTarget(table, e.target);
            if (!hit) return;
            cellSelectionCtrl.setRangeFromCells(rangeDrag.start, hit, {
                columns: orderedDisplayColumns(),
                additive: rangeDrag.additive,
            });
            refreshSelectionPaint();
        });
    }

    for (const pane of panes) installSelectionGestures(pane);

    function onDocMouseUp() {
        rangeDrag = null;
    }
    document.addEventListener("mouseup", onDocMouseUp);

    root.addEventListener("keydown", (e) => {
        const cellOpts = getCellSelection?.();
        if (!cellOpts?.enabled || !cellSelectionCtrl) return;
        if (e.key === "Delete" || e.key === "Backspace") {
            const ranges = cellSelectionCtrl.beginDelete();
            if (ranges.length) {
                // Client rowData clear is handled by host via events; still end delete.
                cellSelectionCtrl.endDelete();
                e.preventDefault();
            }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "a") {
            const rowOpts = getRowSelection?.();
            if (rowOpts?.mode === "multiRow" && rowOpts.ctrlASelectsRows) {
                rowSelectionCtrl?.selectAll();
                e.preventDefault();
            }
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) {
            // Ctrl+D: signal only (host/editing may implement fill-down)
            e.preventDefault();
        }
    });
    root.tabIndex = 0;

    /** @type {HTMLElement|null} */
    let fillHandleEl = null;

    function updateFillHandle() {
        const cellOpts = getCellSelection?.();
        const handle = cellOpts?.handle;
        if (!cellOpts?.enabled || !handle || !cellSelectionCtrl) {
            fillHandleEl?.remove();
            fillHandleEl = null;
            return;
        }
        const ranges = cellSelectionCtrl.getCellRanges();
        if (!ranges.length) {
            fillHandleEl?.remove();
            fillHandleEl = null;
            return;
        }
        const r = ranges[ranges.length - 1];
        const endRow = Math.max(r.startRow.rowIndex, r.endRow.rowIndex);
        const endCol = r.columns[r.columns.length - 1];
        // Find bottom-right cell in center/left panes
        let anchorTd = null;
        for (const pane of panes) {
            if (pane.wrap.style.display === "none") continue;
            const xi = pane.fields.indexOf(endCol);
            if (xi < 0) continue;
            const tds = pane.table.querySelectorAll("tbody td");
            for (const td of tds) {
                const meta = pane.table.getMeta?.(td);
                if (meta?.y === endRow && meta?.x === xi) {
                    anchorTd = td;
                    break;
                }
            }
            if (anchorTd) break;
        }
        if (!anchorTd) return;
        if (!fillHandleEl) {
            fillHandleEl = document.createElement("div");
            fillHandleEl.className = "fg-shell__fill-handle";
            fillHandleEl.title =
                handle.mode === "fill" ? "Fill handle" : "Range handle";
            fillHandleEl.addEventListener("mousedown", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const rangesNow = cellSelectionCtrl.getCellRanges();
                if (!rangesNow.length) return;
                const cur = rangesNow[rangesNow.length - 1];
                rangeDrag = {
                    start: {
                        rowIndex: Math.min(
                            cur.startRow.rowIndex,
                            cur.endRow.rowIndex,
                        ),
                        colId: cur.columns[0],
                    },
                    additive: false,
                };
            });
            root.appendChild(fillHandleEl);
        }
        const box = anchorTd.getBoundingClientRect();
        const rootBox = root.getBoundingClientRect();
        fillHandleEl.style.left = `${box.right - rootBox.left - 4}px`;
        fillHandleEl.style.top = `${box.bottom - rootBox.top - 4}px`;
    }

    function refreshSelectionPaint() {
        for (const pane of panes) {
            if (pane.wrap.style.display === "none") continue;
            decorateSelectionUi(pane);
        }
        // Header select-all checkbox
        syncHeaderSelectAll();
    }

    function syncHeaderSelectAll() {
        const rowOpts = getRowSelection?.();
        const headerCbHost = root.parentElement?.querySelector?.(
            `.fg-shell__leaf-cell[data-field="${SELECTION_COL_ID}"]`,
        );
        if (!headerCbHost || !rowOpts || rowOpts.mode !== "multiRow") {
            headerCbHost
                ?.querySelector?.("input.fg-shell__selection-cb--all")
                ?.remove();
            return;
        }
        if (rowOpts.headerCheckbox === false) return;
        let input = headerCbHost.querySelector(
            "input.fg-shell__selection-cb--all",
        );
        if (!input) {
            input = document.createElement("input");
            input.type = "checkbox";
            input.className =
                "fg-shell__selection-cb fg-shell__selection-cb--all";
            input.title = "Select all";
            input.addEventListener("click", (e) => {
                e.stopPropagation();
                if (input.checked) rowSelectionCtrl?.selectAll();
                else rowSelectionCtrl?.deselectAll();
            });
            headerCbHost.appendChild(input);
        }
        const nodes = rowSelectionCtrl?.getRowNodes?.() || [];
        const selectable = nodes.filter((n) =>
            rowSelectionCtrl.isSelectable(n),
        );
        const selected = selectable.filter((n) => n.isSelected?.());
        input.checked =
            selectable.length > 0 && selected.length === selectable.length;
        input.indeterminate =
            selected.length > 0 && selected.length < selectable.length;
    }

    function notifyDisplayedRows() {
        onDisplayedRowCount?.(numRows);
    }

    /**
     * Decorate auto-group cells with indent + expand/collapse control.
     * @param {ReturnType<typeof makePane>} pane
     */
    function decorateTreeCells(pane) {
        if (!groupBy.length || !rowPathCache) return;
        if (!pane.fields.includes(AUTO_GROUP_COL_ID)) return;

        const { y0, paths, slice } = rowPathCache;
        const tds = pane.table.querySelectorAll("tbody td");
        for (const td of tds) {
            const meta = pane.table.getMeta?.(td);
            if (meta?.y == null || meta.x == null) continue;
            if (pane.fields[meta.x] !== AUTO_GROUP_COL_ID) continue;
            const local = meta.y - y0;
            const vrow = slice?.[local];
            const path = paths[local];
            if (path === undefined && !vrow) continue;

            // Detail leaf row: deeper indent, no toggle
            if (vrow?.kind === "detail") {
                td.classList.add(
                    "fg-shell__tree-cell",
                    "fg-shell__tree-cell--detail",
                );
                td.style.paddingLeft = `${8 + (groupBy.length + 1) * 14}px`;
                if (td.dataset.fgTreeKind === "detail") continue;
                td.dataset.fgTreeKind = "detail";
                td.dataset.fgTreeLabel = "";
                td.textContent = "";
                continue;
            }

            const usePath = path || vrow?.path || [];
            const depth = usePath?.length ?? 0;
            const expandable = isRowPathExpandable(usePath, groupBy.length, {
                allowDetailLeaves: detailLeavesActive(),
            });
            const label = formatRowPathLabel(usePath);

            let open = false;
            if (isDetailExpandable(usePath, groupBy.length) && detailModel) {
                open = detailModel.isDetailOpen(usePath);
            } else if (isTreeExpandable(usePath, groupBy.length)) {
                const nextPath = paths[local + 1];
                const nextRow = slice?.[local + 1];
                open = !!(
                    (nextRow?.kind === "detail" &&
                        JSON.stringify(nextRow.path) ===
                            JSON.stringify(usePath)) ||
                    (nextPath &&
                        nextPath.length > depth &&
                        usePath.every((v, i) => nextPath[i] === v))
                );
            }

            td.classList.add("fg-shell__tree-cell");
            td.classList.remove("fg-shell__tree-cell--detail");
            td.style.paddingLeft = `${8 + depth * 14}px`;
            const sig = `${label}|${open}|group`;
            if (td.dataset.fgTreeSig === sig) continue;
            td.dataset.fgTreeSig = sig;
            td.dataset.fgTreeKind = "group";
            td.textContent = "";
            if (expandable) {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "fg-shell__tree-toggle";
                btn.setAttribute("aria-expanded", open ? "true" : "false");
                btn.title = open
                    ? isDetailExpandable(usePath, groupBy.length)
                        ? "Hide rows"
                        : "Collapse"
                    : isDetailExpandable(usePath, groupBy.length)
                      ? "Show rows"
                      : "Expand";
                btn.append(
                    open
                        ? iconChevronDown({ size: 12 })
                        : iconChevronRight({ size: 12 }),
                );
                td.append(btn, document.createTextNode(` ${label}`));
            } else {
                td.append(document.createTextNode(label));
            }
        }
    }

    /**
     * @param {string[]} nextGroupBy
     */
    function setGroupBy(nextGroupBy = []) {
        groupBy = nextGroupBy.slice();
        if (!groupBy.length) {
            rowPathCache = null;
            void detailModel?.clear();
            clearStickyGroups();
        } else {
            ensureDetailModel();
        }
    }

    async function rebuildDetailMap() {
        if (!engineView || !rowModelActive()) return;
        ensureDetailModel();
        await detailModel.rebuild(engineView);
        numRows = detailModel.numRows;
    }

    /**
     * @param {ReturnType<typeof makePane>} pane
     */
    function applyWidthsToPane(pane) {
        const getW = (f) => layoutApi?.getWidth?.(f) ?? widths[f] ?? 120;
        const rows = pane.table.querySelectorAll("tbody tr");
        for (const row of rows) {
            const cells = [...row.children].filter((el) => el.tagName === "TD");
            for (const td of cells) {
                const meta = pane.table.getMeta?.(td);
                const idx = meta?.x;
                const f =
                    typeof idx === "number" ? pane.fields[idx] : null;
                if (!f) continue;
                const w = getW(f);
                td.style.width = `${w}px`;
                td.style.minWidth = `${w}px`;
                td.style.maxWidth = `${w}px`;
            }
        }
        if (
            (pane.side === "left" || pane.side === "right") &&
            pane.fields.length
        ) {
            const w = paneWidthPx(pane.fields);
            pane.wrap.style.flex = `0 0 ${w}px`;
            pane.wrap.style.width = `${w}px`;
        }
    }

    function applyPinnedLayout(orderedFields, columnState) {
        if (orderedFields) fields = orderedFields.slice();
        if (columnState) layoutApi = columnState;
        const state = columnState || layoutApi;
        const getW = (f) => state?.getWidth?.(f) ?? widths[f] ?? 120;
        const getP = (f) => state?.getPin?.(f) ?? pins[f] ?? null;
        for (const f of fields) {
            widths[f] = getW(f);
            pins[f] = getP(f);
        }

        const next = partitionFields(fields);
        const pinSignature = `${next.left.join(",")}|${next.right.join(",")}`;
        const prevSignature = `${leftFields.join(",")}|${rightFields.join(",")}`;

        if (pinSignature !== prevSignature || !centerPane.fields.length) {
            layoutPanes();
            void drawAll({ invalid_columns: true });
            return;
        }

        for (const pane of panes) {
            if (pane.wrap.style.display === "none") continue;
            applyWidthsToPane(pane);
        }
    }

    /**
     * @param {ReturnType<typeof makePane>} pane
     */
    function flashChangedCells(pane) {
        const tds = pane.table.querySelectorAll("tbody td");
        for (const td of tds) {
            const meta = pane.table.getMeta?.(td);
            if (!meta || meta.y == null || meta.x == null) continue;
            const field = pane.fields[meta.x];
            if (!field) continue;
            const key = `${field}:${meta.y}`;
            const val = td.textContent ?? "";
            const old = prevCellValues.get(key);
            if (old !== undefined && old !== val) {
                td.classList.remove(
                    "fg-shell__flash",
                    "fg-shell__flash--up",
                    "fg-shell__flash--down",
                );
                void td.offsetWidth;
                const numOld = Number(old);
                const numNew = Number(val);
                if (
                    old !== "" &&
                    val !== "" &&
                    Number.isFinite(numOld) &&
                    Number.isFinite(numNew)
                ) {
                    td.classList.add(
                        numNew >= numOld
                            ? "fg-shell__flash--up"
                            : "fg-shell__flash--down",
                    );
                } else {
                    td.classList.add("fg-shell__flash");
                }
            }
            prevCellValues.set(key, val);
        }
    }

    async function drawAll(opts) {
        const active = panes.filter((p) => p.wrap.style.display !== "none");
        await Promise.all(active.map((p) => p.table.draw(opts)));
        for (const p of active) {
            applyWidthsToPane(p);
            flashChangedCells(p);
        }
        await updateStickyGroups();
        notifyDisplayedRows();
        refreshSelectionPaint();
    }

    function measureColumnWidths() {
        /** @type {Record<string, number>} */
        const out = {};
        for (const pane of panes) {
            if (pane.wrap.style.display === "none") continue;
            const firstRow =
                pane.table.querySelector("tbody tr") ||
                pane.table.querySelector("thead tr:last-child");
            if (!firstRow) continue;
            for (const td of [...firstRow.children].filter(
                (el) => el.tagName === "TD" || el.tagName === "TH",
            )) {
                const meta = pane.table.getMeta?.(td);
                const f =
                    typeof meta?.x === "number" ? pane.fields[meta.x] : null;
                if (f) out[f] = td.getBoundingClientRect().width;
            }
        }
        return out;
    }

    /**
     * @param {any} view
     * @param {string[]} nextFields
     * @param {{ widths?: Record<string, number>, pins?: Record<string, any> }} [layout]
     */
    async function setEngineView(view, nextFields, layout = {}) {
        engineView = view;
        fields = nextFields.slice();
        columns = {};
        widths = { ...(layout.widths || {}) };
        pins = { ...(layout.pins || {}) };
        layoutApi = {
            getWidth: (f) => widths[f] || 120,
            getPin: (f) => pins[f] || null,
        };
        prevCellValues.clear();
        rowPathCache = null;
        viewFields = fields.filter((f) => !isSyntheticField(f));
        ensureDetailModel();
        try {
            if (rowModelActive() && detailModel && view) {
                await detailModel.rebuild(view);
                numRows = detailModel.numRows;
            } else {
                numRows = view ? await view.num_rows() : 0;
            }
        } catch {
            numRows = 0;
        }
        layoutPanes();
        await drawAll({ invalid_columns: true });
        onDraw?.();
        return measureColumnWidths();
    }

    /**
     * @param {string[]} nextFields
     * @param {Record<string, any[]>} nextColumns
     * @param {{ widths?: Record<string, number>, pins?: Record<string, any> }} [layout]
     */
    async function setData(nextFields, nextColumns, layout = {}) {
        engineView = null;
        fields = nextFields.slice();
        columns = nextColumns || {};
        rowPathCache = null;
        await detailModel?.clear();
        widths = { ...(layout.widths || {}) };
        pins = { ...(layout.pins || {}) };
        layoutApi = {
            getWidth: (f) => widths[f] || 120,
            getPin: (f) => pins[f] || null,
        };
        numRows = fields.length
            ? Math.max(
                  0,
                  ...fields.map((f) => (columns[f] ? columns[f].length : 0)),
              )
            : 0;
        layoutPanes();
        await drawAll({ invalid_columns: true });
        onDraw?.();
        return measureColumnWidths();
    }

    async function onEngineUpdate() {
        if (!engineView) return;
        try {
            if (rowModelActive() && detailModel) {
                await detailModel.rebuild(engineView);
                numRows = detailModel.numRows;
            } else {
                numRows = await engineView.num_rows();
            }
        } catch {
            return;
        }
        await drawAll();
    }

    /**
     * Expand every row group to leaf level:
     * 1) Perspective `set_depth(groupBy.length)` (engine tree)
     * 2) Open all finest groups to detail leaves via one count aggregate view;
     *    filtered detail views are created lazily on scroll.
     */
    async function expandAllGroups() {
        if (!engineView || !groupBy.length) return;
        try {
            if (typeof engineView.set_depth === "function") {
                await engineView.set_depth(groupBy.length);
            }
            stickySignature = "";
            if (rowModelActive() && detailModel) {
                if (detailLeavesActive() && detailModel.expandAllToLeaves) {
                    await detailModel.expandAllToLeaves(engineView);
                } else {
                    await detailModel.rebuild(engineView);
                }
                numRows = detailModel.numRows;
            } else {
                numRows = await engineView.num_rows();
            }
            await drawAll({ invalid_columns: true });
        } catch {
            /* view replaced */
        }
    }

    /**
     * Collapse every row group to the root (Perspective `set_depth(0)`).
     */
    async function collapseAllGroups() {
        if (!engineView || !groupBy.length) return;
        try {
            if (typeof engineView.set_depth === "function") {
                await engineView.set_depth(0);
            }
            stickySignature = "";
            if (rowModelActive() && detailModel) {
                await detailModel.closeAllDetails?.();
                await detailModel.rebuild(engineView);
                numRows = detailModel.numRows;
            } else {
                numRows = await engineView.num_rows();
            }
            await drawAll({ invalid_columns: true });
        } catch {
            /* view replaced */
        }
    }

    leftPane.wrap.style.display = "none";
    rightPane.wrap.style.display = "none";
    centerPane.configure([], 0, "both");

    return {
        el: root,
        setData,
        setEngineView,
        setGroupBy,
        rebuildDetailMap,
        setSuppressGroupRowsSticky,
        setGroupTotalRow,
        setGrandTotalRow,
        onEngineUpdate,
        expandAllGroups,
        collapseAllGroups,
        measureColumnWidths,
        applyPinnedLayout,
        refreshSelectionPaint,
        get scrollLeft() {
            return centerPane.table.scrollLeft || 0;
        },
        draw: (opts) => drawAll(opts),
    };
}
