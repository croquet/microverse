// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { mix, q_euler } from "@croquet/worldcore";
import { AM_Elected, PM_Elected} from "../src/DElected.js";
import { CardActor, CardPawn } from '../src/DCard.js';

export class BitcoinTracker extends mix(CardActor).with(AM_Elected) {
    get pawn(){ return BitcoinTrackerDisplay; }
    init(options) {
        super.init(options);
        this.listen("BTC-USD", this.onBitcoinData);
        this.listen("BTC-USD-history", this.onBitcoinHistory);
        this.history = [];
    }

    get latest() { return this.history.length > 0 ? this.history[ this.history.length - 1] : { date: 0, amount: 0 }; }

    onBitcoinData({date, amount}) {
        if (date - this.latest.date < 1000) return;
        this.history.push({date, amount});
        if (this.history.length > 300) this.history.shift();
        this.sayDeck("value-changed", amount);
    }

    onBitcoinHistory(prices) {
        const newer = prices.filter(p => p.date - this.latest.date > 25000);
        this.history.push(...newer);
        while (this.history.length > 300) this.history.shift();
        this.sayDeck("value-init", newer.map(v=>v.amount));
    }
}
BitcoinTracker.register("BitcoinTracker");

class BitcoinTrackerDisplay extends mix(CardPawn).with(PM_Elected) {
    constructor(actor) {
        super(actor);   // might call handleElected()
        this.lastAmount = 0;
        this.listenDeck("value-changed", this.onBTCUSDChanged);
        this.listenDeck("value-init", this.onBTCUSDChanged);
    }

    handleElected() {
        console.log("I AM ELECTED!")
        super.handleElected();

        this.count = 0;

        // if (Date.now() - this.actor.latest.date < 60_000) this.fetchSpot("on-elected");
        // else this.fetchHistory();
        this.fetchHistory();
        const id = setInterval(() => this.fetchSpot(id), 30000);
        this.interval = id;
    }

    handleUnelected() {
        super.handleUnelected();
        clearInterval(this.interval);
    }

    async fetchSpot(id){
        const host = "wss://ws.sfox.com/ws";
        const sub_msg = {"type": "subscribe", "feeds": ["ticker.sfox.btcusd"]};

        let BTC_View = this;
        let socket = new WebSocket(host);

        socket.onopen = function() {
            socket.send(JSON.stringify(sub_msg));
        };

        socket.onmessage = function(evt){
            var last_price = JSON.parse(evt.data).payload.last;
            if(typeof last_price !== "undefined"){
                BTC_View.say("BTC-USD", { date: Date.now(), amount: + last_price });
                console.log("last_price: ", last_price);
            }
        };

    }
/*
    async fetchSpot(id) {
        const count = ++this.count;
        // console.log("Fetching BTC-USD from Coinbase", id, count);
        const response = await fetch(`https://api.coinbase.com/v2/prices/BTC-USD/spot`);
        const json = await response.json();
        // console.log("Fetched BTC-USD from Coinbase", id, count, json);
        this.say("BTC-USD", { date: Date.now(), amount: +json.data.amount });
    }
*/
    
    async fetchHistory() {
        console.log("Fetching BTC-USD history from Coinbase...");
        const response = await fetch(`https://api.coinbase.com/v2/prices/BTC-USD/historic?period=day`);
        const json = await response.json();
        const prices = json.data.prices.map(price => ({ date: +new Date(price.time), amount: +price.price }));
        console.log("fetched %s prices", prices.length);
        const newer = prices.filter(price => price.date > this.actor.latest.date);
        console.log("publishing %s latest prices", newer.length);
        this.say("BTC-USD-history", newer);
    }

    onBTCUSDChanged() {
        // this is called on all views, not just the elected one
        
        let amount = this.actor.latest.amount;
        let color;
        if(this.lastAmount === amount)return;
        if(this.lastAmount > amount) color = "#FF2222";
        else color = "#22FF22";
        this.clear("#222222");
        let ctx = this.canvas.getContext('2d');
        ctx.textAlign = 'right';
        ctx.fillStyle = color;

        ctx.font = "40px Arial";
        ctx.fillText("BTC-USD", this.canvas.width - 40, 85);

        ctx.textAlign = 'center';        
        ctx.font = "90px Arial";
        ctx.fillText("$" + amount, this.canvas.width / 2, 100); //50+this.canvas.height/2);
        this.texture.needsUpdate = true;
        this.lastAmount = amount;
        this.sayDeck('setColor', color);
    }

    clear(fill){
        let ctx = this.canvas.getContext('2d');
        ctx.fillStyle = fill;
        ctx.fillRect( 0, 0, this.canvas.width, this.canvas.height );
    }
}

export class BitLogoCard extends CardActor {
    get pawn(){return BitLogoPawn}
    get version(){return '0.11'}
}
BitLogoCard.register('BitLogoCard');

class BitLogoPawn extends CardPawn {
    constructor(actor) {
        super(actor);
        this.listenDeck('setColor', this.setColor);
        this.removeEventListener("pointerWheel", "onPointerWheel");
    }
}

export function constructBitcoinTracker() {
    return [
        {
            card: {
                name: 'bitcointracker',
                className: "BitcoinTracker",
                translation: [-4, -0.5, 0],
                rotation: q_euler(0, Math.PI / 2, 0),
                scale: [4, 4, 4],
                type: "svg",
                dataLocation: './assets/SVG/credit-card.svg',
                textureType: "canvas",
                width: 1024,
                height: 512,
                frameColor: 0x666666,
                color: 0xffffff,
                depth: 0.05,
            },
            id: "main",
        },
        {
            card: {
                name:'bitlogo',
                className: "BitLogoCard",
                translation: [-0.35, 0.35, 0.1],
                scale: [0.25, 0.25, 0.25],
                parent: "main",
                type: "svg",
                dataLocation: './assets/SVG/BitcoinSign.svg',
                depth: 0.05,
                color: 0xffffff,
                frameColor: 0x666666,
            }
        },
        {
            card: {
                name:'bar graph',
                className: "DBarGraphCard",
                translation:[0, -0.3, 0.1],
                color: 0x8888ff,
                type: "object",
                name: "BarGraph",
                height: 0.4,
                parent: "main",
            }
        }
    ];   
}
