// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Copyright (c) 2017, the Perspective Authors.                              ┃
// ┃ AG Chrome Phase 1 — Quartz theme feature                                  ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { CHROME_THEME_ATTR, DEFAULT_THEME_ID } from "../types.js";

export function createThemeFeature() {
    let ctx = null;

    function apply(themeId) {
        if (!ctx) {
            return;
        }
        const id = themeId || DEFAULT_THEME_ID;
        ctx.themeId = id;
        ctx.slots.root.setAttribute(CHROME_THEME_ATTR, id);
        ctx.regular_table.setAttribute(CHROME_THEME_ATTR, id);
        ctx.plugin.setAttribute(CHROME_THEME_ATTR, id);
    }

    return {
        id: "theme",
        mount(chromeCtx) {
            ctx = chromeCtx;
            apply(ctx.themeId || DEFAULT_THEME_ID);
        },
        syncFromConfig() {
            apply(ctx?.themeId || DEFAULT_THEME_ID);
        },
        save() {
            return { themeId: ctx?.themeId || DEFAULT_THEME_ID };
        },
        restore(token) {
            if (token?.themeId) {
                apply(token.themeId);
            }
        },
        destroy() {
            ctx = null;
        },
    };
}
