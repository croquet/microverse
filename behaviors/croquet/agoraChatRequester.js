class AgoraChatRequesterActor {
    setup() {
    }

    viewJoined(viewId) {
    }

    viewExited(viewId) {
    }
}

class AgoraChatRequesterPawn {
    setup() {
        this.subscribe("playerManager", "enter", "playerEnter");
        this.subscribe("playerManager", "leave", "playerLeave");

        this.publish("shellServices", "ensure-service", "AgoraChat");

        this.sessionHandleP = this.computeSessionHandle();
console.log("ChatRequester", this);
    }

    async computeSessionHandle() {
        // derive a sessionHandle from the sessionId
        const subtle = window.crypto.subtle;
        if (!subtle) {
            throw new Error("crypto.subtle is not available");
        }
        const encoder = new TextEncoder();
        const bits = await subtle.digest("SHA-256", encoder.encode(this.sessionId));
        const map = Array.prototype.map;
        const handle = map.call(
            new Uint8Array(bits),
            x => ("00" + x.toString(16)).slice(-2)).join("");
        return handle;
    }

    async playerEnter(p) {
        if (p.playerId !== this.viewId) return;

console.log("OUR PLAYER ENTERED");
        const sessionHandle = await this.sessionHandleP;
        this.publish("shellServices", "send-to-service", { serviceName: "AgoraChat", command: "join-channel", data: { sessionHandle, viewId: this.viewId } });
    }

    async playerLeave(p) { console.log("P_LEAVE", p);
        if (p.playerId !== this.viewId) return;

console.log("OUR PLAYER LEFT");
        const sessionHandle = await this.sessionHandleP;
        this.publish("shellServices", "send-to-service", { serviceName: "AgoraChat", command: "leave-channel", data: { sessionHandle, viewId: this.viewId } });
    }

    update() {
    }

    teardown() {
    }
}

export default {
    modules: [
        {
            name: "AgoraChatRequester",
            actorBehaviors: [AgoraChatRequesterActor],
            pawnBehaviors: [AgoraChatRequesterPawn],
        }
    ]
}
