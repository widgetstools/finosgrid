// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ AG Chrome Phase 1 — unit tests for filter bridge + conditional rules      ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    mergeFilters,
    toPerspectiveFilters,
    isChromeManagedClause,
} from "../../src/js/chrome/filter_bridge.js";
import {
    ruleMatches,
    applyConditionalFormatting,
} from "../../src/js/style_handlers/table_cell/conditional.js";

describe("filter_bridge", () => {
    it("toPerspectiveFilters emits floating and set clauses", () => {
        const filters = toPerspectiveFilters({
            City: { kind: "floating", op: "contains", value: "York" },
            Category: { kind: "set", op: "in", value: ["A", "B"] },
            Empty: { kind: "floating", op: "contains", value: "" },
        });
        assert.deepEqual(filters, [
            ["City", "contains", "York"],
            ["Category", "in", ["A", "B"]],
        ]);
    });

    it("mergeFilters preserves non-chrome clauses and replaces managed columns", () => {
        const existing = [
            ["Region", "==", "East"],
            ["City", "contains", "old"],
            ["Sales", ">", 10],
        ];
        const chrome = {
            City: { kind: "floating", op: "contains", value: "York" },
        };
        const merged = mergeFilters(existing, chrome);
        assert.deepEqual(merged, [
            ["Region", "==", "East"],
            ["Sales", ">", 10],
            ["City", "contains", "York"],
        ]);
    });

    it("isChromeManagedClause detects set filters", () => {
        const state = {
            Category: { kind: "set", op: "in", value: ["A"] },
        };
        assert.equal(
            isChromeManagedClause(["Category", "in", ["A"]], state),
            true,
        );
        assert.equal(
            isChromeManagedClause(["Category", "==", "A"], state),
            false,
        );
        assert.equal(
            isChromeManagedClause(["Other", "in", ["A"]], state),
            false,
        );
    });
});

describe("conditional formatting", () => {
    it("ruleMatches numeric and string ops", () => {
        assert.equal(ruleMatches(10, { op: ">", value: 5 }), true);
        assert.equal(ruleMatches(10, { op: "<", value: 5 }), false);
        assert.equal(ruleMatches("Hello", { op: "contains", value: "ell" }), true);
        assert.equal(
            ruleMatches("Hello", { op: "startsWith", value: "He" }),
            true,
        );
        assert.equal(ruleMatches(null, { op: "isNull" }), true);
    });

    it("applyConditionalFormatting sets styles on first match", () => {
        const td = { style: {}, classList: { add() {}, remove() {} } };
        const applied = applyConditionalFormatting(td, 100, [
            { op: ">", value: 50, fg: "#c00", bg: "#fee" },
        ]);
        assert.equal(applied, true);
        assert.equal(td.style.color, "#c00");
        assert.equal(td.style.backgroundColor, "#fee");
    });
});
