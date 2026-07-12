// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Copyright (c) 2017, the Perspective Authors.                              ┃
// ┃ AG Chrome Phase 1 — floating filter band                                  ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { FLOATING_FILTER_DEBOUNCE_MS } from "../types.js";

function defaultOpForType(type) {
    if (type === "integer" || type === "float") {
        return "==";
    }
    if (type === "boolean") {
        return "==";
    }
    return "contains";
}

function leafName(path) {
    return path?.split?.("|")?.at?.(-1) ?? path;
}

export function createFloatingFiltersFeature() {
    let ctx = null;
    let debounceTimer = null;
    let onScroll = null;
    let onDraw = null;
    /** @type {Map<string, HTMLElement>} */
    const inputs = new Map();

    function clearBand() {
        if (!ctx) {
            return;
        }
        ctx.slots.headerBand.replaceChildren();
        inputs.clear();
    }

    function scheduleApply() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            ctx?.applyChromeFilters?.();
        }, FLOATING_FILTER_DEBOUNCE_MS);
    }

    function onInputChange(columnPath, type, inputEl, opEl) {
        const raw = inputEl.value;
        if (raw === "" || raw === undefined) {
            ctx.clearChromeFilter(columnPath);
            scheduleApply();
            return;
        }
        let value = raw;
        const op = opEl?.value || defaultOpForType(type);
        if (type === "integer") {
            value = parseInt(raw, 10);
            if (Number.isNaN(value)) {
                return;
            }
        } else if (type === "float") {
            value = parseFloat(raw);
            if (Number.isNaN(value)) {
                return;
            }
        } else if (type === "boolean") {
            if (raw === "true") value = true;
            else if (raw === "false") value = false;
            else {
                ctx.clearChromeFilter(columnPath);
                scheduleApply();
                return;
            }
        }
        ctx.setChromeFilter(columnPath, {
            kind: "floating",
            op,
            value,
        });
        scheduleApply();
    }

    function rebuild() {
        if (!ctx?.plugin?.model) {
            return;
        }
        clearBand();
        const paths = ctx.getColumnPaths();
        const band = ctx.slots.headerBand;
        band.style.display = "flex";
        band.style.overflow = "hidden";

        // Spacer for row-header columns
        const groupDepth = ctx.plugin.model._config?.group_by?.length || 0;
        if (groupDepth > 0) {
            const spacer = document.createElement("div");
            spacer.className = "psp-ag-floating-filter psp-ag-floating-filter--row-header";
            spacer.style.flex = `0 0 ${groupDepth * 100}px`;
            band.appendChild(spacer);
        }

        for (const path of paths) {
            const type = ctx.getColumnType(path);
            const cell = document.createElement("div");
            cell.className = "psp-ag-floating-filter";
            cell.dataset.column = path;

            let opEl = null;
            if (type === "integer" || type === "float") {
                opEl = document.createElement("select");
                opEl.className = "psp-ag-floating-filter__op";
                for (const op of ["==", "!=", ">", ">=", "<", "<="]) {
                    const opt = document.createElement("option");
                    opt.value = op;
                    opt.textContent = op;
                    opEl.appendChild(opt);
                }
                cell.appendChild(opEl);
            }

            let input;
            if (type === "boolean") {
                input = document.createElement("select");
                input.className = "psp-ag-floating-filter__input";
                for (const [v, label] of [
                    ["", ""],
                    ["true", "true"],
                    ["false", "false"],
                ]) {
                    const opt = document.createElement("option");
                    opt.value = v;
                    opt.textContent = label;
                    input.appendChild(opt);
                }
            } else {
                input = document.createElement("input");
                input.className = "psp-ag-floating-filter__input";
                input.type = type === "integer" || type === "float" ? "number" : "text";
                input.placeholder = `Filter ${leafName(path)}…`;
            }

            const existing = ctx.chromeFilterState[path];
            if (existing?.kind === "floating") {
                input.value =
                    existing.value === true
                        ? "true"
                        : existing.value === false
                          ? "false"
                          : existing.value ?? "";
                if (opEl && existing.op) {
                    opEl.value = existing.op;
                }
            }

            const handler = () => onInputChange(path, type, input, opEl);
            input.addEventListener("input", handler);
            input.addEventListener("change", handler);
            opEl?.addEventListener("change", handler);

            cell.appendChild(input);
            band.appendChild(cell);
            inputs.set(path, cell);
        }

        syncGeometry();
    }

    function syncGeometry() {
        if (!ctx?.regular_table) {
            return;
        }
        const table = ctx.regular_table;
        const scrollLeft = table.scrollLeft || 0;
        ctx.slots.headerBand.style.transform = `translateX(${-scrollLeft}px)`;

        // Match cell widths from first body header row if available
        const headerRow = table.querySelector("thead tr:last-child");
        if (!headerRow) {
            return;
        }
        const ths = [...headerRow.children].filter(
            (el) => el.tagName === "TH" || el.tagName === "TD",
        );
        // Skip tree/row header ths that don't map to column paths
        const pathCells = [...inputs.values()];
        let thIndex = ths.length - pathCells.length;
        if (thIndex < 0) thIndex = 0;
        pathCells.forEach((cell, i) => {
            const th = ths[thIndex + i];
            if (th) {
                const w = th.getBoundingClientRect().width;
                cell.style.flex = `0 0 ${w}px`;
                cell.style.width = `${w}px`;
            }
        });
    }

    return {
        id: "floatingFilters",
        mount(chromeCtx) {
            ctx = chromeCtx;
            onScroll = () => syncGeometry();
            onDraw = () => {
                requestAnimationFrame(() => syncGeometry());
            };
            ctx.regular_table.addEventListener("scroll", onScroll, {
                passive: true,
            });
            ctx.regular_table.addStyleListener?.(onDraw);
            rebuild();
        },
        syncFromConfig() {
            rebuild();
        },
        save() {
            return {};
        },
        restore() {
            rebuild();
        },
        destroy() {
            clearTimeout(debounceTimer);
            if (ctx?.regular_table && onScroll) {
                ctx.regular_table.removeEventListener("scroll", onScroll);
            }
            clearBand();
            ctx = null;
        },
    };
}
