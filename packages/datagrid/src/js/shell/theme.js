// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — AG-style parameter theming (themeQuartz.withParams)               ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

/**
 * @typedef {Record<string, any>} ThemeParams
 * @typedef {{
 *   id?: string,
 *   params: { light?: ThemeParams, dark?: ThemeParams, [mode: string]: ThemeParams|undefined },
 *   withParams: (params: ThemeParams, mode?: string) => Theme,
 * }} Theme
 */

export const THEME_MODE_ATTR = "data-ag-theme-mode";

/**
 * camelCase → `--ag-kebab-case`
 * @param {string} name
 */
export function paramToCssVar(name) {
    const kebab = String(name)
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/_/g, "-")
        .toLowerCase();
    return `--ag-${kebab}`;
}

/**
 * @param {string} name
 * @param {any} value
 * @returns {string}
 */
export function serializeParamValue(name, value) {
    if (value == null) return "";
    if (typeof value === "boolean") {
        if (/Border$/i.test(name) || name === "columnBorder") {
            return value ? "1px solid var(--ag-border-color)" : "none";
        }
        return value ? "1" : "0";
    }
    if (typeof value === "number") {
        if (
            /ColorScheme$/i.test(name) ||
            /Weight$/i.test(name) ||
            /Scale$/i.test(name)
        ) {
            return String(value);
        }
        return `${value}px`;
    }
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
        return value
            .map((v) =>
                typeof v === "object" && v?.googleFont
                    ? `"${v.googleFont}"`
                    : String(v),
            )
            .join(", ");
    }
    if (typeof value === "object") {
        if (value.googleFont) {
            return `"${value.googleFont}", sans-serif`;
        }
        if (value.calc) {
            const expr = String(value.calc).replace(
                /\b([a-zA-Z][a-zA-Z0-9]*)\b/g,
                (tok) => {
                    if (
                        /^(px|em|rem|vh|vw|%|in|cm|mm|pt|pc|s|ms)$/i.test(tok)
                    ) {
                        return tok;
                    }
                    if (/^\d/.test(tok)) return tok;
                    return `var(${paramToCssVar(tok)})`;
                },
            );
            return `calc(${expr})`;
        }
        if (value.ref) {
            const refVar = `var(${paramToCssVar(value.ref)})`;
            if (value.mix != null) {
                const pct = Math.round(Number(value.mix) * 100);
                if (value.onto) {
                    return `color-mix(in srgb, ${refVar} ${pct}%, var(${paramToCssVar(value.onto)}))`;
                }
                return `color-mix(in srgb, ${refVar} ${pct}%, transparent)`;
            }
            return refVar;
        }
        if (
            value.width != null ||
            value.style != null ||
            value.color != null
        ) {
            const w =
                value.width == null
                    ? "1px"
                    : typeof value.width === "number"
                      ? `${value.width}px`
                      : String(value.width);
            const style = value.style || "solid";
            const color =
                value.color == null
                    ? "var(--ag-border-color)"
                    : typeof value.color === "object"
                      ? serializeParamValue("borderColor", value.color)
                      : String(value.color);
            return `${w} ${style} ${color}`;
        }
    }
    return String(value);
}

/**
 * Cursor Light v0.0.2 tokens (from Cursor.app theme-cursor).
 * Source: extensions/theme-cursor/themes/cursor-light-color-theme.json
 *
 * Grid borders/selection use solidized Cursor alpha tokens so dense tables stay readable.
 * @type {ThemeParams}
 */
export const QUARTZ_LIGHT = {
    accentColor: "#3C7CAB", // button.background / textLink.foreground
    backgroundColor: "#FCFCFC", // editor.background
    foregroundColor: "#141414", // editor.foreground
    borderColor: "#E4E4E4", // solidized sideBar.border (#14141413 on #FCFCFC)
    browserColorScheme: "light",
    chromeBackgroundColor: "#F3F3F3", // sideBar.background
    headerBackgroundColor: "#F3F3F3", // editorGroupHeader.tabsBackground
    headerTextColor: "#141414",
    headerFontSize: 13,
    headerFontWeight: 600,
    headerColumnBorder: true,
    cellTextColor: "#141414",
    fontSize: 13,
    fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    iconSize: 12,
    inputBackgroundColor: "#FFFFFF",
    inputBorderColor: "#D0D0D0", // solidized input.border (#14141426)
    oddRowBackgroundColor: "#F5F5F5",
    rowHoverColor: "#EFEFEF", // solidized list.hoverBackground
    selectedRowBackgroundColor: "#E8E8E8", // solidized list.activeSelection
    rangeSelectionBackgroundColor: "#DCDCDC", // solidized editor.selection
    rangeSelectionBorderColor: "#3C7CAB",
    focusShadow: "#3C7CAB",
    secondaryBackgroundColor: "#F3F3F3",
    mutedTextColor: "#5C5C5C", // solidized #141414BD
    disabledTextColor: "#9A9A9A", // solidized #1414145C
    popupBackgroundColor: "#F3F3F3",
    popupShadow: "0 4px 16px #1414141E",
    pinShadowColor: "#1414141E",
    positiveColor: "#0B6E4F",
    negativeColor: "#CF2D56", // errorForeground
    wrapperBorderRadius: 0,
    spacing: 6,
    columnBorder: true,
};

/**
 * Cursor Dark Anysphere v0.0.3 tokens (from Cursor.app theme-cursor).
 * Source: extensions/theme-cursor/themes/cursor-dark-color-theme.json
 *
 * Grid cell borders use a solidized form of Cursor's `#F0F0F013` /
 * `#F0F0F030` chrome borders so dense table lines stay visible.
 * @type {ThemeParams}
 */
export const QUARTZ_DARK = {
    accentColor: "#81A1C1", // button.background / textLink.foreground
    backgroundColor: "#181818", // editor.background
    foregroundColor: "#E4E4E4", // slightly softer than pure #F0F0F0 for dense cells
    borderColor: "#2B2B2B", // solidized sideBar.border (#F0F0F013 on #181818)
    browserColorScheme: "dark",
    chromeBackgroundColor: "#141414", // sideBar.background
    headerBackgroundColor: "#141414", // editorGroupHeader.tabsBackground
    headerTextColor: "#F0F0F0",
    headerFontSize: 13,
    headerFontWeight: 600,
    headerColumnBorder: true,
    cellTextColor: "#E4E4E4",
    fontSize: 13,
    fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    iconSize: 12,
    // Inset inputs: editor surface sitting in chrome (matches Cursor search/input wells)
    inputBackgroundColor: "#181818",
    inputBorderColor: "#3A3A3A", // solidized input.border (#F0F0F013)
    oddRowBackgroundColor: "#1C1C1C",
    rowHoverColor: "#252525", // solidized list.hoverBackground (#F0F0F011)
    selectedRowBackgroundColor: "#2A2A2A", // solidized list.activeSelection (#F0F0F01E)
    rangeSelectionBackgroundColor: "#333333", // solidized editor.selection (#40404099)
    rangeSelectionBorderColor: "#81A1C1",
    focusShadow: "#81A1C1",
    secondaryBackgroundColor: "#141414",
    mutedTextColor: "#A0A0A0", // solidized #F0F0F0BD
    disabledTextColor: "#6A6A6A", // solidized #F0F0F05C
    popupBackgroundColor: "#141414",
    popupShadow: "0 4px 16px #00000066",
    pinShadowColor: "#00000066",
    // Cursor error / success accents for signed values
    positiveColor: "#A3BE8C",
    negativeColor: "#E34671", // errorForeground
    wrapperBorderRadius: 0,
    spacing: 6,
    columnBorder: true,
};

/**
 * @param {Partial<{ id: string, params: Theme['params'] }>} [init]
 * @returns {Theme}
 */
export function createTheme(init = {}) {
    /** @type {Theme['params']} */
    const params = {
        light: { ...(init.params?.light || {}) },
        dark: { ...(init.params?.dark || {}) },
    };
    for (const [k, v] of Object.entries(init.params || {})) {
        if (k === "light" || k === "dark") continue;
        params[k] = { ...(v || {}) };
    }

    /** @type {Theme} */
    const theme = {
        id: init.id || "custom",
        params,
        withParams(nextParams, mode) {
            const m = mode || "light";
            return createTheme({
                id: theme.id,
                params: {
                    ...params,
                    [m]: {
                        ...(params[m] || params.light || {}),
                        ...nextParams,
                    },
                },
            });
        },
    };
    return theme;
}

/** Built-in theme with Cursor Light + Cursor Dark schemes (AG Theme API shape). */
export const themeQuartz = createTheme({
    id: "quartz",
    params: {
        light: { ...QUARTZ_LIGHT },
        dark: { ...QUARTZ_DARK },
    },
});

/**
 * @param {Theme|null|undefined} theme
 * @param {string} [mode]
 * @returns {ThemeParams}
 */
export function resolveThemeParams(theme, mode = "light") {
    if (!theme) return { ...QUARTZ_LIGHT };
    const m = mode || "light";
    const base = theme.params?.light || {};
    const overlay = theme.params?.[m] || {};
    if (m === "light") return { ...base, ...overlay };
    return { ...base, ...overlay };
}

/**
 * Apply resolved params as CSS custom properties on an element.
 * @param {any} el
 * @param {Theme} theme
 * @param {string} [mode]
 */
export function applyTheme(el, theme, mode = "light") {
    if (!el) return;
    const m = mode || "light";
    const params = resolveThemeParams(theme, m);
    el.__fgTheme = theme;
    el.__fgThemeMode = m;
    el.setAttribute?.(THEME_MODE_ATTR, m);
    if (el.dataset) el.dataset.agThemeMode = m;

    for (const [key, value] of Object.entries(params)) {
        const cssVar = paramToCssVar(key);
        const serialized = serializeParamValue(key, value);
        if (serialized === "") continue;
        el.style.setProperty(cssVar, serialized);
    }

    const bg = serializeParamValue("backgroundColor", params.backgroundColor);
    const fg = serializeParamValue(
        "foregroundColor",
        params.foregroundColor ?? params.cellTextColor,
    );
    const border = serializeParamValue("borderColor", params.borderColor);
    const accent = serializeParamValue("accentColor", params.accentColor);
    const headerBg = serializeParamValue(
        "headerBackgroundColor",
        params.headerBackgroundColor,
    );
    const chromeBg = serializeParamValue(
        "chromeBackgroundColor",
        params.chromeBackgroundColor ?? params.headerBackgroundColor,
    );
    const odd = serializeParamValue(
        "oddRowBackgroundColor",
        params.oddRowBackgroundColor,
    );
    const secondary = serializeParamValue(
        "secondaryBackgroundColor",
        params.secondaryBackgroundColor ?? params.headerBackgroundColor,
    );
    const muted = serializeParamValue(
        "mutedTextColor",
        params.mutedTextColor ?? params.foregroundColor,
    );
    const inputBg = serializeParamValue(
        "inputBackgroundColor",
        params.inputBackgroundColor ?? params.backgroundColor,
    );
    const inputBorder = serializeParamValue(
        "inputBorderColor",
        params.inputBorderColor ?? params.borderColor,
    );
    const selected = serializeParamValue(
        "selectedRowBackgroundColor",
        params.selectedRowBackgroundColor,
    );
    const rangeBg = serializeParamValue(
        "rangeSelectionBackgroundColor",
        params.rangeSelectionBackgroundColor,
    );
    const rangeBorder = serializeParamValue(
        "rangeSelectionBorderColor",
        params.rangeSelectionBorderColor ?? params.accentColor,
    );
    const focus = serializeParamValue(
        "focusShadow",
        params.focusShadow ?? params.accentColor,
    );
    const hover = serializeParamValue("rowHoverColor", params.rowHoverColor);
    const popupBg = serializeParamValue(
        "popupBackgroundColor",
        params.popupBackgroundColor ?? params.backgroundColor,
    );
    const pinShadow = serializeParamValue(
        "pinShadowColor",
        params.pinShadowColor,
    );
    const disabled = serializeParamValue(
        "disabledTextColor",
        params.disabledTextColor ?? params.mutedTextColor,
    );
    const positive = serializeParamValue(
        "positiveColor",
        params.positiveColor ?? "#0B6E4F",
    );
    const negative = serializeParamValue(
        "negativeColor",
        params.negativeColor ?? "#CF2D56",
    );

    el.style.setProperty("--fg-background", bg);
    el.style.setProperty("--fg-foreground", fg);
    el.style.setProperty("--fg-border", border);
    el.style.setProperty("--fg-accent", accent);
    el.style.setProperty("--fg-header-bg", headerBg);
    el.style.setProperty("--fg-chrome-bg", chromeBg);
    el.style.setProperty("--fg-odd-row", odd);
    el.style.setProperty("--fg-secondary-bg", secondary);
    el.style.setProperty("--fg-muted", muted);
    el.style.setProperty("--fg-disabled", disabled);
    el.style.setProperty("--fg-input-bg", inputBg);
    el.style.setProperty("--fg-input-border", inputBorder);
    el.style.setProperty("--fg-selected-row", selected);
    el.style.setProperty("--fg-range-bg", rangeBg);
    el.style.setProperty("--fg-range-border", rangeBorder);
    el.style.setProperty("--fg-focus", focus);
    el.style.setProperty("--fg-row-hover", hover);
    el.style.setProperty("--fg-popup-bg", popupBg);
    el.style.setProperty("--fg-pin-shadow", pinShadow);
    el.style.setProperty("--fg-positive", positive);
    el.style.setProperty("--fg-negative", negative);
    // Perspective / regular-table signed number hooks
    el.style.setProperty("--rt-pos-cell--color", positive);
    el.style.setProperty("--rt-neg-cell--color", negative);

    if (params.fontSize != null) {
        el.style.setProperty(
            "--fg-font-size",
            serializeParamValue("fontSize", params.fontSize),
        );
    }
    if (params.headerFontSize != null) {
        el.style.setProperty(
            "--fg-header-font-size",
            serializeParamValue("headerFontSize", params.headerFontSize),
        );
    }
    if (params.spacing != null) {
        el.style.setProperty(
            "--fg-spacing",
            serializeParamValue("spacing", params.spacing),
        );
    }
    if (params.fontFamily != null) {
        el.style.setProperty(
            "--fg-font-family",
            serializeParamValue("fontFamily", params.fontFamily),
        );
    }
    if (params.popupShadow != null) {
        el.style.setProperty(
            "--fg-popup-shadow",
            serializeParamValue("popupShadow", params.popupShadow),
        );
    }
    if (params.browserColorScheme) {
        el.style.setProperty("color-scheme", String(params.browserColorScheme));
    }
}

/**
 * @param {any} el
 * @param {string} mode
 * @param {Theme} [theme]
 */
export function setThemeMode(el, mode, theme) {
    if (!el) return;
    const m = mode === "dark" ? "dark" : "light";
    const t = theme || el.__fgTheme;
    if (t) {
        applyTheme(el, t, m);
        return;
    }
    el.__fgThemeMode = m;
    el.setAttribute?.(THEME_MODE_ATTR, m);
    if (el.dataset) el.dataset.agThemeMode = m;
}

/**
 * @param {any} el
 * @returns {string}
 */
export function getThemeMode(el) {
    const fromAttr = el?.getAttribute?.(THEME_MODE_ATTR);
    if (fromAttr) return fromAttr;
    return el?.dataset?.agThemeMode || "light";
}

/**
 * @param {any} raw
 * @returns {Theme}
 */
export function normalizeTheme(raw) {
    if (raw && typeof raw.withParams === "function" && raw.params) {
        return raw;
    }
    return themeQuartz;
}
