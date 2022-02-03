import { Model, View } from "@croquet/worldcore";

export class ElectedViewModel extends Model {
    init(options) {
        super.init(options);
        this.views = new Set();
        this.subscribe(this.sessionId, "view-join", this.viewJoined);
        this.subscribe(this.sessionId, "view-exit", this.viewExited);
    }

    get electedView() { for (const view of this.views) return view; }

    viewJoined(viewId) { this.publishViewElectedAfter(() => this.views.add(viewId)); }
    viewExited(viewId) { this.publishViewElectedAfter(() => this.views.delete(viewId)); }

    publishViewElectedAfter(action) {
        const electedBefore = this.electedView;
        action();
        const electedAfter = this.electedView;
        if (electedBefore !== electedAfter) {
            this.publish(this.id, "view-elected", electedAfter);
        }
    }
}
ElectedViewModel.register("ElectedViewModel");


export class ElectedView extends View {
    constructor(model) {
        super(model);
        this.model = model;
        this.electedViewId = "";
        this.subscribe(model.id, {event: "view-elected", handling: "oncePerFrame"}, this.onViewElected);
        this.onViewElected(model.electedView);
    }

    get isElected() { return this.viewId === this.electedViewId; }

    onViewElected(viewId) {
        const wasElected = this.isElected;
        this.electedViewId = viewId;
        if (wasElected !== this.isElected) {
            if (wasElected) this.handleUnelected();
            else this.handleElected();
        } else {
            console.log('%cView Elected: %s (this view %s unaffected)', 'color: #CC0', this.electedViewId, this.viewId);
        }
    }

    handleElected() {
        console.log('%cView Elected: %s (this view %s elected ✅)', 'color: #0C0', this.electedViewId, this.viewId);
    }

    handleUnelected() {
        console.log('%cView Elected: %s (this view %s unelected ❌)', 'color: #C00', this.electedViewId, this.viewId);
    }

    dispose() {
        this.onViewElected("");
    }
}

///////////////////////////////////////////////////////////////////////////


export class BitcoinTracker extends ElectedViewModel {
    init(options) {
        super.init(options);
        this.subscribe(this.id, "BTC-USD", this.onBitcoinData);
        this.subscribe(this.id, "BTC-USD-history", this.onBitcoinHistory);
        this.history = [];
    }

    get latest() { return this.history.length > 0 ? this.history[ this.history.length - 1] : { date: 0, amount: 0 }; }

    onBitcoinData({date, amount}) {
        if (date - this.latest.date < 25_000) return;
        this.history.push({date, amount});
        if (this.history.length > 300) this.history.shift();
        this.publish(this.id, "BTC-USD-changed");
    }

    onBitcoinHistory(prices) {
        const newer = prices.filter(p => p.date - this.latest.date > 25_000);
        this.history.push(...newer);
        while (this.history.length > 300) this.history.shift();
        this.publish(this.id, "BTC-USD-changed");
    }
}
BitcoinTracker.register("BitcoinTracker");


export class BitcoinTrackerView extends ElectedView {
    constructor(model) {
        super(model);   // might call handleElected()
        this.subscribe(this.model.id, "BTC-USD-changed", this.onBTCUSDChanged);
    }

    handleElected() {
        super.handleElected();

        this.count = 0;

        if (Date.now() - this.model.latest.date < 60_000) this.fetchSpot("on-elected");
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
        this.publish(this.model.id, "BTC-USD", { date: Date.now(), amount: +json.data.amount });
    }

    async fetchHistory() {
        console.log("Fetching BTC-USD history from Coinbase...");
        const response = await fetch(`https://api.coinbase.com/v2/prices/BTC-USD/historic?period=day`);
        const json = await response.json();
        const prices = json.data.prices.map(price => ({ date: +new Date(price.time), amount: +price.price }));
        console.log("fetched %s prices", prices.length);
        const newer = prices.filter(price => price.date > this.model.latest.date);
        console.log("publishing %s latest prices", newer.length);
        this.publish(this.model.id, "BTC-USD-history", newer);
    }

    onBTCUSDChanged() {
        // this is called on all views, not just the elected one
        console.log("BTC-USD changed to %s", this.model.latest.amount);
    }
}


