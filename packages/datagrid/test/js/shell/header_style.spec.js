// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — AG HeaderStyle / HeaderClass                                      ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    applyHeaderStyle,
    applyHeaderClass,
    headerStyleToCss,
} from "../../../src/js/shell/header_style.js";

function fakeEl() {
    const classes = new Set();
    return {
        style: /** @type {Record<string, string|number>} */ ({}),
        classList: {
            add: (c) => classes.add(c),
            has: (c) => classes.has(c),
            _all: classes,
        },
    };
}

describe("headerStyleToCss (AG flat HeaderStyle)", () => {
    it("passes through camelCase CSS properties", () => {
        const css = headerStyleToCss({
            color: "white",
            backgroundColor: "cadetblue",
            borderBottom: "2px solid #2196f3",
            fontWeight: 600,
        });
        assert.equal(css.color, "white");
        assert.equal(css.backgroundColor, "cadetblue");
        assert.equal(css.borderBottom, "2px solid #2196f3");
        assert.equal(css.fontWeight, 600);
    });

    it("resolves headerStyle functions like AG Grid", () => {
        const css = headerStyleToCss(
            (params) => ({
                backgroundColor: params.floatingFilter ? "blue" : "teal",
            }),
            { floatingFilter: false },
        );
        assert.equal(css.backgroundColor, "teal");
    });

    it("returns empty object for missing style", () => {
        assert.deepEqual(headerStyleToCss(undefined), {});
    });
});

describe("applyHeaderStyle / applyHeaderClass", () => {
    it("writes flat CSS onto el.style", () => {
        const el = fakeEl();
        applyHeaderStyle(el, {
            color: "#111",
            borderLeftWidth: "2px",
            borderLeftStyle: "solid",
            borderLeftColor: "#c62828",
        });
        assert.equal(el.style.color, "#111");
        assert.equal(el.style.borderLeftWidth, "2px");
    });

    it("applies headerClass string and array", () => {
        const el = fakeEl();
        applyHeaderClass(el, "sport-header");
        assert.equal(el.classList.has("sport-header"), true);
        applyHeaderClass(el, ["a", "b"]);
        assert.equal(el.classList.has("a"), true);
        assert.equal(el.classList.has("b"), true);
    });
});
