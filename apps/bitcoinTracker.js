// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { mix, q_euler } from "@croquet/worldcore";
import { AM_Elected, PM_Elected} from "../src/DElected.js";
import { CardActor, CardPawn } from '../src/DCard.js';

export class BitcoinTracker extends mix(CardActor).with(AM_Elected) {
    get pawn() {return BitcoinTrackerDisplay;}
    init(options) {
        super.init(options);
        this.history = [{ date: 0, amount: 0 }];
        this.listen("BTC-USD", this.onBitcoinData);
        this.listen("BTC-USD-history", this.onBitcoinHistory);
    }

    get latest() {
        return this.history[ this.history.length - 1];
    }

    onBitcoinData({date, amount}) {
        if (date - this.latest.date < 1000) return;
        this.addEntries({date, amount});
        this.sayDeck("value-changed", amount);
    }

    onBitcoinHistory(prices) {
        const newer = prices.filter(p => p.date - this.latest.date > 25000);
        this.addEntries(...newer);
        this.sayDeck("value-init", newer.map(v=>v.amount));
    }

    addEntries(...data) {
        this.history.push(...data);
        if (this.history[0].date === 0) {this.history.shift();}
        if (this.history.length > 300) {this.history.shift();}
    }
}
BitcoinTracker.register("BitcoinTracker");

class BitcoinTrackerDisplay extends mix(CardPawn).with(PM_Elected) {
    constructor(actor) {
        super(actor);   // might call handleElected()
        this.lastAmount = 0;
        this.listenDeck("value-changed", this.onBTCUSDChanged);

        this.onBTCUSDChanged();
    }

    handleElected() {
        super.handleElected();
        this.fetchHistory().then(() => this.openSocket());
    }

    handleUnelected() {
        super.handleUnelected();
        this.closeSocket();
    }

    openSocket() {
        this.closeSocket();

        const host = "wss://ws.sfox.com/ws";
        const sub_msg = {"type": "subscribe", "feeds": ["ticker.sfox.btcusd"]};

        this.socket = new WebSocket(host);

        this.socket.onopen = () => {
            this.socket.send(JSON.stringify(sub_msg));
        };

        this.socket.onmessage = (evt) => {
            let last;
            try {
                last = JSON.parse(evt.data).payload.last;
            } catch(e) {
                console.log("invalid data");
            }
            if (last !== undefined) {
                this.say("BTC-USD", { date: Date.now(), amount: +last });
            }
        }
    }

    closeSocket() {
        if (this.socket) {
            this.socket.close();
        }
    }

    fetchHistory() {
        console.log("Fetching BTC-USD history from Coinbase...");
        return fetch(`https://api.coinbase.com/v2/prices/BTC-USD/historic?period=day`).then((response) => {
            return response.json();
        }).then((json) => {
            const prices = json.data.prices.map(price => ({ date: +new Date(price.time), amount: +price.price }));
            console.log("fetched %s prices", prices.length);
            const newer = prices.filter(price => price.date > this.actor.latest.date).slice(0, 20);
            newer.sort((a, b) => a.date - b.date);
            console.log("publishing %s latest prices", newer.length);
            this.say("BTC-USD-history", newer);
        });
    }
    
    onBTCUSDChanged() {
        // this is called on all views, not just the elected one
        let amount = this.actor.latest.amount;
        if(this.lastAmount === amount) return;
        let color = this.lastAmount > amount ? "#FF2222" : "#22FF22";
        this.lastAmount = amount;

        this.clear("#222222");
        let ctx = this.canvas.getContext('2d');
        ctx.textAlign = 'right';
        ctx.fillStyle = color;

        ctx.font = "40px Arial";
        ctx.fillText("BTC-USD", this.canvas.width - 40, 85);

        ctx.textAlign = 'center';
        ctx.font = "90px Arial";
        ctx.fillText("$" + amount.toFixed(2), this.canvas.width / 2, 100); //50+this.canvas.height/2);
        this.texture.needsUpdate = true;
        this.sayDeck('setColor', color);
    }

    clear(fill) {
        let ctx = this.canvas.getContext('2d');
        ctx.fillStyle = fill;
        ctx.fillRect( 0, 0, this.canvas.width, this.canvas.height );
    }
}

export class BitLogoCard extends CardActor {
    get pawn() {return BitLogoPawn;}
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
                translation: [-4, -0.5, -6],
                rotation: q_euler(0, Math.PI / 2, 0),
                scale: [4, 4, 4],
                type: "2d",
                textureType: "canvas",
                width: 1024,
                height: 768,
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
                type: "2d",
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
