import {
    Actor, Pawn, mix, THREE, PM_ThreeVisible, AM_Spatial, PM_Spatial
} from "@croquet/worldcore";

import {TextFieldActor} from "./text/text.js";

export class TextPopupActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return TextPopupPawn;}
    init(options) {
        super.init(options);
        this.subscribe(this.sessionId, "popup", "popup");
        this.subscribe(this.sessionId, "popdown", "popdown");

        this.shown = false;
        this.strings = [
            {
                extent: {width: 500, height: 50},
                fontName: "DejaVu Sans Mono",
                drawnStrings: [
                    {x: 0, y: 0, string: "Croquet is awesome!", style: "blue"}
                ],
            },
            {
                extent: {width: 500, height: 50},
                fontName: "DejaVu Sans Mono",
                drawnStrings: [
                    {x: 0, y: 0, string: "Croquet is awesome!", style: "green"}
                ]
            }
        ];
    }

    popup(options) {
        if (this.shown) {return;}
        this.shown = true;
        this.stringIndex = 0;
        this.future(1000).nextString();
        if (!this.text) {
            this.text = TextFieldActor.create();
        }
        let obj = {};
        if (options.translation) {
            obj.translation = options.translation;
        }
        if (options.rotation) {
            obj.rotation = options.rotation;
        }
        if (options.scale) {
            obj.scale = options.scale;
        }
        this.text.set(obj);
    }

    nextString() {
        if (this.shown) {
            this.future(1000).nextString();
        } else {
            this.stringIndex = 0;
        }

        this.stringIndex++;
        if (this.stringIndex >= this.strings.length) {
            this.stringIndex = 0;
        }
        this.text.text = this.strings[this.stringIndex];
        this.say("updateString");
    }

    popdown() {
        if (this.text) {
            this.text.destroy();
        }
        this.shown = false;
        this.stringIndex = 0;
    }
}

TextPopupActor.register("TextPopupActor");

export class TextPopupPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisible) {
    constructor(model) {
        super(model);
        this.model = model;
        this.listen("updateString", "updateString");
    }

    updateString() {
        if (!this.model.text) {return;}
        let pawn = this.service('PawnManager').get(this.model.text.id);
        if (!pawn.model) {console.log("not initialized?"); return;}

        pawn.updateString(true);

        if (!this.closeButton) {
            let canvas = document.createElement("canvas");
            canvas.width = 64;
            canvas.height = 64;

            let ctx = canvas.getContext("2d");

            ctx.clearRect(0, 0, 64, 64);
            ctx.strokeStile = "green";

            ctx.beginPath();

            ctx.moveTo(8, 4);
            ctx.lineTo(56, 4);
            ctx.arcTo(60, 4, 60, 8, 4);
            ctx.lineTo(60, 56);
            ctx.arcTo(60, 60, 56, 60, 4);
            ctx.lineTo(8, 60);
            ctx.arcTo(4, 60, 4, 56, 4);
            ctx.lineTo(4, 8);
            ctx.arcTo(4, 4, 8, 4, 4);
            ctx.stroke();

            ctx.fillStyle = "blue";
            ctx.font = "60px monospace";
            ctx.fillText("X", 10, 56);

            let texture = new THREE.CanvasTexture(canvas, THREE.UVMapping);

            let extent = pawn.model.text.extent;

            let newWidth = extent.width * 0.01;
            let newHeight = extent.height * 0.01;
            
            this.closeButtonGeometry = new THREE.PlaneGeometry(64, 64);
            this.closeButtonMaterial = new THREE.MeshBasicMaterial({map: texture, transparent: true});
            this.closeButton = new THREE.Mesh(this.closeButtonGeometry, this.closeButtonMaterial);
            this.closeButton.position.x = newWidth / 2,
            this.closeButton.position.y = newHeight / 2,
            this.closeButton.position.z = 0.008;
            this.closeButton.scale.x = 0.3 / 64;
            this.closeButton.scale.y = 0.3 / 64;
            pawn.plane.add(this.closeButton);
        }
    }
}
        
