// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — Lucide icons (vanilla SVG)                                        ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import {
    ChevronRight,
    ChevronDown,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    Pin,
    PinOff,
    GripVertical,
} from "lucide";

/**
 * @param {import('lucide').IconNode} iconNode
 * @param {{ size?: number, className?: string, strokeWidth?: number }} [opts]
 * @returns {SVGSVGElement}
 */
export function lucideIcon(iconNode, opts = {}) {
    const size = opts.size ?? 14;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", String(opts.strokeWidth ?? 2));
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    if (opts.className) svg.setAttribute("class", opts.className);
    for (const [tag, attrs] of iconNode) {
        const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
        for (const [k, v] of Object.entries(attrs || {})) {
            el.setAttribute(k, String(v));
        }
        svg.appendChild(el);
    }
    return svg;
}

export function iconChevronRight(opts) {
    return lucideIcon(ChevronRight, opts);
}
export function iconChevronDown(opts) {
    return lucideIcon(ChevronDown, opts);
}
export function iconArrowUp(opts) {
    return lucideIcon(ArrowUp, opts);
}
export function iconArrowDown(opts) {
    return lucideIcon(ArrowDown, opts);
}
export function iconArrowUpDown(opts) {
    return lucideIcon(ArrowUpDown, opts);
}
export function iconPin(opts) {
    return lucideIcon(Pin, opts);
}
export function iconPinOff(opts) {
    return lucideIcon(PinOff, opts);
}
export function iconGrip(opts) {
    return lucideIcon(GripVertical, opts);
}
