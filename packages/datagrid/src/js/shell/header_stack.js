// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — header stack (groups → leaves → filters) + column interactions    ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import {
    computeHeaderLayout,
    groupRowsForOrderedLeaves,
    isGroupExpandable,
} from "./header_layout.js";
import { applyColDefHeaderChrome } from "./header_style.js";
import { leafField } from "./column_tree.js";
import { canMoveColumnWithMarryChildren } from "./marry_children.js";
import {
    iconChevronRight,
    iconChevronDown,
    iconArrowUp,
    iconArrowDown,
    iconArrowUpDown,
    iconPin,
    iconPinOff,
    iconGrip,
} from "./icons.js";
import { applyPopupTheme } from "./context_menu.js";

const DEFAULT_COL_WIDTH = 120;

/**
 * @typedef {import('./ag_types.js').ColDef} ColDef
 */

/**
 * @param {object} options
 * @param {ReturnType<import('./column_tree.js').createColumnTree>} [options.columnTree]
 * @param {() => ReturnType<import('./column_tree.js').createColumnTree>} [options.getColumnTree]
 * @param {ReturnType<import('./column_state.js').createColumnState>} options.columnState
 * @param {(leaf: ColDef, value: string) => void} [options.onFilterInput]
 * @param {(detail?: { groupId?: string, opened?: boolean }) => void} [options.onLayoutChange]
 * @param {(kind?: string) => void} [options.onColumnStateChange]
 * @param {ColDef} [options.defaultColDef]
 * @param {() => ColDef[]} [options.getVisibleLeaves] override visible leaf list (e.g. auto-group)
 */
export function createHeaderStack({
    columnTree,
    getColumnTree,
    columnState,
    onFilterInput,
    onLayoutChange,
    onColumnStateChange,
    defaultColDef = {},
    getVisibleLeaves,
}) {
    const tree = () => getColumnTree?.() ?? columnTree;
    const root = document.createElement("div");
    root.className = "fg-shell__header";
    root.setAttribute("part", "shell-header");

    const groupsEl = document.createElement("div");
    groupsEl.className = "fg-shell__group-rows";

    const leafRow = document.createElement("div");
    leafRow.className = "fg-shell__leaf-row";

    const filterRow = document.createElement("div");
    filterRow.className = "fg-shell__filter-row";

    const leafTrack = document.createElement("div");
    leafTrack.className = "fg-shell__track fg-shell__track--leaves";
    leafRow.appendChild(leafTrack);

    const filterTrack = document.createElement("div");
    filterTrack.className = "fg-shell__track fg-shell__track--filters";
    filterRow.appendChild(filterTrack);

    root.append(groupsEl, leafRow, filterRow);

    /** @type {Map<string, HTMLElement>} */
    const leafCells = new Map();
    /** @type {Map<string, HTMLElement>} */
    const filterCells = new Map();

    /** @type {HTMLElement|null} */
    let openMenu = null;

    function closeMenu() {
        openMenu?.remove();
        openMenu = null;
    }

    document.addEventListener("click", closeMenu);

    function leafWidth(field) {
        return columnState.getWidth(field, DEFAULT_COL_WIDTH);
    }

    function colOpt(leaf, key, fallback) {
        const v = leaf?.[key];
        if (v !== undefined) return v;
        return defaultColDef?.[key] ?? fallback;
    }

    function setScrollLeft(scrollLeft) {
        // Use real scrollLeft (not transform) so position:sticky pins work.
        const s = Math.max(0, scrollLeft || 0);
        for (const row of root.querySelectorAll(
            ".fg-shell__group-row, .fg-shell__leaf-row, .fg-shell__filter-row",
        )) {
            if (Math.abs(row.scrollLeft - s) > 0.5) {
                row.scrollLeft = s;
            }
        }
    }

    function setColumnWidths(next) {
        columnState.setWidths(next);
        applyWidthsToDom();
    }

    function applyWidthsToDom() {
        for (const [field, cell] of leafCells) {
            const w = leafWidth(field);
            cell.style.flex = `0 0 ${w}px`;
            cell.style.width = `${w}px`;
        }
        for (const [field, cell] of filterCells) {
            const w = leafWidth(field);
            cell.style.flex = `0 0 ${w}px`;
            cell.style.width = `${w}px`;
        }
        rebuildGroupWidths();
        applyPinOffsets();
    }

    function rebuildGroupWidths() {
        const leaves = getOrderedLeaves();
        const groupRows = groupRowsForOrderedLeaves(
            leaves,
            tree().getDefs(),
            tree().getOpenState(),
            (f) => columnState.getPin(f),
        );
        const rowEls = [...groupsEl.querySelectorAll(".fg-shell__group-row")];
        groupRows.forEach((segs, rowIndex) => {
            const row = rowEls[rowIndex];
            if (!row) return;
            const track = row.querySelector(".fg-shell__track");
            if (!track) return;
            let leafIndex = 0;
            const cells = [...track.children];
            segs.forEach((seg, i) => {
                const cell = cells[i];
                if (!cell) return;
                let w = 0;
                for (let k = 0; k < seg.span; k++) {
                    w += leafWidth(leafField(leaves[leafIndex + k]));
                }
                leafIndex += seg.span;
                cell.style.flex = `0 0 ${w}px`;
                cell.style.width = `${w}px`;
            });
        });
        applyGroupPinOffsets(leaves, groupRows);
    }

    /**
     * Sticky left/right offsets for group cells that live entirely in a pin
     * region (AG: pinning splits groups across regions).
     * @param {ColDef[]} leaves
     * @param {ReturnType<typeof groupRowsForOrderedLeaves>} groupRows
     */
    function applyGroupPinOffsets(leaves, groupRows) {
        let leftGutter = 0;
        for (const leaf of leaves) {
            if (columnState.getPin(leafField(leaf)) === "left") {
                leftGutter += leafWidth(leafField(leaf));
            }
        }

        const rowEls = [...groupsEl.querySelectorAll(".fg-shell__group-row")];
        groupRows.forEach((segs, rowIndex) => {
            const track = rowEls[rowIndex]?.querySelector(".fg-shell__track");
            if (!track) return;

            /** @type {{ seg: typeof segs[0], cell: Element, w: number, leafIndex: number }[]} */
            const items = [];
            let leafIndex = 0;
            segs.forEach((seg, i) => {
                let w = 0;
                for (let k = 0; k < seg.span; k++) {
                    w += leafWidth(leafField(leaves[leafIndex + k]));
                }
                items.push({
                    seg,
                    cell: track.children[i],
                    w,
                    leafIndex,
                });
                leafIndex += seg.span;
            });

            let left = 0;
            let right = 0;
            for (let i = items.length - 1; i >= 0; i--) {
                const { seg, cell, w } = items[i];
                if (!cell) continue;
                cell.classList.remove(
                    "fg-shell__pin-left",
                    "fg-shell__pin-right",
                );
                cell.style.left = "";
                cell.style.right = "";
                const label = cell.querySelector?.(".fg-shell__group-label");
                if (label) label.style.left = "";

                if (seg.pin === "right") {
                    cell.classList.add("fg-shell__pin-right");
                    cell.style.right = `${right}px`;
                    right += w;
                }
            }
            for (const { seg, cell, w } of items) {
                if (!cell) continue;
                if (seg.pin === "left") {
                    cell.classList.add("fg-shell__pin-left");
                    cell.style.left = `${left}px`;
                    left += w;
                } else if (
                    seg.pin !== "right" &&
                    labelStickyEnabled(cell) &&
                    leftGutter > 0
                ) {
                    const label = cell.querySelector(".fg-shell__group-label");
                    if (label) label.style.left = `${leftGutter}px`;
                }
            }
        });
    }

    function labelStickyEnabled(cell) {
        return (
            cell?.classList &&
            !cell.classList.contains("fg-shell__group-cell--no-sticky-label")
        );
    }

    function getOrderedLeaves() {
        const layoutLeaves =
            typeof getVisibleLeaves === "function"
                ? getVisibleLeaves()
                : computeHeaderLayout(
                      tree().getDefs(),
                      tree().getOpenState(),
                  ).leaves;
        const byField = new Map(layoutLeaves.map((l) => [leafField(l), l]));
        const wanted = layoutLeaves.map(leafField);
        let fields = columnState.orderVisible(wanted);
        for (const f of wanted) {
            if (fields.includes(f)) continue;
            if (f === "ag-Grid-AutoColumn" || f === "ag-Grid-SelectionColumn")
                fields = [f, ...fields.filter((x) => x !== f)];
            else fields.push(f);
        }
        // Drop fields no longer visible
        fields = fields.filter((f) => byField.has(f));
        // Stable leading order: selection column, then auto-group
        const lead = [];
        if (fields.includes("ag-Grid-SelectionColumn"))
            lead.push("ag-Grid-SelectionColumn");
        if (fields.includes("ag-Grid-AutoColumn")) lead.push("ag-Grid-AutoColumn");
        if (lead.length) {
            fields = [
                ...lead,
                ...fields.filter((f) => !lead.includes(f)),
            ];
        }
        return fields.map((f) => byField.get(f)).filter(Boolean);
    }

    function applyPinOffsets() {
        const leaves = getOrderedLeaves();
        let left = 0;
        const leftPins = [];
        for (const leaf of leaves) {
            const f = leafField(leaf);
            if (columnState.getPin(f) === "left") leftPins.push(f);
        }
        for (const f of leftPins) {
            const w = leafWidth(f);
            for (const map of [leafCells, filterCells]) {
                const el = map.get(f);
                if (!el) continue;
                el.classList.add("fg-shell__pin-left");
                el.style.left = `${left}px`;
            }
            left += w;
        }
        let right = 0;
        const rightPins = [];
        for (const leaf of leaves) {
            const f = leafField(leaf);
            if (columnState.getPin(f) === "right") rightPins.push(f);
        }
        for (let i = rightPins.length - 1; i >= 0; i--) {
            const f = rightPins[i];
            const w = leafWidth(f);
            for (const map of [leafCells, filterCells]) {
                const el = map.get(f);
                if (!el) continue;
                el.classList.add("fg-shell__pin-right");
                el.style.right = `${right}px`;
            }
            right += w;
        }
        for (const leaf of leaves) {
            const f = leafField(leaf);
            const pin = columnState.getPin(f);
            if (pin) continue;
            for (const map of [leafCells, filterCells]) {
                const el = map.get(f);
                if (!el) continue;
                el.classList.remove("fg-shell__pin-left", "fg-shell__pin-right");
                el.style.left = "";
                el.style.right = "";
            }
        }
    }

    function notifyState(kind) {
        onColumnStateChange?.(kind);
    }

    function startResize(field, startX, startW, leafEl) {
        const minW = 60;
        if (leafEl) leafEl.draggable = false;
        const onMove = (e) => {
            columnState.setWidth(field, startW + (e.clientX - startX), minW);
            applyWidthsToDom();
            // Live-sync body widths without recreating the Perspective view
            onColumnStateChange?.("resize-live");
        };
        const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);
            if (leafEl) {
                const leaf = leafCells.get(field);
                const suppress = leaf?.dataset?.suppressMovable === "1";
                leafEl.draggable = !suppress;
            }
            notifyState("resize");
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
    }

    function showPinMenu(anchor, field) {
        closeMenu();
        const menu = document.createElement("div");
        menu.className = "fg-shell__menu";
        const current = columnState.getPin(field);
        const items = [
            { label: "Pin left", value: "left", icon: iconPin },
            { label: "Pin right", value: "right", icon: iconPin },
            { label: "No pin", value: null, icon: iconPinOff },
        ];
        for (const item of items) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "fg-shell__menu-item";
            if (current === item.value) btn.classList.add("is-active");
            btn.append(item.icon({ size: 12 }), document.createTextNode(` ${item.label}`));
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                columnState.setPin(field, item.value);
                closeMenu();
                render();
                notifyState("pin");
            });
            menu.appendChild(btn);
        }
        const rect = anchor.getBoundingClientRect();
        menu.style.top = `${rect.bottom + 2}px`;
        menu.style.left = `${rect.left}px`;
        // Body mount avoids .fg-shell overflow clipping; stamp theme tokens.
        const themeHost =
            root.closest?.(".fg-shell") || root.parentElement || root;
        applyPopupTheme(menu, themeHost);
        document.body.appendChild(menu);
        openMenu = menu;
    }

    function render() {
        closeMenu();
        const leaves = getOrderedLeaves();
        const groupRows = groupRowsForOrderedLeaves(
            leaves,
            tree().getDefs(),
            tree().getOpenState(),
            (f) => columnState.getPin(f),
        );

        groupsEl.replaceChildren();
        for (const segs of groupRows) {
            const row = document.createElement("div");
            row.className = "fg-shell__group-row";
            const track = document.createElement("div");
            track.className = "fg-shell__track";
            let leafIndex = 0;
            for (const seg of segs) {
                const cell = document.createElement("div");
                let w = 0;
                for (let k = 0; k < seg.span; k++) {
                    w += leafWidth(leafField(leaves[leafIndex + k]));
                }
                leafIndex += seg.span;
                cell.style.flex = `0 0 ${w}px`;
                cell.style.width = `${w}px`;

                if (seg.kind === "group") {
                    cell.className = "fg-shell__group-cell";
                    cell.dataset.groupId = seg.group.groupId || "";
                    cell.dataset.expandable = isGroupExpandable(
                        seg.group,
                        tree().getOpenState(),
                    )
                        ? "1"
                        : "0";
                    if (seg.group.suppressStickyLabel === true) {
                        cell.classList.add(
                            "fg-shell__group-cell--no-sticky-label",
                        );
                    }
                    const label = document.createElement("span");
                    label.className = "fg-shell__group-label";
                    label.textContent = seg.group.headerName || "";
                    if (seg.group.headerTooltip) {
                        label.title = String(seg.group.headerTooltip);
                        cell.title = String(seg.group.headerTooltip);
                    }

                    const expandable = isGroupExpandable(
                        seg.group,
                        tree().getOpenState(),
                    );
                    if (expandable) {
                        const btn = document.createElement("button");
                        btn.type = "button";
                        btn.className = "fg-shell__group-toggle";
                        const open = tree().isOpen(seg.group.groupId);
                        btn.title = open ? "Collapse" : "Expand";
                        btn.setAttribute(
                            "aria-expanded",
                            open ? "true" : "false",
                        );
                        btn.append(
                            open
                                ? iconChevronDown({ size: 14 })
                                : iconChevronRight({ size: 14 }),
                        );
                        btn.addEventListener("click", (e) => {
                            e.stopPropagation();
                            const next = tree().toggleOpen(seg.group.groupId);
                            render();
                            onLayoutChange?.({
                                groupId: seg.group.groupId,
                                opened: next,
                            });
                        });
                        // Caption first, then expand/collapse icon (AG-like)
                        cell.append(label, btn);
                    } else {
                        cell.append(label);
                    }
                    applyColDefHeaderChrome(cell, seg.group);
                } else {
                    cell.className = "fg-shell__group-pad";
                }
                track.appendChild(cell);
            }
            row.appendChild(track);
            groupsEl.appendChild(row);
        }

        applyGroupPinOffsets(leaves, groupRows);

        leafTrack.replaceChildren();
        filterTrack.replaceChildren();
        leafCells.clear();
        filterCells.clear();

        const sort = columnState.getSort();

        for (const leaf of leaves) {
            const field = leafField(leaf);
            const w = leafWidth(field);
            const sortable = colOpt(leaf, "sortable", true) !== false;
            const resizable = colOpt(leaf, "resizable", true) !== false;
            const filterable =
                colOpt(leaf, "filter", true) !== false &&
                colOpt(leaf, "floatingFilter", true) !== false;
            const pinnable = colOpt(leaf, "lockPinned", false) !== true;
            const suppressMovable = colOpt(leaf, "suppressMovable", false);

            const h = document.createElement("div");
            h.className = "fg-shell__leaf-cell";
            h.dataset.field = field;
            if (suppressMovable) h.dataset.suppressMovable = "1";
            h.style.flex = `0 0 ${w}px`;
            h.style.width = `${w}px`;
            if (columnState.getPin(field) === "left") {
                h.classList.add("fg-shell__pin-left");
            }
            if (columnState.getPin(field) === "right") {
                h.classList.add("fg-shell__pin-right");
            }

            if (!suppressMovable) {
                h.draggable = true;
                h.addEventListener("dragstart", (e) => {
                    if (h.dataset.resizing === "1") {
                        e.preventDefault();
                        return;
                    }
                    e.dataTransfer?.setData("text/col-id", field);
                    e.dataTransfer.effectAllowed = "move";
                    h.classList.add("is-dragging");
                });
                h.addEventListener("dragend", () => {
                    h.classList.remove("is-dragging");
                });
                h.addEventListener("dragover", (e) => {
                    e.preventDefault();
                    h.classList.add("is-drag-over");
                });
                h.addEventListener("dragleave", () => {
                    h.classList.remove("is-drag-over");
                });
                h.addEventListener("drop", (e) => {
                    e.preventDefault();
                    h.classList.remove("is-drag-over");
                    const from = e.dataTransfer?.getData("text/col-id");
                    if (!from || from === field) return;
                    const allowed = canMoveColumnWithMarryChildren({
                        defs: tree().getDefs(),
                        order: columnState.getOrder(),
                        field: from,
                        beforeField: field,
                    });
                    if (!allowed) return;
                    columnState.moveColumn(from, field);
                    render();
                    notifyState("move");
                });
            }

            const grip = document.createElement("span");
            grip.className = "fg-shell__leaf-grip";
            grip.append(iconGrip({ size: 12 }));
            grip.title = "Drag to reorder";

            const label = document.createElement("span");
            label.className = "fg-shell__leaf-label";
            label.textContent = leaf.headerName || field;
            if (leaf.headerTooltip) {
                label.title = String(leaf.headerTooltip);
                h.title = String(leaf.headerTooltip);
            }

            const sortBtn = document.createElement("button");
            sortBtn.type = "button";
            sortBtn.className = "fg-shell__icon-btn fg-shell__sort-btn";
            sortBtn.disabled = !sortable;
            const isActive = sort.colId === field;
            if (isActive && sort.sort === "asc") {
                sortBtn.append(iconArrowUp({ size: 13 }));
                sortBtn.title = "Sorted ascending";
            } else if (isActive && sort.sort === "desc") {
                sortBtn.append(iconArrowDown({ size: 13 }));
                sortBtn.title = "Sorted descending";
            } else {
                sortBtn.append(iconArrowUpDown({ size: 13 }));
                sortBtn.title = "Sort";
                sortBtn.classList.add("is-muted");
            }
            if (sortable) {
                sortBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    columnState.cycleSort(field);
                    render();
                    notifyState("sort");
                });
            }

            const pinBtn = document.createElement("button");
            pinBtn.type = "button";
            pinBtn.className = "fg-shell__icon-btn fg-shell__pin-btn";
            pinBtn.disabled = !pinnable;
            const pin = columnState.getPin(field);
            pinBtn.append((pin ? iconPin : iconPinOff)({ size: 12 }));
            pinBtn.title = pin ? `Pinned ${pin}` : "Pin column";
            if (pin) pinBtn.classList.add("is-active");
            if (pinnable) {
                pinBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    showPinMenu(pinBtn, field);
                });
            }

            h.append(grip, label, sortBtn, pinBtn);

            if (resizable) {
                const handle = document.createElement("div");
                handle.className = "fg-shell__resize-handle";
                handle.title = "Resize";
                handle.addEventListener("pointerdown", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    h.dataset.resizing = "1";
                    h.draggable = false;
                    try {
                        handle.setPointerCapture?.(e.pointerId);
                    } catch {
                        /* ignore */
                    }
                    startResize(field, e.clientX, leafWidth(field), h);
                    const clear = () => {
                        delete h.dataset.resizing;
                        window.removeEventListener("pointerup", clear);
                    };
                    window.addEventListener("pointerup", clear);
                });
                h.appendChild(handle);
            }

            applyColDefHeaderChrome(h, leaf);
            leafTrack.appendChild(h);
            leafCells.set(field, h);

            const f = document.createElement("div");
            f.className = "fg-shell__filter-cell";
            f.dataset.field = field;
            f.style.flex = `0 0 ${w}px`;
            f.style.width = `${w}px`;
            if (columnState.getPin(field) === "left") {
                f.classList.add("fg-shell__pin-left");
            }
            if (columnState.getPin(field) === "right") {
                f.classList.add("fg-shell__pin-right");
            }
            if (filterable) {
                const input = document.createElement("input");
                input.className = "fg-shell__filter-input";
                input.type = "text";
                input.placeholder = "Filter…";
                input.value = columnState.getFilter(field);
                input.setAttribute(
                    "aria-label",
                    `Filter ${leaf.headerName || field}`,
                );
                input.addEventListener("input", () => {
                    columnState.setFilter(field, input.value);
                    onFilterInput?.(leaf, input.value);
                    notifyState("filter");
                });
                f.appendChild(input);
            }
            filterTrack.appendChild(f);
            filterCells.set(field, f);
        }

        applyPinOffsets();
    }

    render();

    return {
        el: root,
        render,
        setScrollLeft,
        setColumnWidths,
        getLeafFields: () => getOrderedLeaves().map(leafField),
        destroy() {
            document.removeEventListener("click", closeMenu);
            closeMenu();
        },
    };
}
