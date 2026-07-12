// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — AG-style context / column menus                                   ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

/**
 * @typedef {object} MenuItemDef
 * @property {string} name
 * @property {(() => void)=} action
 * @property {boolean=} disabled
 * @property {boolean=} checked
 * @property {string=} shortcut
 * @property {string=} tooltip
 * @property {string|HTMLElement=} icon
 * @property {(MenuItemDef|string)[]=} subMenu
 * @property {boolean=} suppressCloseOnSelect
 * @property {string[]=} cssClasses
 */

/**
 * @typedef {object} MenuActions
 * @property {Function=} sortAscending
 * @property {Function=} sortDescending
 * @property {Function=} sortUnSort
 * @property {Function=} pinLeft
 * @property {Function=} pinRight
 * @property {Function=} pinNone
 * @property {Function=} autoSizeThis
 * @property {Function=} autoSizeAll
 * @property {Function=} expandGroup
 * @property {Function=} collapseGroup
 * @property {Function=} expandAll
 * @property {Function=} contractAll
 * @property {Function=} copy
 * @property {Function=} copyWithHeaders
 * @property {Function=} copyWithGroupHeaders
 * @property {Function=} cut
 * @property {Function=} paste
 */

/** @returns {(string|MenuItemDef)[]} */
export function defaultColumnMenuItems() {
    return [
        "sortAscending",
        "sortDescending",
        "sortUnSort",
        "separator",
        "pinSubMenu",
        "separator",
        "autoSizeThis",
        "autoSizeAll",
    ];
}

/**
 * Header menu for the AG auto-group column (`ag-Grid-AutoColumn`).
 * Includes row-group expand/collapse all.
 * @returns {(string|MenuItemDef)[]}
 */
export function defaultAutoGroupColumnMenuItems() {
    return [
        "expandAll",
        "contractAll",
        "separator",
        "pinSubMenu",
        "separator",
        "autoSizeThis",
        "autoSizeAll",
    ];
}

/** @returns {(string|MenuItemDef)[]} */
export function defaultGroupHeaderMenuItems() {
    return [
        "expandGroup",
        "collapseGroup",
        "separator",
        "expandAll",
        "contractAll",
        "separator",
        "autoSizeThis",
    ];
}

/** @returns {(string|MenuItemDef)[]} */
export function defaultCellContextMenuItems() {
    return [
        "copy",
        "copyWithHeaders",
        "separator",
        "pinSubMenu",
        "separator",
        "autoSizeThis",
    ];
}

/**
 * Expand built-in ids + custom defs into renderable items.
 * @param {(string|MenuItemDef)[]|Function} raw
 * @param {{
 *   defaultItems?: (string|MenuItemDef)[],
 *   actions?: MenuActions,
 *   context?: Record<string, any>,
 * }} opts
 * @returns {(string|MenuItemDef)[]}
 */
export function resolveMenuItems(raw, opts = {}) {
    const actions = opts.actions || {};
    const context = opts.context || {};
    const defaultItems = opts.defaultItems || [];

    /** @type {(string|MenuItemDef)[]} */
    let list;
    if (typeof raw === "function") {
        list = raw({
            defaultItems: defaultItems.slice(),
            ...context,
        });
    } else if (Array.isArray(raw)) {
        list = raw.slice();
    } else {
        list = defaultItems.slice();
    }

    return list.map((item) => expandBuiltIn(item, actions, context));
}

/**
 * @param {string|MenuItemDef} item
 * @param {MenuActions} actions
 * @param {Record<string, any>} context
 * @returns {string|MenuItemDef}
 */
function expandBuiltIn(item, actions, context) {
    if (item === "separator") return "separator";
    if (typeof item !== "string") {
        const next = { ...item };
        if (Array.isArray(item.subMenu)) {
            next.subMenu = item.subMenu.map((s) =>
                expandBuiltIn(s, actions, context),
            );
        }
        return next;
    }

    const pin = context.pin ?? null;
    const sort = context.sort ?? null;

    switch (item) {
        case "sortAscending":
            return {
                name: "Sort Ascending",
                checked: sort === "asc",
                disabled: context.sortable === false,
                action: () => actions.sortAscending?.(context),
            };
        case "sortDescending":
            return {
                name: "Sort Descending",
                checked: sort === "desc",
                disabled: context.sortable === false,
                action: () => actions.sortDescending?.(context),
            };
        case "sortUnSort":
            return {
                name: "Clear Sort",
                disabled: context.sortable === false || !sort,
                action: () => actions.sortUnSort?.(context),
            };
        case "pinSubMenu":
            return {
                name: "Pin Column",
                disabled: context.pinnable === false,
                subMenu: [
                    {
                        name: "Pin Left",
                        checked: pin === "left",
                        action: () => actions.pinLeft?.(context),
                    },
                    {
                        name: "Pin Right",
                        checked: pin === "right",
                        action: () => actions.pinRight?.(context),
                    },
                    {
                        name: "No Pin",
                        checked: pin == null,
                        action: () => actions.pinNone?.(context),
                    },
                ],
            };
        case "autoSizeThis":
            return {
                name: "Autosize This Column",
                action: () => actions.autoSizeThis?.(context),
            };
        case "autoSizeAll":
            return {
                name: "Autosize All Columns",
                action: () => actions.autoSizeAll?.(context),
            };
        case "expandGroup":
            return {
                name: "Expand Group",
                disabled:
                    context.expandable === false || context.groupOpen === true,
                action: () => actions.expandGroup?.(context),
            };
        case "collapseGroup":
            return {
                name: "Collapse Group",
                disabled:
                    context.expandable === false || context.groupOpen === false,
                action: () => actions.collapseGroup?.(context),
            };
        case "expandAll":
            return {
                name: "Expand All Groups",
                disabled:
                    context.hasRowGroups === false &&
                    context.hasColumnGroups === false,
                action: () => actions.expandAll?.(context),
            };
        case "contractAll":
            return {
                name: "Collapse All Groups",
                disabled:
                    context.hasRowGroups === false &&
                    context.hasColumnGroups === false,
                action: () => actions.contractAll?.(context),
            };
        case "copy":
            return {
                name: "Copy",
                shortcut: "⌘C",
                action: () => actions.copy?.(context),
            };
        case "copyWithHeaders":
            return {
                name: "Copy with Headers",
                action: () => actions.copyWithHeaders?.(context),
            };
        case "copyWithGroupHeaders":
            return {
                name: "Copy with Group Headers",
                action: () => actions.copyWithGroupHeaders?.(context),
            };
        case "cut":
            return {
                name: "Cut",
                action: () => actions.cut?.(context),
            };
        case "paste":
            return {
                name: "Paste",
                action: () => actions.paste?.(context),
            };
        default:
            return {
                name: String(item),
                disabled: true,
                tooltip: `Unknown menu item: ${item}`,
            };
    }
}

/** CSS custom properties copied from .fg-shell onto body-mounted popups. */
const THEME_VARS = [
    "--fg-background",
    "--fg-foreground",
    "--fg-border",
    "--fg-muted",
    "--fg-disabled",
    "--fg-secondary-bg",
    "--fg-popup-bg",
    "--fg-popup-shadow",
    "--fg-pin-shadow",
    "--fg-font-family",
    "--fg-font-size",
];

/**
 * Stamp theme tokens onto a popup so body-mounted menus match .fg-shell.
 * @param {HTMLElement} menu
 * @param {HTMLElement|null|undefined} host
 */
export function applyPopupTheme(menu, host) {
    if (!menu || !host) return;
    const mode = host.getAttribute?.("data-ag-theme-mode");
    if (mode) menu.setAttribute("data-ag-theme-mode", mode);
    if (typeof getComputedStyle !== "function") return;
    const cs = getComputedStyle(host);
    for (const name of THEME_VARS) {
        const value = cs.getPropertyValue(name).trim();
        if (value) menu.style.setProperty(name, value);
    }
}

/**
 * Popup menu controller (shared by column header / group / cell).
 * @param {{
 *   getDocumentBody?: () => any,
 *   getDocument?: () => any,
 *   getThemeHost?: () => any,
 * }} [options]
 */
export function createContextMenuController(options = {}) {
    const getDoc =
        options.getDocument ||
        (() => (typeof document !== "undefined" ? document : null));
    const getBody =
        options.getDocumentBody ||
        (() => getDoc()?.body);
    const getThemeHost = options.getThemeHost || (() => null);

    /** @type {HTMLElement|null} */
    let openEl = null;
    /** @type {(() => void)|null} */
    let detachOutside = null;

    function hidePopupMenu() {
        detachOutside?.();
        detachOutside = null;
        openEl?.remove();
        openEl = null;
    }

    function isOpen() {
        return !!openEl;
    }

    /**
     * @param {object} spec
     * @param {number} spec.x
     * @param {number} spec.y
     * @param {(string|MenuItemDef)[]} spec.items
     */
    function showPopup({ x, y, items }) {
        hidePopupMenu();
        const doc = getDoc();
        if (!doc?.createElement) {
            throw new Error("createContextMenuController: no document");
        }
        const menu = doc.createElement("div");
        menu.className = "fg-shell__menu fg-shell__context-menu";
        menu.setAttribute("role", "menu");
        menu.style.left = `${Math.max(0, x)}px`;
        menu.style.top = `${Math.max(0, y)}px`;
        applyPopupTheme(menu, getThemeHost());

        buildMenuDom(menu, items, () => hidePopupMenu(), 0, doc);

        getBody()?.appendChild(menu);
        openEl = menu;

        if (typeof requestAnimationFrame === "function" && typeof window !== "undefined") {
            requestAnimationFrame(() => {
                if (!openEl?.getBoundingClientRect) return;
                const rect = openEl.getBoundingClientRect();
                const vw = window.innerWidth || 800;
                const vh = window.innerHeight || 600;
                if (rect.right > vw) {
                    openEl.style.left = `${Math.max(0, vw - rect.width - 4)}px`;
                }
                if (rect.bottom > vh) {
                    openEl.style.top = `${Math.max(0, vh - rect.height - 4)}px`;
                }
            });
        }

        const onDown = (e) => {
            if (openEl && !openEl.contains?.(e.target)) hidePopupMenu();
        };
        const onKey = (e) => {
            if (e.key === "Escape") hidePopupMenu();
        };
        setTimeout(() => {
            doc.addEventListener?.("mousedown", onDown, true);
            doc.addEventListener?.("keydown", onKey, true);
            detachOutside = () => {
                doc.removeEventListener?.("mousedown", onDown, true);
                doc.removeEventListener?.("keydown", onKey, true);
            };
        }, 0);

        return menu;
    }

    return {
        showPopup,
        hidePopupMenu,
        isOpen,
    };
}

/**
 * @param {HTMLElement} host
 * @param {(string|MenuItemDef)[]} items
 * @param {() => void} close
 * @param {number} [depth]
 * @param {Document} [doc]
 */
function buildMenuDom(host, items, close, depth = 0, doc = document) {
    for (const item of items) {
        if (item === "separator") {
            const sep = doc.createElement("div");
            sep.className = "fg-shell__menu-separator";
            sep.setAttribute("role", "separator");
            host.appendChild(sep);
            continue;
        }
        if (!item || typeof item !== "object") continue;

        if (Array.isArray(item.subMenu) && item.subMenu.length) {
            const wrap = doc.createElement("div");
            wrap.className = "fg-shell__menu-submenu-wrap";
            const btn = doc.createElement("button");
            btn.type = "button";
            btn.className = "fg-shell__menu-item fg-shell__menu-item--submenu";
            btn.setAttribute("role", "menuitem");
            if (item.disabled) btn.disabled = true;
            btn.append(doc.createTextNode(item.name));
            const chevron = doc.createElement("span");
            chevron.className = "fg-shell__menu-chevron";
            chevron.textContent = "›";
            btn.append(chevron);

            const sub = doc.createElement("div");
            sub.className = "fg-shell__menu fg-shell__menu--submenu";
            sub.setAttribute("role", "menu");
            buildMenuDom(sub, item.subMenu, close, depth + 1, doc);

            wrap.append(btn, sub);
            host.appendChild(wrap);
            continue;
        }

        const btn = doc.createElement("button");
        btn.type = "button";
        btn.className = "fg-shell__menu-item";
        if (item.cssClasses?.length) {
            btn.classList.add(...item.cssClasses);
        }
        if (item.checked) btn.classList.add("is-active");
        btn.setAttribute("role", "menuitem");
        if (item.disabled) btn.disabled = true;
        if (item.tooltip) btn.title = item.tooltip;

        const label = doc.createElement("span");
        label.className = "fg-shell__menu-label";
        label.textContent = item.name;
        btn.append(label);

        if (item.shortcut) {
            const sc = doc.createElement("span");
            sc.className = "fg-shell__menu-shortcut";
            sc.textContent = item.shortcut;
            btn.append(sc);
        }

        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (item.disabled) return;
            item.action?.();
            if (!item.suppressCloseOnSelect) close();
        });
        host.appendChild(btn);
    }
}
