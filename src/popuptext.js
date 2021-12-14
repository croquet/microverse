import {
    Actor, Pawn, mix, THREE, PM_ThreeVisible, AM_Spatial, PM_Spatial
} from "@croquet/worldcore";

import {TextFieldActor} from "./text/text.js";
import {TextLayout} from "./text/layout.js";

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
        this.say("updateString");
    }

    getString() {
        return this.strings[this.stringIndex];
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
        if (!pawn.textMesh) {console.log("not initialized?"); return;}

        let stringInfo = this.model.getString();
        let {fontName, extent, drawnStrings} = stringInfo;
        if (!pawn.fonts[fontName]) {return;}
        let font = pawn.fonts[fontName].font;

        drawnStrings = drawnStrings.map(spec => ({...spec, font: font}));
 
        let layout = new TextLayout({font});
        let glyphs = layout.computeGlyphs({font, drawnStrings});

        pawn.textMesh.scale.x = 0.01;
        pawn.textMesh.scale.y = -0.01;

        let newWidth = extent.width * 0.01;
        let newHeight = extent.height * 0.01;

        if (newWidth !== pawn.plane.geometry.parameters.width ||
            newHeight !== pawn.plane.geometry.parameters.height) {
            let geometry = new THREE.PlaneGeometry(newWidth, newHeight);
            pawn.plane.geometry = geometry;
            pawn.geometry.dispose();
            pawn.geometry = geometry;

            pawn.textMesh.position.x = -newWidth / 2;
            pawn.textMesh.position.y = newHeight / 2;
            pawn.textMesh.position.z = 0.005;
        }
        pawn.textGeometry.update({glyphs});
        let bounds = {left: 0, top: 0, bottom: extent.height, right: extent.width};
        pawn.textMaterial.uniforms.corners.value = new THREE.Vector4(bounds.left, bounds.top, bounds.right, bounds.bottom);

        if (!this.closeButton) {
            this.closeButtonGeometry = new THREE.PlaneGeometry(0.2, 0.2);
            this.closeButtonMaterial = new THREE.MeshStandardMaterial({color: 0x602020});
            this.closeButton = new THREE.Mesh(this.closeButtonGeometry, this.closeButtonMaterial);
            this.closeButton.position.x = newWidth / 2,
            this.closeButton.position.y = newHeight / 2,
            this.closeButton.position.z = 0.008
            pawn.plane.add(this.closeButton);
        }
    }
}
        
