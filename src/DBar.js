// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { CardActor, CardPawn } from '../src/DCard.js';
import { THREE } from '@croquet/worldcore';

export class DBarGraphCard extends CardActor{
    init(...args){
        super.init(...args);
        this.values = [];
        this.listenDeck("value-changed", this.updateBars);
        this.listenDeck("value-init", this.initBars);
    }
    get length(){return this._length || 20}
    get height(){return this._height || 0.5}
    get pawn(){return DBarGraphPawn}
    get version(){return '0.05'}

    updateBars(value){
        this.values.shift();
        this.values.push(value);
        this.say('updateGraph');
    }

    initBars(values){
        let l = values.length-this.length;
        let v;
        if(l > 0){
            v = values.slice(l, values.length);
            while(v.length<this.length)v.unshift(0); // pad it with 0
            this.values = v;
        }
        this.say('updateGraph');
    }
    
}
DBarGraphCard.register('DBarGraphCard');

class DBarGraphPawn extends CardPawn{
    constructor(args) {
        super(args);
        this.constructBars();
        this.listen('updateGraph', this.updateGraph);
        this.listenDeck('setColor', this.setColor);
        this.updateGraph();
    }

    constructBars(){
        this.barGroup = new THREE.Group();
        let len = this.actor.length;
        let size = 1/len;

        this.base = new THREE.Mesh(new THREE.BoxGeometry(1, size/4, size, 2, 4, 2 ),
            new THREE.MeshStandardMaterial({color: this.actor.frameColor}));
        this.base.position.set(0, -size/4, 0);        
        this.barGroup.add(this.base);
        this.bar = new THREE.Mesh(new THREE.BoxGeometry(size*0.8, 1, size*0.8, 2, 2, 2 ),
        new THREE.MeshStandardMaterial({color: this.actor.color}));
        console.log("Actor color", this.actor.color)
        this.bars = [];
        for(let i=0; i<len; i++){
            let bar = this.bar.clone();
            bar.material = bar.material.clone()
            bar.position.set((0.5+i-len/2)*size, 0,0);
            this.barGroup.add(bar);
            this.bars.push(bar);
        }
        this.setRenderObject( this.barGroup );
    }

    setColor(color){        
        let c = new THREE.Color(color);
        this.base.material.color = c;
    }

    updateGraph(){
        let mn = Math.min(...this.actor.values);
        let mx = Math.max(...this.actor.values);
        let range = mx-mn;
        mn = Math.max(mn-range/10,0);
        range = mx-mn; //update this with the additional bit
        let dec = 10;
        for(let i=0; i<this.actor.length; i++){
            let d = this.actor.height* (this.actor.values[i] - mn)/range;
            this.bars[i].scale.set(1,d,1);
            this.bars[i].position.y = d/2;
        }
    }
}
