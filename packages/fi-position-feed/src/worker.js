// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ FI position feed — Web Worker (snapshot chunks → realtime patches)        ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import {
    buildFieldCatalog,
    createRng,
    generatePosition,
    generatePatch,
} from "./schema.js";

/** @type {{
 *   rowCount: number,
 *   minFields: number,
 *   chunkSize: number,
 *   updatesPerSec: number,
 *   batchSize: number,
 *   seed: number,
 * }} */
let config = {
    rowCount: 50_000,
    minFields: 300,
    chunkSize: 5_000,
    updatesPerSec: 1_000,
    batchSize: 100,
    seed: 42,
};

/** @type {ReturnType<typeof buildFieldCatalog>} */
let fields = [];
/** @type {() => number} */
let rng = createRng(42);
let updateSeq = 0;
/** @type {ReturnType<typeof setInterval>|null} */
let tickTimer = null;
let running = false;

function post(type, payload) {
    self.postMessage({ type, ...payload });
}

async function emitSnapshot() {
    fields = buildFieldCatalog(config.minFields);
    rng = createRng(config.seed);
    updateSeq = 0;
    post("schema", {
        fields,
        leafCount: fields.length,
        rowCount: config.rowCount,
    });

    const { rowCount, chunkSize } = config;
    for (let start = 0; start < rowCount; start += chunkSize) {
        if (!running) return;
        const end = Math.min(rowCount, start + chunkSize);
        /** @type {Record<string, any>[]} */
        const rows = [];
        for (let i = start; i < end; i++) {
            rows.push(generatePosition(i, fields, rng, { updateSeq: 0 }));
        }
        post("snapshot-chunk", {
            start,
            end,
            rows,
            done: end >= rowCount,
        });
        // Yield so the main thread can flatten/update between chunks
        await new Promise((r) => setTimeout(r, 0));
    }
    post("snapshot-complete", { rowCount });
}

function startRealtime() {
    stopRealtime();
    const { updatesPerSec, batchSize, rowCount } = config;
    if (updatesPerSec <= 0 || batchSize <= 0 || rowCount <= 0) return;

    const intervalMs = Math.max(16, Math.round((1000 * batchSize) / updatesPerSec));
    tickTimer = setInterval(() => {
        if (!running) return;
        /** @type {Record<string, any>[]} */
        const patches = [];
        // Bias ~70% of patches to the first window so a default (unsorted /
        // positionId-asc) viewport actually flickers under realtime load.
        const hotWindow = Math.min(200, rowCount);
        for (let b = 0; b < batchSize; b++) {
            const i =
                rng() < 0.7
                    ? Math.floor(rng() * hotWindow)
                    : Math.floor(rng() * rowCount);
            updateSeq += 1;
            const positionId = `FI-${String(i).padStart(6, "0")}`;
            patches.push(
                generatePatch(positionId, i, fields, rng, updateSeq),
            );
        }
        post("update-batch", { patches, updateSeq, batchSize: patches.length });
    }, intervalMs);
}

function stopRealtime() {
    if (tickTimer) {
        clearInterval(tickTimer);
        tickTimer = null;
    }
}

self.onmessage = async (ev) => {
    const msg = ev.data || {};
    if (msg.type === "start") {
        config = { ...config, ...(msg.config || {}) };
        running = true;
        stopRealtime();
        await emitSnapshot();
        if (running) startRealtime();
        return;
    }
    if (msg.type === "configure") {
        config = { ...config, ...(msg.config || {}) };
        if (running && tickTimer) {
            startRealtime();
        }
        post("configured", { config });
        return;
    }
    if (msg.type === "stop") {
        running = false;
        stopRealtime();
        post("stopped", {});
    }
};
