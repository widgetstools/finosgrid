// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — AG Grid–compatible column / grid option types (v35+)              ┃
// ┃ Shape mirrors ag-grid-community ColDef / ColGroupDef / GridOptions.       ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

/**
 * AG Grid `ColumnGroupShowType` — omit property ⇒ always visible in the group.
 * @typedef {'open' | 'closed'} ColumnGroupShowType
 *
 * AG Grid `HeaderStyle` — flat CSS property bag (camelCase).
 * Per-side borders use standard CSS keys, e.g. `borderBottom`, `borderLeftWidth`.
 * @typedef {Record<string, string|number>} HeaderStyle
 *
 * @typedef {string|string[]} HeaderClass
 *
 * @typedef {object} AbstractColDef
 * @property {string} [headerName]
 * @property {HeaderStyle|function} [headerStyle]
 * @property {HeaderClass|function} [headerClass]
 * @property {ColumnGroupShowType} [columnGroupShow]
 * @property {string} [headerTooltip]
 * @property {boolean} [suppressColumnsToolPanel]
 * @property {boolean} [suppressFiltersToolPanel]
 * @property {*} [context]
 * @property {boolean} [wrapHeaderText]
 * @property {boolean} [autoHeaderHeight]
 *
 * @typedef {AbstractColDef & {
 *   colId?: string,
 *   field?: string,
 *   type?: string|string[],
 *   width?: number,
 *   initialWidth?: number,
 *   minWidth?: number,
 *   maxWidth?: number,
 *   hide?: boolean,
 *   pinned?: 'left'|'right'|boolean|null,
 *   lockPosition?: boolean|'left'|'right',
 *   sortable?: boolean,
 *   filter?: boolean|string|object,
 *   floatingFilter?: boolean,
 *   resizable?: boolean,
 *   editable?: boolean|function,
 *   cellStyle?: object|function,
 *   cellClass?: string|string[]|function,
 *   cellClassRules?: object,
 *   valueGetter?: string|function,
 *   valueFormatter?: string|function,
 *   enableRowGroup?: boolean,
 *   enablePivot?: boolean,
 *   enableValue?: boolean,
 *   aggFunc?: string|function|null,
 *   children?: never
 * }} ColDef
 *
 * @typedef {AbstractColDef & {
 *   children: Array<ColDef|ColGroupDef>,
 *   groupId?: string,
 *   openByDefault?: boolean,
 *   marryChildren?: boolean,
 *   suppressStickyLabel?: boolean,
 *   headerGroupComponent?: *,
 *   headerGroupComponentParams?: *
 * }} ColGroupDef
 *
 * @typedef {object} GridOptions
 * @property {Array<ColDef|ColGroupDef>} [columnDefs]
 * @property {ColDef} [defaultColDef]
 * @property {Partial<ColGroupDef>} [defaultColGroupDef]
 * @property {any[]} [rowData]
 * @property {boolean} [floatingFilter]
 * @property {string} [domLayout]
 * @property {object} [icons]
 * @property {(event: *) => void} [onGridReady]
 * @property {(event: *) => void} [onColumnGroupOpened]
 *
 * @typedef {{ groupId: string, open: boolean }} ColumnGroupStateItem
 */

export {};
