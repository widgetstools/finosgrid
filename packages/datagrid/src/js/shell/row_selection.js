// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ Shell — row selection controller (AG RowSelectionModule subset)           ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

/**
 * @param {object} options
 * @param {() => import('./selection_options.js').RowSelectionOptions|null} options.getOptions
 * @param {() => any[]} [options.getRowNodes] — raw node stubs; attached with selection API
 * @param {(e: { node: any }) => void} [options.onRowSelected]
 * @param {(e: { selectedNodes: any[], source?: string }) => void} [options.onSelectionChanged]
 */
export function createRowSelectionController({
    getOptions,
    getRowNodes = () => [],
    onRowSelected,
    onSelectionChanged,
} = {}) {
    /** @type {Map<string, boolean|undefined>} */
    const selected = new Map();
    /** @type {any[]} */
    let attached = [];

    function opts() {
        return getOptions?.() || null;
    }

    function nodeId(node, fallbackIndex = 0) {
        if (node?.id != null) return String(node.id);
        if (node?.key != null) return `key:${node.key}`;
        return `idx:${fallbackIndex}`;
    }

    function isSelectable(node) {
        const o = opts();
        if (!o) return false;
        if (typeof o.isRowSelectable === "function") {
            return !!o.isRowSelectable(node);
        }
        return true;
    }

    function fireSelectionChanged(source = "api") {
        onSelectionChanged?.({
            selectedNodes: getSelectedNodes(),
            source,
        });
    }

    /**
     * Attach selection methods onto node stubs (mutates nodes).
     * @param {any[]} nodes
     */
    function attachNodes(nodes) {
        attached = nodes || [];
        attached.forEach((node, i) => {
            const id = nodeId(node, i);
            if (node.id == null) node.id = id;
            node.isSelected = () => {
                if (!selected.has(id)) return false;
                return selected.get(id);
            };
            node.setSelected = (newValue, clearSelection = false) => {
                setNodeSelected(node, !!newValue, {
                    clearSelection: !!clearSelection,
                    source: "api",
                });
            };
        });
        return attached;
    }

    function getAttachedOrFresh() {
        const fresh = getRowNodes() || [];
        if (fresh.length && fresh !== attached) {
            // Re-attach if caller rebuilt nodes
            const needAttach = fresh.some((n) => typeof n.setSelected !== "function");
            if (needAttach) attachNodes(fresh);
            else attached = fresh;
        } else if (!attached.length && fresh.length) {
            attachNodes(fresh);
        }
        return attached.length ? attached : fresh;
    }

    /**
     * @param {any} node
     * @param {boolean} newValue
     * @param {{ clearSelection?: boolean, source?: string, silent?: boolean }} [meta]
     */
    function setNodeSelected(node, newValue, meta = {}) {
        const o = opts();
        if (!o || !node) return;
        const id = nodeId(node);
        if (newValue && !isSelectable(node)) return;

        if (newValue && (o.mode === "singleRow" || meta.clearSelection)) {
            selected.clear();
        }

        const prev = selected.get(id);
        if (newValue) selected.set(id, true);
        else selected.delete(id);

        if (!meta.silent && prev !== newValue) {
            onRowSelected?.({ node });
        }

        // groupSelects descendants
        if (
            newValue &&
            o.mode === "multiRow" &&
            (o.groupSelects === "descendants" ||
                o.groupSelects === "filteredDescendants") &&
            node.group &&
            Array.isArray(node.childrenAfterGroup)
        ) {
            for (const child of node.childrenAfterGroup) {
                setNodeSelected(child, true, { silent: true, source: meta.source });
            }
        }

        if (!meta.silent) fireSelectionChanged(meta.source || "api");
    }

    function getSelectedNodes() {
        const nodes = getAttachedOrFresh();
        return nodes.filter((n) => selected.get(nodeId(n)) === true);
    }

    function getSelectedRows() {
        return getSelectedNodes()
            .map((n) => n.data)
            .filter((d) => d != null);
    }

    function setNodesSelected({ nodes, newValue }) {
        const o = opts();
        if (!o) return;
        if (o.mode === "singleRow" && newValue) {
            selected.clear();
            const first = (nodes || []).find((n) => isSelectable(n));
            if (first) setNodeSelected(first, true, { source: "apiSetNodes" });
            return;
        }
        for (const n of nodes || []) {
            setNodeSelected(n, !!newValue, { silent: true, source: "apiSetNodes" });
        }
        fireSelectionChanged("apiSetNodes");
    }

    function selectAll(_mode) {
        const o = opts();
        if (!o) return;
        const nodes = getAttachedOrFresh();
        if (o.mode === "singleRow") {
            const first = nodes.find((n) => isSelectable(n));
            selected.clear();
            if (first) setNodeSelected(first, true, { source: "apiSelectAll" });
            return;
        }
        for (const n of nodes) {
            if (isSelectable(n)) selected.set(nodeId(n), true);
        }
        fireSelectionChanged("apiSelectAll");
    }

    function deselectAll(_mode) {
        selected.clear();
        fireSelectionChanged("apiSelectAll");
    }

    /**
     * Click / keyboard selection helper.
     * @param {any} node
     * @param {{ ctrlKey?: boolean, metaKey?: boolean, shiftKey?: boolean }} [ev]
     */
    function handleRowClick(node, ev = {}) {
        const o = opts();
        if (!o || !node) return;
        const clickMode = o.enableClickSelection;
        if (!clickMode && !o.enableSelectionWithoutKeys) return;

        const allowSelect =
            clickMode === true ||
            clickMode === "enableSelection" ||
            o.enableSelectionWithoutKeys;
        const allowDeselect =
            clickMode === true || clickMode === "enableDeselection";

        const isSel = selected.get(nodeId(node)) === true;
        const multi =
            o.mode === "multiRow" &&
            (ev.ctrlKey || ev.metaKey || o.enableSelectionWithoutKeys);

        if (isSel && allowDeselect && (multi || o.mode === "singleRow")) {
            setNodeSelected(node, false, { source: "rowClicked" });
            return;
        }
        if (!isSel && allowSelect) {
            setNodeSelected(node, true, {
                clearSelection: !multi && o.mode === "multiRow" && !ev.shiftKey,
                source: "rowClicked",
            });
        }
    }

    function clear() {
        selected.clear();
    }

    return {
        attachNodes,
        getRowNodes: getAttachedOrFresh,
        getSelectedNodes,
        getSelectedRows,
        setNodesSelected,
        selectAll,
        deselectAll,
        handleRowClick,
        isSelectable,
        clear,
        /** @param {string} id */
        isIdSelected(id) {
            return selected.get(String(id)) === true;
        },
        /** Expose for body paint by virtual row index mapping */
        getSelectedIdSet() {
            return new Set(selected.keys());
        },
    };
}
