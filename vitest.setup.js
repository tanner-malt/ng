// Basic browser-like globals used by the game

// Polyfill localStorage for Node
if (typeof globalThis.localStorage === 'undefined') {
    globalThis.localStorage = {
        _store: {},
        getItem(k) { return Object.prototype.hasOwnProperty.call(this._store, k) ? this._store[k] : null; },
        setItem(k, v) { this._store[k] = String(v); },
        removeItem(k) { delete this._store[k]; },
        clear() { this._store = {}; },
    };
}

// Ensure window exists for modules expecting it
globalThis.window = globalThis.window || globalThis;

// Quiet noisy console during tests (opt-in by commenting out)
// const originalLog = console.log; console.log = (...args) => { if (String(args[0]).includes('[GameState]')) return; originalLog(...args); };
