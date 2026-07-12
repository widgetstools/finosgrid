// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ AG Chrome Phase 3 — pivot panel → group_by / split_by / aggregates        ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

const AGGS = ["sum", "avg", "count", "min", "max", "last", "high", "low"];

export function createPivotChromeFeature() {
    let ctx = null;

    async function columnNames() {
        const table = await ctx.viewer.getTable(true);
        const schema = await table.schema();
        return { names: Object.keys(schema), schema };
    }

    function currentConfig() {
        return ctx.plugin.model?._config || {
            group_by: [],
            split_by: [],
            columns: [],
            aggregates: {},
        };
    }

    async function openPanel() {
        const { names, schema } = await columnNames();
        const config = currentConfig();
        const groupSet = new Set(config.group_by || []);
        const splitSet = new Set(config.split_by || []);
        const valueCols = (config.columns || []).filter(
            (c) => !groupSet.has(c) && !splitSet.has(c),
        );
        /** @type {Record<string, string>} */
        const aggs = { ...(config.aggregates || {}) };

        const panel = document.createElement("div");
        panel.className = "psp-ag-chrome-panel psp-ag-pivot-panel";

        panel.innerHTML = `
          <div class="psp-ag-chrome-panel__header">
            <strong>Pivot</strong>
            <button type="button" class="psp-ag-chrome-panel__close" title="Close">×</button>
          </div>
          <div class="psp-ag-chrome-panel__body">
            <section>
              <h4>Row groups</h4>
              <div class="psp-ag-pivot-panel__cols" data-role="group"></div>
            </section>
            <section>
              <h4>Column labels</h4>
              <div class="psp-ag-pivot-panel__cols" data-role="split"></div>
            </section>
            <section>
              <h4>Values</h4>
              <div class="psp-ag-pivot-panel__cols" data-role="values"></div>
            </section>
          </div>
          <div class="psp-ag-chrome-panel__footer">
            <button type="button" data-act="clear">Clear</button>
            <button type="button" class="psp-ag-chrome-panel__primary" data-act="apply">Apply</button>
          </div>
        `;

        const groupBox = panel.querySelector('[data-role="group"]');
        const splitBox = panel.querySelector('[data-role="split"]');
        const valuesBox = panel.querySelector('[data-role="values"]');

        for (const name of names) {
            const g = document.createElement("label");
            g.innerHTML = `<input type="checkbox" data-col="${name}" ${groupSet.has(name) ? "checked" : ""}/> ${name}`;
            groupBox.appendChild(g);

            const s = document.createElement("label");
            s.innerHTML = `<input type="checkbox" data-col="${name}" ${splitSet.has(name) ? "checked" : ""}/> ${name}`;
            splitBox.appendChild(s);

            const isNum =
                schema[name] === "integer" ||
                schema[name] === "float" ||
                schema[name] === "decimal";
            if (!isNum) continue;

            const v = document.createElement("label");
            v.className = "psp-ag-pivot-panel__value-row";
            const checked = valueCols.includes(name) || !!aggs[name];
            const select = document.createElement("select");
            for (const a of AGGS) {
                const opt = document.createElement("option");
                opt.value = a;
                opt.textContent = a;
                if ((aggs[name] || "sum") === a) opt.selected = true;
                select.appendChild(opt);
            }
            v.innerHTML = `<input type="checkbox" data-col="${name}" ${checked ? "checked" : ""}/> <span>${name}</span>`;
            v.appendChild(select);
            valuesBox.appendChild(v);
        }

        panel.querySelector(".psp-ag-chrome-panel__close").onclick = () =>
            ctx.closeChromePanel?.();

        panel.querySelector('[data-act="clear"]').onclick = async () => {
            await ctx.viewer.restore({
                group_by: [],
                split_by: [],
                aggregates: {},
            });
            ctx.closeChromePanel?.();
        };

        panel.querySelector('[data-act="apply"]').onclick = async () => {
            const group_by = [
                ...groupBox.querySelectorAll("input:checked"),
            ].map((el) => el.dataset.col);
            const split_by = [
                ...splitBox.querySelectorAll("input:checked"),
            ].map((el) => el.dataset.col);
            const aggregates = {};
            const valueNames = [];
            for (const row of valuesBox.querySelectorAll(
                ".psp-ag-pivot-panel__value-row",
            )) {
                const cb = row.querySelector('input[type="checkbox"]');
                const sel = row.querySelector("select");
                if (cb?.checked) {
                    valueNames.push(cb.dataset.col);
                    aggregates[cb.dataset.col] = sel.value;
                }
            }
            const columns = [...group_by, ...split_by, ...valueNames];
            // Dedupe while preserving order
            const seen = new Set();
            const cols = columns.filter((c) => {
                if (seen.has(c)) return false;
                seen.add(c);
                return true;
            });
            await ctx.viewer.restore({
                group_by,
                split_by,
                aggregates,
                columns: cols.length ? cols : undefined,
            });
            ctx.closeChromePanel?.();
        };

        ctx.openChromePanel?.(panel);
    }

    return {
        id: "pivotChrome",
        mount(chromeCtx) {
            ctx = chromeCtx;
            // Defer until toolbar feature mounted (registration order)
            queueMicrotask(() => {
                ctx.addChromeToolbarButton?.({
                    id: "pivot",
                    label: "Pivot",
                    title: "Row groups / column labels / values",
                    onClick: () => openPanel(),
                });
            });
        },
        syncFromConfig() {},
        open: openPanel,
        save() {
            return {};
        },
        restore() {},
        destroy() {
            ctx = null;
        },
    };
}
