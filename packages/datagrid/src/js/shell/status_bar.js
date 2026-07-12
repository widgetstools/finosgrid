// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — AG-style status bar (provided + custom panels)                    ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

/**
 * @typedef {object} StatusPanelDef
 * @property {string|Function|object} statusPanel
 * @property {'left'|'center'|'right'} [align]
 * @property {string} [key]
 * @property {Record<string, any>} [statusPanelParams]
 */

/**
 * @typedef {object} StatusBarDef
 * @property {StatusPanelDef[]} statusPanels
 */

/**
 * @typedef {object} IStatusPanelComp
 * @property {() => HTMLElement} getGui
 * @property {(params: any) => void} [init]
 * @property {(params: any) => boolean} [refresh]
 * @property {() => void} [destroy]
 */

export const PROVIDED_STATUS_PANELS = Object.freeze({
    TOTAL: "agTotalRowCountComponent",
    FILTERED: "agFilteredRowCountComponent",
    TOTAL_AND_FILTERED: "agTotalAndFilteredRowCountComponent",
    SELECTED: "agSelectedRowCountComponent",
    AGGREGATION: "agAggregationComponent",
});

const DEFAULT_AGG_FUNCS = ["count", "sum", "min", "max", "avg"];

/**
 * @param {unknown} value
 * @returns {number|null}
 */
export function coerceNumeric(value) {
    if (typeof value === "bigint") return Number(value);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

/**
 * @param {number[]} values
 * @param {string[]} [aggFuncs]
 * @returns {{ id: string, label: string, value: number }[]}
 */
export function computeAggregations(values, aggFuncs = DEFAULT_AGG_FUNCS) {
    const nums = (values || []).filter((v) => typeof v === "number" && Number.isFinite(v));
    if (!nums.length) return [];
    const want = new Set(
        (aggFuncs?.length ? aggFuncs : DEFAULT_AGG_FUNCS).map((x) =>
            String(x).toLowerCase(),
        ),
    );
    /** @type {{ id: string, label: string, value: number }[]} */
    const out = [];
    const sum = nums.reduce((a, b) => a + b, 0);
    if (want.has("count")) out.push({ id: "count", label: "Count", value: nums.length });
    if (want.has("sum")) out.push({ id: "sum", label: "Sum", value: sum });
    if (want.has("min")) out.push({ id: "min", label: "Min", value: Math.min(...nums) });
    if (want.has("max")) out.push({ id: "max", label: "Max", value: Math.max(...nums) });
    if (want.has("avg")) {
        out.push({
            id: "avg",
            label: "Avg",
            value: nums.length ? sum / nums.length : 0,
        });
    }
    return out;
}

/**
 * @param {number|bigint|null|undefined} value
 * @param {(p: { value: number|null, bigintValue?: bigint|null }) => string} [formatter]
 */
export function formatStatusValue(value, formatter) {
    if (typeof value === "bigint") {
        if (formatter) return formatter({ value: Number(value), bigintValue: value });
        return value.toString();
    }
    const n = typeof value === "number" ? value : null;
    if (formatter) return formatter({ value: n, bigintValue: null });
    if (n == null || Number.isNaN(n)) return "";
    if (Number.isInteger(n)) return String(n);
    return String(Math.round(n * 1000) / 1000);
}

/**
 * @param {object} state
 * @param {number} state.totalRowCount
 * @param {number} state.displayedRowCount
 * @param {number} state.selectedRowCount
 * @param {boolean} [state.hasFilter]
 */
export function resolveCountLabels(state) {
    const total = Math.max(0, state.totalRowCount | 0);
    const displayed = Math.max(0, state.displayedRowCount | 0);
    const selected = Math.max(0, state.selectedRowCount | 0);
    // Column filters only — collapsed row groups must not look like a filter.
    const filtered = state.hasFilter === true;
    return {
        total,
        displayed,
        selected,
        filtered,
        totalLabel: `Total Rows: ${total}`,
        filteredLabel: filtered ? `Filtered: ${displayed}` : "",
        totalAndFilteredLabel: filtered
            ? `Rows: ${displayed} of ${total}`
            : `Rows: ${total}`,
        selectedLabel: selected > 0 ? `Selected: ${selected}` : "",
    };
}

/**
 * @param {Document} [doc]
 */
function el(tag, className, doc = document) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    return node;
}

/**
 * @param {object} opts
 * @param {() => { total: number, displayed: number, selected: number, hasFilter: boolean }} opts.getCounts
 * @param {() => number[]} [opts.getAggregationValues]
 * @param {() => any} [opts.getApi]
 * @param {any} [opts.context]
 * @param {Document} [opts.document]
 */
export function createStatusBar({
    getCounts,
    getAggregationValues,
    getApi,
    context,
    document: doc = typeof document !== "undefined" ? document : null,
} = {}) {
    if (!doc?.createElement) {
        throw new Error("createStatusBar: no document");
    }

    const root = el("div", "fg-shell__status-bar", doc);
    root.setAttribute("role", "status");
    root.setAttribute("aria-live", "polite");

    const left = el("div", "fg-shell__status-bar-section fg-shell__status-bar-section--left", doc);
    const center = el(
        "div",
        "fg-shell__status-bar-section fg-shell__status-bar-section--center",
        doc,
    );
    const right = el(
        "div",
        "fg-shell__status-bar-section fg-shell__status-bar-section--right",
        doc,
    );
    root.append(left, center, right);

    /** @type {Map<string, { def: StatusPanelDef, comp: IStatusPanelComp|null, host: HTMLElement, providedId?: string }>} */
    const panelsByKey = new Map();
    /** @type {StatusBarDef|null} */
    let config = null;
    let panelSeq = 0;

    function sectionFor(align) {
        if (align === "left") return left;
        if (align === "center") return center;
        return right;
    }

    function clearPanels() {
        for (const entry of panelsByKey.values()) {
            try {
                entry.comp?.destroy?.();
            } catch {
                /* ignore */
            }
            entry.host.remove();
        }
        panelsByKey.clear();
        left.replaceChildren();
        center.replaceChildren();
        right.replaceChildren();
    }

    /**
     * @param {string} providedId
     * @param {StatusPanelDef} def
     * @returns {IStatusPanelComp}
     */
    function createProvidedPanel(providedId, def) {
        const params = def.statusPanelParams || {};
        const host = el("div", "fg-shell__status-panel", doc);
        host.dataset.panel = providedId;

        function applyFormatter(value) {
            return formatStatusValue(value, params.valueFormatter);
        }

        function setText(text, visible = true) {
            host.textContent = text || "";
            host.hidden = !visible || !text;
        }

        const comp = {
            getGui: () => host,
            init() {
                comp.refresh?.();
            },
            refresh() {
                const counts = getCounts?.() || {
                    total: 0,
                    displayed: 0,
                    selected: 0,
                    hasFilter: false,
                };
                const labels = resolveCountLabels({
                    totalRowCount: counts.total,
                    displayedRowCount: counts.displayed,
                    selectedRowCount: counts.selected,
                    hasFilter: counts.hasFilter,
                });
                if (providedId === PROVIDED_STATUS_PANELS.TOTAL) {
                    setText(
                        `Total Rows: ${applyFormatter(labels.total)}`,
                        true,
                    );
                    return true;
                }
                if (providedId === PROVIDED_STATUS_PANELS.FILTERED) {
                    setText(
                        labels.filtered
                            ? `Filtered: ${applyFormatter(labels.displayed)}`
                            : "",
                        labels.filtered,
                    );
                    return true;
                }
                if (providedId === PROVIDED_STATUS_PANELS.TOTAL_AND_FILTERED) {
                    const text = labels.filtered
                        ? `Rows: ${applyFormatter(labels.displayed)} of ${applyFormatter(labels.total)}`
                        : `Rows: ${applyFormatter(labels.total)}`;
                    setText(text, true);
                    return true;
                }
                if (providedId === PROVIDED_STATUS_PANELS.SELECTED) {
                    setText(
                        labels.selected > 0
                            ? `Selected: ${applyFormatter(labels.selected)}`
                            : "",
                        labels.selected > 0,
                    );
                    return true;
                }
                if (providedId === PROVIDED_STATUS_PANELS.AGGREGATION) {
                    const values = getAggregationValues?.() || [];
                    const aggs = computeAggregations(
                        values,
                        params.aggFuncs || DEFAULT_AGG_FUNCS,
                    );
                    host.replaceChildren();
                    if (!aggs.length) {
                        host.hidden = true;
                        return true;
                    }
                    host.hidden = false;
                    for (const a of aggs) {
                        const chip = el("span", "fg-shell__status-agg", doc);
                        chip.dataset.agg = a.id;
                        chip.textContent = `${a.label}: ${applyFormatter(a.value)}`;
                        host.appendChild(chip);
                    }
                    return true;
                }
                setText(providedId, true);
                return true;
            },
            destroy() {},
        };
        return comp;
    }

    /**
     * @param {StatusPanelDef} def
     * @returns {IStatusPanelComp|null}
     */
    function instantiatePanel(def) {
        const panel = def.statusPanel;
        if (typeof panel === "string") {
            return createProvidedPanel(panel, def);
        }
        if (typeof panel === "function") {
            try {
                // class or factory
                /** @type {any} */
                const maybe = panel.prototype?.getGui
                    ? new panel()
                    : panel();
                return maybe;
            } catch {
                try {
                    return new /** @type {any} */ (panel)();
                } catch {
                    return null;
                }
            }
        }
        if (panel && typeof panel === "object" && typeof panel.getGui === "function") {
            return /** @type {IStatusPanelComp} */ (panel);
        }
        return null;
    }

    /**
     * @param {StatusBarDef|null|undefined} next
     */
    function setConfig(next) {
        clearPanels();
        config = next && Array.isArray(next.statusPanels) ? next : null;
        if (!config?.statusPanels?.length) {
            root.hidden = true;
            root.style.display = "none";
            return;
        }
        root.hidden = false;
        root.style.display = "";

        for (const def of config.statusPanels) {
            const key =
                def.key ||
                (typeof def.statusPanel === "string"
                    ? def.statusPanel
                    : `panel-${++panelSeq}`);
            const align = def.align || "right";
            const wrap = el("div", "fg-shell__status-panel-wrap", doc);
            wrap.dataset.key = key;
            wrap.dataset.align = align;

            const comp = instantiatePanel(def);
            if (!comp) continue;
            const params = {
                api: getApi?.(),
                context,
                key,
                ...(def.statusPanelParams || {}),
            };
            try {
                comp.init?.(params);
            } catch {
                /* custom panel init failure */
            }
            const gui = comp.getGui?.();
            if (gui) wrap.appendChild(gui);
            sectionFor(align).appendChild(wrap);
            panelsByKey.set(key, {
                def,
                comp,
                host: wrap,
                providedId:
                    typeof def.statusPanel === "string"
                        ? def.statusPanel
                        : undefined,
            });
        }
        refresh();
    }

    function refresh() {
        if (!panelsByKey.size) {
            root.hidden = true;
            root.style.display = "none";
            return;
        }
        let anyVisible = false;
        for (const entry of panelsByKey.values()) {
            try {
                const ok = entry.comp?.refresh?.(
                    {
                        api: getApi?.(),
                        context,
                        key: entry.host.dataset.key,
                        ...(entry.def.statusPanelParams || {}),
                    },
                );
                if (ok === false) {
                    // AG: recreate — keep simple: re-init text via provided refresh only
                }
            } catch {
                /* ignore */
            }
            const gui = entry.comp?.getGui?.();
            if (gui && !gui.hidden && (gui.textContent || gui.children.length)) {
                anyVisible = true;
            }
        }
        // Keep bar visible if configured (min height via CSS); hide only if empty config
        root.hidden = false;
        root.style.display = "";
        root.classList.toggle("fg-shell__status-bar--empty", !anyVisible);
        void anyVisible;
    }

    /**
     * @param {string} key
     */
    function getStatusPanel(key) {
        return panelsByKey.get(key)?.comp || null;
    }

    function destroy() {
        clearPanels();
        root.remove();
    }

    root.hidden = true;
    root.style.display = "none";

    return {
        el: root,
        setConfig,
        refresh,
        getStatusPanel,
        destroy,
    };
}
