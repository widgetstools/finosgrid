// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Copyright (c) 2017, the Perspective Authors.                              ┃
// ┃ AG Chrome Phase 1 — shared context for chrome features                    ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { mergeFilters } from "./filter_bridge.js";

/**
 * @param {HTMLElement} plugin HTMLPerspectiveViewerDatagridPluginElement
 */
export function createChromeContext(plugin) {
    const viewer = plugin.parentElement;
    const regular_table = plugin.regular_table;

    const root = document.createElement("div");
    root.className = "psp-ag-chrome";
    root.setAttribute("part", "ag-chrome");

    const headerBand = document.createElement("div");
    headerBand.className = "psp-ag-chrome__header-band";
    headerBand.setAttribute("part", "ag-chrome-header-band");

    const popupPortal = document.createElement("div");
    popupPortal.className = "psp-ag-chrome__popup-portal";
    popupPortal.setAttribute("part", "ag-chrome-popup-portal");

    root.appendChild(headerBand);
    root.appendChild(popupPortal);

    /** @type {import('./types.js').ChromeFilterState} */
    const chromeFilterState = {};

    const ctx = {
        plugin,
        regular_table,
        viewer,
        slots: { root, headerBand, popupPortal },
        chromeFilterState,
        themeId: "quartz",

        getColumnPaths() {
            return plugin.model?._column_paths?.slice() || [];
        },

        getColumnType(columnName) {
            const schema = plugin.model?._schema || {};
            const leaf = columnName?.split?.("|")?.at?.(-1) ?? columnName;
            return schema[leaf] || schema[columnName];
        },

        getViewConfig() {
            return plugin.model?._config || { filter: [] };
        },

        /**
         * Merge chrome filters into viewer View config without wiping
         * non-chrome filter clauses.
         */
        async applyChromeFilters() {
            if (!viewer?.restore) {
                return;
            }
            const config = ctx.getViewConfig();
            const next = mergeFilters(config.filter || [], chromeFilterState);
            await viewer.restore({ filter: next });
        },

        setChromeFilter(column, clause) {
            if (!clause) {
                delete chromeFilterState[column];
            } else {
                chromeFilterState[column] = clause;
            }
        },

        clearChromeFilter(column) {
            delete chromeFilterState[column];
        },
    };

    return ctx;
}
