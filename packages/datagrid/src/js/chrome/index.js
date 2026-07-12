// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Copyright (c) 2017, the Perspective Authors.                              ┃
// ┃ AG Chrome Phase 1 — barrel                                                ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { ChromeFeatureHost } from "./host.js";
import { createThemeFeature } from "./features/theme.js";
import { createFloatingFiltersFeature } from "./features/floating_filters.js";
import { createSetFilterFeature } from "./features/set_filter.js";
import { createConditionalFormattingFeature } from "./features/conditional_formatting.js";
import { createColumnGroupsFeature } from "./features/column_groups.js";
import { createStickyGroupsFeature } from "./features/sticky_groups.js";

/**
 * Create a host with Phase 1+2 default features registered.
 * @param {HTMLElement} plugin
 */
export function createDefaultChromeHost(plugin) {
    const host = new ChromeFeatureHost(plugin);
    host
        .register(createThemeFeature())
        .register(createColumnGroupsFeature())
        .register(createFloatingFiltersFeature())
        .register(createSetFilterFeature())
        .register(createConditionalFormattingFeature())
        .register(createStickyGroupsFeature());
    return host;
}

export { ChromeFeatureHost };
export { mergeFilters, toPerspectiveFilters } from "./filter_bridge.js";
