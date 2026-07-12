# finosgrid AG Chrome Demo

Visual demo of Perspective datagrid with AG Grid–like chrome (Phase 1 + 2).

## Run

```bash
cd apps/ag-chrome-demo
npm install
npm start
```

Open [http://localhost:5180/](http://localhost:5180/).

`prestart` rebuilds the local datagrid bundle from
`perspective/packages/perspective-viewer-datagrid` (Quartz theme, floating/set
filters, column groups, sticky groups, conditional formatting).

## Toolbar

| Button | Action |
|---|---|
| Toggle column groups | Geography / Metrics header band |
| Sales conditional rule | Color Sales cells by thresholds |
| Toggle Region group_by | Tree groups + sticky group overlay |

Floating filter inputs sit under each column header; use ▾ for set filter.
