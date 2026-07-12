// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — column group tree visibility (always / open / closed)             ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    createColumnTree,
    isColGroupDef,
    visibleLeaves,
} from "../../../src/js/shell/column_tree.js";

/** @type {import('../../../src/js/shell/column_tree.js').ColGroupDef} */
const geography = {
    groupId: "geography",
    headerName: "Geography",
    openByDefault: true,
    children: [
        { field: "region", headerName: "Region" }, // always
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
    it("detects groups vs leaves", () => {
        assert.equal(isColGroupDef(geography), true);
        assert.equal(isColGroupDef({ field: "region" }), false);
    });
});

describe("visibleLeaves", () => {
    it("shows always leaves when group is open or closed", () => {
        const openLeaves = visibleLeaves([geography], { geography: true }).map(
            (c) => c.field,
        );
        const closedLeaves = visibleLeaves([geography], {
            geography: false,
        }).map((c) => c.field);

        assert.ok(openLeaves.includes("region"));
        assert.ok(closedLeaves.includes("region"));
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
        assert.equal(
            visibleLeaves([geography], { geography: true })
                .map((c) => c.field)
                .includes("regionCode"),
            false,
        );
    });

    it("keeps stable DFS order of visible leaves", () => {
        const tree = [
            {
                groupId: "a",
                headerName: "A",
                children: [
                    { field: "a1" },
                    { field: "a2", columnGroupShow: "open" },
                ],
            },
            { field: "top" },
            {
                groupId: "b",
                headerName: "B",
                children: [{ field: "b1" }],
            },
        ];
        assert.deepEqual(
            visibleLeaves(tree, { a: true, b: true }).map((c) => c.field),
            ["a1", "a2", "top", "b1"],
        );
    });

    it("hides open-only grandchildren when a parent group is collapsed", () => {
        /** @type {import('../../../src/js/shell/column_tree.js').ColGroupDef} */
        const nested = {
            groupId: "outer",
            headerName: "Outer",
            children: [
                {
                    groupId: "inner",
                    headerName: "Inner",
                    columnGroupShow: "open",
                    children: [
                        { field: "alwaysInner" },
                        {
                            field: "openInner",
                            columnGroupShow: "open",
                        },
                        {
                            field: "closedInner",
                            columnGroupShow: "closed",
                        },
                    ],
                },
                {
                    field: "outerClosed",
                    columnGroupShow: "closed",
                },
            ],
        };

        // Outer open, inner open → alwaysInner + openInner
        assert.deepEqual(
            visibleLeaves([nested], { outer: true, inner: true }).map(
                (c) => c.field,
            ),
            ["alwaysInner", "openInner"],
        );

        // Outer open, inner closed → alwaysInner + closedInner
        assert.deepEqual(
            visibleLeaves([nested], { outer: true, inner: false }).map(
                (c) => c.field,
            ),
            ["alwaysInner", "closedInner"],
        );

        // Outer collapsed → inner (open-only child of outer) hidden; outerClosed shown
        assert.deepEqual(
            visibleLeaves([nested], { outer: false, inner: true }).map(
                (c) => c.field,
            ),
            ["outerClosed"],
        );
    });
});

describe("createColumnTree", () => {
    it("initializes open state from openByDefault (default true)", () => {
        const tree = createColumnTree([
            {
                groupId: "g1",
                headerName: "G1",
                children: [{ field: "x" }],
            },
            {
                groupId: "g2",
                headerName: "G2",
                openByDefault: false,
                children: [{ field: "y", columnGroupShow: "open" }],
            },
        ]);

        assert.equal(tree.isOpen("g1"), true);
        assert.equal(tree.isOpen("g2"), false);
        assert.deepEqual(
            tree.visibleLeaves().map((c) => c.field),
            ["x"],
        );
    });

    it("setOpen and toggleOpen update visibility and persist state", () => {
        const tree = createColumnTree([geography]);

        assert.deepEqual(
            tree.visibleLeaves().map((c) => c.field),
            ["region", "city"],
        );

        tree.setOpen("geography", false);
        assert.equal(tree.isOpen("geography"), false);
        assert.deepEqual(
            tree.visibleLeaves().map((c) => c.field),
            ["region", "regionCode"],
        );

        tree.toggleOpen("geography");
        assert.equal(tree.isOpen("geography"), true);
        assert.deepEqual(
            tree.visibleLeaves().map((c) => c.field),
            ["region", "city"],
        );

        assert.deepEqual(tree.getOpenState(), { geography: true });
    });

    it("assigns groupId when missing so open state can be keyed", () => {
        const tree = createColumnTree([
            {
                headerName: "Metrics",
                children: [
                    { field: "sales" },
                    { field: "detail", columnGroupShow: "open" },
                ],
            },
        ]);
        const ids = Object.keys(tree.getOpenState());
        assert.equal(ids.length, 1);
        assert.equal(tree.isOpen(ids[0]), true);
        tree.setOpen(ids[0], false);
        assert.deepEqual(
            tree.visibleLeaves().map((c) => c.field),
            ["sales"],
        );
    });
});
