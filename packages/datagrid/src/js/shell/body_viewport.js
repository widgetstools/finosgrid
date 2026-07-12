// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — body viewport (regular-table, no product column_headers)          ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import "regular-table";

/**
 * Column-oriented viewport over in-memory arrays (typically from Perspective
 * `view.to_columns()`), painted with regular-table without product headers.
 *
 * @param {object} options
 * @param {(scrollLeft: number) => void} [options.onScroll]
 * @param {() => void} [options.onDraw]
 */
export function createBodyViewport({ onScroll, onDraw } = {}) {
    const table = document.createElement("regular-table");
    table.className = "fg-shell__body";

    /** @type {string[]} */
    let fields = [];
    /** @type {Record<string, any[]>} */
    let columns = {};
    let numRows = 0;

    function dataListener(x0, y0, x1, y1) {
        const sliceFields = fields.slice(x0, x1);
        return {
            num_rows: numRows,
            num_columns: fields.length,
            data: sliceFields.map((f) => {
                const col = columns[f] || [];
                return col.slice(y0, y1);
            }),
            // Intentionally omit column_headers — shell owns headers.
        };
    }

    table.setDataListener(dataListener);

    function measureColumnWidths() {
        /** @type {Record<string, number>} */
        const widths = {};
        const firstRow =
            table.querySelector("tbody tr") ||
            table.querySelector("thead tr:last-child");
        if (!firstRow) {
            return widths;
        }
        const cells = [...firstRow.children].filter(
            (el) => el.tagName === "TD" || el.tagName === "TH",
        );
        // If thead somehow appears empty, still try tbody
        fields.forEach((field, i) => {
            const cell = cells[i];
            if (cell) {
                widths[field] = cell.getBoundingClientRect().width;
            }
        });
        return widths;
    }

    /**
     * @param {string[]} nextFields
     * @param {Record<string, any[]>} nextColumns
     */
    async function setData(nextFields, nextColumns) {
        fields = nextFields.slice();
        columns = nextColumns || {};
        numRows = fields.length
            ? Math.max(
                  0,
                  ...fields.map((f) => (columns[f] ? columns[f].length : 0)),
              )
            : 0;
        await table.draw({ invalid_columns: true });
        onDraw?.();
        return measureColumnWidths();
    }

    table.addEventListener(
        "scroll",
        () => {
            onScroll?.(table.scrollLeft || 0);
        },
        { passive: true },
    );

    table.addStyleListener?.(() => {
        onDraw?.();
    });

    return {
        el: table,
        setData,
        measureColumnWidths,
        get scrollLeft() {
            return table.scrollLeft || 0;
        },
        draw: () => table.draw(),
    };
}
