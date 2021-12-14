import {
    App, ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PlayerManager, FocusManager,
    AM_Player, PM_Player,
    THREE,
    PM_ThreeVisible, ThreeRenderManager, AM_Spatial, PM_Spatial, AM_MouselookAvatar,
    PM_MouselookAvatar, PM_ThreeCamera, toRad, v3_sqrMag, v3_sub, q_identity, q_euler,
    q_axisAngle, m4_scaleRotationTranslation, m4_multiply, m4_translation, m4_rotationQ
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
            [
                {x: 0, y: 0, string: "Croquet is awesome!", fontName: "DejaVu Sans Mono", style: "blue"},
            ],
            [
                {x: 0, y: 0, string: "Croquet is awesome!", fontName: "DejaVu Sans Mono", style: "green"}
            ]
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
        this.text.set({translation: options.translation});
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
        let name = "DejaVu Sans Mono";

        if (!pawn.fonts[name]) {return;}

        let drawnStrings = this.model.getString();

        let font = pawn.fonts[name].font;

        drawnStrings = drawnStrings.map(spec => ({...spec, font: font}))
 
        let layout = new TextLayout({font});
        let glyphs = layout.computeGlyphs({font, drawnStrings});

        pawn.textGeometry.update({glyphs});

        let bounds = {left: 0, top: 0, bottom: 600, right: 600};
        pawn.textMaterial.uniforms.corners.value = new THREE.Vector4(bounds.left, bounds.top, bounds.right, bounds.bottom);
    }
}
        
