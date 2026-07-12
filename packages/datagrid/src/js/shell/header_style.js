// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — apply HeaderStyle (font, colors, per-side borders) to cells       ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

/**
 * @typedef {import('./column_tree.js').HeaderStyle} HeaderStyle
 * @typedef {import('./column_tree.js').HeaderBorderSide} HeaderBorderSide
 */

/**
 * @param {string|number|undefined} value
 * @param {string} [unit]
 * @returns {string|undefined}
 */
function cssSize(value, unit = "px") {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    if (typeof value === "number") {
        return `${value}${unit}`;
    }
    return String(value);
}

/**
 * @param {HeaderBorderSide|undefined} side
 * @param {'Top'|'Right'|'Bottom'|'Left'} edge
 * @param {Record<string, string>} out
 */
function applyBorderSide(side, edge, out) {
    if (!side) {
        return;
    }
    if (side.visible === false) {
        out[`border${edge}Style`] = "none";
        out[`border${edge}Width`] = "0px";
        if (side.color !== undefined) {
            out[`border${edge}Color`] = String(side.color);
        }
        return;
    }
    if (side.width !== undefined) {
        out[`border${edge}Width`] = cssSize(side.width);
    }
    if (side.color !== undefined) {
        out[`border${edge}Color`] = String(side.color);
    }
    if (side.style !== undefined) {
        out[`border${edge}Style`] = side.style;
    }
}

/**
 * Resolve a HeaderStyle into camelCase CSS property → value pairs
 * suitable for `el.style` or Object.assign.
 *
 * @param {HeaderStyle|null|undefined} style
 * @returns {Record<string, string>}
 */
export function headerStyleToCss(style) {
    /** @type {Record<string, string>} */
    const out = {};
    if (!style) {
        return out;
    }

    if (style.fontFamily !== undefined) {
        out.fontFamily = String(style.fontFamily);
    }
    const fontSize = cssSize(style.fontSize);
    if (fontSize !== undefined) {
        out.fontSize = fontSize;
    }
    if (style.fontWeight !== undefined) {
        out.fontWeight = String(style.fontWeight);
    }
    if (style.fontStyle !== undefined) {
        out.fontStyle = style.fontStyle;
    }
    if (style.color !== undefined) {
        out.color = String(style.color);
    }
    if (style.backgroundColor !== undefined) {
        out.backgroundColor = String(style.backgroundColor);
    }

    const border = style.border;
    if (border) {
        applyBorderSide(border.top, "Top", out);
        applyBorderSide(border.right, "Right", out);
        applyBorderSide(border.bottom, "Bottom", out);
        applyBorderSide(border.left, "Left", out);
    }

    return out;
}

/**
 * Apply HeaderStyle onto an element's inline style.
 *
 * @param {{ style: Record<string, string>|CSSStyleDeclaration }|null|undefined} el
 * @param {HeaderStyle|null|undefined} style
 */
export function applyHeaderStyle(el, style) {
    if (!el?.style || !style) {
        return;
    }
    const css = headerStyleToCss(style);
    for (const [key, value] of Object.entries(css)) {
        el.style[key] = value;
    }
}
