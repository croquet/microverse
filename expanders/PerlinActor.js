class PerlinActor {
    setup() {
        this.hashTable = this.generateHashTable();
        this.visible = true;
        this.initPerlin();
        this.updatePerlin();

        this.scriptListen("hiliteRequest", "hilite");
        this.scriptListen("unhiliteRequest", "unhilite");
        this.scriptListen("showHideRequest", "showHide");
        this.scriptListen("enterHiliteRequest", "enterHilite");
        this.scriptListen("leaveHiliteRequest", "leaveHilite");
    }

    hilite(p3d) {
        console.log("onPointerDown")
        this.say("hilite", 0x081808);
        this.downTargetId = p3d.targetId;
    }

    unhilite(p3d) {
        console.log("onPointerUp")
        this.say("hilite", 0x000000);
    }

    enterHilite(p3d) {
        this.say("hilite", 0x181808);
    }
    leaveHilite(p3d) {
        this.say("hilite", 0x000000);
    }

    initPerlin() {
        let r = this.currentRow = this.rows = 20;
        let c = this.columns = 20;
        let d = this.delta = 0.1;

        this.data = [...Array(this.rows).keys()].map(i => {
            return [...Array(this.columns).keys()].map(j => {
                return this.noise2D(i * d, j * d);
            });
        });
    }

    updatePerlin() {
        this.data.shift(); // dump the first row
        let d = this.delta;

        let row = [...Array(this.columns).keys()].map(i => {
            return this.noise2D(this.currentRow * d, i * d);
        });
        this.data.push(row); 
        this.currentRow++;
        this.say("updatePerlin", row);
        this.future(100).call("PerlinActor", "updatePerlin");
    }

    showHide() {
        this.visible = !this.visible;
        this.say("showMe", this.visible);
    }

    generateHashTable() {
        const table = [];
        this.items = [];
        for (let n = 0; n < 256; n++) {
            this.push({key: Math.random(), value: n});
        }
        while (!this.isEmpty()) {
            table.push(this.pop().value);
        }
        return table.concat(table);
    }

    signedNoise2D(x,y) {
        return this.noise2D(x, y) - 0.5;
    }

    noise2D(x,y) {
        const table = this.hashTable;
        const xInt = Math.floor(x);
        const yInt = Math.floor(y);
        const xf = x - xInt;
        const yf = y - yInt;
        const u = this.fade(xf);
        const v = this.fade(yf);
        const xi = xInt & 0xff;
        const yi = yInt & 0xff;
        const aa = table[table[xi    ] + yi];
        const ab = table[table[xi + 1] + yi];
        const ba = table[table[xi    ] + yi + 1];
        const bb = table[table[xi + 1] + yi + 1];

        const aaGrad = this.grad(aa, xf, yf);
        const abGrad = this.grad(ab, xf - 1, yf);
        const baGrad = this.grad(ba, xf, yf - 1);
        const bbGrad = this.grad(bb, xf - 1, yf - 1);

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
        switch (hash & 0x3) {
            case 0: return x + y;
            case 1: return x - y;
            case 2: return -x + y;
            case 3: return -x - y;
            default: return 0;
        }
    }

    comparator(a, b){
        return a.key < b.key;
    }

    isEmpty() {
        return (this.items.length === 0);
    }

    clear() {
        this.items.length = 0;
    }

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
    
