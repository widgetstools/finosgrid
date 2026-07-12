// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — detail row model (expand finest groups → Perspective leaf rows)   ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    buildVirtualRowMap,
    detailFilterForPath,
    pathKey,
    isTreeExpandable,
    isDetailExpandable,
    computeStickyGroupEntries,
    splitStickyTopAndBottom,
    stickyTotalLabel,
} from "../../../src/js/shell/detail_row_model.js";
import { isRowPathExpandable } from "../../../src/js/shell/row_grouping.js";

describe("path / expand helpers", () => {
    it("distinguishes tree vs detail expand levels", () => {
        assert.equal(isTreeExpandable([], 2), true);
        assert.equal(isTreeExpandable(["A"], 2), true);
        assert.equal(isTreeExpandable(["A", "B"], 2), false);
        assert.equal(isDetailExpandable(["A", "B"], 2), true);
        assert.equal(isDetailExpandable(["A"], 2), false);
        assert.equal(
            isRowPathExpandable(["A", "B"], 2, { allowDetailLeaves: true }),
            true,
        );
    });
});

describe("buildVirtualRowMap", () => {
    it("inserts detail rows under expanded finest groups only", () => {
        const paths = [[], ["Desk1"], ["Desk1", "Tech"], ["Desk2"]];
        const counts = new Map([[pathKey(["Desk1", "Tech"]), 3]]);
        const rows = buildVirtualRowMap(paths, counts, 2);
        assert.equal(rows.length, 4 + 3);
        assert.equal(rows[0].kind, "group");
        assert.equal(rows[2].kind, "group");
        assert.deepEqual(rows[2].path, ["Desk1", "Tech"]);
        assert.equal(rows[3].kind, "detail");
        assert.equal(rows[3].detailY, 0);
        assert.equal(rows[5].kind, "detail");
        assert.equal(rows[5].detailY, 2);
        assert.equal(rows[6].kind, "group");
        assert.deepEqual(rows[6].path, ["Desk2"]);
    });

    it("skips detail when count is zero", () => {
        const paths = [["A", "B"]];
        const rows = buildVirtualRowMap(paths, new Map(), 2);
        assert.equal(rows.length, 1);
    });
});

describe("detailFilterForPath", () => {
    it("AND-equals each group_by column to the path value", () => {
        assert.deepEqual(
            detailFilterForPath(
                ["book.desk", "instrument.sector"],
                ["Rates", "Tech"],
                [["positionId", "contains", "x"]],
            ),
            [
                ["positionId", "contains", "x"],
                ["book.desk", "==", "Rates"],
                ["instrument.sector", "==", "Tech"],
            ],
        );
    });
});

describe("computeStickyGroupEntries", () => {
    it("pins Total + ancestors while scrolling detail leaves", () => {
        const counts = new Map([[pathKey(["Desk1", "Tech"]), 5]]);
        const map = buildVirtualRowMap(
            [[], ["Desk1"], ["Desk1", "Tech"], ["Desk2"]],
            counts,
            2,
        );
        // map: Total, Desk1, Tech, d0,d1,d2,d3,d4, Desk2
        // index of first detail = 3
        const sticky = computeStickyGroupEntries(map, 5);
        assert.deepEqual(
            sticky.map((s) => s.path),
            [[], ["Desk1"], ["Desk1", "Tech"]],
        );
        assert.ok(sticky.every((s) => s.virtualY < 5));
    });

    it("returns empty at the top of the grid", () => {
        const map = buildVirtualRowMap([[], ["A"]], new Map(), 1);
        assert.deepEqual(computeStickyGroupEntries(map, 0), []);
    });
});

describe("splitStickyTopAndBottom", () => {
    const entries = [
        { virtualY: 0, groupY: 0, path: [] },
        { virtualY: 1, groupY: 1, path: ["Desk1"] },
        { virtualY: 2, groupY: 2, path: ["Desk1", "Tech"] },
    ];

    it("default bottom: headers on top, totals + grand on bottom", () => {
        const { top, bottom } = splitStickyTopAndBottom(entries);
        assert.deepEqual(
            top.map((e) => [e.stickyKind, e.path]),
            [
                ["header", ["Desk1"]],
                ["header", ["Desk1", "Tech"]],
            ],
        );
        assert.deepEqual(
            bottom.map((e) => [e.stickyKind, e.path]),
            [
                ["total", ["Desk1", "Tech"]],
                ["total", ["Desk1"]],
                ["total", []],
            ],
        );
    });

    it("groupTotalRow top puts subgroup totals on the top stack", () => {
        const { top, bottom } = splitStickyTopAndBottom(entries, {
            groupTotalRow: "top",
            grandTotalRow: "bottom",
        });
        assert.deepEqual(
            top.map((e) => [e.stickyKind, e.path]),
            [
                ["header", ["Desk1"]],
                ["header", ["Desk1", "Tech"]],
                ["total", ["Desk1"]],
                ["total", ["Desk1", "Tech"]],
            ],
        );
        assert.deepEqual(
            bottom.map((e) => [e.stickyKind, e.path]),
            [["total", []]],
        );
    });

    it("can hide group totals while keeping grand total", () => {
        const { top, bottom } = splitStickyTopAndBottom(entries, {
            groupTotalRow: null,
            grandTotalRow: "bottom",
        });
        assert.equal(top.every((e) => e.stickyKind === "header"), true);
        assert.deepEqual(
            bottom.map((e) => e.path),
            [[]],
        );
    });
});

describe("stickyTotalLabel", () => {
    it("formats AG-style total labels", () => {
        assert.equal(stickyTotalLabel([]), "Total");
        assert.equal(stickyTotalLabel(["East"]), "Total East");
        assert.equal(
            stickyTotalLabel(["East", "Furniture"]),
            "Total Furniture",
        );
    });
});
