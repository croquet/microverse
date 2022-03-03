// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { startWorld, Constants, q_euler } from "./root.js";
import { constructBitcoinTracker } from  './apps/bitcoinTracker.js';

Constants.MaxAvatars = 6;
Constants.AvatarNames = [
    "generic/1", "generic/2", "generic/3", "generic/4", "generic/5", "generic/6",
    "alice", "newwhite", "fixmadhatter", "marchhare", "queenofhearts", "cheshirecat"
];

Constants.DefaultScripts = [
    {
        action: "add",
        name: "Fly",
        content: `class Fly {
    setup() {
        this.set({
            rotation: WorldCore.q_euler(0, 0, 0),
            translation: [0, 3, 0]});
        if (!this.flying) {
            this.flying = true;
            this.fly();
        }
        this.addEventListener("pointerDown", "toggle");
    }

    fly() {
        if (!this.flying) {return;}
        this.future(20).call("Fly", "fly");
        this.rotateBy([0, 0.01, 0]);
        this.forwardBy(0.03);
    }

    toggle() {
        this.flying = !this.flying;
        if (this.flying) {
            this.fly();
        }
    }

    rotateBy(angles) {
        let q = WorldCore.q_euler(...angles);
        q = WorldCore.q_multiply(this.rotation, q);
        this.rotateTo(q);
    }

    forwardBy(dist) {
        let v = WorldCore.v3_rotate([0, 0, dist], this.rotation)
        this.translateTo([
            this.translation[0] + v[0],
            this.translation[1] + v[1],
            this.translation[2] + v[2]]);
    }
}
/*global WorldCore */
`
    }, {
        action: "add",
        name: "Drive",
        content: `class Drive {
    setup() {
        this.set({
            rotation: WorldCore.q_euler(-Math.PI/2, 0, 0),
            translation: [0, -2.9, 10]});
        this.speed = 0;
        this.angle = 0;
        this.addEventListener("pointerDown", "toggle");
        this.addEventListener("keyDown", "turn");
    }

    run() {
        if (!this.running) {return;}
        this.future(20).call("Drive", "run");
        this.rotateBy([0, -this.angle, 0]);
        this.forwardBy(-this.speed);
    }

    toggle() {
        this.running = !this.running;
        if (this.running) {
            this.run();
        }
    }

    rotateBy(angles) {
        let q = WorldCore.q_euler(...angles);
        q = WorldCore.q_multiply(this.rotation, q);
        this.rotateTo(q);
    }

    forwardBy(dist) {
        let v = WorldCore.v3_rotate([dist, 0, 0], this.rotation)
        this.translateTo([
            this.translation[0] + v[0],
            this.translation[1] + v[1],
            this.translation[2] + v[2]]);
    }

    turn(key) {
        if (key.key === "ArrowRight") {
            this.angle = Math.min(0.05, this.angle + 0.004);
        }
        if (key.key === "ArrowLeft") {
            this.angle = Math.max(-0.05, this.angle - 0.004);
        }
        if (key.key === "ArrowUp") {
            this.speed = Math.min(1, this.speed + 0.05);
        }
        if (key.key === "ArrowDown") {
            this.speed = Math.max(-0.2, this.speed - 0.05);
        }
    }
}
/*global WorldCore */`
    }
];

Constants.DefaultCards = [
    {
        card: {
            name:'world model',
            translation:[25, -90.5, -60],
            scale:[200, 200, 200],
            rotation: q_euler(0, Math.PI, 0),
            layers: ['walk'],
            type: "model",
            dataLocation: "./assets/3D/Refinery.glb.zip",
            singleSided: true,
            shadow: true,
            placeholder: true,
            placeholderSize: [40, 1, 40],
            placeholderColor: 0x808080,
            placeholderOffset: [0, -0.065, 0],
        }
    },
    {
        card: {
            name: 'lighting #1',
            type: "lighting",
            className: "DLight",
        }
    },
    {
        card: {
            name: 'Perlin Demo',
            className: "PerlinActor",
            translation:[ 10, -2.75, -14],
            rotation:[ 0, -0.7071068, 0, 0.7071068 ],
        }
    },
    {
        card: {
            name: 'text editor',
            className: "TextFieldActor",
            translation: [-4, -0.5, -6],
            rotation: q_euler(0, Math.PI / 2, 0),
            multiuser: true,
            depth: 0.05,
            type: "text",
            dataLocation: './assets/SVG/credit-card.svg',
            runs: [{text: "hello"}],
            isSticky: true,
            color: 0xf4e056,
            width: 1,
            height: 1,
            textScale: 0.0025
        }
    },
    {
        card: {
            name:'simple 3D model',
            translation: [-4, -0.5, -12],
            rotation: q_euler(0, Math.PI / 2, 0),
            type: "model",
            dataLocation: "./assets/avatars/generic/1.zip",
            shadow: true,
            singleSided: true,
        }
    },
    {
        card: {
            name: 'video card',
            translation: [-4, -0.5, -18],
            rotation: q_euler(0, Math.PI / 2, 0),
            scale: [4, 4, 4],
            type: "svg",
            dataLocation: './assets/SVG/credit-card.svg',
            textureType: "video",
            textureLocation: "./assets/videos/fromPCtoHMD.mp4",
            frameColor: 0x666666,
            color: 0xffffff,
            depth: 0.05,
            fullBright: true
        }
    },
    {
        card: {
            name: 'image card',
            translation: [-4, -0.5, -24],
            rotation: q_euler(0, Math.PI / 2, 0),
            scale: [4, 4, 4],
            type: "svg",
            dataLocation: './assets/SVG/credit-card.svg',
            textureType: "image",
            textureLocation: './assets/images/Colony.png',
            frameColor: 0x666666,
            color: 0xffffff,
            depth: 0.05,
            fullBright: true
        }
    },
    {
        card: {
            name: 'multiblaster',
            className: "MultiBlaster",
            translation: [-4, -0.5, -30],
            rotation: q_euler(0, Math.PI / 2, 0),
            scale: [4, 4, 4],
            layers: ['pointer'],
            multiuser: true,
            type: "svg",
            dataLocation: './assets/SVG/square.svg',
            textureType: "canvas",
            width: 1024,
            height: 1024,
            frameColor: 0x666666,
            color: 0xffffff,
            depth: 0.05,
            fullBright: true
        }
    },
    {
        card: {
            name:'bouncingball',
            className: "BouncingBall",
            translation: [-4, -0.5, -36],
            rotation: q_euler(0, Math.PI / 2, 0),
            scale: [4, 4, 4],
            layers: ['pointer'],
            multiuser: true,
            type: "svg",
            dataLocation: './assets/SVG/square.svg',
            textureType: "canvas",
            width: 1024,
            height: 1024,
            frameColor: 0x666666,
            color: 0xffffff,
            depth: 0.05,
            fullBright: true,
        }
    },
    {
        card: {
            name:'bouncinglogo',
            className: "BouncingLogo",
            translation: [-4, -0.5, -42],
            rotation: q_euler(0, Math.PI / 2, 0),
            scale: [4, 4, 4],
            layers: ['pointer'],
            multiuser: true,
            type: "svg",
            dataLocation: "./assets/SVG/full-circle.svg",
            textureType: "dynamic",
            width: 1024,
            height: 1024,
            frameColor: 0x666666,
            color: 0xffffff,
            depth: 0.05,
            fullBright: true,
        }
    },
    {
        card: {
            name:'code editor',
            translation: [13, 0, 8],
            rotation: q_euler(0, -Math.PI / 2, 0),
            layers: ['pointer'],
            type: "code",
            expander: "Fly",
            textScale: 0.001,
            width: 2,
            height: 2.5,
        }
    },
    {
        card: {
            name:'flamingo model',
            rotation: q_euler(0, 0, 0),
            type: "model",
            dataLocation: './assets/3D/Flamingo.glb.zip',
            actorCode: ["Fly"]
        }
    },
    {
        card: {
            name: 'code editor',
            translation: [13, 0, 14],
            rotation: q_euler(0, -Math.PI / 2, 0),
            layers: ['pointer'],
            type: "code",
            expander: "Drive",
            textScale: 0.001,
            width: 2,
            height: 3.5,
        },
        id: "Drive"
    },    
    {
        card: {
            name:'porsche',
            rotation: q_euler(0, 0, 0),
            layers: ['pointer'],
            type: "model",
            multiuser: true,
            dataLocation: "3Rph2fVNkc0jhp42pQF7jVIX5t2yeugm3T6CFPV1F4c4OiYmIiFofX00Oz43IXwnIXwxID0jJzcmfDs9fSd9BB4aNghrYWMwFDEIFidjEzsGZSYcOxAmajgYYH07PXwxID0jJzcmfD87MSA9JDcgITd9EyUlJhYaBj8oOzFnOTocMCEwNjZ_OgZiATQGOgE_OD0BZgU9ZR4iAjoIOX02MyYzfTwzaio-MyE7NA07NT8KFQVrNWATYAA7GRllYWMFEBhiJQskIj8xfyM9ZmI",
            actorCode: ["Drive"]
        }
    },
    {
        card: {
            name:'bridge',
            translation: [-2, 2, 100],
            rotation: q_euler(0, Math.PI, 0),
            layers: ['pointer'],
            type: "code",
            expander: "BridgeActor",
            textScale: 0.001,
            width: 2,
            height: 2.5,
        },
        id: "BridgeActor"
    },
    {
        card: {
            name:'bridgePawn',
            translation: [2, 2, 100],
            rotation: q_euler(0, Math.PI, 0),
            layers: ['pointer'],
            type: "code",
            expander: "BridgePawn",
            textScale: 0.001,
            width: 2,
            height: 2.5,
        },
        id: "BridgePawn"
    },    
    {
        card: {
            name:'bridge',
            translation: [0, 0, 50],
            rotation: q_euler(0, 0, 0),
            actorCode: ["BridgeActor"],
            pawnCode: ["BridgePawn"]
        }
    },
    {
        card: {
            name:'perlin actor',
            translation: [-4, 2, 200],
            rotation: q_euler(0, Math.PI, 0),
            type: "code",
            expander: "PerlinNoise",
            textScale: 0.001,
            width: 2,
            height: 2.5,
        },
    },
    {
        card: {
            name:'perlin actor',
            translation: [-2, 2, 200],
            rotation: q_euler(0, Math.PI, 0),
            type: "code",
            expander: "PerliinActor",
            textScale: 0.001,
            width: 2,
            height: 2.5,
        },
    },
    {
        card: {
            name:'perlin pawn',
            translation: [-0, 2, 200],
            rotation: q_euler(0, Math.PI, 0),
            type: "code",
            expander: "PerliinPawn",
            textScale: 0.001,
            width: 2,
            height: 2.5,
        },
    },
    {
        card: {
            name: 'perlin',
            translation: [0, -2, 100],
            rotation: q_euler(0, 0, 0),
            layers: ["pointer"],
            actorCode: ["PerlinNoise", "PerlinActor"],
            pawnCode: ["PerlinPawn"]
        }
    }
].concat(constructBitcoinTracker());

// Default parameters are filled in the body of startWorld
startWorld({
    appId: 'io.croquet.microverse',
    apiKey: '1_nsjqc1jktrot0iowp3c1348dgrjvl42hv6wj8c2i',
    tps: 30,
    eventRateLimit: 60,
}).then(() => {
    console.log(` 
  ________  ____  ____  __  ____________ 
 / ___/ _ \\/ __ \\/ __ \\/ / / / __/_  __/
/ /__/ , _/ /_/ / /_/ / /_/ / _/  / /   
\\___/_/|_|\\____/\\___\\_\\____/___/ /_/
`);
});
