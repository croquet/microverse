// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { CardActor, CardPawn } from '../src/DCard.js';
import { THREE } from '@croquet/worldcore';

export class DBarGraphCard extends CardActor{
    init(options) {
        super.init(options);
        this._cardData.values = options.values || [];
        this.listenDeck("value-changed", this.updateBars);
        this.listenDeck("value-init", this.initBars);
    }
    get length(){return this._length || 20}
    get height(){return this._height || 0.5}
    get pawn(){return DBarGraphPawn}
    get version(){return '0.05'}

    get values() {return this._cardData.values;}

    updateBars(value, notSay) {
        let values = this.values;
        values.push(value);
        if (values.length > this.length) {
            values.shift();
        }
        if (!notSay) {
            this.say('updateGraph');
        }
    }

    initBars(values) {
        values.forEach((value) => this.updateBars(value, true));
        this.say('updateGraph');
    }
}
DBarGraphCard.register('DBarGraphCard');

class DBarGraphPawn extends CardPawn{
    constructor(actor) {
        super(actor);
        this.constructBars();
        this.listen('updateGraph', this.updateGraph);
        this.listenDeck('setColor', this.setColor);
        this.updateGraph();
        this.removeEventListener("pointerWheel", "onPointerWheel");
    }

    constructBars() {
        this.barGroup = this.shape;
        let len = this.actor.length;
        let size = 1/len;
        let color = this.actor._cardData.color;
        this.base = new THREE.Mesh(
            new THREE.BoxGeometry(1, size/4, size, 2, 4, 2 ),
            new THREE.MeshStandardMaterial());
        this.base.position.set(0, -size/4, 0);        
        this.barGroup.add(this.base);
        this.bar = new THREE.Mesh(
            new THREE.BoxGeometry(size*0.8, 1, size*0.8, 2, 2, 2 ),
            new THREE.MeshStandardMaterial({color: color, emmisive: color}));
        this.bars = [];
        for(let i=0; i<len; i++){
            let bar = this.bar.clone();
            bar.material = bar.material.clone();
            bar.position.set((0.5+i-len/2)*size, 0,0);
            this.barGroup.add(bar);
            this.bars.push(bar);
        }
    }

    setColor(color) {
        let c = new THREE.Color(color);
        this.base.material.color = c;
        this.base.material.emissive = c;
    }

    updateGraph(){
        let mn = Math.min(...this.actor.values);
        let mx = Math.max(...this.actor.values);
        let range = mx-mn;
        mn = Math.max(mn-range/10,0);
        range = mx-mn; //update this with the additional bit


        this.bars.forEach((b, i) => {
            let d = this.actor.height * (this.actor.values[i] - mn)/range;
            b.scale.set(1,d,1);
            b.position.y = d/2;
        });
    }
}
