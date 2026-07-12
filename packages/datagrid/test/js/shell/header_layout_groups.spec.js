// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — isGroupExpandable + pin-split group rows                          ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    isGroupExpandable,
    groupRowsForOrderedLeaves,
} from "../../../src/js/shell/header_layout.js";

describe("isGroupExpandable", () => {
    it("is false when no child uses columnGroupShow open/closed", () => {
        assert.equal(
            isGroupExpandable({
                groupId: "g",
                headerName: "G",
                children: [{ field: "a" }, { field: "b" }],
            }),
            false,
        );
    });

    it("is true for medals-style open/closed with always-visible sibling", () => {
        assert.equal(
            isGroupExpandable({
                groupId: "medals",
                headerName: "Medals",
                children: [
                    { field: "total", columnGroupShow: "closed" },
                    { field: "gold", columnGroupShow: "open" },
                    { field: "silver", columnGroupShow: "open" },
                ],
            }),
            true,
        );
    });

    it("is false when open state would leave zero leaves", () => {
        // Only closed children — expanding empties the group
        assert.equal(
            isGroupExpandable({
                groupId: "bad",
                headerName: "Bad",
                children: [{ field: "x", columnGroupShow: "closed" }],
            }),
            false,
        );
    });
});

describe("groupRowsForOrderedLeaves pin split", () => {
    const defs = [
        {
            groupId: "sports",
            headerName: "Sports Results",
            children: [
                { field: "gold" },
                { field: "silver" },
                { field: "bronze" },
            ],
        },
    ];
    const leaves = [
        { field: "gold" },
        { field: "silver" },
        { field: "bronze" },
    ];

    it("keeps one segment when all leaves share pin", () => {
        const rows = groupRowsForOrderedLeaves(leaves, defs, {}, () => null);
        assert.equal(rows[0].length, 1);
        assert.equal(rows[0][0].span, 3);
        assert.equal(rows[0][0].pin, null);
    });

    it("splits the group when a leaf is pinned left (AG pin break)", () => {
        const getPin = (f) => (f === "gold" ? "left" : null);
        const rows = groupRowsForOrderedLeaves(leaves, defs, {}, getPin);
        assert.equal(rows[0].length, 2);
        assert.equal(rows[0][0].group.groupId, "sports");
        assert.equal(rows[0][0].span, 1);
        assert.equal(rows[0][0].pin, "left");
        assert.equal(rows[0][1].group.groupId, "sports");
        assert.equal(rows[0][1].span, 2);
        assert.equal(rows[0][1].pin, null);
    });
});
