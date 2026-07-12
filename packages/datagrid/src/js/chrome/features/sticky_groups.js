// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ AG Chrome Phase 2 — sticky / overlay group row labels                     ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

/**
 * Overlay mode: pin the current group-by label(s) to the top-left while
 * scrolling. CSS sticky is also applied as a progressive enhancement.
 */
export function createStickyGroupsFeature() {
    let ctx = null;
    let overlay = null;
    let onScroll = null;
    let onStyle = null;
    let mode = "overlay"; // 'overlay' | 'css'

    function ensureOverlay() {
        if (!ctx || overlay) {
            return;
        }
        overlay = document.createElement("div");
        overlay.className = "psp-ag-sticky-group-overlay";
        overlay.setAttribute("part", "ag-chrome-sticky-groups");
        overlay.style.display = "none";
        ctx.slots.root.appendChild(overlay);
    }

    function groupDepth() {
        return ctx?.plugin?.model?._config?.group_by?.length || 0;
    }

    function updateOverlay() {
        if (!ctx || mode !== "overlay") {
            return;
        }
        ensureOverlay();
        const depth = groupDepth();
        if (depth === 0) {
            overlay.style.display = "none";
            return;
        }

        const table = ctx.regular_table;
        const body = table.querySelector("tbody");
        if (!body) {
            overlay.style.display = "none";
            return;
        }

        // Find first visible body row and read row_header path
        const firstRow = body.querySelector("tr");
        if (!firstRow) {
            overlay.style.display = "none";
            return;
        }
        const firstTh = firstRow.querySelector("th");
        if (!firstTh) {
            overlay.style.display = "none";
            return;
        }
        const meta = table.getMeta?.(firstTh);
        const headers = meta?.row_header;
        if (!headers?.length) {
            overlay.style.display = "none";
            return;
        }

        const labels = [];
        for (let i = 0; i < depth; i++) {
            const v = headers[i];
            if (v !== undefined && v !== null && String(v).length) {
                labels.push(String(v));
            }
        }
        if (!labels.length) {
            overlay.style.display = "none";
            return;
        }

        overlay.replaceChildren();
        for (const label of labels) {
            const row = document.createElement("div");
            row.className = "psp-ag-sticky-group-overlay__row";
            row.textContent = label;
            overlay.appendChild(row);
        }

        const rect = firstTh.getBoundingClientRect();
        const rootRect = ctx.slots.root.getBoundingClientRect();
        const headerBand = ctx.slots.headerBand;
        const groupsBand = ctx.slots.root.querySelector(
            ".psp-ag-chrome__column-groups",
        );
        let top =
            (headerBand?.getBoundingClientRect?.().bottom || rootRect.top) -
            rootRect.top;
        if (groupsBand?.style.display !== "none") {
            // already accounted via headerBand position under groups
        }
        overlay.style.display = "block";
        overlay.style.top = `${top}px`;
        overlay.style.left = "0px";
        overlay.style.width = `${Math.max(rect.width, 80)}px`;
    }

    function applyCssSticky() {
        if (!ctx) {
            return;
        }
        ctx.slots.root.classList.toggle(
            "psp-ag-sticky-groups--css",
            mode === "css" || mode === "overlay",
        );
    }

    return {
        id: "stickyGroups",
        mount(chromeCtx) {
            ctx = chromeCtx;
            applyCssSticky();
            ensureOverlay();
            onScroll = () => updateOverlay();
            onStyle = () => requestAnimationFrame(() => updateOverlay());
            ctx.regular_table.addEventListener("scroll", onScroll, {
                passive: true,
            });
            ctx.regular_table.addStyleListener?.(onStyle);
            updateOverlay();
        },
        syncFromConfig() {
            applyCssSticky();
            updateOverlay();
        },
        setMode(next) {
            mode = next === "css" ? "css" : "overlay";
            applyCssSticky();
            updateOverlay();
        },
        save() {
            return { mode };
        },
        restore(token) {
            if (token?.mode) {
                mode = token.mode;
            }
            applyCssSticky();
            updateOverlay();
        },
        destroy() {
            if (ctx?.regular_table && onScroll) {
                ctx.regular_table.removeEventListener("scroll", onScroll);
            }
            overlay?.remove();
            overlay = null;
            ctx = null;
        },
    };
}
