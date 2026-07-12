// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — selection options normalize + row/cell controllers (tests)        ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    normalizeRowSelection,
    normalizeCellSelection,
    SELECTION_COL_ID,
} from "../../../src/js/shell/selection_options.js";
import { createRowSelectionController } from "../../../src/js/shell/row_selection.js";
import { createCellSelectionController } from "../../../src/js/shell/cell_selection.js";

describe("normalizeRowSelection", () => {
    it("returns null when unset", () => {
        assert.equal(normalizeRowSelection(undefined), null);
        assert.equal(normalizeRowSelection(null), null);
        assert.equal(normalizeRowSelection(false), null);
    });

    it("maps legacy string modes", () => {
        assert.equal(normalizeRowSelection("single").mode, "singleRow");
        assert.equal(normalizeRowSelection("multiple").mode, "multiRow");
    });

    it("applies multiRow defaults", () => {
        const opts = normalizeRowSelection({ mode: "multiRow" });
        assert.equal(opts.mode, "multiRow");
        assert.equal(opts.checkboxes, true);
        assert.equal(opts.headerCheckbox, true);
        assert.equal(opts.checkboxLocation, "selectionColumn");
        assert.equal(opts.enableClickSelection, false);
        assert.equal(opts.groupSelects, "self");
        assert.equal(opts.selectAll, "all");
    });

    it("applies singleRow defaults without headerCheckbox meaning", () => {
        const opts = normalizeRowSelection({ mode: "singleRow" });
        assert.equal(opts.mode, "singleRow");
        assert.equal(opts.checkboxes, true);
        assert.equal(opts.checkboxLocation, "selectionColumn");
    });
});

describe("normalizeCellSelection", () => {
    it("returns null when unset/false", () => {
        assert.equal(normalizeCellSelection(undefined), null);
        assert.equal(normalizeCellSelection(false), null);
    });

    it("expands true to defaults", () => {
        const opts = normalizeCellSelection(true);
        assert.equal(opts.enabled, true);
        assert.equal(opts.suppressMultiRanges, false);
        assert.equal(opts.enableHeaderHighlight, false);
        assert.equal(opts.enableColumnSelection, false);
    });

    it("merges object config", () => {
        const opts = normalizeCellSelection({
            suppressMultiRanges: true,
            handle: { mode: "fill" },
        });
        assert.equal(opts.suppressMultiRanges, true);
        assert.equal(opts.handle.mode, "fill");
    });
});

describe("SELECTION_COL_ID", () => {
    it("matches AG-style selection column id", () => {
        assert.equal(SELECTION_COL_ID, "ag-Grid-SelectionColumn");
    });
});

describe("createRowSelectionController", () => {
    function nodesFromRows(rows) {
        return rows.map((data, i) => ({
            id: String(i),
            data,
            group: false,
            level: 0,
        }));
    }

    it("selects a single row exclusively in singleRow mode", () => {
        const events = [];
        const ctrl = createRowSelectionController({
            getOptions: () => normalizeRowSelection({ mode: "singleRow" }),
            getRowNodes: () => nodesFromRows([{ a: 1 }, { a: 2 }, { a: 3 }]),
            onRowSelected: (e) => events.push(["row", e.node.id, e.node.isSelected()]),
            onSelectionChanged: (e) =>
                events.push(["changed", e.selectedNodes.map((n) => n.id)]),
        });
        const nodes = ctrl.getRowNodes();
        nodes[0].setSelected(true);
        assert.deepEqual(
            ctrl.getSelectedRows(),
            [{ a: 1 }],
        );
        nodes[1].setSelected(true);
        assert.deepEqual(ctrl.getSelectedRows(), [{ a: 2 }]);
        assert.equal(nodes[0].isSelected(), false);
        assert.ok(events.some((e) => e[0] === "changed"));
    });

    it("allows multi select and selectAll / deselectAll", () => {
        const ctrl = createRowSelectionController({
            getOptions: () => normalizeRowSelection({ mode: "multiRow" }),
            getRowNodes: () => nodesFromRows([{ a: 1 }, { a: 2 }, { a: 3 }]),
        });
        ctrl.selectAll();
        assert.equal(ctrl.getSelectedNodes().length, 3);
        ctrl.deselectAll();
        assert.equal(ctrl.getSelectedNodes().length, 0);
        ctrl.setNodesSelected({
            nodes: [ctrl.getRowNodes()[0], ctrl.getRowNodes()[2]],
            newValue: true,
        });
        assert.deepEqual(
            ctrl.getSelectedRows().map((r) => r.a).sort(),
            [1, 3],
        );
    });

    it("respects isRowSelectable", () => {
        const ctrl = createRowSelectionController({
            getOptions: () =>
                normalizeRowSelection({
                    mode: "multiRow",
                    isRowSelectable: (n) => n.data.a !== 2,
                }),
            getRowNodes: () => nodesFromRows([{ a: 1 }, { a: 2 }, { a: 3 }]),
        });
        ctrl.selectAll();
        assert.deepEqual(
            ctrl.getSelectedRows().map((r) => r.a).sort(),
            [1, 3],
        );
    });

    it("groupSelects descendants selects children", () => {
        const tree = [
            {
                id: "g",
                data: null,
                group: true,
                level: 0,
                childrenAfterGroup: [
                    { id: "0", data: { a: 1 }, group: false, level: 1 },
                    { id: "1", data: { a: 2 }, group: false, level: 1 },
                ],
            },
            { id: "0", data: { a: 1 }, group: false, level: 1 },
            { id: "1", data: { a: 2 }, group: false, level: 1 },
        ];
        tree[0].childrenAfterGroup = [tree[1], tree[2]];
        const ctrl = createRowSelectionController({
            getOptions: () =>
                normalizeRowSelection({
                    mode: "multiRow",
                    groupSelects: "descendants",
                }),
            getRowNodes: () => tree,
        });
        tree[0].setSelected = undefined; // will be attached by controller
        ctrl.attachNodes(tree);
        tree[0].setSelected(true);
        assert.equal(tree[1].isSelected(), true);
        assert.equal(tree[2].isSelected(), true);
    });
});

describe("createCellSelectionController", () => {
    it("creates a range from anchor to focus", () => {
        const events = [];
        const ctrl = createCellSelectionController({
            getOptions: () => normalizeCellSelection(true),
            onCellSelectionChanged: (e) => events.push(e.cellRanges.length),
        });
        ctrl.setRangeFromCells(
            { rowIndex: 1, colId: "a" },
            { rowIndex: 3, colId: "c" },
            { columns: ["a", "b", "c"] },
        );
        const ranges = ctrl.getCellRanges();
        assert.equal(ranges.length, 1);
        assert.equal(ranges[0].startRow.rowIndex, 1);
        assert.equal(ranges[0].endRow.rowIndex, 3);
        assert.deepEqual(ranges[0].columns, ["a", "b", "c"]);
        assert.deepEqual(events, [1]);
    });

    it("suppressMultiRanges replaces prior range", () => {
        const ctrl = createCellSelectionController({
            getOptions: () =>
                normalizeCellSelection({ suppressMultiRanges: true }),
        });
        ctrl.addCellRange({
            startRow: { rowIndex: 0 },
            endRow: { rowIndex: 0 },
            columns: ["a"],
        });
        ctrl.addCellRange({
            startRow: { rowIndex: 2 },
            endRow: { rowIndex: 2 },
            columns: ["b"],
        });
        assert.equal(ctrl.getCellRanges().length, 1);
        assert.deepEqual(ctrl.getCellRanges()[0].columns, ["b"]);
    });

    it("allows multiple ranges when not suppressed", () => {
        const ctrl = createCellSelectionController({
            getOptions: () => normalizeCellSelection(true),
        });
        ctrl.addCellRange({
            startRow: { rowIndex: 0 },
            endRow: { rowIndex: 0 },
            columns: ["a"],
        });
        ctrl.addCellRange({
            startRow: { rowIndex: 2 },
            endRow: { rowIndex: 2 },
            columns: ["b"],
        });
        assert.equal(ctrl.getCellRanges().length, 2);
    });

    it("clearCellSelection empties ranges", () => {
        const ctrl = createCellSelectionController({
            getOptions: () => normalizeCellSelection(true),
        });
        ctrl.addCellRange({
            startRow: { rowIndex: 0 },
            endRow: { rowIndex: 1 },
            columns: ["a", "b"],
        });
        ctrl.clearCellSelection();
        assert.equal(ctrl.getCellRanges().length, 0);
    });

    it("isCellInSelection reports membership", () => {
        const ctrl = createCellSelectionController({
            getOptions: () => normalizeCellSelection(true),
        });
        ctrl.setRangeFromCells(
            { rowIndex: 1, colId: "b" },
            { rowIndex: 2, colId: "c" },
            { columns: ["a", "b", "c", "d"] },
        );
        assert.equal(ctrl.isCellInSelection(1, "b"), true);
        assert.equal(ctrl.isCellInSelection(2, "c"), true);
        assert.equal(ctrl.isCellInSelection(0, "b"), false);
        assert.equal(ctrl.isCellInSelection(1, "a"), false);
    });

    it("tracks focus cell and range edge flags", () => {
        const ctrl = createCellSelectionController({
            getOptions: () => normalizeCellSelection(true),
        });
        ctrl.setRangeFromCells(
            { rowIndex: 1, colId: "b" },
            { rowIndex: 3, colId: "c" },
            { columns: ["a", "b", "c", "d"] },
        );
        assert.deepEqual(ctrl.getFocus(), { rowIndex: 3, colId: "c" });
        assert.deepEqual(ctrl.getRangeEdgeFlags(1, "b"), {
            top: true,
            bottom: false,
            left: true,
            right: false,
        });
        assert.deepEqual(ctrl.getRangeEdgeFlags(3, "c"), {
            top: false,
            bottom: true,
            left: false,
            right: true,
        });
        assert.equal(ctrl.getRangeEdgeFlags(2, "b")?.left, true);
        assert.equal(ctrl.getRangeEdgeFlags(2, "b")?.top, false);
        assert.equal(ctrl.getRangeEdgeFlags(0, "b"), null);
    });

    it("extendRangeToColumn builds a full-column range", () => {
        const ctrl = createCellSelectionController({
            getOptions: () =>
                normalizeCellSelection({ enableColumnSelection: true }),
        });
        ctrl.selectColumn("b", { rowCount: 5, clearOthers: true });
        const r = ctrl.getCellRanges()[0];
        assert.equal(r.startRow.rowIndex, 0);
        assert.equal(r.endRow.rowIndex, 4);
        assert.deepEqual(r.columns, ["b"]);
    });
});
