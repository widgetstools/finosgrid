// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — AG-style parameter theme API (tests)                              ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    paramToCssVar,
    serializeParamValue,
    createTheme,
    themeQuartz,
    resolveThemeParams,
    applyTheme,
    setThemeMode,
    getThemeMode,
} from "../../../src/js/shell/theme.js";

describe("paramToCssVar", () => {
    it("maps camelCase params to --ag-* kebab vars", () => {
        assert.equal(paramToCssVar("accentColor"), "--ag-accent-color");
        assert.equal(
            paramToCssVar("headerBackgroundColor"),
            "--ag-header-background-color",
        );
        assert.equal(paramToCssVar("spacing"), "--ag-spacing");
        assert.equal(
            paramToCssVar("browserColorScheme"),
            "--ag-browser-color-scheme",
        );
    });
});

describe("serializeParamValue", () => {
    it("treats bare numbers as px lengths", () => {
        assert.equal(serializeParamValue("spacing", 6), "6px");
        assert.equal(serializeParamValue("fontSize", 13), "13px");
    });

    it("passes color strings through", () => {
        assert.equal(
            serializeParamValue("accentColor", "#2196f3"),
            "#2196f3",
        );
    });

    it("resolves { ref } to var(--ag-*)", () => {
        assert.equal(
            serializeParamValue("borderColor", { ref: "accentColor" }),
            "var(--ag-accent-color)",
        );
    });

    it("supports color mix onto another color", () => {
        assert.equal(
            serializeParamValue("selectedRowBackgroundColor", {
                ref: "accentColor",
                mix: 0.15,
                onto: "backgroundColor",
            }),
            "color-mix(in srgb, var(--ag-accent-color) 15%, var(--ag-background-color))",
        );
    });

    it("supports googleFont objects", () => {
        assert.equal(
            serializeParamValue("fontFamily", { googleFont: "IBM Plex Sans" }),
            '"IBM Plex Sans", sans-serif',
        );
    });

    it("serializes boolean borders", () => {
        assert.equal(serializeParamValue("columnBorder", true), "1px solid var(--ag-border-color)");
        assert.equal(serializeParamValue("columnBorder", false), "none");
    });
});

describe("themeQuartz / withParams", () => {
    it("exposes Cursor Light defaults for light mode", () => {
        const params = resolveThemeParams(themeQuartz, "light");
        assert.equal(params.accentColor, "#3C7CAB");
        assert.equal(params.backgroundColor, "#FCFCFC");
        assert.equal(params.headerBackgroundColor, "#F3F3F3");
        assert.equal(params.borderColor, "#E4E4E4");
        assert.equal(params.foregroundColor, "#141414");
        assert.equal(params.oddRowBackgroundColor, "#F5F5F5");
        assert.equal(params.spacing, 6);
        assert.equal(params.fontSize, 13);
    });

    it("exposes Cursor Dark defaults for dark mode", () => {
        const params = resolveThemeParams(themeQuartz, "dark");
        assert.equal(params.backgroundColor, "#181818");
        assert.equal(params.foregroundColor, "#E4E4E4");
        assert.equal(params.headerBackgroundColor, "#141414");
        assert.equal(params.accentColor, "#81A1C1");
        assert.equal(params.borderColor, "#2B2B2B");
        assert.equal(params.selectedRowBackgroundColor, "#2A2A2A");
        assert.equal(params.browserColorScheme, "dark");
    });

    it("withParams merges without mutating the base theme", () => {
        const next = themeQuartz.withParams({ accentColor: "#ff0000" }, "light");
        assert.equal(
            resolveThemeParams(themeQuartz, "light").accentColor,
            "#3C7CAB",
        );
        assert.equal(
            resolveThemeParams(next, "light").accentColor,
            "#ff0000",
        );
        // Unspecified mode still inherits other modes from base
        assert.equal(
            resolveThemeParams(next, "dark").backgroundColor,
            "#181818",
        );
    });

    it("createTheme starts empty and accepts withParams", () => {
        const t = createTheme().withParams({ accentColor: "red" });
        assert.equal(resolveThemeParams(t, "light").accentColor, "red");
    });
});

describe("applyTheme / setThemeMode", () => {
    it("writes CSS custom properties and data-ag-theme-mode", () => {
        const el = {
            style: { setProperty(k, v) {
                this[k] = v;
            }},
            dataset: {},
            setAttribute(name, value) {
                this.attrs = this.attrs || {};
                this.attrs[name] = value;
            },
            getAttribute(name) {
                return this.attrs?.[name] ?? null;
            },
        };
        applyTheme(el, themeQuartz, "light");
        assert.equal(el.attrs["data-ag-theme-mode"], "light");
        assert.equal(el.style["--ag-accent-color"], "#3C7CAB");
        assert.equal(el.style["--ag-spacing"], "6px");
        assert.equal(el.style["--ag-background-color"], "#FCFCFC");

        setThemeMode(el, "dark");
        assert.equal(getThemeMode(el), "dark");
        assert.equal(el.attrs["data-ag-theme-mode"], "dark");
        assert.equal(el.style["--ag-background-color"], "#181818");
    });
});
