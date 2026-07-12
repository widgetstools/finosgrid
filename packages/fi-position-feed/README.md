# @widgetstools/fi-position-feed

Worker-backed **fixed-income position** data feed for finosgrid.

- Nested **JSON** rows (real-feed shaped)
- **Flatten** translator → flat Perspective columns (`risk.dv01`, …)
- Runs generation in a **Web Worker**
- Emits a **snapshot** (default 50k rows, ≥300 fields), then **configurable realtime** patches

```js
import { createFIPositionFeed } from "@widgetstools/fi-position-feed";

const feed = createFIPositionFeed({
  async onSchema({ schema, columnDefs }) { /* create Perspective table + grid */ },
  async onSnapshotChunk({ flatRows }) { await table.update(flatRows); },
  async onUpdate({ flatRows }) { await table.update(flatRows); },
});

feed.start({
  rowCount: 50_000,
  minFields: 300,
  updatesPerSec: 1000,
  batchSize: 100,
});

// later
feed.configure({ updatesPerSec: 5000, batchSize: 250 });
```
