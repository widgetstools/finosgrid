// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — AG Grid HeaderStyle / HeaderClass application                     ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

/**
 * @typedef {import('./ag_types.js').HeaderStyle} HeaderStyle
 * @typedef {import('./ag_types.js').HeaderClass} HeaderClass
 * @typedef {import('./ag_types.js').AbstractColDef} AbstractColDef
 */

/**
 * Resolve AG `headerStyle` (object or function) to a flat CSS property map.
 * Numbers are left as-is for assignment onto `el.style` (browser coerces).
 *
 * @param {HeaderStyle|function|null|undefined} style
 * @param {object} [params]
 * @returns {HeaderStyle}
 */
export function headerStyleToCss(style, params = {}) {
    if (!style) {
        return {};
    }
    if (typeof style === "function") {
        const resolved = style({
            floatingFilter: false,
            colDef: params.colDef,
            column: params.column ?? null,
            columnGroup: params.columnGroup ?? null,
            ...params,
        });
        return resolved && typeof resolved === "object" ? { ...resolved } : {};
    }
    return { ...style };
}

/**
 * Apply AG Grid `headerStyle` onto an element.
 *
 * @param {{ style: CSSStyleDeclaration|Record<string, string|number>, classList?: DOMTokenList }|null|undefined} el
 * @param {HeaderStyle|function|null|undefined} style
 * @param {object} [params]
 */
export function applyHeaderStyle(el, style, params) {
    if (!el?.style || !style) {
        return;
    }
    const css = headerStyleToCss(style, params);
    for (const [key, value] of Object.entries(css)) {
        if (value === undefined || value === null) continue;
        el.style[key] = value;
    }
}

/**
 * Apply AG Grid `headerClass` (string | string[] | function).
 *
 * @param {{ classList: DOMTokenList }|null|undefined} el
 * @param {HeaderClass|function|null|undefined} headerClass
 * @param {object} [params]
 */
export function applyHeaderClass(el, headerClass, params = {}) {
    if (!el?.classList || !headerClass) {
        return;
    }
    let value = headerClass;
    if (typeof headerClass === "function") {
        value = headerClass({
            floatingFilter: false,
            colDef: params.colDef,
            column: params.column ?? null,
            columnGroup: params.columnGroup ?? null,
            ...params,
        });
    }
    if (!value) return;
    const list = Array.isArray(value) ? value : String(value).split(/\s+/);
    for (const cls of list) {
        if (cls) el.classList.add(cls);
    }
}

/**
 * @param {*} el
 * @param {AbstractColDef} [colDef]
 * @param {object} [params]
 */
export function applyColDefHeaderChrome(el, colDef, params = {}) {
    if (!el || !colDef) return;
    const p = { ...params, colDef };
    applyHeaderStyle(el, colDef.headerStyle, p);
    applyHeaderClass(el, colDef.headerClass, p);
}
