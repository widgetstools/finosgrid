import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    flattenPosition,
    flattenPositions,
} from "../src/flatten.js";
import {
    buildFieldCatalog,
    buildColumnDefs,
    toPerspectiveSchema,
    generatePosition,
    createRng,
} from "../src/schema.js";

describe("flattenPositions", () => {
    it("flattens nested JSON to dot paths", () => {
        const flat = flattenPosition({
            positionId: "FI-1",
            risk: { dv01: 12.5, keyRate: { kr2y: 1 } },
        });
        assert.equal(flat.positionId, "FI-1");
        assert.equal(flat["risk.dv01"], 12.5);
        assert.equal(flat["risk.keyRate.kr2y"], 1);
    });

    it("maps arrays of positions", () => {
        const out = flattenPositions([
            { positionId: "A", prices: { mid: 1 } },
            { positionId: "B", prices: { mid: 2 } },
        ]);
        assert.equal(out[0]["prices.mid"], 1);
        assert.equal(out[1]["prices.mid"], 2);
    });
});

describe("field catalog", () => {
    it("provides at least 300 leaf fields", () => {
        const fields = buildFieldCatalog(300);
        assert.ok(fields.length >= 300);
        const schema = toPerspectiveSchema(fields);
        assert.equal(Object.keys(schema).length, fields.length);
        assert.equal(schema.positionId, "string");
        assert.equal(schema["risk.dv01"], "float");
    });

    it("builds nested columnDefs", () => {
        const defs = buildColumnDefs(buildFieldCatalog(300));
        assert.ok(defs.some((d) => d.field === "positionId"));
        assert.ok(defs.some((d) => d.groupId === "instrument" || d.headerName));
        const instrument = defs.find((d) => d.groupId === "instrument");
        assert.ok(instrument?.children?.length);
    });

    it("generatePosition fills catalog paths", () => {
        const fields = buildFieldCatalog(300);
        const row = generatePosition(7, fields, createRng(1));
        const flat = flattenPosition(row);
        assert.equal(flat.positionId, "FI-000007");
        assert.ok(flat["instrument.isin"]);
        assert.ok(typeof flat["risk.dv01"] === "number");
        // Most catalog fields present when flattened
        let hit = 0;
        for (const f of fields) {
            if (f.path in flat) hit += 1;
        }
        assert.ok(hit >= fields.length * 0.95, `only ${hit}/${fields.length}`);
    });
});
