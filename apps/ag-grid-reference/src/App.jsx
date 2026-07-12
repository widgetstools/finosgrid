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
      sales: Math.round((Math.random() * 500 + 10) * 100) / 100,
      profit: Math.round((Math.random() * 200 - 50) * 100) / 100,
      quantity: (i % 12) + 1,
    });
  }
  return rows;
}

const salesCellStyle = (params) => {
  if (params.value == null) return null;
  if (params.value > 200) return { color: "#0b6e4f", backgroundColor: "#d8f3e7" };
  if (params.value < 50) return { color: "#8b1e1e", backgroundColor: "#fde2e1" };
  return null;
};

const profitCellClassRules = {
  " ag-cell-profit-neg": (p) => p.value < 0,
  "ag-cell-profit-pos": (p) => p.value >= 0,
};

export function App() {
  const gridRef = useRef(null);
  const [rowData] = useState(() => makeRows());
  const [pivotMode, setPivotMode] = useState(false);

  const columnDefs = useMemo(
    () => [
      {
        headerName: "Geography",
        children: [
          {
            field: "region",
            filter: "agSetColumnFilter",
            enableRowGroup: true,
            enablePivot: true,
          },
          {
            field: "city",
            filter: "agTextColumnFilter",
            enableRowGroup: true,
            enablePivot: true,
          },
        ],
      },
      {
        headerName: "Product",
        children: [
          {
            field: "category",
            filter: "agSetColumnFilter",
            enableRowGroup: true,
            enablePivot: true,
          },
        ],
      },
      {
        headerName: "Metrics",
        children: [
          {
            field: "sales",
            filter: "agNumberColumnFilter",
            enableValue: true,
            aggFunc: "sum",
            cellStyle: salesCellStyle,
          },
          {
            field: "profit",
            filter: "agNumberColumnFilter",
            enableValue: true,
            aggFunc: "sum",
            cellClassRules: profitCellClassRules,
          },
          {
            field: "quantity",
            filter: "agNumberColumnFilter",
            enableValue: true,
            aggFunc: "sum",
          },
        ],
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
      minWidth: 200,
      floatingFilter: true,
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
          toolPanelParams: {
            suppressRowGroups: false,
            suppressValues: false,
            suppressPivots: false,
            suppressPivotMode: false,
            suppressColumnFilter: false,
            suppressColumnSelectAll: false,
            suppressColumnExpandAll: false,
          },
        },
        {
          id: "filters",
          labelDefault: "Filters",
          labelKey: "filters",
          iconKey: "filter",
          toolPanel: "agFiltersToolPanel",
        },
      ],
      defaultToolPanel: "columns",
    }),
    [],
  );

  const togglePivot = useCallback(() => {
    setPivotMode((v) => {
      const next = !v;
      gridRef.current?.api?.setGridOption("pivotMode", next);
      return next;
    });
  }, []);

  return (
    <AgGridProvider modules={modules}>
      <div className="app">
        <header className="app__bar">
          <div>
            <strong>AG Grid Enterprise reference</strong>
            <span className="app__meta">v36 · Quartz · parity source for finosgrid</span>
          </div>
          <div className="app__actions">
            <button type="button" onClick={togglePivot}>
              {pivotMode ? "Exit pivot mode" : "Pivot mode"}
            </button>
            <a
              className="app__link"
              href="http://localhost:5180/"
              target="_blank"
              rel="noreferrer"
            >
              Open finosgrid demo
            </a>
          </div>
        </header>
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
            pivotPanelShow="always"
            animateRows
            cellSelection
          />
        </div>
      </div>
    </AgGridProvider>
  );
}
