// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — GridApi-facing column APIs (DOM-less)                             ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createColumnTree } from "../../../src/js/shell/column_tree.js";

describe("GridApi column-group surface (via column tree)", () => {
    it("matches AG setColumnGroupOpened / getColumnGroupState / reset", () => {
        const tree = createColumnTree({
            columnDefs: [
                {
                    groupId: "medals",
                    headerName: "Medal Details",
                    openByDefault: true,
                    children: [
                        { field: "bronze", columnGroupShow: "open" },
                        { field: "silver", columnGroupShow: "open" },
                        { field: "total", columnGroupShow: "closed" },
                    ],
                },
            ],
        });

        assert.deepEqual(
            tree.visibleLeaves().map((c) => c.field),
            ["bronze", "silver"],
        );

        // api.setColumnGroupOpened('medals', false)
        tree.setOpen("medals", false);
        assert.deepEqual(
            tree.visibleLeaves().map((c) => c.field),
            ["total"],
        );
        assert.deepEqual(tree.getColumnGroupState(), [
            { groupId: "medals", open: false },
        ]);

        // api.setColumnGroupState([{ groupId, open }])
        tree.setColumnGroupState([{ groupId: "medals", open: true }]);
        assert.deepEqual(
            tree.visibleLeaves().map((c) => c.field),
            ["bronze", "silver"],
        );

        tree.setOpen("medals", false);
        tree.resetColumnGroupState();
        assert.equal(tree.isOpen("medals"), true);
    });
});
