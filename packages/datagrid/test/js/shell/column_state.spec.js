// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — column state (resize / order / sort / pin / filter)               ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    createColumnState,
    applyColumnStateToData,
} from "../../../src/js/shell/column_state.js";

describe("createColumnState", () => {
    it("seeds widths and pins from ColDefs", () => {
        const state = createColumnState([
            { field: "a", width: 180 },
            { field: "b", pinned: "left" },
            { field: "c", initialWidth: 90 },
        ]);
        assert.equal(state.getWidth("a"), 180);
        assert.equal(state.getPin("b"), "left");
        assert.equal(state.getWidth("c"), 90);
        assert.deepEqual(state.getOrder(), ["a", "b", "c"]);
    });

    it("cycles sort null → asc → desc → null", () => {
        const state = createColumnState([{ field: "a" }, { field: "b" }]);
        assert.deepEqual(state.cycleSort("a"), { colId: "a", sort: "asc" });
        assert.deepEqual(state.cycleSort("a"), { colId: "a", sort: "desc" });
        assert.deepEqual(state.cycleSort("a"), { colId: null, sort: null });
        assert.deepEqual(state.cycleSort("b"), { colId: "b", sort: "asc" });
    });

    it("reorders and pins left → center → right", () => {
        const state = createColumnState([
            { field: "a" },
            { field: "b" },
            { field: "c" },
            { field: "d" },
        ]);
        state.moveColumn("c", "a");
        assert.deepEqual(state.getOrder(), ["c", "a", "b", "d"]);
        state.setPin("d", "left");
        state.setPin("b", "right");
        assert.deepEqual(state.orderVisible(["a", "b", "c", "d"]), [
            "d",
            "c",
            "a",
            "b",
        ]);
    });

    it("clamps resize width", () => {
        const state = createColumnState([{ field: "a" }]);
        assert.equal(state.setWidth("a", 10, 60, 800), 60);
        assert.equal(state.setWidth("a", 9999, 60, 800), 800);
    });
});

describe("applyColumnStateToData", () => {
    it("filters and sorts column-oriented rows", () => {
        const state = createColumnState([
            { field: "name" },
            { field: "qty" },
        ]);
        const cols = {
            name: ["Apple", "Banana", "Apricot"],
            qty: [3, 1, 2],
        };
        state.setFilter("name", "ap");
        state.setSort("qty", "asc");
        const out = applyColumnStateToData(["name", "qty"], cols, state);
        assert.deepEqual(out.name, ["Apricot", "Apple"]);
        assert.deepEqual(out.qty, [2, 3]);
    });
});
