// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — context / column menu (tests)                                     ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    resolveMenuItems,
    defaultColumnMenuItems,
    defaultAutoGroupColumnMenuItems,
    defaultGroupHeaderMenuItems,
    defaultCellContextMenuItems,
    createContextMenuController,
    applyPopupTheme,
} from "../../../src/js/shell/context_menu.js";

describe("defaultColumnMenuItems", () => {
    it("includes sort, pin submenu, and autosize", () => {
        const ids = defaultColumnMenuItems().map((x) =>
            typeof x === "string" ? x : x.name,
        );
        assert.ok(ids.includes("sortAscending"));
        assert.ok(ids.includes("sortDescending"));
        assert.ok(ids.includes("sortUnSort"));
        assert.ok(ids.includes("pinSubMenu"));
        assert.ok(ids.includes("autoSizeThis"));
        assert.ok(ids.includes("separator"));
    });
});

describe("defaultAutoGroupColumnMenuItems", () => {
    it("includes expand/collapse all for row groups", () => {
        const ids = defaultAutoGroupColumnMenuItems().map((x) =>
            typeof x === "string" ? x : x.name,
        );
        assert.ok(ids.includes("expandAll"));
        assert.ok(ids.includes("contractAll"));
        assert.ok(ids.includes("pinSubMenu"));
        assert.ok(ids.includes("autoSizeThis"));
    });
});

describe("defaultGroupHeaderMenuItems", () => {
    it("includes this-group and all-groups expand/collapse plus autosize", () => {
        const ids = defaultGroupHeaderMenuItems().map((x) =>
            typeof x === "string" ? x : x.name,
        );
        assert.ok(ids.includes("expandGroup"));
        assert.ok(ids.includes("collapseGroup"));
        assert.ok(ids.includes("expandAll"));
        assert.ok(ids.includes("contractAll"));
        assert.ok(ids.includes("autoSizeThis"));
    });
});

describe("group header expand/collapse built-ins", () => {
    it("resolves Expand/Collapse Group and Expand/Collapse All Groups", () => {
        const items = resolveMenuItems(
            ["expandGroup", "collapseGroup", "expandAll", "contractAll"],
            {
                actions: {
                    expandGroup() {},
                    collapseGroup() {},
                    expandAll() {},
                    contractAll() {},
                },
                context: {
                    expandable: true,
                    groupOpen: false,
                    hasColumnGroups: true,
                },
            },
        );
        assert.equal(items[0].name, "Expand Group");
        assert.equal(items[0].disabled, false);
        assert.equal(items[1].name, "Collapse Group");
        assert.equal(items[1].disabled, true);
        assert.equal(items[2].name, "Expand All Groups");
        assert.equal(items[3].name, "Collapse All Groups");
    });
});

describe("defaultCellContextMenuItems", () => {
    it("includes copy actions and column pin submenu", () => {
        const ids = defaultCellContextMenuItems().map((x) =>
            typeof x === "string" ? x : x.name,
        );
        assert.ok(ids.includes("copy"));
        assert.ok(ids.includes("copyWithHeaders"));
        assert.ok(ids.includes("pinSubMenu"));
    });
});

describe("resolveMenuItems", () => {
    it("expands built-in string ids into MenuItemDefs", () => {
        const actions = {
            sortAscending() {},
            sortDescending() {},
            pinLeft() {},
        };
        const items = resolveMenuItems(
            ["sortAscending", "separator", "pinSubMenu"],
            { actions, context: { field: "a", pin: null, sort: null } },
        );
        assert.equal(items.length, 3);
        assert.equal(items[0].name, "Sort Ascending");
        assert.equal(items[1], "separator");
        assert.equal(items[2].name, "Pin Column");
        assert.ok(Array.isArray(items[2].subMenu));
        assert.equal(items[2].subMenu.length, 3);
    });

    it("honors custom MenuItemDef and disabled flag", () => {
        const items = resolveMenuItems(
            [
                {
                    name: "Custom",
                    disabled: true,
                    action() {},
                },
            ],
            { actions: {}, context: {} },
        );
        assert.equal(items[0].name, "Custom");
        assert.equal(items[0].disabled, true);
    });

    it("supports getItems callback returning defaults + custom", () => {
        const items = resolveMenuItems(
            (params) => [
                ...params.defaultItems,
                "separator",
                { name: "Log", action() {} },
            ],
            {
                defaultItems: defaultColumnMenuItems(),
                actions: {
                    sortAscending() {},
                    sortDescending() {},
                    sortUnSort() {},
                    pinLeft() {},
                    pinRight() {},
                    pinNone() {},
                    autoSizeThis() {},
                },
                context: { field: "x", pin: "left", sort: "asc" },
            },
        );
        assert.ok(items.some((i) => i === "separator" || i.name === "Sort Ascending"));
        assert.ok(items.some((i) => i.name === "Log"));
        const sortAsc = items.find((i) => i.name === "Sort Ascending");
        assert.equal(sortAsc.checked, true);
    });
});

describe("createContextMenuController", () => {
    it("showPopup renders items and invokes action on click", () => {
        /** @type {HTMLElement[]} */
        const appended = [];
        /** @type {any} */
        const fakeDoc = {
            createElement(tag) {
                return makeEl(tag);
            },
            createTextNode(text) {
                return { nodeType: 3, textContent: text };
            },
            addEventListener() {},
            removeEventListener() {},
            body: {
                appendChild(el) {
                    appended.push(el);
                    return el;
                },
            },
        };
        function makeEl(tag) {
            /** @type {any} */
            const el = {
                tagName: String(tag).toUpperCase(),
                className: "",
                style: {},
                children: [],
                disabled: false,
                title: "",
                attrs: {},
                setAttribute(k, v) {
                    this.attrs[k] = v;
                },
                append(...nodes) {
                    for (const n of nodes) this.children.push(n);
                },
                appendChild(n) {
                    this.children.push(n);
                    return n;
                },
                addEventListener(type, fn) {
                    this._listeners = this._listeners || {};
                    this._listeners[type] = this._listeners[type] || [];
                    this._listeners[type].push(fn);
                },
                dispatchEvent(ev) {
                    for (const fn of this._listeners?.[ev.type] || []) fn(ev);
                },
                querySelector(sel) {
                    if (sel === "button") {
                        return this.children.find((c) => c.tagName === "BUTTON");
                    }
                    return null;
                },
                remove() {},
                contains() {
                    return false;
                },
            };
            return el;
        }

        const ctrl = createContextMenuController({
            getDocument: () => fakeDoc,
            getDocumentBody: () => fakeDoc.body,
        });
        let clicked = false;
        ctrl.showPopup({
            x: 10,
            y: 20,
            items: [
                {
                    name: "Do it",
                    action() {
                        clicked = true;
                    },
                },
            ],
        });
        assert.equal(appended.length, 1);
        const menu = appended[0];
        assert.equal(menu.className, "fg-shell__menu fg-shell__context-menu");
        assert.equal(menu.style.left, "10px");
        assert.equal(menu.style.top, "20px");
        const btn = menu.querySelector("button");
        btn.dispatchEvent({
            type: "click",
            preventDefault() {},
            stopPropagation() {},
        });
        assert.equal(clicked, true);
        assert.equal(ctrl.isOpen(), false);
    });

    it("applyPopupTheme stamps mode and CSS vars from host", () => {
        const host = {
            getAttribute(name) {
                return name === "data-ag-theme-mode" ? "dark" : null;
            },
        };
        const menu = {
            attrs: {},
            style: {
                props: {},
                setProperty(k, v) {
                    this.props[k] = v;
                },
            },
            setAttribute(k, v) {
                this.attrs[k] = v;
            },
        };
        // jsdom-less unit env: stub getComputedStyle via global if missing
        const prev = globalThis.getComputedStyle;
        globalThis.getComputedStyle = () => ({
            getPropertyValue(name) {
                if (name === "--fg-popup-bg") return " #1e1e1e ";
                if (name === "--fg-foreground") return "#eee";
                return "";
            },
        });
        try {
            applyPopupTheme(menu, host);
            assert.equal(menu.attrs["data-ag-theme-mode"], "dark");
            assert.equal(menu.style.props["--fg-popup-bg"], "#1e1e1e");
            assert.equal(menu.style.props["--fg-foreground"], "#eee");
        } finally {
            if (prev) globalThis.getComputedStyle = prev;
            else delete globalThis.getComputedStyle;
        }
    });
});
