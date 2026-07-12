import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createColumnState } from "../../../src/js/shell/column_state.js";
import {
    toPerspectiveSort,
    toPerspectiveFilter,
    toPerspectiveViewConfig,
} from "../../../src/js/shell/engine_bridge.js";

describe("engine_bridge → Perspective ViewConfig", () => {
    it("maps sort to [[col, dir]]", () => {
        const state = createColumnState([{ field: "Sales" }]);
        assert.deepEqual(toPerspectiveSort(state), []);
        state.setSort("Sales", "desc");
        assert.deepEqual(toPerspectiveSort(state), [["Sales", "desc"]]);
    });

    it("maps floating filters to contains clauses", () => {
        const state = createColumnState([
            { field: "Region" },
            { field: "City" },
        ]);
        state.setFilter("Region", "East");
        state.setFilter("City", "");
        assert.deepEqual(toPerspectiveFilter(state), [
            ["Region", "contains", "East"],
        ]);
    });

    it("builds full view config", () => {
        const state = createColumnState([
            { field: "Region" },
            { field: "Sales" },
        ]);
        state.setSort("Sales", "asc");
        state.setFilter("Region", "West");
        assert.deepEqual(toPerspectiveViewConfig(["Region", "Sales"], state), {
            columns: ["Region", "Sales"],
            sort: [["Sales", "asc"]],
            filter: [["Region", "contains", "West"]],
        });
    });
});
