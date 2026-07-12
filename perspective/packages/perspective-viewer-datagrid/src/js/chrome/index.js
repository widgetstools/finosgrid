// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Copyright (c) 2017, the Perspective Authors.                              ┃
// ┃ AG Chrome Phase 1 — barrel                                                ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { ChromeFeatureHost } from "./host.js";
import { createThemeFeature } from "./features/theme.js";
import { createFloatingFiltersFeature } from "./features/floating_filters.js";
import { createSetFilterFeature } from "./features/set_filter.js";
import { createConditionalFormattingFeature } from "./features/conditional_formatting.js";

/**
 * Create a host with Phase 1 default features registered.
 * @param {HTMLElement} plugin
 */
export function createDefaultChromeHost(plugin) {
    const host = new ChromeFeatureHost(plugin);
    host
        .register(createThemeFeature())
        .register(createFloatingFiltersFeature())
        .register(createSetFilterFeature())
        .register(createConditionalFormattingFeature());
    return host;
}

export { ChromeFeatureHost };
export { mergeFilters, toPerspectiveFilters } from "./filter_bridge.js";
