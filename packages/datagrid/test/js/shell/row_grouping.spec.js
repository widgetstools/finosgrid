// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — row grouping / aggregation unit tests                             ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    extractRowGroupConfig,
    filterDisplayLeaves,
    mapAggFuncToPerspective,
    formatRowPathLabel,
    isRowPathExpandable,
    AUTO_GROUP_COL_ID,
} from "../../../src/js/shell/row_grouping.js";
import { toPerspectiveViewConfig } from "../../../src/js/shell/engine_bridge.js";
import { createColumnState } from "../../../src/js/shell/column_state.js";

describe("mapAggFuncToPerspective", () => {
    it("maps AG names to Perspective aggregates", () => {
        assert.equal(mapAggFuncToPerspective("sum"), "sum");
        assert.equal(mapAggFuncToPerspective("avg"), "avg");
        assert.equal(mapAggFuncToPerspective("mean"), "avg");
        assert.equal(mapAggFuncToPerspective("count"), "count");
        assert.equal(mapAggFuncToPerspective(() => 1), null);
    });
});

describe("extractRowGroupConfig", () => {
    it("orders by rowGroupIndex and collects aggregates", () => {
        const cfg = extractRowGroupConfig({
            columnDefs: [
                { field: "year", rowGroup: true, rowGroupIndex: 1, hide: true },
                { field: "country", rowGroup: true, rowGroupIndex: 0, hide: true },
                { field: "gold", aggFunc: "sum" },
                { field: "silver", aggFunc: "avg" },
                { field: "athlete" },
            ],
            groupDefaultExpanded: 1,
        });
        assert.deepEqual(cfg.groupBy, ["country", "year"]);
        assert.deepEqual(cfg.aggregates, { gold: "sum", silver: "avg" });
        assert.equal(cfg.groupByDepth, 1);
        assert.equal(cfg.enabled, true);
        assert.equal(cfg.autoGroupColumnDef.field, AUTO_GROUP_COL_ID);
        assert.ok(cfg.hiddenGroupFields.has("country"));
    });

    it("maps groupDefaultExpanded -1 to full depth", () => {
        const cfg = extractRowGroupConfig({
            columnDefs: [
                { field: "a", rowGroup: true },
                { field: "b", rowGroup: true },
            ],
            groupDefaultExpanded: -1,
        });
        assert.equal(cfg.groupByDepth, 2);
    });
});

describe("filterDisplayLeaves", () => {
    it("drops hide:true and hidden group dims", () => {
        const leaves = filterDisplayLeaves(
            [
                { field: "country", hide: true },
                { field: "gold" },
                { field: "year" },
            ],
            {
                hiddenGroupFields: new Set(["country"]),
                groupBy: ["country", "year"],
                hideGroupedColumns: true,
            },
        );
        assert.deepEqual(
            leaves.map((l) => l.field),
            ["gold"],
        );
    });
});

describe("row path helpers", () => {
    it("formats TOTAL and leaf labels", () => {
        assert.equal(formatRowPathLabel([]), "Total");
        assert.equal(formatRowPathLabel(["USA", "2020"]), "2020");
        assert.equal(isRowPathExpandable(["USA"], 2), true);
        assert.equal(isRowPathExpandable(["USA", "2020"], 2), false);
    });
});

describe("toPerspectiveViewConfig with grouping", () => {
    it("includes group_by and aggregates", () => {
        const state = createColumnState([{ field: "gold" }]);
        const cfg = toPerspectiveViewConfig(["gold"], state, {
            groupBy: ["country"],
            aggregates: { gold: "sum" },
            groupByDepth: 1,
        });
        assert.deepEqual(cfg.group_by, ["country"]);
        assert.deepEqual(cfg.aggregates, { gold: "sum" });
        assert.equal(cfg.group_by_depth, 1);
        assert.deepEqual(cfg.columns, ["gold"]);
    });
});
