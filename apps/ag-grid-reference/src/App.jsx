import { useMemo, useState, useCallback, useRef } from "react";
import { AgGridReact, AgGridProvider } from "ag-grid-react";
import { themeQuartz } from "ag-grid-community";
import { AllEnterpriseModule, LicenseManager } from "ag-grid-enterprise";

/**
 * Enterprise watermark is expected without a license key.
 * Set VITE_AG_GRID_LICENSE in .env.local if you have one.
 */
if (import.meta.env.VITE_AG_GRID_LICENSE) {
  LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE);
}

const modules = [AllEnterpriseModule];

const theme = themeQuartz.withParams({
  accentColor: "#2196f3",
  backgroundColor: "#ffffff",
  borderColor: "#dde2e6",
  browserColorScheme: "light",
  headerBackgroundColor: "#f5f7f7",
  headerFontWeight: 600,
  headerFontSize: 13,
  fontSize: 13,
  spacing: 6,
  oddRowBackgroundColor: "#fafbfc",
});

function makeRows(n = 800) {
  const regions = ["East", "West", "Central", "South"];
  const cats = ["Furniture", "Office Supplies", "Technology"];
  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      region: regions[i % regions.length],
      category: cats[i % cats.length],
      city: `City ${i % 40}`,
      product: `SKU-${(i % 60) + 1}`,
      sales: Math.round((Math.random() * 500 + 10) * 100) / 100,
      profit: Math.round((Math.random() * 200 - 50) * 100) / 100,
      quantity: (i % 12) + 1,
    });
  }
  return rows;
}

/**
 * Row-grouping reference: mirrors the finosgrid shell spike
 * (desk→sector ≈ region→category) so sticky + expand-to-leaf can be compared.
 */
export function App() {
  const gridRef = useRef(null);
  const [rowData] = useState(() => makeRows());
  const [suppressSticky, setSuppressSticky] = useState(false);
  const [groupDefaultExpanded, setGroupDefaultExpanded] = useState(1);
  const [groupTotalRow, setGroupTotalRow] = useState("bottom");
  const [grandTotalRow, setGrandTotalRow] = useState("bottom");

  const columnDefs = useMemo(
    () => [
      {
        field: "region",
        rowGroup: true,
        hide: true,
        rowGroupIndex: 0,
        enableRowGroup: true,
      },
      {
        field: "category",
        rowGroup: true,
        hide: true,
        rowGroupIndex: 1,
        enableRowGroup: true,
      },
      { field: "city", filter: "agTextColumnFilter" },
      { field: "product", filter: "agTextColumnFilter" },
      {
        field: "sales",
        filter: "agNumberColumnFilter",
        enableValue: true,
        aggFunc: "sum",
      },
      {
        field: "profit",
        filter: "agNumberColumnFilter",
        enableValue: true,
        aggFunc: "sum",
      },
      {
        field: "quantity",
        filter: "agNumberColumnFilter",
        enableValue: true,
        aggFunc: "sum",
      },
    ],
    [],
  );

  const defaultColDef = useMemo(
    () => ({
      flex: 1,
      minWidth: 110,
      sortable: true,
      resizable: true,
      floatingFilter: true,
      filter: true,
    }),
    [],
  );

  const autoGroupColumnDef = useMemo(
    () => ({
      headerName: "Region / Category",
      minWidth: 240,
      pinned: "left",
    }),
    [],
  );

  const sideBar = useMemo(
    () => ({
      toolPanels: [
        {
          id: "columns",
          labelDefault: "Columns",
          labelKey: "columns",
          iconKey: "columns",
          toolPanel: "agColumnsToolPanel",
        },
      ],
      defaultToolPanel: "",
    }),
    [],
  );

  const expandAll = useCallback(() => {
    gridRef.current?.api?.expandAll();
  }, []);

  const collapseAll = useCallback(() => {
    gridRef.current?.api?.collapseAll();
  }, []);

  const toggleSticky = useCallback(() => {
    setSuppressSticky((v) => {
      const next = !v;
      gridRef.current?.api?.setGridOption("suppressGroupRowsSticky", next);
      return next;
    });
  }, []);

  return (
    <AgGridProvider modules={modules}>
      <div className="app">
        <header className="app__bar">
          <div>
            <strong>AG Grid row grouping reference</strong>
            <span className="app__meta">
              v36 · region→category · sticky groups · expand to leaf rows
            </span>
          </div>
          <div className="app__actions">
            <button type="button" onClick={expandAll}>
              Expand all
            </button>
            <button type="button" onClick={collapseAll}>
              Collapse all
            </button>
            <button type="button" onClick={toggleSticky}>
              {suppressSticky ? "Enable sticky groups" : "Suppress sticky"}
            </button>
            <label className="app__check">
              groupTotalRow
              <select
                value={groupTotalRow}
                onChange={(e) => {
                  const v = e.target.value;
                  setGroupTotalRow(v);
                  gridRef.current?.api?.setGridOption("groupTotalRow", v);
                }}
              >
                <option value="bottom">bottom</option>
                <option value="top">top</option>
              </select>
            </label>
            <label className="app__check">
              grandTotalRow
              <select
                value={grandTotalRow}
                onChange={(e) => {
                  const v = e.target.value;
                  setGrandTotalRow(v);
                  gridRef.current?.api?.setGridOption("grandTotalRow", v);
                }}
              >
                <option value="bottom">bottom</option>
                <option value="top">top</option>
              </select>
            </label>
            <label className="app__check">
              Default expand
              <select
                value={groupDefaultExpanded}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setGroupDefaultExpanded(n);
                  gridRef.current?.api?.setGridOption(
                    "groupDefaultExpanded",
                    n,
                  );
                  gridRef.current?.api?.resetRowGroupExpansion?.();
                }}
              >
                <option value={0}>0 (collapsed)</option>
                <option value={1}>1 (regions)</option>
                <option value={-1}>-1 (all)</option>
              </select>
            </label>
            <a
              className="app__link"
              href="http://localhost:5182/"
              target="_blank"
              rel="noreferrer"
            >
              Open finosgrid shell
            </a>
          </div>
        </header>
        <p className="app__hint">
          Sticky group rows match normal row chrome. Use{" "}
          <code>groupTotalRow</code> / <code>grandTotalRow</code> (
          <code>top</code> or <code>bottom</code>) to place subgroup and grand
          totals. Headers stick at the top with expand/collapse; totals stick
          on the side you choose. Compare with finosgrid shell.
        </p>
        <div className="app__grid">
          <AgGridReact
            ref={gridRef}
            theme={theme}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            autoGroupColumnDef={autoGroupColumnDef}
            sideBar={sideBar}
            rowGroupPanelShow="always"
            groupDefaultExpanded={groupDefaultExpanded}
            suppressGroupRowsSticky={suppressSticky}
            animateRows
            cellSelection
            grandTotalRow={grandTotalRow}
            groupTotalRow={groupTotalRow}
          />
        </div>
      </div>
    </AgGridProvider>
  );
}
