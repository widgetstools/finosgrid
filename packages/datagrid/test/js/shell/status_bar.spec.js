// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — status bar (tests)                                                ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    coerceNumeric,
    computeAggregations,
    formatStatusValue,
    resolveCountLabels,
    createStatusBar,
    PROVIDED_STATUS_PANELS,
} from "../../../src/js/shell/status_bar.js";

describe("coerceNumeric / computeAggregations", () => {
    it("coerces numbers and numeric strings", () => {
        assert.equal(coerceNumeric(3), 3);
        assert.equal(coerceNumeric("4.5"), 4.5);
        assert.equal(coerceNumeric(""), null);
        assert.equal(coerceNumeric(null), null);
    });

    it("computes count sum min max avg", () => {
        const aggs = computeAggregations([2, 4, 6], ["count", "sum", "min", "max", "avg"]);
        assert.deepEqual(
            aggs.map((a) => [a.id, a.value]),
            [
                ["count", 3],
                ["sum", 12],
                ["min", 2],
                ["max", 6],
                ["avg", 4],
            ],
        );
    });

    it("returns empty when no numeric values", () => {
        assert.deepEqual(computeAggregations([]), []);
    });
});

describe("resolveCountLabels", () => {
    it("shows of-total when filtered", () => {
        const labels = resolveCountLabels({
            totalRowCount: 100,
            displayedRowCount: 12,
            selectedRowCount: 2,
            hasFilter: true,
        });
        assert.equal(labels.totalAndFilteredLabel, "Rows: 12 of 100");
        assert.equal(labels.selectedLabel, "Selected: 2");
        assert.equal(labels.filteredLabel, "Filtered: 12");
    });

    it("hides selected when zero", () => {
        const labels = resolveCountLabels({
            totalRowCount: 10,
            displayedRowCount: 10,
            selectedRowCount: 0,
        });
        assert.equal(labels.selectedLabel, "");
        assert.equal(labels.totalAndFilteredLabel, "Rows: 10");
    });

    it("uses dataset total when groups collapse displayed rows", () => {
        const labels = resolveCountLabels({
            totalRowCount: 50_000,
            displayedRowCount: 46,
            selectedRowCount: 0,
            hasFilter: false,
        });
        assert.equal(labels.filtered, false);
        assert.equal(labels.totalAndFilteredLabel, "Rows: 50000");
        assert.equal(labels.totalLabel, "Total Rows: 50000");
    });
});

describe("formatStatusValue", () => {
    it("honors valueFormatter", () => {
        assert.equal(
            formatStatusValue(1500, ({ value }) =>
                value > 1000 ? `${value / 1000} K` : String(value),
            ),
            "1.5 K",
        );
    });
});

describe("createStatusBar", () => {
    function fakeDoc() {
        /** @type {any} */
        const doc = {
            createElement(tag) {
                /** @type {any} */
                const node = {
                    tagName: String(tag).toUpperCase(),
                    className: "",
                    hidden: false,
                    style: {},
                    dataset: {},
                    children: [],
                    textContent: "",
                    attributes: {},
                    setAttribute(k, v) {
                        this.attributes[k] = v;
                    },
                    append(...nodes) {
                        for (const n of nodes) this.appendChild(n);
                    },
                    appendChild(n) {
                        this.children.push(n);
                        n.parent = this;
                        return n;
                    },
                    replaceChildren(...nodes) {
                        this.children = [];
                        for (const n of nodes) this.appendChild(n);
                    },
                    remove() {
                        /* noop */
                    },
                    classList: {
                        toggle() {},
                    },
                };
                return node;
            },
        };
        return doc;
    }

    it("renders provided count panels and hides when unconfigured", () => {
        const doc = fakeDoc();
        let selected = 0;
        const bar = createStatusBar({
            document: doc,
            getCounts: () => ({
                total: 1000,
                displayed: 40,
                selected,
                hasFilter: true,
            }),
            getAggregationValues: () => [],
        });
        assert.equal(bar.el.hidden, true);

        bar.setConfig({
            statusPanels: [
                { statusPanel: PROVIDED_STATUS_PANELS.TOTAL_AND_FILTERED, align: "left" },
                { statusPanel: PROVIDED_STATUS_PANELS.SELECTED, align: "left" },
                {
                    statusPanel: PROVIDED_STATUS_PANELS.AGGREGATION,
                    align: "right",
                    statusPanelParams: { aggFuncs: ["sum", "avg"] },
                },
            ],
        });
        assert.equal(bar.el.hidden, false);
        // Walk children for text
        function collect(node, out = []) {
            if (node.textContent) out.push(node.textContent);
            for (const c of node.children || []) collect(c, out);
            return out;
        }
        const labels = collect(bar.el);
        assert.ok(labels.some((t) => /Rows: 40 of 1000/.test(t)));
        assert.ok(!labels.some((t) => /Selected:/.test(t)));

        selected = 3;
        bar.refresh();
        const after = collect(bar.el);
        assert.ok(after.some((t) => /Selected: 3/.test(t)));
    });

    it("shows aggregation chips from values", () => {
        const doc = fakeDoc();
        const bar = createStatusBar({
            document: doc,
            getCounts: () => ({
                total: 10,
                displayed: 10,
                selected: 0,
                hasFilter: false,
            }),
            getAggregationValues: () => [10, 20, 30],
        });
        bar.setConfig({
            statusPanels: [
                {
                    statusPanel: PROVIDED_STATUS_PANELS.AGGREGATION,
                    statusPanelParams: { aggFuncs: ["sum", "avg"] },
                },
            ],
        });
        function collect(node, out = []) {
            if (node.textContent) out.push(node.textContent);
            for (const c of node.children || []) collect(c, out);
            return out;
        }
        const labels = collect(bar.el);
        assert.ok(labels.some((t) => /Sum: 60/.test(t)));
        assert.ok(labels.some((t) => /Avg: 20/.test(t)));
    });

    it("getStatusPanel returns custom panel instance", () => {
        const doc = fakeDoc();
        function CustomPanel() {
            const gui = doc.createElement("div");
            gui.textContent = "custom";
            this.getGui = () => gui;
            this.init = () => {};
            this.refresh = () => true;
            this.destroy = () => {};
            this.ping = () => "pong";
        }
        const bar = createStatusBar({
            document: doc,
            getCounts: () => ({
                total: 1,
                displayed: 1,
                selected: 0,
                hasFilter: false,
            }),
        });
        bar.setConfig({
            statusPanels: [
                { statusPanel: CustomPanel, key: "custom", align: "center" },
            ],
        });
        const inst = bar.getStatusPanel("custom");
        assert.equal(inst.ping(), "pong");
    });
});
