import { mix } from "@croquet/worldcore";
import { CanvasSurface, CanvasSurfacePawn} from "../src/DSurface.js";
import { AM_Elected, PM_Elected} from "../src/DElected.js";

export class BitcoinTracker extends mix(CanvasSurface).with(AM_Elected) {
    get pawn(){ return BitcoinTrackerDisplay }
    init(...args) {
        super.init(...args);
        this.listen("BTC-USD", this.onBitcoinData);
        this.listen("BTC-USD-history", this.onBitcoinHistory);
        this.history = [];
        this._width = 1024;
        this._height = 512;
    }

    get latest() { return this.history.length > 0 ? this.history[ this.history.length - 1] : { date: 0, amount: 0 }; }

    onBitcoinData({date, amount}) {
        if (date - this.latest.date < 25_000) return;
        this.history.push({date, amount});
        if (this.history.length > 300) this.history.shift();
        this.say("BTC-USD-changed");
    }

    onBitcoinHistory(prices) {
        const newer = prices.filter(p => p.date - this.latest.date > 25_000);
        this.history.push(...newer);
        while (this.history.length > 300) this.history.shift();
        this.say("BTC-USD-changed");
    }
}
BitcoinTracker.register("BitcoinTracker");


export class BitcoinTrackerDisplay extends mix(CanvasSurfacePawn).with(PM_Elected) {
    constructor(...args) {
        super(...args);   // might call handleElected()
        this.listen("BTC-USD-changed", this.onBTCUSDChanged);
    }

    handleElected() {
        super.handleElected();

        this.count = 0;

        if (Date.now() - this.actor.latest.date < 60_000) this.fetchSpot("on-elected");
        else this.fetchHistory();

        const id = setInterval(() => this.fetchSpot(id), 30_000);
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
        console.log("BTC-USD changed to %s", this.actor.latest.amount);
    }
}


