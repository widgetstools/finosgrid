// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — header layout unit tests                                          ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    computeHeaderLayout,
    maxGroupDepth,
} from "../../../src/js/shell/header_layout.js";

const tree = [
    {
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
                    { field: "a" },
                    { field: "b", columnGroupShow: "open" },
                ],
            },
            { field: "c", columnGroupShow: "closed" },
            { field: "d" },
        ],
    },
    { field: "top" },
];

describe("maxGroupDepth", () => {
    it("counts nested groups", () => {
        assert.equal(maxGroupDepth(tree), 2);
        assert.equal(maxGroupDepth([{ field: "x" }]), 0);
    });
});

describe("computeHeaderLayout", () => {
    it("builds group rows and leaves when outer+inner open", () => {
        const { leaves, groupRows } = computeHeaderLayout(tree, {
            outer: true,
            inner: true,
        });
        assert.deepEqual(
            leaves.map((l) => l.field),
            ["a", "b", "d", "top"],
        );
        assert.equal(groupRows.length, 2);
        assert.equal(groupRows[0][0].group.groupId, "outer");
        assert.equal(groupRows[0][0].span, 3);
        assert.equal(groupRows[1][0].group.groupId, "inner");
        assert.equal(groupRows[1][0].span, 2);
    });

    it("hides inner when outer collapsed", () => {
        const { leaves, groupRows } = computeHeaderLayout(tree, {
            outer: false,
            inner: true,
        });
        assert.deepEqual(
            leaves.map((l) => l.field),
            ["c", "d", "top"],
        );
        assert.equal(groupRows[0][0].span, 2);
    });
});
