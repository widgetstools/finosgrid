// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Copyright (c) 2017, the Perspective Authors.                              ┃
// ┃ AG Chrome Phase 1 — set filter popup                                      ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

/**
 * Cache of distinct column values.
 * Keyed by column leaf name.
 */
const valueCache = new Map();

function leafName(path) {
    return path?.split?.("|")?.at?.(-1) ?? path;
}

export function createSetFilterFeature() {
    let ctx = null;
    let popup = null;
    let activeColumn = null;
    let onHeaderClick = null;

    function closePopup() {
        if (popup) {
            popup.remove();
            popup = null;
        }
        activeColumn = null;
    }

    async function loadDistinctValues(columnPath) {
        const col = leafName(columnPath);
        if (valueCache.has(col)) {
            return valueCache.get(col);
        }
        const table = await ctx.viewer.getTable(true);
        const view = await table.view({ columns: [col] });
        try {
            const data = await view.to_columns();
            const raw = data[col] || [];
            const uniq = [...new Set(raw.map((v) => (v === null ? "(null)" : v)))];
            uniq.sort((a, b) => String(a).localeCompare(String(b)));
            valueCache.set(col, uniq);
            return uniq;
        } finally {
            await view.delete();
        }
    }

    function invalidateCache() {
        valueCache.clear();
    }

    async function openPopup(columnPath, anchorEl) {
        closePopup();
        activeColumn = columnPath;
        const values = await loadDistinctValues(columnPath);
        const existing = ctx.chromeFilterState[columnPath];
        const selected = new Set(
            existing?.kind === "set" && Array.isArray(existing.value)
                ? existing.value.map((v) => (v === null ? "(null)" : v))
                : values,
        );

        popup = document.createElement("div");
        popup.className = "psp-ag-set-filter";
        popup.tabIndex = -1;

        const search = document.createElement("input");
        search.className = "psp-ag-set-filter__search";
        search.type = "text";
        search.placeholder = "Search…";

        const selectAllLabel = document.createElement("label");
        selectAllLabel.className = "psp-ag-set-filter__select-all";
        const selectAll = document.createElement("input");
        selectAll.type = "checkbox";
        selectAll.checked = selected.size === values.length;
        selectAllLabel.appendChild(selectAll);
        selectAllLabel.appendChild(document.createTextNode(" (Select All)"));

        const list = document.createElement("div");
        list.className = "psp-ag-set-filter__list";

        const checkboxes = [];

        function renderList(filterText = "") {
            list.replaceChildren();
            checkboxes.length = 0;
            const q = filterText.toLowerCase();
            for (const v of values) {
                if (q && !String(v).toLowerCase().includes(q)) {
                    continue;
                }
                const label = document.createElement("label");
                label.className = "psp-ag-set-filter__item";
                const cb = document.createElement("input");
                cb.type = "checkbox";
                cb.value = String(v);
                cb.checked = selected.has(v);
                cb.addEventListener("change", () => {
                    if (cb.checked) selected.add(v);
                    else selected.delete(v);
                    selectAll.checked = selected.size === values.length;
                });
                label.appendChild(cb);
                label.appendChild(document.createTextNode(` ${v}`));
                list.appendChild(label);
                checkboxes.push(cb);
            }
        }

        search.addEventListener("input", () => renderList(search.value));
        selectAll.addEventListener("change", () => {
            if (selectAll.checked) {
                values.forEach((v) => selected.add(v));
            } else {
                selected.clear();
            }
            renderList(search.value);
        });

        const actions = document.createElement("div");
        actions.className = "psp-ag-set-filter__actions";
        const applyBtn = document.createElement("button");
        applyBtn.type = "button";
        applyBtn.textContent = "Apply";
        applyBtn.className = "psp-ag-set-filter__apply";
        const resetBtn = document.createElement("button");
        resetBtn.type = "button";
        resetBtn.textContent = "Reset";
        resetBtn.className = "psp-ag-set-filter__reset";

        applyBtn.addEventListener("click", async () => {
            const out = [...selected].map((v) => (v === "(null)" ? null : v));
            if (out.length === 0 || out.length === values.length) {
                ctx.clearChromeFilter(columnPath);
            } else {
                ctx.setChromeFilter(columnPath, {
                    kind: "set",
                    op: "in",
                    value: out,
                });
            }
            await ctx.applyChromeFilters();
            closePopup();
        });

        resetBtn.addEventListener("click", async () => {
            ctx.clearChromeFilter(columnPath);
            await ctx.applyChromeFilters();
            closePopup();
        });

        actions.appendChild(resetBtn);
        actions.appendChild(applyBtn);

        popup.appendChild(search);
        popup.appendChild(selectAllLabel);
        popup.appendChild(list);
        popup.appendChild(actions);
        renderList();

        const portal = ctx.slots.popupPortal;
        portal.appendChild(popup);

        const rect = (anchorEl || ctx.slots.headerBand).getBoundingClientRect();
        const rootRect = ctx.slots.root.getBoundingClientRect();
        popup.style.position = "absolute";
        popup.style.top = `${rect.bottom - rootRect.top + 4}px`;
        popup.style.left = `${Math.max(0, rect.left - rootRect.left)}px`;
        popup.style.zIndex = "20";

        const onDoc = (e) => {
            if (!popup.contains(e.target) && e.target !== anchorEl) {
                document.removeEventListener("mousedown", onDoc, true);
                closePopup();
            }
        };
        setTimeout(() => document.addEventListener("mousedown", onDoc, true), 0);
    }

    return {
        id: "setFilter",
        mount(chromeCtx) {
            ctx = chromeCtx;
            onHeaderClick = (event) => {
                const btn = event.target.closest?.(".psp-ag-set-filter-btn");
                if (!btn) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                openPopup(btn.dataset.column, btn);
            };
            ctx.slots.headerBand.addEventListener("click", onHeaderClick);

            // Decorate floating filter cells with a set-filter button after rebuilds
            const obs = new MutationObserver(() => {
                for (const cell of ctx.slots.headerBand.querySelectorAll(
                    ".psp-ag-floating-filter:not(.psp-ag-floating-filter--row-header)",
                )) {
                    if (cell.querySelector(".psp-ag-set-filter-btn")) {
                        continue;
                    }
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "psp-ag-set-filter-btn";
                    btn.title = "Set filter";
                    btn.textContent = "▾";
                    btn.dataset.column = cell.dataset.column;
                    cell.appendChild(btn);
                }
            });
            obs.observe(ctx.slots.headerBand, { childList: true, subtree: true });
            ctx._setFilterObserver = obs;
        },
        syncFromConfig(config) {
            // Invalidate cache when filters/schema may have shifted via data updates
            if (!config) {
                invalidateCache();
            }
        },
        save() {
            return {};
        },
        restore() {},
        destroy() {
            closePopup();
            ctx?._setFilterObserver?.disconnect?.();
            if (ctx?.slots?.headerBand && onHeaderClick) {
                ctx.slots.headerBand.removeEventListener("click", onHeaderClick);
            }
            invalidateCache();
            ctx = null;
        },
    };
}

/** @internal test helper */
export function _clearSetFilterCache() {
    valueCache.clear();
}
