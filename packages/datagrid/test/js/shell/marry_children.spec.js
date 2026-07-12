// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — marryChildren move constraints                                    ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canMoveColumnWithMarryChildren } from "../../../src/js/shell/marry_children.js";

const defs = [
    {
        groupId: "athlete",
        headerName: "Athlete Details",
        marryChildren: true,
        children: [
            { field: "athlete" },
            { field: "country" },
            { field: "age" },
        ],
    },
    { field: "year" },
    {
        groupId: "results",
        headerName: "Sports Results",
        marryChildren: true,
        children: [
            { field: "gold" },
            { field: "silver" },
            { field: "bronze" },
        ],
    },
];

const order = [
    "athlete",
    "country",
    "age",
    "year",
    "gold",
    "silver",
    "bronze",
];

describe("canMoveColumnWithMarryChildren", () => {
    it("allows reorder inside a married group", () => {
        assert.equal(
            canMoveColumnWithMarryChildren({
                defs,
                order,
                field: "athlete",
                beforeField: "age",
            }),
            true,
        );
    });

    it("rejects dragging a child out of a married group", () => {
        // Place athlete after `year` → breaks athlete/country/age contiguity
        assert.equal(
            canMoveColumnWithMarryChildren({
                defs,
                order,
                field: "athlete",
                beforeField: "gold",
            }),
            false,
        );
    });

    it("rejects inserting an outsider into the middle of a married group", () => {
        assert.equal(
            canMoveColumnWithMarryChildren({
                defs,
                order,
                field: "year",
                beforeField: "country",
            }),
            false,
        );
    });

    it("allows placing a column between married groups", () => {
        // Move year to end (after bronze) — still between? actually after results
        // Move year before gold (between athlete group and results) — year is already before gold
        // Move gold before year would pull gold out — reject
        assert.equal(
            canMoveColumnWithMarryChildren({
                defs,
                order,
                field: "year",
                beforeField: "gold",
            }),
            true,
        );
    });
});
