import { RegisterMixin } from "@croquet/worldcore";

//------------------------------------------------------------------------------------------
//-- Perlin Noise Mixin --------------------------------------------------------------------
//------------------------------------------------------------------------------------------
const defaultComparator = (a, b) => a < b;

export const AM_PerlinNoise = superclass => class extends superclass {
    init(...args) {
        super.init(...args);
        this.generate();
    }

    generate() {
        this.hashTable = this.generateHashTable();
        console.log("generate")
    }

    generateHashTable() {
        const table = [];
        this.items = [];
        for (let n = 0; n < 256; n++) this.push({key: Math.random(), value: n});
        while (!this.isEmpty) table.push(this.pop().value);
        const table2 = table.concat(table);
        return table2;
    }

    signedNoise2D(x,y) {
        return this.noise2D(x,y) - 0.5;
    }

    noise2D(x,y) {
        const table = this.hashTable;
        const xInt= Math.floor(x);
        const yInt = Math.floor(y);
        const xf = x - xInt;
        const yf = y - yInt;
        const u = this.fade(xf);
        const v = this.fade(yf);
        const xi = xInt & 0xff;
        const yi = yInt & 0xff;
        const aa = table[table[xi   ] + yi];
        const ab = table[table[xi+1 ] + yi];
        const ba = table[table[xi   ] + yi+1];
        const bb = table[table[xi+1 ] + yi+1];

        const aaGrad = this.grad(aa, xf, yf);
        const abGrad = this.grad(ab, xf-1, yf);
        const baGrad = this.grad(ba, xf, yf-1);
        const bbGrad = this.grad(bb, xf-1, yf-1);

        const lerp0 = this.lerp(aaGrad, abGrad, u);
        const lerp1 = this.lerp(baGrad, bbGrad, u);

        return (this.lerp(lerp0, lerp1, v) + 1) / 2;
    }

    lerp(a, b, t) {
        return a + t * (b - a);
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    grad(hash, x, y) {
        switch (hash&0x3) {
            case 0: return x + y;
            case 1: return x - y;
            case 2: return -x + y;
            case 3: return -x - y;
            default: return 0;
        }
    }

    comparator(a, b){return a.key < b.key}

    get isEmpty() { return (this.items.length === 0); }
    get count() { return this.items.length; }
    get top() { return this.items[0]; }

    clear() { this.items.length = 0; }

    push(item) {
        let n = this.items.length;
        while (n > 0 && !this.comparator(this.items[n >> 1], item)) {
            this.items[n] = this.items[n >> 1];
            n >>= 1;
        }
        this.items[n] = item;
    }

    pop() {
        const top = this.items[0];
        const last = this.items.pop();
        if (this.items.length > 0) {
            this.items[0] = last;
            this.heapify(0);
        }
        return top;
    }

    traverse(callback) {
        this.items.forEach(callback);
    }

    heapify(n) {
        let m = n;
        const left = n << 1;
        const right = left + 1;
        if (left < this.items.length && this.comparator(this.items[left], this.items[m])) m = left;
        if (right < this.items.length && this.comparator(this.items[right], this.items[m])) m = right;
        if (m === n) return;
        const swap = this.items[n];
        this.items[n] = this.items[m];
        this.items[m] = swap;
        this.heapify(m);
    }
}
RegisterMixin(AM_PerlinNoise);