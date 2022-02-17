import { mix } from "@croquet/worldcore";
import { AM_Elected, PM_Elected} from "../src/DElected.js";
import { DCardActor, DCardPawn } from '../src/DCard.js';
export class BitcoinTracker extends mix(DCardActor).with(AM_Elected) {
    get pawn(){ return BitcoinTrackerDisplay; }
    init(options) {
        super.init(options);
        this.listen("BTC-USD", this.onBitcoinData);
        this.listen("BTC-USD-history", this.onBitcoinHistory);
        this.history = [];
        this.setupLogo();
    }

    setupLogo() {
        this.logo = BitLogoCard.create({
            shapeURL: './assets/SVG/BitcoinSign.svg',
            type: "shape",
            shadow: true,
            depth: 0.05,
            color: 0xffffff,
            frameColor: 0x666666,
            translation: [-0.35, 0.35, 0.1],
            scale: [0.25, 0.25, 0.25],
            parent: this,
            noSave: true,
        });
    }

    get latest() { return this.history.length > 0 ? this.history[ this.history.length - 1] : { date: 0, amount: 0 }; }

    onBitcoinData({date, amount}) {
        if (date - this.latest.date < 25000) return;
        this.history.push({date, amount});
        if (this.history.length > 300) this.history.shift();
        this.say("BTC-USD-changed");
    }

    onBitcoinHistory(prices) {
        const newer = prices.filter(p => p.date - this.latest.date > 25000);
        this.history.push(...newer);
        while (this.history.length > 300) this.history.shift();
        this.say("BTC-USD-changed");
    }
}
BitcoinTracker.register("BitcoinTracker");

export class BitcoinTrackerDisplay extends mix(DCardPawn).with(PM_Elected) {
    constructor(actor) {
        super(actor);   // might call handleElected()
        this.lastAmount = 0;
        this.listen("BTC-USD-changed", this.onBTCUSDChanged);
    }

    handleElected() {
        console.log("I AM ELECTED!")
        super.handleElected();

        this.count = 0;

//        if (Date.now() - this.actor.latest.date < 60_000) this.fetchSpot("on-elected");
//        else this.fetchHistory();
        this.fetchHistory();
        const id = setInterval(() => this.fetchSpot(id), 30000);
        this.interval = id;
    }

    handleUnelected() {
        super.handleUnelected();
        clearInterval(this.interval);
    }

    async fetchSpot(id) {
        const count = ++this.count;
        console.log("Fetching BTC-USD from Coinbase", id, count);
        const response = await fetch(`https://api.coinbase.com/v2/prices/BTC-USD/spot`);
        const json = await response.json();
        console.log("Fetched BTC-USD from Coinbase", id, count, json);
        this.say("BTC-USD", { date: Date.now(), amount: +json.data.amount });
    }

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
        if(this.lastAmount>amount)color = "#FF2222";
        else color = "#22FF22";
        this.clear("#222222");
        let ctx = this.canvas.getContext('2d');
        ctx.textAlign = 'center';
        ctx.fillStyle = color;
        ctx.font = "60px Arial";
        ctx.fillText("BTC-USD", this.canvas.width/2, 80);
        ctx.font = "100px Arial";
        ctx.fillText("$"+amount, this.canvas.width/2, 50+this.canvas.height/2);
        this.texture.needsUpdate=true;
        this.lastAmount = amount;
        this.sayDeck('setColor', color);
    }

    clear(fill){
        let ctx = this.canvas.getContext('2d');
        ctx.fillStyle = fill;
        ctx.fillRect( 0, 0, this.canvas.width, this.canvas.height );
    }
}

class BitLogoCard extends DCardActor{
    get pawn(){return BitLogoPawn}
    get version(){return '0.11'}
}
BitLogoCard.register('BitLogoCard');

class BitLogoPawn extends DCardPawn {
    constructor(actor) {
        super(actor);
        this.shape.name = "bitlogo";
        this.listenDeck('setColor', this.setColor);
    }
}
