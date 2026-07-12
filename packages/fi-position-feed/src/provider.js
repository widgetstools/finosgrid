// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ FI position feed — main-thread provider (Worker host + flatten)           ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

import { flattenPositions } from "./flatten.js";
import {
    buildFieldCatalog,
    buildColumnDefs,
    toPerspectiveSchema,
} from "./schema.js";

/**
 * @typedef {object} FIPositionFeedConfig
 * @property {number} [rowCount]
 * @property {number} [minFields]
 * @property {number} [chunkSize]
 * @property {number} [updatesPerSec]
 * @property {number} [batchSize]
 * @property {number} [seed]
 */

/**
 * @typedef {object} FIPositionFeedHandlers
 * @property {(info: { fields: any[], leafCount: number, rowCount: number, schema: Record<string,string>, columnDefs: any[] }) => void|Promise<void>} [onSchema]
 * @property {(info: { flatRows: Record<string, any>[], start: number, end: number, done: boolean }) => void|Promise<void>} [onSnapshotChunk]
 * @property {(info: { rowCount: number }) => void|Promise<void>} [onSnapshotComplete]
 * @property {(info: { flatRows: Record<string, any>[], updateSeq: number }) => void|Promise<void>} [onUpdate]
 * @property {(err: Error) => void} [onError]
 */

const DEFAULTS = {
    rowCount: 50_000,
    minFields: 300,
    chunkSize: 5_000,
    updatesPerSec: 1_000,
    batchSize: 100,
    seed: 42,
};

/**
 * Host for the FI position Web Worker.
 * Nested JSON stays in the worker; this layer flattens for Perspective.
 *
 * @param {FIPositionFeedHandlers} [handlers]
 * @param {{ workerUrl?: URL|string }} [opts]
 */
export function createFIPositionFeed(handlers = {}, opts = {}) {
    /** @type {Worker|null} */
    let worker = null;
    let config = { ...DEFAULTS };
    /** @type {any[]} */
    let fields = [];
    let started = false;

    let msgChain = Promise.resolve();

    function ensureWorker() {
        if (worker) return worker;
        const url =
            opts.workerUrl ||
            new URL("./worker.js", import.meta.url);
        worker = new Worker(url, { type: "module" });
        worker.onmessage = (ev) => {
            const data = ev.data || {};
            msgChain = msgChain
                .then(() => handleMessage(data))
                .catch((e) => {
                    handlers.onError?.(
                        e instanceof Error ? e : new Error(String(e)),
                    );
                });
        };
        worker.onerror = (err) => {
            handlers.onError?.(
                err instanceof Error
                    ? err
                    : new Error(String(err?.message || err)),
            );
        };
        return worker;
    }

    async function handleMessage(msg) {
        try {
            if (msg.type === "schema") {
                fields = msg.fields || buildFieldCatalog(config.minFields);
                await handlers.onSchema?.({
                    fields,
                    leafCount: msg.leafCount ?? fields.length,
                    rowCount: msg.rowCount ?? config.rowCount,
                    schema: toPerspectiveSchema(fields),
                    columnDefs: buildColumnDefs(fields),
                });
                return;
            }
            if (msg.type === "snapshot-chunk") {
                const flatRows = flattenPositions(msg.rows || []);
                await handlers.onSnapshotChunk?.({
                    flatRows,
                    start: msg.start,
                    end: msg.end,
                    done: !!msg.done,
                });
                return;
            }
            if (msg.type === "snapshot-complete") {
                await handlers.onSnapshotComplete?.({
                    rowCount: msg.rowCount ?? config.rowCount,
                });
                return;
            }
            if (msg.type === "update-batch") {
                const flatRows = flattenPositions(msg.patches || []);
                await handlers.onUpdate?.({
                    flatRows,
                    updateSeq: msg.updateSeq,
                });
            }
        } catch (e) {
            handlers.onError?.(e instanceof Error ? e : new Error(String(e)));
        }
    }

    return {
        getConfig() {
            return { ...config };
        },

        /**
         * @param {Partial<FIPositionFeedConfig>} next
         */
        configure(next = {}) {
            config = { ...config, ...next };
            if (worker && started) {
                worker.postMessage({ type: "configure", config });
            }
            return this;
        },

        /**
         * @param {Partial<FIPositionFeedConfig>} [startConfig]
         */
        start(startConfig = {}) {
            config = { ...config, ...startConfig };
            const w = ensureWorker();
            started = true;
            w.postMessage({ type: "start", config });
            return this;
        },

        stop() {
            started = false;
            worker?.postMessage({ type: "stop" });
            return this;
        },

        destroy() {
            this.stop();
            worker?.terminate();
            worker = null;
        },

        getFields() {
            return fields;
        },
    };
}

export { flattenPositions, flattenPosition, flattenObject } from "./flatten.js";
export {
    buildFieldCatalog,
    buildColumnDefs,
    toPerspectiveSchema,
    generatePosition,
    createRng,
} from "./schema.js";
