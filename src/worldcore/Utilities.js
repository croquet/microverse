//------------------------------------------------------------------------------------------
//-- PriorityQueue -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Implements a basic priority queue.

// If you wanted to set up a queue that sorted on key/value pairs it would look like this:
// const q = new PriorityQueue((a, b) => a.key < b.key);

const defaultComparator = (a, b) => a < b;

export class PriorityQueue {

    constructor(comparator = defaultComparator) {
        this.items = [];
        this.comparator = comparator;
    }

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

//------------------------------------------------------------------------------------------
//-- PerlinNoise -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class PerlinNoise  {
    constructor() {
        this.generate();
    }

    generate() {
        this.hashTable = this.generateHashTable();
    }

    generateHashTable() {
        const permutation = [];
        for (let n = 0; n < 256; n++) permutation.push({key: Math.random(), value: n});
        permutation.sort((a, b) => a.key - b.key);
        const table = permutation.map(a => a.value);
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

}


//------------------------------------------------------------------------------------------
//-- TwoWayMap -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Holds a reverse map that maps values back onto keys

export class TwoWayMap {
    constructor(map = new Map()) {
        this.map = map;
        this.rev = new Map();
        this.map.forEach((value, key) => { this.rev.set(value, key)})
    }

    clear() {
        this.map.clear();
        this.rev.clear();
    }

    set(key, value) {
        this.map.set(key, value);
        this.rev.set(value, key);
    }

    delete(key) {
        if (!this.map.has(key)) return;
        const value = this.map.get(key);
        this.map.delete(key);
        this.rev.delete(value);
    }

    get(key) { return this.map.get(key)}
    revGet(value) { return this.rev.get(value)}
    has(key) {return this.map.has(key)}
    revHas(value) {return this.rev.has(value)}

    forEach(callback) {this.map.forEach(callback)}
    revForEach(callback) {this.rev.forEach(callback)}
}

//------------------------------------------------------------------------------------------
//-- Shuffle -------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Returns an array of the specified length filled with random indices from 0 to length-1.
// Each index appears only once.

export function Shuffle(length) {
    const out = new Array(length);
    for (let n = 0; n < length; n++) out[n] = n;
    let n = length;
    while(n) {
        const pick = Math.floor(Math.random() * n--);
        const swap = out[n];
        out[n] = out[pick];
        out[pick] = swap;
    }
    return out;
}


// shuffle(deck) {
//     let size = deck.length;
//     while (size) {
//         const pick = Math.floor(Math.random() * size--);
//         const swap = deck[size];
//         deck[size] = deck[pick];
//         deck[pick] = swap;
//     }
// }
