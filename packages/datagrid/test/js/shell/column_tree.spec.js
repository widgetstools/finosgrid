// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — column group tree (AG ColDef / ColGroupDef semantics)             ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    createColumnTree,
    isColGroupDef,
    visibleLeaves,
    applyColumnDefaults,
} from "../../../src/js/shell/column_tree.js";

/** @type {import('../../../src/js/shell/ag_types.js').ColGroupDef} */
const geography = {
    groupId: "geography",
    headerName: "Geography",
    openByDefault: true,
    children: [
        { field: "region", headerName: "Region" }, // always (omit columnGroupShow)
        {
            field: "city",
            headerName: "City",
            columnGroupShow: "open",
        },
        {
            field: "regionCode",
            headerName: "Code",
            columnGroupShow: "closed",
        },
    ],
};

describe("isColGroupDef", () => {
    it("detects groups vs leaves (AG children discriminator)", () => {
        assert.equal(isColGroupDef(geography), true);
        assert.equal(isColGroupDef({ field: "region" }), false);
    });
});

describe("visibleLeaves", () => {
    it("shows columns with omitted columnGroupShow when open or closed", () => {
        assert.ok(
            visibleLeaves([geography], { geography: true })
                .map((c) => c.field)
                .includes("region"),
        );
        assert.ok(
            visibleLeaves([geography], { geography: false })
                .map((c) => c.field)
                .includes("region"),
        );
    });

    it("shows open-only leaves only when group is expanded", () => {
        assert.deepEqual(
            visibleLeaves([geography], { geography: true }).map((c) => c.field),
            ["region", "city"],
        );
        assert.equal(
            visibleLeaves([geography], { geography: false })
                .map((c) => c.field)
                .includes("city"),
            false,
        );
    });

    it("shows closed-only leaves only when group is collapsed", () => {
        assert.deepEqual(
            visibleLeaves([geography], { geography: false }).map(
                (c) => c.field,
            ),
            ["region", "regionCode"],
        );
    });

    it("hides open-only nested groups when parent is collapsed", () => {
        const nested = {
            groupId: "outer",
            headerName: "Outer",
            openByDefault: true,
            children: [
                {
                    groupId: "inner",
                    headerName: "Inner",
                    columnGroupShow: "open",
                    openByDefault: true,
                    children: [
                        { field: "alwaysInner" },
                        { field: "openInner", columnGroupShow: "open" },
                        { field: "closedInner", columnGroupShow: "closed" },
                    ],
                },
                { field: "outerClosed", columnGroupShow: "closed" },
            ],
        };

        assert.deepEqual(
            visibleLeaves([nested], { outer: true, inner: true }).map(
                (c) => c.field,
            ),
            ["alwaysInner", "openInner"],
        );
        assert.deepEqual(
            visibleLeaves([nested], { outer: false, inner: true }).map(
                (c) => c.field,
            ),
            ["outerClosed"],
        );
    });
});

describe("createColumnTree (AG openByDefault @default false)", () => {
    it("starts closed unless openByDefault is true", () => {
        const tree = createColumnTree({
            columnDefs: [
                {
                    groupId: "g1",
                    headerName: "G1",
                    children: [{ field: "x" }],
                },
                {
                    groupId: "g2",
                    headerName: "G2",
                    openByDefault: true,
                    children: [{ field: "y", columnGroupShow: "open" }],
                },
            ],
        });

        assert.equal(tree.isOpen("g1"), false);
        assert.equal(tree.isOpen("g2"), true);
        assert.deepEqual(
            tree.visibleLeaves().map((c) => c.field),
            ["x", "y"],
        );
    });

    it("setColumnGroupOpened-compatible setOpen / getColumnGroupState", () => {
        const tree = createColumnTree({ columnDefs: [geography] });
        assert.deepEqual(
            tree.visibleLeaves().map((c) => c.field),
            ["region", "city"],
        );
        tree.setOpen("geography", false);
        assert.deepEqual(tree.getColumnGroupState(), [
            { groupId: "geography", open: false },
        ]);
        tree.resetColumnGroupState();
        assert.equal(tree.isOpen("geography"), true);
    });

    it("applies defaultColDef / defaultColGroupDef like AG Grid", () => {
        const defs = applyColumnDefaults(
            [
                {
                    headerName: "G",
                    children: [{ field: "a" }],
                },
            ],
            { filter: true, floatingFilter: true },
            { openByDefault: true },
        );
        assert.equal(defs[0].openByDefault, true);
        assert.equal(defs[0].children[0].filter, true);
        assert.equal(defs[0].children[0].floatingFilter, true);
    });
});
