import { THREE, Actor, Pawn, AM_Spatial, PM_Spatial, RegisterMixin, mix } from "@croquet/worldcore";
import { PM_ThreeVisibleLayer } from './DLayerManager.js';
import { AM_Events, PM_Events } from './DEvents.js';
import { D } from './DConstants.js';
//------------------------------------------------------------------------------------------
//-- Perlin Noise Mixin --------------------------------------------------------------------
//------------------------------------------------------------------------------------------
const defaultComparator = (a, b) => a < b;
const CardColor = 0x9999cc;  // light blue
const OverColor = 0xffff77;   // yellow
const DownColor = 0x88ff88; // green
const NoColor =0x000000; // black

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


export class PerlinActor extends mix(Actor).with(AM_Spatial, AM_PerlinNoise, AM_Events){
    get pawn() {return PerlinPawn}
    init(...args) {
        this.visible = true;
        super.init(...args);
        this.initPerlin(); // call this before init. PerlinPawn requires this.
        this.future(1000).updatePerlin();
        this.listen("showHide", this.showHide);
        this.visible = false;
        //this._translation = [0, -2.75, -10];
        //this.group.rotation.y = Math.PI/2;
    }

    onPointerDown(p3d){
        this.say("doPointerDown", p3d);
    }
    onPointerUp(p3d){
        if(p3d && p3d.sameTarget)this.showHide();
        this.say("doPointerUp", p3d);
    }
    onPointerEnter(p3d){
        this.say("doPointerEnter", p3d);
    }
    onPointerLeave(p3d){
        this.say("doPointerLeave", p3d);
    }    
    initPerlin(){
        let r = this.currentRow = this.rows=20;
        let c = this.columns=20;
        let d = this.delta=0.1;
        this.data=[];
        let i,j;
        for(i=0;i<this.rows;i++){
            this.data[i]=[];
            for(j=0;j<this.columns;j++){
                this.data[i].push(this.noise2D(i*d,j*d));
            }
        }
    }

    updatePerlin(){
        this.data.shift(); // dump the first row
        let row = [];
        let d = this.delta;
        for(let i=0;i<this.columns;i++)
            row.push(this.noise2D(this.currentRow*d, i*d));
        this.data.push(row); 
        this.currentRow++;
        this.say("updatePerlin", row);
        this.future(100).updatePerlin();    
    }

    showHide(){
        this.visible = !this.visible;
        this.say("showMe", this.visible);
    }

}
PerlinActor.register('PerlinActor');

const maxHeight = 8;
const barScale = 0.25;

class PerlinPawn extends mix(Pawn).with(PM_Spatial, PM_Events, PM_ThreeVisibleLayer){
    constructor(...args) {
        super(...args);
        this.listen("updatePerlin", this.updatePerlin);
        this.listen("showMe", this.showMe);
        this.isConstructed = false;
        this.perlin = true;
        this.listen("doPointerUp", this.doPointerUp);
        this.listen("doPointerDown", this.doPointerDown);
        this.listen("doPointerEnter", this.doPointerEnter);
        this.listen("doPointerLeave", this.doPointerLeave);
    }

    doPointerDown(p3d){ this.hilite(DownColor);}
    doPointerUp(p3d){this.hilite(NoColor);}
    doPointerEnter(p3d){this.hilite(OverColor);}
    doPointerLeave(p3d){this.hilite(NoColor);}

    updatePerlin(row){

        const r = this.actor.rows;
        const s = barScale;
        if(this.isConstructed){
            let rg = this.rowGeometry.shift();
            this.rowGeometry.push(rg);
            for(let i=0; i<rg.children.length;i++){
                this.setBar(rg.children[i],row[i],r,i);
            }
            for(let i=0; i< r; i++){
                this.rowGeometry[i].position.set(0,s/4,(i-r/2)*s);
            }
            
        }
        else this.constructPerlin();
    }

    constructPerlin(){
        console.log("constructPerlin", this.actor, this.actor.rows, this.actor.columns);
        const data = this.actor.data;
        const r = this.actor.rows;
        const c = this.actor.columns;
        const s = barScale;

        this.group = new THREE.Group();
        this.perlinGroup = new THREE.Group();
        this.group.add(this.perlinGroup);

        this.buttonSphere = new THREE.Mesh(new THREE.SphereGeometry(0.5,32,16), 
            new THREE.MeshStandardMaterial());
        this.buttonSphere.position.y = 3;
        this.group.add(this.buttonSphere);

        this.color = new THREE.Color();
        this.base = new THREE.Mesh(new THREE.BoxGeometry((r+2)*s, s/2, (c+2)*s, 2, 10, 2 ),
            new THREE.MeshStandardMaterial({color: this.color.getHex()}));
        this.base.position.set(-s/2, 0, -s/2);
        this.bar = new THREE.Mesh(new THREE.BoxGeometry(s, s, s, 1, 10, 1 ),
            new THREE.MeshStandardMaterial({color: this.color.getHex()}));
        this.base.layers.enable(1); // use this for raycasting
        this.base.castShadow = true;
        this.base.receiveShadow = true;
        this.perlinGroup.add(this.base);

        this.layer = D.EVENT;
        this.setRenderObject( this.group );

        this.rowGeometry = [];
        for(let i=0; i<r; i++){
            let rGroup = new THREE.Group();
            rGroup.position.set(0,s/4,(i-r/2)*s);
            for(let j=0; j<c;j++){
                let bar = this.bar.clone();
                bar.material = bar.material.clone();
                let d = data[i][j];
                this.setBar(bar, d, r, j);
                rGroup.add(bar);
            }
            this.rowGeometry.push(rGroup);
            this.perlinGroup.add(rGroup);
        }
        this.perlinGroup.visible=this.actor.visible;
        this.isConstructed=true;
    }

    setBar(bar, d, rlength, j){
        const s = barScale;
        //bar.material.color.setRGB((1-d)/2, 1-d*d, (1+d)/2);
        let b= Math.cos((1-d)*Math.PI); b=Math.min(1,(b+1)/1.25);
        let g= Math.sin(d*Math.PI); g=(g+1)/2.2;
        let r= Math.cos(d*Math.PI); r=Math.min(1, (r+1)/1.25);

        bar.material.color.setRGB(r, g, b);
        d=d*maxHeight;
        bar.position.set((j-rlength/2)*s, s*d/2, 0);
        bar.scale.set(1, d, 1);
    }

    hilite(color) { 
        this.buttonSphere.material.emissive = new THREE.Color(color);
    }
    showMe(visible){
        console.log(visible);
        this.perlinGroup.visible=visible;
    }
}
