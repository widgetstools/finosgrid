// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — HeaderStyle → CSS                                                 ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    applyHeaderStyle,
    headerStyleToCss,
} from "../../../src/js/shell/header_style.js";

function fakeEl() {
    return { style: /** @type {Record<string, string>} */ ({}) };
}

describe("headerStyleToCss", () => {
    it("maps font and colors", () => {
        const css = headerStyleToCss({
            fontFamily: "IBM Plex Sans",
            fontSize: 14,
            fontWeight: 600,
            fontStyle: "italic",
            color: "#181d1f",
            backgroundColor: "#f5f7f7",
        });
        assert.equal(css.fontFamily, "IBM Plex Sans");
        assert.equal(css.fontSize, "14px");
        assert.equal(css.fontWeight, "600");
        assert.equal(css.fontStyle, "italic");
        assert.equal(css.color, "#181d1f");
        assert.equal(css.backgroundColor, "#f5f7f7");
    });

    it("keeps string fontSize as-is", () => {
        assert.equal(headerStyleToCss({ fontSize: "1rem" }).fontSize, "1rem");
    });

    it("maps per-side borders", () => {
        const css = headerStyleToCss({
            border: {
                top: { width: 2, color: "#2196f3", style: "solid" },
                right: { width: "3px", color: "red", style: "dashed" },
                bottom: { width: 1, color: "#dde2e6", style: "dotted" },
                left: { width: 0, color: "#000", style: "double" },
            },
        });
        assert.equal(css.borderTopWidth, "2px");
        assert.equal(css.borderTopColor, "#2196f3");
        assert.equal(css.borderTopStyle, "solid");
        assert.equal(css.borderRightWidth, "3px");
        assert.equal(css.borderRightColor, "red");
        assert.equal(css.borderRightStyle, "dashed");
        assert.equal(css.borderBottomWidth, "1px");
        assert.equal(css.borderBottomColor, "#dde2e6");
        assert.equal(css.borderBottomStyle, "dotted");
        assert.equal(css.borderLeftWidth, "0px");
        assert.equal(css.borderLeftColor, "#000");
        assert.equal(css.borderLeftStyle, "double");
    });

    it("hides a side when visible is false", () => {
        const css = headerStyleToCss({
            border: {
                top: {
                    width: 4,
                    color: "blue",
                    style: "solid",
                    visible: false,
                },
                left: { width: 1, style: "solid", visible: true },
            },
        });
        assert.equal(css.borderTopStyle, "none");
        assert.equal(css.borderTopWidth, "0px");
        assert.equal(css.borderLeftStyle, "solid");
        assert.equal(css.borderLeftWidth, "1px");
    });

    it("returns empty object for missing/empty style", () => {
        assert.deepEqual(headerStyleToCss(undefined), {});
        assert.deepEqual(headerStyleToCss({}), {});
    });
});

describe("applyHeaderStyle", () => {
    it("writes resolved CSS onto el.style", () => {
        const el = fakeEl();
        applyHeaderStyle(el, {
            color: "#111",
            border: {
                bottom: { width: 2, color: "#ccc", style: "solid" },
            },
        });
        assert.equal(el.style.color, "#111");
        assert.equal(el.style.borderBottomWidth, "2px");
        assert.equal(el.style.borderBottomColor, "#ccc");
        assert.equal(el.style.borderBottomStyle, "solid");
    });

    it("no-ops when el or style is missing", () => {
        assert.equal(applyHeaderStyle(null, { color: "red" }), undefined);
        const el = fakeEl();
        applyHeaderStyle(el, null);
        assert.deepEqual(el.style, {});
    });
});
