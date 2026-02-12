/**
 * simplexNoise.js — Lightweight 2D simplex noise for terrain generation.
 * Exposes window.SimplexNoise class.
 * 
 * Usage:
 *   const noise = new SimplexNoise(seed);
 *   const value = noise.noise2D(x, y); // returns -1 to 1
 */

class SimplexNoise {
    constructor(seed) {
        this.perm = new Uint8Array(512);
        this.grad = [
            [1,1],[-1,1],[1,-1],[-1,-1],
            [1,0],[-1,0],[0,1],[0,-1]
        ];
        // Seed-based permutation
        const p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) p[i] = i;
        // Fisher-Yates shuffle with seeded RNG
        let s = seed | 0;
        for (let i = 255; i > 0; i--) {
            s = (s * 1103515245 + 12345) & 0x7fffffff;
            const j = s % (i + 1);
            [p[i], p[j]] = [p[j], p[i]];
        }
        for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    }

    _dot2(gi, x, y) {
        const g = this.grad[gi % 8];
        return g[0] * x + g[1] * y;
    }

    noise2D(xin, yin) {
        const F2 = 0.5 * (Math.sqrt(3) - 1);
        const G2 = (3 - Math.sqrt(3)) / 6;

        const s = (xin + yin) * F2;
        const i = Math.floor(xin + s);
        const j = Math.floor(yin + s);
        const t = (i + j) * G2;

        const X0 = i - t;
        const Y0 = j - t;
        const x0 = xin - X0;
        const y0 = yin - Y0;

        let i1, j1;
        if (x0 > y0) { i1 = 1; j1 = 0; }
        else { i1 = 0; j1 = 1; }

        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1.0 + 2.0 * G2;
        const y2 = y0 - 1.0 + 2.0 * G2;

        const ii = i & 255;
        const jj = j & 255;
        const gi0 = this.perm[ii + this.perm[jj]];
        const gi1 = this.perm[ii + i1 + this.perm[jj + j1]];
        const gi2 = this.perm[ii + 1 + this.perm[jj + 1]];

        let n0 = 0, n1 = 0, n2 = 0;

        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 > 0) { t0 *= t0; n0 = t0 * t0 * this._dot2(gi0, x0, y0); }

        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 > 0) { t1 *= t1; n1 = t1 * t1 * this._dot2(gi1, x1, y1); }

        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 > 0) { t2 *= t2; n2 = t2 * t2 * this._dot2(gi2, x2, y2); }

        // Scale to [-1, 1]
        return 70.0 * (n0 + n1 + n2);
    }

    /**
     * Fractal Brownian Motion — multi-octave noise.
     * @param {number} x
     * @param {number} y
     * @param {number} octaves - Number of layers (default 4)
     * @param {number} lacunarity - Frequency multiplier (default 2)
     * @param {number} gain - Amplitude multiplier (default 0.5)
     * @returns {number} value roughly in [-1, 1]
     */
    fbm(x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
        let sum = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxAmp = 0;
        for (let i = 0; i < octaves; i++) {
            sum += amplitude * this.noise2D(x * frequency, y * frequency);
            maxAmp += amplitude;
            amplitude *= gain;
            frequency *= lacunarity;
        }
        return sum / maxAmp;
    }
}

window.SimplexNoise = SimplexNoise;
