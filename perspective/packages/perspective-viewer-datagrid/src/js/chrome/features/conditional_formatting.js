// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Copyright (c) 2017, the Perspective Authors.                              ┃
// ┃ AG Chrome Phase 1 — conditional formatting feature                        ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { PRIVATE_PLUGIN_SYMBOL } from "../../model/index.js";

/**
 * Rules live on columns_config / PRIVATE_PLUGIN_SYMBOL:
 *   plugin[col].conditional_formatting = [{ op, value, fg?, bg? }, ...]
 */
export function createConditionalFormattingFeature() {
    let ctx = null;
    /** @type {Object.<string, Array>} */
    let rulesByColumn = {};

    function writeIntoPluginSymbol() {
        if (!ctx?.regular_table) {
            return;
        }
        if (!ctx.regular_table[PRIVATE_PLUGIN_SYMBOL]) {
            ctx.regular_table[PRIVATE_PLUGIN_SYMBOL] = {};
        }
        const bag = ctx.regular_table[PRIVATE_PLUGIN_SYMBOL];
        for (const [col, rules] of Object.entries(rulesByColumn)) {
            if (!bag[col]) {
                bag[col] = {};
            }
            bag[col].conditional_formatting = rules;
        }
    }

    return {
        id: "conditionalFormatting",
        mount(chromeCtx) {
            ctx = chromeCtx;
        },
        syncFromConfig(_config, columnsConfig) {
            if (columnsConfig) {
                for (const [col, cfg] of Object.entries(columnsConfig)) {
                    if (cfg?.conditional_formatting) {
                        rulesByColumn[col] = cfg.conditional_formatting;
                    }
                }
                writeIntoPluginSymbol();
            }
        },
        save() {
            return { rulesByColumn: { ...rulesByColumn } };
        },
        restore(token) {
            if (token?.rulesByColumn) {
                rulesByColumn = { ...token.rulesByColumn };
                writeIntoPluginSymbol();
            }
        },
        /**
         * Programmatic API for tests / future UI.
         * @param {string} column
         * @param {Array} rules
         */
        setRules(column, rules) {
            rulesByColumn[column] = rules || [];
            writeIntoPluginSymbol();
            ctx?.regular_table?.draw?.();
        },
        destroy() {
            rulesByColumn = {};
            ctx = null;
        },
    };
}
