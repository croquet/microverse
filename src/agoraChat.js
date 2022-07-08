// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { ViewService } from "@croquet/worldcore-kernel";

export class AgoraChatManager extends ViewService {
    constructor(name) {
        super(name || "AgoraChatManager");
        this.subscribe("playerManager", "enter", "playerEnter");
        this.subscribe("playerManager", "leave", "playerLeave");

        this.startMessageListener();

        // if this view's player is already in the world, make sure the embedded
        // chat app is running.
        const player = this.localPlayer;
        const alreadyHere = player && player.inWorld;
        if (alreadyHere) this.ensureChatIFrame();

console.log(`AgoraChatManager (local actor ${alreadyHere ? "already" : "not yet"} here)`, this);
    }

    get localPlayer() { return this.model.service("PlayerManager").players.get(this.viewId);  }

    computeSessionHandles() {
        // derive handles { persistent, ephemeral } from the
        // persistentId and sessionId respectively.
        if (!this.sessionHandlesP) {
            this.sessionHandlesP = new Promise((resolve, reject) => {
                let subtle = window.crypto.subtle;
                if (!subtle) {
                    reject(new Error("crypto.subtle is not available"));
                    return;
                }
                let encoder = new TextEncoder();
                let persistent = this.session.persistentId;
                let ephemeral = this.sessionId;
                let promises = [persistent, ephemeral].map(id => {
                    return subtle.digest("SHA-256", encoder.encode(id)).then((bits) => {
                        let map = Array.prototype.map;
                        let handle = map.call(
                            new Uint8Array(bits),
                            x => ("00" + x.toString(16)).slice(-2)).join("");
                        return handle;
                    });
                });
                Promise.all(promises).then(([pHandle, eHandle]) => resolve({ persistent: pHandle, ephemeral: eHandle }));
            });
        }

        return this.sessionHandlesP;
    }

    startMessageListener() {
        this.messageListener = e => {
            if (!this.chatIFrame) return;

            if (e.source === this.chatIFrame.contentWindow) this.handleChatFrameEvent(e.data);
        };
        window.addEventListener('message', this.messageListener);
    }

    sendMessageToChat(event, data = null) {
        if (!this.chatIFrame) {
            console.warn(`attempt to send ${event} event before chat initialized`);
            return;
        }
        this.chatIFrame.contentWindow.postMessage({ event, data }, "*");
    }

    handleChatFrameEvent({ event, data }) {
        switch (event) {
            case 'sessionInfoRequest':
                this.handleSessionInfoRequest(data);
                break;
            case 'userInfoRequest':
                this.handleUserInfoRequest(data);
                break;
            case 'videoChatInitialStateRequest':
                this.handleVideoChatInitialStateRequest(data);
                break;
            case 'chatReady':
                this.handleChatReady(data);
                break;
            case 'setFrameStyle':
                this.handleSetFrameStyle(data);
                break;
            default:
                console.warn(`unknown event ${event} from chat iframe`);
        }
    }

    ensureChatIFrame() {
        if (this.chatIFrame) return;

        const existing = document.getElementById('agoraChatIFrame');
        if (existing) {
            // not sure there is any legitimate way this can happen
            console.warn("AgoraChatMgr: found existing iframe");
            this.chatIFrame = existing;
            this.chatReadyP = Promise.resolve(); // assume it's ready
            return;
        }

        const { innerWidth, innerHeight } = window;
        const frame = this.chatIFrame = document.createElement('iframe');
        frame.id = 'agoraChatIFrame';
        frame.style.cssText = "position: absolute; width: 1px; height: 1px; z-index: 100; transition: none;"
        document.body.appendChild(frame);
        const chatURL = new URL(`../video-chat/microverse.html?rejoinable&ih=${innerHeight}&iw=${innerWidth}&debug=session`, window.location.href).href;
        frame.src = chatURL;
        this.chatReadyP = new Promise(resolve => this.resolveChatReady = resolve);
    }

    async handleSessionInfoRequest() {
        const { persistent, ephemeral } = await this.computeSessionHandles();
        this.sendMessageToChat('sessionInfo', { sessionHandle: persistent, ephemeralSessionHandle: ephemeral });
    }

    handleUserInfoRequest() {
        const { _chatNickname: nick } = this.localPlayer;
        const userInfo = { initials: this.viewId.slice(0, 2), nickname: nick || '' };
        this.sendMessageToChat('userInfo', userInfo);
    }

    handleVideoChatInitialStateRequest() {
        let info = {
            mic: 'on',
            video: 'unavailable'
        };
        this.sendMessageToChat('videoChatInitialState', info);
    }

    handleChatReady(data) {
        if (data) {
            // must be a user-supplied nickname
            this.publish("playerManager", "details", { playerId: this.viewId, details: { chatNickname: data.nickname } });
        }
        this.resolveChatReady();
    }

    handleSetFrameStyle(data, _source) {
        Object.assign(this.chatIFrame.style, data);
    }

    async playerEnter(p) {
        if (p.playerId !== this.viewId) return;

        console.log("our player entered");
        this.ensureChatIFrame();
        // await this.chatReadyP;
        // this.sendMessageToChat('joinChat');
    }

    async playerLeave(p) { console.log("P_LEAVE", p);
        if (p.playerId !== this.viewId) return;

        console.log("our player left");
        if (!this.chatIFrame) return;

        this.sendMessageToChat('leaveChat');
    }

    detach() {
        super.detach();
        console.log("AgoraChatMgr: detach");
        window.removeEventListener('message', this.messageListener);
        if (this.chatIFrame) this.chatIFrame.remove(); // will cause us to crash out of Agora chat, probably not cleanly
        this.chatIFrame = null;
    }
}
