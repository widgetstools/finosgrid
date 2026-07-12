// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Copyright (c) 2017, the Perspective Authors.                              ┃
// ┃ AG Chrome Phase 1 — feature host                                          ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { createChromeContext } from "./context.js";

/**
 * Extensible registry for UI-only chrome features.
 *
 * Features implement: { id, mount(ctx), syncFromConfig(config, columnsConfig), destroy() }
 * Optional: save() / restore(token)
 */
export class ChromeFeatureHost {
    /** @param {HTMLElement} plugin */
    constructor(plugin) {
        this.plugin = plugin;
        /** @type {Map<string, object>} */
        this._features = new Map();
        this._mounted = false;
        this.ctx = null;
        /** @type {object|null} */
        this._lastColumnsConfig = null;
    }

    /**
     * @param {object} feature
     */
    register(feature) {
        if (!feature?.id) {
            throw new Error("ChromeFeature requires an id");
        }
        this._features.set(feature.id, feature);
        if (this._mounted && this.ctx) {
            feature.mount?.(this.ctx);
        }
        return this;
    }

    /** @returns {object|undefined} */
    getFeature(id) {
        return this._features.get(id);
    }

    mount() {
        if (this._mounted) {
            return;
        }
        this.ctx = createChromeContext(this.plugin);
        const table = this.plugin.regular_table;
        const parent = table.parentElement;
        if (!parent) {
            return;
        }

        parent.insertBefore(this.ctx.slots.root, table);
        this.ctx.slots.root.appendChild(this.ctx.slots.headerBand);
        this.ctx.slots.root.appendChild(table);
        this.ctx.slots.root.appendChild(this.ctx.slots.popupPortal);

        for (const feature of this._features.values()) {
            feature.mount?.(this.ctx);
        }
        this._mounted = true;
    }

    /**
     * @param {object} config View config
     * @param {object} [columnsConfig]
     */
    syncFromConfig(config, columnsConfig) {
        if (!this._mounted) {
            return;
        }
        if (columnsConfig) {
            this._lastColumnsConfig = columnsConfig;
        }
        for (const feature of this._features.values()) {
            feature.syncFromConfig?.(
                config,
                columnsConfig || this._lastColumnsConfig || {},
            );
        }
    }

    save() {
        const token = {
            themeId: this.ctx?.themeId,
            chromeFilterState: {
                ...(this.ctx?.chromeFilterState || {}),
            },
            features: {},
        };
        for (const [id, feature] of this._features) {
            if (typeof feature.save === "function") {
                token.features[id] = feature.save();
            }
        }
        return token;
    }

    /**
     * @param {object} token
     * @param {object} [columnsConfig]
     */
    restore(token, columnsConfig) {
        if (!token || !this.ctx) {
            return;
        }
        if (token.themeId) {
            this.ctx.themeId = token.themeId;
        }
        if (token.chromeFilterState) {
            for (const key of Object.keys(this.ctx.chromeFilterState)) {
                delete this.ctx.chromeFilterState[key];
            }
            Object.assign(this.ctx.chromeFilterState, token.chromeFilterState);
        }
        for (const [id, feature] of this._features) {
            if (typeof feature.restore === "function" && token.features?.[id]) {
                feature.restore(token.features[id]);
            }
        }
        this.syncFromConfig(this.ctx.getViewConfig(), columnsConfig);
    }

    destroy() {
        for (const feature of this._features.values()) {
            feature.destroy?.();
        }
        if (this.ctx?.slots?.root?.parentElement) {
            const parent = this.ctx.slots.root.parentElement;
            const table = this.plugin.regular_table;
            if (table) {
                parent.insertBefore(table, this.ctx.slots.root);
            }
            this.ctx.slots.root.remove();
        }
        this._features.clear();
        this._mounted = false;
        this.ctx = null;
        this._lastColumnsConfig = null;
    }
}
