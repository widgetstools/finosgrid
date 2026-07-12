/**
 * AG Grid–compatible types for `@widgetstools/finosgrid/shell`.
 * Property names and defaults match ag-grid-community v35+ ColDef / ColGroupDef / GridOptions.
 */
export type ColumnGroupShowType = "open" | "closed";

/** Flat CSS map — same as AG Grid `HeaderStyle`. */
export type HeaderStyle = Record<string, string | number>;

export type HeaderClass =
    | string
    | string[]
    | ((params: Record<string, unknown>) => string | string[] | undefined);

export interface AbstractColDef {
    headerName?: string;
    headerStyle?: HeaderStyle | ((params: Record<string, unknown>) => HeaderStyle | null | undefined);
    headerClass?: HeaderClass;
    /** Omit ⇒ always visible. Only `'open' | 'closed'` are valid (AG Grid). */
    columnGroupShow?: ColumnGroupShowType;
    headerTooltip?: string;
    context?: any;
    wrapHeaderText?: boolean;
    autoHeaderHeight?: boolean;
    suppressColumnsToolPanel?: boolean;
    suppressFiltersToolPanel?: boolean;
}

export interface ColDef extends AbstractColDef {
    colId?: string;
    field?: string;
    width?: number;
    initialWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    hide?: boolean;
    filter?: boolean | string | object;
    floatingFilter?: boolean;
    sortable?: boolean;
    resizable?: boolean;
    /** `'left' | 'right' | true` — `true` pins left (AG). */
    pinned?: "left" | "right" | boolean | null;
    lockPinned?: boolean;
    suppressMovable?: boolean;
    editable?: boolean | ((params: any) => boolean);
    cellStyle?: object | ((params: any) => object | null | undefined);
    cellClass?: string | string[] | ((params: any) => string | string[] | undefined);
    cellClassRules?: Record<string, (params: any) => boolean>;
    valueGetter?: string | ((params: any) => any);
    valueFormatter?: string | ((params: any) => string);
    enableRowGroup?: boolean;
    enablePivot?: boolean;
    enableValue?: boolean;
    /** Set true to include this column in Perspective `group_by`. */
    rowGroup?: boolean;
    /** Explicit group order (lower first). */
    rowGroupIndex?: number;
    /** Aggregation when row grouping / pivot is active (maps to Perspective `aggregates`). */
    aggFunc?: string | ((params: any) => any) | null;
    defaultAggFunc?: string;
    allowedAggFuncs?: string[];
}

export interface ColGroupDef extends AbstractColDef {
    children: (ColDef | ColGroupDef)[];
    groupId?: string;
    /** @default false (AG Grid) */
    openByDefault?: boolean;
    marryChildren?: boolean;
    suppressStickyLabel?: boolean;
}

export interface ColumnGroupStateItem {
    groupId: string;
    open: boolean;
}

export interface GridOptions {
    columnDefs?: (ColDef | ColGroupDef)[];
    defaultColDef?: ColDef;
    defaultColGroupDef?: Partial<ColGroupDef>;
    rowData?: any[];
    floatingFilter?: boolean;
    /** AG: levels expanded by default (`0` none, `1` first, `-1` all). */
    groupDefaultExpanded?: number;
    autoGroupColumnDef?: ColDef;
    groupDisplayType?: "singleColumn" | "multipleColumns" | "groupRows" | "custom";
    /** When true, hide all row-group dimension columns from the body. */
    groupHideColumns?: boolean;
    /** When true (default), finest group keys expand to Perspective-filtered leaf rows. */
    enableDetailLeaves?: boolean;
    /** AG: when true, disable sticky total/subgroup rows while scrolling leaves. @default false */
    suppressGroupRowsSticky?: boolean;
    /**
     * AG: where subgroup total rows pin while sticky.
     * `'top'` | `'bottom'`; omit/`null` to hide group totals from sticky stacks.
     * @default 'bottom'
     */
    groupTotalRow?: "top" | "bottom" | null;
    /**
     * AG: where the grand total row pins while sticky.
     * `'top'` | `'bottom'`; omit/`null` to hide grand total from sticky stacks.
     * @default 'bottom'
     */
    grandTotalRow?: "top" | "bottom" | null;
    /** finosgrid extension: Perspective table — sort/filter/columns via View */
    table?: {
        view: (config: Record<string, unknown>) => Promise<{
            to_columns: () => Promise<Record<string, any[]>>;
            delete: () => Promise<void>;
        }>;
    };
    /** finosgrid extension: column-oriented loader; receives Perspective ViewConfig */
    loadColumns?: (
        fields: string[],
        viewConfig: {
            columns: string[];
            sort: Array<[string, string]>;
            filter: Array<[string, string, string]>;
            group_by?: string[];
            aggregates?: Record<string, string>;
            group_by_depth?: number;
        },
    ) =>
        | Record<string, any[]>
        | Promise<Record<string, any[]>>;
    onGridReady?: (event: { api: GridApi; type: string }) => void;
    onColumnGroupOpened?: (event: {
        api: GridApi;
        groupId?: string;
        opened?: boolean;
        columnGroupState: ColumnGroupStateItem[];
    }) => void;
    onRowGroupOpened?: (event: {
        api: GridApi;
        rowIndex: number;
        expanded: boolean;
        detail?: boolean;
    }) => void;
    onSortChanged?: (event: { api: GridApi }) => void;
    onFilterChanged?: (event: { api: GridApi }) => void;
    onColumnPinned?: (event: { api: GridApi }) => void;
    onColumnMoved?: (event: { api: GridApi }) => void;
    onColumnResized?: (event: { api: GridApi }) => void;
}

export interface ColumnStateItem {
    colId: string;
    width?: number;
    pinned?: "left" | "right" | null;
    sort?: "asc" | "desc" | null;
}

export interface GridApi {
    setGridOption(key: string, value: unknown): void;
    getGridOption(key: string): unknown;
    getColumnDefs(): (ColDef | ColGroupDef)[] | undefined;
    setColumnGroupOpened(group: string | { groupId?: string }, newValue: boolean): void;
    getColumnGroupState(): ColumnGroupStateItem[];
    setColumnGroupState(stateItems: ColumnGroupStateItem[]): void;
    resetColumnGroupState(): void;
    setColumnPinned(key: string | { field?: string }, pinned: "left" | "right" | null): void;
    applyColumnState(stateItems: ColumnStateItem[]): void;
    getColumnState(): ColumnStateItem[];
    /** Perspective ViewConfig fragment currently applied. */
    getViewConfig(): {
        columns: string[];
        sort: Array<[string, string]>;
        filter: Array<[string, string, string]>;
        group_by?: string[];
        aggregates?: Record<string, string>;
        group_by_depth?: number;
    };
    getRowGroupColumns(): string[];
    setColumnAggFunc(key: string | { field?: string }, aggFunc: string | null): void;
    refreshCells(): Promise<void>;
    destroy(): void | Promise<void>;
}

export declare function createGrid(
    eGridDiv: HTMLElement,
    gridOptions?: GridOptions,
): GridApi;

export declare function createShell(options: {
    container: HTMLElement;
    columnDefs: (ColDef | ColGroupDef)[];
    loadColumns?: GridOptions["loadColumns"];
    [key: string]: unknown;
}): {
    api: GridApi;
    el: Element | null;
    refresh: () => Promise<void>;
    destroy: () => void;
};
