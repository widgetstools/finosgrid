// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ AG Chrome Phase 3 — calculated columns via Perspective expressions        ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

export function createCalculatedColumnsFeature() {
    let ctx = null;

    function currentConfig() {
        return (
            ctx.plugin.model?._config || {
                expressions: {},
                columns: [],
            }
        );
    }

    async function openPanel() {
        const config = currentConfig();
        /** @type {Record<string, string>} */
        const expressions =
            config.expressions && typeof config.expressions === "object"
                ? { ...config.expressions }
                : {};

        const panel = document.createElement("div");
        panel.className = "psp-ag-chrome-panel psp-ag-calc-panel";

        panel.innerHTML = `
          <div class="psp-ag-chrome-panel__header">
            <strong>Calculated column</strong>
            <button type="button" class="psp-ag-chrome-panel__close" title="Close">×</button>
          </div>
          <div class="psp-ag-chrome-panel__body">
            <label class="psp-ag-calc-panel__field">
              <span>Name</span>
              <input type="text" data-field="name" placeholder="e.g. Margin" />
            </label>
            <label class="psp-ag-calc-panel__field">
              <span>Expression</span>
              <input type="text" data-field="expr" placeholder='"Sales" - "Profit"' />
            </label>
            <p class="psp-ag-calc-panel__hint">Use Perspective ExprTK syntax. Column names in double quotes.</p>
            <h4>Existing</h4>
            <div class="psp-ag-calc-panel__list" data-role="list"></div>
          </div>
          <div class="psp-ag-chrome-panel__footer">
            <button type="button" class="psp-ag-chrome-panel__primary" data-act="add">Add</button>
          </div>
        `;

        const list = panel.querySelector('[data-role="list"]');

        function renderList() {
            list.replaceChildren();
            const entries = Object.entries(expressions);
            if (!entries.length) {
                list.textContent = "None yet.";
                return;
            }
            for (const [name, expr] of entries) {
                const row = document.createElement("div");
                row.className = "psp-ag-calc-panel__item";
                row.innerHTML = `<code>${name}</code> = <code>${expr}</code>`;
                const rm = document.createElement("button");
                rm.type = "button";
                rm.textContent = "Remove";
                rm.onclick = async () => {
                    delete expressions[name];
                    const cols = (config.columns || []).filter((c) => c !== name);
                    await ctx.viewer.restore({
                        expressions: { ...expressions },
                        columns: cols,
                    });
                    // refresh local config snapshot
                    Object.assign(config, currentConfig());
                    renderList();
                };
                row.appendChild(rm);
                list.appendChild(row);
            }
        }

        renderList();

        panel.querySelector(".psp-ag-chrome-panel__close").onclick = () =>
            ctx.closeChromePanel?.();

        panel.querySelector('[data-act="add"]').onclick = async () => {
            const name = panel
                .querySelector('[data-field="name"]')
                .value.trim();
            const expr = panel
                .querySelector('[data-field="expr"]')
                .value.trim();
            if (!name || !expr) {
                return;
            }
            expressions[name] = expr;
            const cols = [...(currentConfig().columns || [])];
            if (!cols.includes(name)) {
                cols.push(name);
            }
            await ctx.viewer.restore({
                expressions: { ...expressions },
                columns: cols,
            });
            ctx.closeChromePanel?.();
        };

        ctx.openChromePanel?.(panel);
    }

    return {
        id: "calculatedColumns",
        mount(chromeCtx) {
            ctx = chromeCtx;
            queueMicrotask(() => {
                ctx.addChromeToolbarButton?.({
                    id: "calc",
                    label: "Fx",
                    title: "Calculated columns (expressions)",
                    onClick: () => openPanel(),
                });
            });
        },
        syncFromConfig() {},
        open: openPanel,
        /**
         * Programmatic helper
         * @param {string} name
         * @param {string} expression
         */
        async addExpression(name, expression) {
            const config = currentConfig();
            const expressions = {
                ...(config.expressions || {}),
                [name]: expression,
            };
            const columns = [...(config.columns || [])];
            if (!columns.includes(name)) {
                columns.push(name);
            }
            await ctx.viewer.restore({ expressions, columns });
        },
        save() {
            return {};
        },
        restore() {},
        destroy() {
            ctx = null;
        },
    };
}
