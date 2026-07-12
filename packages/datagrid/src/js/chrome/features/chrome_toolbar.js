// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ AG Chrome Phase 3 — shared chrome toolbar + panel host                    ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

/**
 * Provides slots.chromeToolbar and openPanel/closePanel helpers used by
 * pivot + calculated-column features.
 */
export function createChromeToolbarFeature() {
    let ctx = null;
    let toolbar = null;
    let panelHost = null;
    let activePanel = null;

    function ensure() {
        if (!ctx || toolbar) {
            return;
        }
        toolbar = document.createElement("div");
        toolbar.className = "psp-ag-chrome__toolbar";
        toolbar.setAttribute("part", "ag-chrome-toolbar");

        panelHost = document.createElement("div");
        panelHost.className = "psp-ag-chrome__panel-host";
        panelHost.setAttribute("part", "ag-chrome-panel-host");

        // Insert toolbar at top of chrome root
        ctx.slots.root.insertBefore(toolbar, ctx.slots.root.firstChild);
        ctx.slots.root.appendChild(panelHost);

        ctx.slots.chromeToolbar = toolbar;
        ctx.slots.panelHost = panelHost;

        ctx.openChromePanel = (el) => {
            close();
            activePanel = el;
            panelHost.appendChild(el);
            panelHost.classList.add("psp-ag-chrome__panel-host--open");
        };
        ctx.closeChromePanel = () => close();

        ctx.addChromeToolbarButton = ({ id, label, title, onClick }) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "psp-ag-chrome__toolbar-btn";
            btn.dataset.chromeAction = id;
            btn.textContent = label;
            if (title) btn.title = title;
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                onClick?.(btn);
            });
            toolbar.appendChild(btn);
            return btn;
        };
    }

    function close() {
        if (activePanel) {
            activePanel.remove();
            activePanel = null;
        }
        panelHost?.classList.remove("psp-ag-chrome__panel-host--open");
    }

    return {
        id: "chromeToolbar",
        mount(chromeCtx) {
            ctx = chromeCtx;
            ensure();
            const hidePspToolbar = () => {
                const parent = ctx.plugin.parentElement;
                parent
                    ?.querySelectorAll?.("perspective-viewer-datagrid-toolbar")
                    ?.forEach((el) => {
                        // Inline style — toolbar lives outside the plugin shadow tree
                        el.style.display = "none";
                        el.classList.add("psp-ag-chrome-hide-psp-toolbar");
                    });
            };
            hidePspToolbar();
            // Toolbar is appended in connectedCallback; observe briefly
            const parent = ctx.plugin.parentElement;
            if (parent) {
                const obs = new MutationObserver(hidePspToolbar);
                obs.observe(parent, { childList: true });
                ctx._pspToolbarObserver = obs;
            }
            ctx.slots.root.classList.add("psp-ag-chrome--polished");
        },
        syncFromConfig() {
            const parent = ctx?.plugin?.parentElement;
            parent
                ?.querySelectorAll?.("perspective-viewer-datagrid-toolbar")
                ?.forEach((el) => {
                    el.style.display = "none";
                    el.classList.add("psp-ag-chrome-hide-psp-toolbar");
                });
        },
        save() {
            return {};
        },
        restore() {},
        destroy() {
            ctx?._pspToolbarObserver?.disconnect?.();
            close();
            toolbar?.remove();
            panelHost?.remove();
            toolbar = null;
            panelHost = null;
            ctx = null;
        },
    };
}
