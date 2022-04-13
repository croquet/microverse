class PropertySheetActor {
    setup() {
        if (this.windows) {
            this.windows.forEach((w) => w.destroy());
        }
        this.windows = [];
        this.addWindow();

        if (this.dismiss) {
            this.dismiss.destroy();
        }
        this.dismiss = this.createCard({
            translation: [0.45, 0.45, 0.041],
            name: 'dismiss',
            behaviorModules: ["PropertySheetDismiss"],
            parent: this,
            type: "object",
            noSave: true,
        });
        this.subscribe(this.dismiss.id, "dismiss", "dismissSheet");
    }

    dismissSheet(id) {
        console.log(id, this.id);
        if (this.dismiss) {
            this.dismiss.destroy();
        }

        if (this.windows) {
            this.windows.forEach((w) => w.destroy());
        }
        this.destroy();
    }
    
    addWindow() {
        this.window = this.createCard({
            name: 'window',
            behaviorModules: ["PropertySheetWindow"],
            extent: [0.3, 0.2],
            parent: this,
            type: "object",
            noSave: true,
        });

        this.window.set({translation: [0.1, 0.1, 0.02]});
    }

    setObject() {console.log("set object");}
}

class PropertySheetPawn {
    setup() {
        if (this.frame) {
            this.shape.remove(this.frame);
            this.frame = null;
        }

        if (this.back) {
            this.shape.remove(this.back);
            this.back = null;
        }
        this.shape.children = [];

        let frameGeometry = this.roundedCornerGeometry(1, 1, 0.04, 0.02);
        let frameMaterial = this.makePlaneMaterial(0.02, 0xcccccc, 0xcccccc, false);

        this.frame = new Worldcore.THREE.Mesh(frameGeometry, frameMaterial);
        this.shape.add(this.frame);

        let backGeometry = this.roundedCornerGeometry(0.98, 0.98, 0.0001, 0.02);
        let backMaterial = this.makePlaneMaterial(0.02, 0x525252, 0x525252, false);
        this.back = new Worldcore.THREE.Mesh(backGeometry, backMaterial);
        this.back.position.set(0, 0, 0.04);
        this.shape.add(this.back);
    }
}

class PropertySheetWindowActor {
    setup() {
        if (this.dismiss) {
            this.dismiss.destroy();
        }

        this.dismiss = this.createCard({
            translation: this.dismissButtonPosition(),
            name: 'dismiss window',
            behaviorModules: ["PropertySheetDismiss"],
            parent: this,
            type: "object",
            noSave: true,
        });
        this.subscribe(this.dismiss.id, "dismiss", "dismissWindow");
    }

    dismissButtonPosition() {
        return [this._cardData.extent[0] / 2 - (0.022), this._cardData.extent[1] / 2 - (0.022), 0.031];
    }

    dismissWindow(id) {
        console.log("dismissWindow", id, this.id);
    }

    setObject() {console.log("set object");}
}

class PropertySheetWindowPawn {
    setup() {
        if (this.frame) {
            this.shape.remove(this.frame);
            this.frame = null;
        }

        if (this.back) {
            this.shape.remove(this.back);
            this.back = null;
        }

        this.shape.children = [];

        let frameGeometry = this.roundedCornerGeometry(0.3, 0.2, 0.0001, 0.02);
        let frameMaterial = this.makePlaneMaterial(0.02, 0x000000, 0x000000, false);
        this.frame = new Worldcore.THREE.Mesh(frameGeometry, frameMaterial);
        this.frame.position.set(0, 0, 0.021);
        this.shape.add(this.frame);

        let backGeometry = this.roundedCornerGeometry(0.28, 0.18, 0.0001, 0.02);
        let backMaterial = this.makePlaneMaterial(0.02, 0xffffff, 0xffffff, false);
        this.back = new Worldcore.THREE.Mesh(backGeometry, backMaterial);
        this.back.position.set(0, 0, 0.022);
        this.shape.add(this.back);

        this.addEventListener("pointerDown", "pointerDown");
        this.addEventListener("pointerMove", "pointerMove");
        this.addEventListener("pointerUp", "pointerUp");

    }

    pointerDown(evt) {
        if (!evt.xyz) {return;}
        let vec = new Worldcore.THREE.Vector3(...evt.xyz);
        let inv = this.renderObject.matrixWorld.clone().invert();
        let vec2 = vec.applyMatrix4(inv);

        let extent = this.actor._cardData.extent;

        let edge = {};

        if (vec2.x < -(extent[0] / 2) + 0.01) {edge.x = "left";}
        if (vec2.x > (extent[0] / 2) - 0.01) {edge.x = "right";}
        if (vec2.y < -(extent[1] / 2) + 0.01) {edge.y = "bottom";}
        if (vec2.y > (extent[1] / 2) - 0.01) {edge.y = "top";}

        this.downInfo = {...edge, position: vec2};
    }

    pointerMove(evt) {
        if (!evt.xyz) {return;}
        let vec = new Worldcore.THREE.Vector3(...evt.xyz);
        let inv = this.renderObject.matrixWorld.clone().invert();
        let vec2 = vec.applyMatrix4(inv);

        let origDownPoint = this.downInfo.position;

        console.log(origDownPoint);
        let deltaX = vec2.x - origDownPoint.x;
        let deltaY = vec2.y - origDownPoint.y;

        console.log("move", deltaX, deltaY);
        
        
        if (this.downInfo) {
            if (this.downInfo.x === "left") {
            }
        }
    }

    pointerUp(p3d) {
        console.log("up", p3d);
    }
}

class PropertySheetDismissActor {
    setup() {
    }
}

class PropertySheetDismissPawn {
    setup() {
        this.addEventListener("pointerTap", "tap");

        if (this.back) {
            this.shape.remove(this.back);
            this.shape.children = [];
        }

        let backGeometry = new Worldcore.THREE.BoxGeometry(0.022, 0.022, 0.00001);
        let backMaterial = new Worldcore.THREE.MeshStandardMaterial({
            color: 0x882222,
            side: Worldcore.THREE.DoubleSide
        });

        this.back = new Worldcore.THREE.Mesh(backGeometry, backMaterial);
        
        let dismissGeometry = new Worldcore.THREE.BoxGeometry(0.02, 0.005, 0.001);
        let dismissMaterial = new Worldcore.THREE.MeshStandardMaterial({
            color: 0x000000,
            side: Worldcore.THREE.DoubleSide
        });

        let button = new Worldcore.THREE.Mesh(dismissGeometry, dismissMaterial);
        button.position.set(0, 0, 0.00001);

        this.back.add(button)

        this.shape.add(this.back);
    }

    tap(p3d) {
        this.publish(this.actor.id, "dismiss", this.actor.parent.id);
    }
}

class PropertySheetWindowBarActor {
    setup() {
    }
}

class PropertySheetWindowBarPawn {
    setup() {
        this.addEventListener("pointerDown", "pointerDown");
        this.addEventListener("pointerMove", "pointerMove");
        this.addEventListener("pointerUp", "pointerUp");

        if (this.back) {
            this.shape.remove(this.back);
            this.shape.children = [];
        }

        let backGeometry = new Worldcore.THREE.BoxGeometry(0.022, 0.022, 0.00001);
        let backMaterial = new Worldcore.THREE.MeshStandardMaterial({
            color: 0x882222,
            side: Worldcore.THREE.DoubleSide
        });

        this.back = new Worldcore.THREE.Mesh(backGeometry, backMaterial);
        
        let dismissGeometry = new Worldcore.THREE.BoxGeometry(0.02, 0.005, 0.001);
        let dismissMaterial = new Worldcore.THREE.MeshStandardMaterial({
            color: 0x000000,
            side: Worldcore.THREE.DoubleSide
        });

        let button = new Worldcore.THREE.Mesh(dismissGeometry, dismissMaterial);
        button.position.set(0, 0, 0.00001);

        this.back.add(button)

        this.shape.add(this.back);
    }

    tap(p3d) {
        this.publish(this.actor.id, "dismiss", this.actor.parent.id);
    }

}

export default {
    modules: [
        {
            name: "PropertySheet",
            actorBehaviors: [PropertySheetActor],
            pawnBehaviors: [PropertySheetPawn]
        },
        {
            name: "PropertySheetWindow",
            actorBehaviors: [PropertySheetWindowActor],
            pawnBehaviors: [PropertySheetWindowPawn]
        },
        {
            name: "PropertySheetDismiss",
            actorBehaviors: [PropertySheetDismissActor],
            pawnBehaviors: [PropertySheetDismissPawn]
        },
        {
            name: "PropertySheetWindowBar",
            actorBehaviors: [PropertySheetWindowBarActor],
            pawnBehaviors: [PropertySheetWindowBarPawn]
        },
    ]
}
/*globals Worldcore */
