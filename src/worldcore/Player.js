import { Actor } from "./Actor";
import { RegisterMixin } from "./Mixins";
import { ModelService } from "./Root";

//------------------------------------------------------------------------------------------
//-- PlayerManager -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Maintains a list of players connected to the session. Your player manager should override the
// createPlayer() method.

export class PlayerManager extends ModelService {

    init(name) {
        super.init(name ||'PlayerManager');
        this.players = new Map();
        this.subscribe(this.sessionId, "view-join", this.onJoin);
        this.subscribe(this.sessionId, "view-exit", this.onExit);
    }

    onJoin(viewId) {
        if (this.players.has(viewId)) console.warn("PlayerManager received duplicate view-join for viewId " + viewId);
        const player = this.createPlayer({playerId: viewId});
        if (!player) return;
        this.players.set(viewId, player);
        this.publish("playerManager", "create", player);
    }

    // This method can be overridden to create your specific actor type. Note that if you want to pass additional options
    // you need to add them to the existing options object.

    createPlayer(options) {
        return null;
    }

    destroyPlayer(player) {
        this.publish("playerManager", "destroy", player);
        player.destroy();
    }

    onExit(viewId) {
        const player = this.player(viewId);
        if (!player) return;
        this.destroyPlayer(player);
        this.players.delete(viewId);
    }

    get count() { return this.players.size }
    player(viewId) { return this.players.get(viewId) }

}
PlayerManager.register("PlayerManager");


//------------------------------------------------------------------------------------------
//-- Player --------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// A player actor is automatically created whenever a player joins. You should specify the player
// actor class in the playerActor method of your PlayerManager. The playerId is the viewId
// of the view that spawned the player actor.

//-- Actor ---------------------------------------------------------------------------------

export const AM_Player = superclass => class extends superclass {

    get playerId() { return this._playerId }

};
RegisterMixin(AM_Player);

//-- Pawn ----------------------------------------------------------------------------------

export const PM_Player = superclass => class extends superclass {

    // Returns true if this pawn or any of its parents is owned by the local player.

    get isMyPlayerPawn() {
        let p = this;
        do {
            if (p.actor && p.actor.playerId === p.viewId) return true;
            p = p.parent;
        } while (p);
        return false;
    }

};
