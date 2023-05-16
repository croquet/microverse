import { Pawn } from "./Pawn";
import { ModelService, WorldcoreModel } from "./Root";

//------------------------------------------------------------------------------------------
//-- ActorManager --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class ActorManager extends ModelService {
    init(name) {
        super.init(name || 'ActorManager');
        this.actors = new Map();
    }

    add(actor) {
        this.actors.set(actor.id, actor);
    }

    has(id) {
        return this.actors.has(id);
    }

    get(id) {
        return this.actors.get(id);
    }

    delete(actor) {
        this.actors.delete(actor.id);
    }

}
ActorManager.register("ActorManager");

//------------------------------------------------------------------------------------------
//-- Actor ---------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class Actor extends WorldcoreModel {
    get pawn() {return null;}
    get doomed() {return this._doomed} // About to be destroyed. This is used to prevent creating new future messages.
    get parent() { return this._parent; }


    init(options) {
        super.init();
        this.listen("parentSet", this.onParent);
        this.listen("_set", this.set);
        this.set(options);
        this.service('ActorManager').add(this);
        this.publish("actor", "createActor", this);
    }

    destroy() {
        new Set(this.children).forEach(child => child.destroy());
        this.set({parent: null});
        this._doomed = true; // About to be destroyed. This is used to prevent creating new future messages.
        this.say("destroyActor");
        this.service('ActorManager').delete(this);
        super.destroy();
    }

    set(options = {}) {
        const sorted = Object.entries(options).sort((a,b) => { return b[0] < a[0] ? 1 : -1 } );
        for (const option of sorted) {
            const name = option[0];
            const setEvent = name + "Set";
            const n = "_" + option[0];
            const v = option[1];
            const o = this[n];
            this[n] = v;
            this.say(setEvent, {v, o}); // Publish a local message whenever a property changes with its old and new value.
        }
    }

    addChild(child) {
        if (!this.children) this.children = new Set();
        this.children.add(child);
    }

    removeChild(child) {
        if (this.children) this.children.delete(child);
    }

    onParent(d) {
        if (d.o) d.o.removeChild(this);
        if (d.v) d.v.addChild(this);
    }

    say(event, data) {
        this.publish(this.id, event, data);
    }

    listen(event, callback) {
        this.subscribe(this.id, event, callback);
    }

    ignore(event) {
        this.unsubscribe(this.id, event);
    }

    actorFromId(id) {
        return this.service("ActorManager").get(id);
    }

}
Actor.register("Actor");

