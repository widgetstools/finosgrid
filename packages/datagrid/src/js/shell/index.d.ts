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
    editable?: boolean | ((params: any) => boolean);
    cellStyle?: object | ((params: any) => object | null | undefined);
    cellClass?: string | string[] | ((params: any) => string | string[] | undefined);
    cellClassRules?: Record<string, (params: any) => boolean>;
    valueGetter?: string | ((params: any) => any);
    valueFormatter?: string | ((params: any) => string);
    enableRowGroup?: boolean;
    enablePivot?: boolean;
    enableValue?: boolean;
    aggFunc?: string | ((params: any) => any) | null;
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
    /** finosgrid extension: column-oriented loader (Perspective, etc.) */
    loadColumns?: (
        fields: string[],
    ) =>
        | Record<string, any[]>
        | Promise<Record<string, any[]>>;
    onGridReady?: (event: { api: GridApi; type: string }) => void;
    onColumnGroupOpened?: (event: {
        api: GridApi;
        columnGroupState: ColumnGroupStateItem[];
    }) => void;
}

export interface GridApi {
    setGridOption(key: string, value: unknown): void;
    getGridOption(key: string): unknown;
    getColumnDefs(): (ColDef | ColGroupDef)[] | undefined;
    setColumnGroupOpened(group: string | { groupId?: string }, newValue: boolean): void;
    getColumnGroupState(): ColumnGroupStateItem[];
    setColumnGroupState(stateItems: ColumnGroupStateItem[]): void;
    resetColumnGroupState(): void;
    refreshCells(): Promise<void>;
    destroy(): void;
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
