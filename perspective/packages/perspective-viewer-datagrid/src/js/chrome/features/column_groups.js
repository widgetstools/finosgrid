// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ AG Chrome Phase 2 — column group header band                              ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

function leafName(path) {
    return path?.split?.("|")?.at?.(-1) ?? path;
}

/**
 * @typedef {{ headerName: string, children: string[] }} ColumnGroupDef
 */

export function createColumnGroupsFeature() {
    let ctx = null;
    /** @type {ColumnGroupDef[]} */
    let groups = [];
    let band = null;
    let onScroll = null;
    let onStyle = null;

    function ensureBand() {
        if (!ctx || band) {
            return;
        }
        band = document.createElement("div");
        band.className = "psp-ag-chrome__column-groups";
        band.setAttribute("part", "ag-chrome-column-groups");
        // Insert above floating filter band
        ctx.slots.root.insertBefore(band, ctx.slots.headerBand);
    }

    function clear() {
        if (band) {
            band.replaceChildren();
        }
    }

    function childWidthMap() {
        /** @type {Map<string, number>} */
        const widths = new Map();
        for (const cell of ctx.slots.headerBand.querySelectorAll(
            ".psp-ag-floating-filter[data-column]",
        )) {
            const path = cell.dataset.column;
            const leaf = leafName(path);
            const w = cell.getBoundingClientRect().width;
            widths.set(leaf, w);
            widths.set(path, w);
        }
        return widths;
    }

    function rebuild() {
        if (!ctx) {
            return;
        }
        ensureBand();
        clear();
        if (!groups.length) {
            band.style.display = "none";
            return;
        }
        band.style.display = "flex";
        const widths = childWidthMap();
        const paths = ctx.getColumnPaths();
        const leafOrder = paths.map(leafName);

        // Spacer for row headers (match floating band)
        const groupDepth = ctx.plugin.model?._config?.group_by?.length || 0;
        if (groupDepth > 0) {
            const spacer = document.createElement("div");
            spacer.className = "psp-ag-column-group psp-ag-column-group--row-header";
            spacer.style.flex = `0 0 ${groupDepth * 100}px`;
            band.appendChild(spacer);
        }

        // Build a map leaf -> group
        /** @type {Map<string, ColumnGroupDef>} */
        const leafToGroup = new Map();
        for (const g of groups) {
            for (const c of g.children || []) {
                leafToGroup.set(c, g);
            }
        }

        let i = 0;
        while (i < leafOrder.length) {
            const leaf = leafOrder[i];
            const g = leafToGroup.get(leaf);
            if (!g) {
                const cell = document.createElement("div");
                cell.className = "psp-ag-column-group psp-ag-column-group--ungrouped";
                const w = widths.get(leaf) || widths.get(paths[i]) || 100;
                cell.style.flex = `0 0 ${w}px`;
                cell.style.width = `${w}px`;
                band.appendChild(cell);
                i += 1;
                continue;
            }
            // Span consecutive children that belong to this group
            let spanW = 0;
            let j = i;
            while (j < leafOrder.length && leafToGroup.get(leafOrder[j]) === g) {
                spanW +=
                    widths.get(leafOrder[j]) ||
                    widths.get(paths[j]) ||
                    100;
                j += 1;
            }
            const cell = document.createElement("div");
            cell.className = "psp-ag-column-group";
            cell.textContent = g.headerName;
            cell.title = g.headerName;
            cell.style.flex = `0 0 ${spanW}px`;
            cell.style.width = `${spanW}px`;
            band.appendChild(cell);
            i = j;
        }

        syncScroll();
    }

    function syncScroll() {
        if (!band || !ctx) {
            return;
        }
        const scrollLeft = ctx.regular_table.scrollLeft || 0;
        band.style.transform = `translateX(${-scrollLeft}px)`;
    }

    return {
        id: "columnGroups",
        mount(chromeCtx) {
            ctx = chromeCtx;
            ensureBand();
            onScroll = () => syncScroll();
            onStyle = () => requestAnimationFrame(() => rebuild());
            ctx.regular_table.addEventListener("scroll", onScroll, {
                passive: true,
            });
            ctx.regular_table.addStyleListener?.(onStyle);
            rebuild();
        },
        syncFromConfig() {
            rebuild();
        },
        /**
         * @param {ColumnGroupDef[]} next
         */
        setGroups(next) {
            groups = Array.isArray(next) ? next : [];
            rebuild();
        },
        save() {
            return { columnGroups: groups };
        },
        restore(token) {
            if (token?.columnGroups) {
                groups = token.columnGroups;
                rebuild();
            }
        },
        destroy() {
            if (ctx?.regular_table && onScroll) {
                ctx.regular_table.removeEventListener("scroll", onScroll);
            }
            band?.remove();
            band = null;
            groups = [];
            ctx = null;
        },
    };
}
