const fs = require('fs');
const path = require('path');
const events = require('events');

const MB = 1024 * 1024;
const DEFAULTS = {
    checkEveryMs: 60 * 1000,
    tempEveryMs: 5 * 60 * 1000,
    tempMaxAgeMs: 30 * 60 * 1000,
    heapWarnMb: 512,
    heapHardMb: 768,
    maxTempEntries: 2500
};

const asPositiveNumber = (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
};

function cleanupTempDir(tempDir, { maxAgeMs = DEFAULTS.tempMaxAgeMs, maxEntries = DEFAULTS.maxTempEntries } = {}) {
    if (!tempDir || !fs.existsSync(tempDir)) return { removed: 0, bytes: 0 };

    let entries;
    try { entries = fs.readdirSync(tempDir, { withFileTypes: true }); } catch (_) { return { removed: 0, bytes: 0 }; }

    const now = Date.now();
    const files = [];
    for (const entry of entries) {
        if (!entry.isFile()) continue;
        const fullPath = path.join(tempDir, entry.name);
        try {
            const stat = fs.statSync(fullPath);
            files.push({ fullPath, mtime: stat.mtimeMs, size: stat.size });
        } catch (_) {}
    }

    files.sort((a, b) => a.mtime - b.mtime);
    const victims = files.filter(file => now - file.mtime >= maxAgeMs);
    if (files.length > maxEntries) victims.push(...files.slice(0, files.length - maxEntries));

    const seen = new Set();
    let removed = 0;
    let bytes = 0;
    for (const file of victims) {
        if (seen.has(file.fullPath)) continue;
        seen.add(file.fullPath);
        try {
            fs.unlinkSync(file.fullPath);
            removed += 1;
            bytes += file.size;
        } catch (_) {}
    }
    return { removed, bytes };
}

function installProcessGuards({ log = console.error, onMemoryPressure } = {}) {
    if (global.__FAIZAN_PROCESS_GUARDS__) return global.__FAIZAN_PROCESS_GUARDS__;

    const safeLog = (message, type = 'error') => {
        try { log(message, type); } catch (_) { console.error(message); }
    };

    process.setMaxListeners?.(50);
    events.defaultMaxListeners = Math.max(events.defaultMaxListeners || 10, 50);

    const onUncaughtException = (error) => {
        safeLog(`Uncaught exception: ${error?.stack || error?.message || error}`, 'error');
        try { global.gc?.(); } catch (_) {}
        try { onMemoryPressure?.('uncaughtException'); } catch (_) {}
    };
    const onUnhandledRejection = (reason) => {
        safeLog(`Unhandled rejection: ${reason?.stack || reason?.message || reason}`, 'error');
    };

    process.on('uncaughtException', onUncaughtException);
    process.on('unhandledRejection', onUnhandledRejection);

    const guards = {
        onUncaughtException,
        onUnhandledRejection,
        dispose() {
            process.off('uncaughtException', onUncaughtException);
            process.off('unhandledRejection', onUnhandledRejection);
            if (guards.timer) clearInterval(guards.timer);
            if (guards.tempTimer) clearInterval(guards.tempTimer);
            delete global.__FAIZAN_PROCESS_GUARDS__;
        }
    };
    global.__FAIZAN_PROCESS_GUARDS__ = guards;
    return guards;
}

function startRuntimeMonitor({
    log = console.error,
    getSockets = () => [],
    getStates = () => [],
    getTempDirs = () => [],
    onMemoryPressure,
    onStalled,
    options = {}
} = {}) {
    const settings = {
        ...DEFAULTS,
        checkEveryMs: asPositiveNumber(process.env.RUNTIME_CHECK_MS, DEFAULTS.checkEveryMs),
        tempEveryMs: asPositiveNumber(process.env.TEMP_CLEANUP_MS, DEFAULTS.tempEveryMs),
        tempMaxAgeMs: asPositiveNumber(process.env.TEMP_MAX_AGE_MS, DEFAULTS.tempMaxAgeMs),
        heapWarnMb: asPositiveNumber(process.env.HEAP_WARN_MB, DEFAULTS.heapWarnMb),
        heapHardMb: asPositiveNumber(process.env.HEAP_HARD_MB, DEFAULTS.heapHardMb),
        ...options
    };
    let pressureInProgress = false;

    const check = () => {
        const usage = process.memoryUsage();
        const heapUsedMb = usage.heapUsed / MB;
        const rssMb = usage.rss / MB;
        if (heapUsedMb >= settings.heapWarnMb || rssMb >= settings.heapHardMb) {
            if (!pressureInProgress) {
                pressureInProgress = true;
                try { log(`Memory pressure: heap=${heapUsedMb.toFixed(1)}MB rss=${rssMb.toFixed(1)}MB`, 'warning'); } catch (_) {}
                try { global.gc?.(); } catch (_) {}
                try { onMemoryPressure?.({ heapUsedMb, rssMb, hard: heapUsedMb >= settings.heapHardMb || rssMb >= settings.heapHardMb }); } catch (_) {}
                setTimeout(() => { pressureInProgress = false; }, settings.checkEveryMs).unref?.();
            }
        }

        const now = Date.now();
        for (const state of getStates() || []) {
            if (!state || !state.lastActivityAt || state.restartInProgress) continue;
            if (now - state.lastActivityAt > state.stallTimeoutMs) {
                try { onStalled?.(state); } catch (_) {}
            }
        }
        // Keep references bounded if a socket is removed during a reconnect race.
        for (const [number, socket] of getSockets() || []) {
            if (!socket || socket.user == null) {
                try { socket.ws?.close?.(); } catch (_) {}
                try { log(`Removed stale socket reference: ${number}`, 'warning'); } catch (_) {}
            }
        }
    };

    const cleanTemp = () => {
        let removed = 0;
        let bytes = 0;
        for (const dir of getTempDirs() || []) {
            const result = cleanupTempDir(dir, { maxAgeMs: settings.tempMaxAgeMs, maxEntries: settings.maxTempEntries });
            removed += result.removed;
            bytes += result.bytes;
        }
        if (removed) {
            try { log(`Temp cleanup removed ${removed} files (${(bytes / MB).toFixed(1)}MB)`, 'info'); } catch (_) {}
        }
    };

    const timer = setInterval(check, settings.checkEveryMs);
    const tempTimer = setInterval(cleanTemp, settings.tempEveryMs);
    timer.unref?.();
    tempTimer.unref?.();
    check();
    cleanTemp();
    return { timer, tempTimer, check, cleanTemp, settings };
}

module.exports = { cleanupTempDir, installProcessGuards, startRuntimeMonitor };
