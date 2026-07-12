// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — column interaction state (resize / drag / sort / pin / filter)    ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { leafField } from "./column_tree.js";

/**
 * @typedef {'asc'|'desc'|null} SortDir
 * @typedef {'left'|'right'|null} PinDir
 */

/**
 * Mutable AG-like column chrome state layered on top of ColDefs.
 */
export function createColumnState(initialDefs = []) {
    /** @type {string[]} */
    let order = [];
    /** @type {Map<string, number>} */
    const widths = new Map();
    /** @type {Map<string, PinDir>} */
    const pinned = new Map();
    /** @type {{ colId: string|null, sort: SortDir }} */
    let sortModel = { colId: null, sort: null };
    /** @type {Map<string, string>} */
    const filterModel = new Map();

    function seedFromDefs(defs) {
        const fields = [];
        const walk = (nodes) => {
            for (const n of nodes || []) {
                if (Array.isArray(n?.children)) walk(n.children);
                else {
                    const f = leafField(n);
                    if (f) fields.push(f);
                }
            }
        };
        walk(defs);
        for (const f of fields) {
            if (!order.includes(f)) order.push(f);
            const def = findDef(defs, f);
            if (def?.width && !widths.has(f)) widths.set(f, def.width);
            if (def?.initialWidth && !widths.has(f)) {
                widths.set(f, def.initialWidth);
            }
            if (def?.pinned && !pinned.has(f)) {
                pinned.set(f, def.pinned === true ? "left" : def.pinned);
            }
        }
        // Drop order entries that no longer exist
        order = order.filter((f) => fields.includes(f));
        for (const f of fields) {
            if (!order.includes(f)) order.push(f);
        }
    }

    function findDef(defs, field) {
        for (const n of defs || []) {
            if (Array.isArray(n?.children)) {
                const hit = findDef(n.children, field);
                if (hit) return hit;
            } else if (leafField(n) === field) {
                return n;
            }
        }
        return null;
    }

    seedFromDefs(initialDefs);

    return {
        seedFromDefs,

        getWidth(field, fallback = 120) {
            return widths.get(field) ?? fallback;
        },

        setWidth(field, width, minWidth = 60, maxWidth = 800) {
            const w = Math.max(minWidth, Math.min(maxWidth, Math.round(width)));
            widths.set(field, w);
            return w;
        },

        getWidths() {
            return Object.fromEntries(widths);
        },

        setWidths(next) {
            for (const [f, w] of Object.entries(next || {})) {
                if (typeof w === "number" && w > 0) widths.set(f, w);
            }
        },

        getPin(field) {
            return pinned.get(field) ?? null;
        },

        setPin(field, dir) {
            if (!dir) pinned.delete(field);
            else pinned.set(field, dir);
        },

        getSort() {
            return { ...sortModel };
        },

        /**
         * Cycle: null → asc → desc → null
         * @param {string} colId
         */
        cycleSort(colId) {
            if (sortModel.colId !== colId) {
                sortModel = { colId, sort: "asc" };
            } else if (sortModel.sort === "asc") {
                sortModel = { colId, sort: "desc" };
            } else {
                sortModel = { colId: null, sort: null };
            }
            return { ...sortModel };
        },

        setSort(colId, sort) {
            sortModel = { colId: sort ? colId : null, sort: sort || null };
        },

        getFilter(field) {
            return filterModel.get(field) ?? "";
        },

        setFilter(field, value) {
            if (value == null || value === "") filterModel.delete(field);
            else filterModel.set(field, String(value));
        },

        getFilterModel() {
            return Object.fromEntries(filterModel);
        },

        /**
         * Reorder: move `field` before `beforeField` (or to end if null).
         */
        moveColumn(field, beforeField) {
            order = order.filter((f) => f !== field);
            if (!beforeField) {
                order.push(field);
            } else {
                const i = order.indexOf(beforeField);
                if (i < 0) order.push(field);
                else order.splice(i, 0, field);
            }
        },

        getOrder() {
            return order.slice();
        },

        /**
         * Order visible fields: left-pinned (order), center, right-pinned.
         * @param {string[]} visibleFields
         */
        orderVisible(visibleFields) {
            const set = new Set(visibleFields);
            const ordered = order.filter((f) => set.has(f));
            for (const f of visibleFields) {
                if (!ordered.includes(f)) ordered.push(f);
            }
            const left = ordered.filter((f) => pinned.get(f) === "left");
            const right = ordered.filter((f) => pinned.get(f) === "right");
            const center = ordered.filter(
                (f) => pinned.get(f) !== "left" && pinned.get(f) !== "right",
            );
            return [...left, ...center, ...right];
        },
    };
}

/**
 * Apply text filters + sort to column-oriented data.
 * Fallback for `rowData` only — when a Perspective `table` / `loadColumns`
 * engine path is active, sort/filter run in the View instead.
 *
 * @param {string[]} fields
 * @param {Record<string, any[]>} columns
 * @param {ReturnType<typeof createColumnState>} state
 */
export function applyColumnStateToData(fields, columns, state) {
    const n = fields.length
        ? Math.max(0, ...fields.map((f) => columns[f]?.length || 0))
        : 0;
    let indices = Array.from({ length: n }, (_, i) => i);

    const filters = state.getFilterModel();
    for (const [field, raw] of Object.entries(filters)) {
        if (!raw || !fields.includes(field)) continue;
        const needle = String(raw).toLowerCase();
        indices = indices.filter((i) => {
            const v = columns[field]?.[i];
            return String(v ?? "")
                .toLowerCase()
                .includes(needle);
        });
    }

    const { colId, sort } = state.getSort();
    if (colId && sort && fields.includes(colId)) {
        indices.sort((a, b) => {
            const av = columns[colId]?.[a];
            const bv = columns[colId]?.[b];
            let cmp = 0;
            if (av == null && bv == null) cmp = 0;
            else if (av == null) cmp = -1;
            else if (bv == null) cmp = 1;
            else if (typeof av === "number" && typeof bv === "number") {
                cmp = av - bv;
            } else {
                cmp = String(av).localeCompare(String(bv), undefined, {
                    numeric: true,
                    sensitivity: "base",
                });
            }
            return sort === "desc" ? -cmp : cmp;
        });
    }

    /** @type {Record<string, any[]>} */
    const out = {};
    for (const f of fields) {
        const src = columns[f] || [];
        out[f] = indices.map((i) => src[i]);
    }
    return out;
}
