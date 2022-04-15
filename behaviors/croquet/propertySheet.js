class PropertySheetActor {
    setup() {
        if (this.windows) {
            this.windows.forEach((w) => w.destroy());
        }
        this.windows = [];

        if (this.dismiss) {
            this.dismiss.destroy();
        }

        let extent = {x: this._cardData.width, y: this._cardData.height};
        this.dismiss = this.createCard({
            translation: [extent.x / 2 - 0.05, extent.y / 2 - 0.05, 0.041],
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

    newWindow(extent, position) {
        console.log("add");
        let sheetWindow = this.createCard({
            name: 'window',
            behaviorModules: ["PropertySheetWindow"],
            parent: this,
            width: extent.x,
            height: extent.y,
            type: "object",
            noSave: true,
        });

        sheetWindow.set({translation: [position.x, position.y, 0.05]});
        return sheetWindow;
    }

    setObject(target) {
        console.log("setObject");
        this.target = target;
        this.menuWindow = this.newWindow({x: 1, y: 1.5}, {x: 0.3, y: 0.7});

        this.behaviorMenu = this.createCard({
            name: 'behavior menu',
            behaviorModules: ["BehaviorMenu"],
            translation: [0, 0, 0.08],
            width: this.menuWindow._cardData.width,
            height: this.menuWindow._cardData.height,
            type: "object",
            parent: this.menuWindow,
            noSave: true,
            target: target.id});

        this.subscribe(this.behaviorMenu.id, "extentChanged", "menuExtentChanged")
        this.behaviorMenu.call("BehaviorMenu$BehaviorMenuActor", "show");

        this.cardSpecWindow = this.newWindow({x: 1.9, y: 1}, {x:  0, y: -0.6});

        this.cardSpec = this.createCard({
            className: "TextFieldActor",
            name: 'card spec',
            translation: [0, 0, 0.025],
            parent: this.cardSpecWindow,
            type: "text",
            multiuser: true,
            margins: {left: 8, top: 8, right: 8, bottom: 8},
            textScale: 0.0014,
            backgroundColor: 0xffffff,
            width: 1.9 - 0.04,
            height: 1 - 0.04,
            depth: 0.002,
            autoResize: false,
            noDismissButton: true,
            borderRadius: 0.013,
            fullBright: true,
            runs: [{text: ""}],
            noSave: true,
        });

        let cardDataString = this.cardSpecString(target);
        this.cardSpec.loadAndReset(cardDataString);
        this.subscribe(this.cardSpec.id, "text", "cardSpecAccept");

        this.actionMenuWindow = this.newWindow({x: 0.8, y: 0.6}, {x: -0.5, y: 1.0});

        this.actionMenu = this.createCard({
            name: 'action menu',
            behaviorModules: ["ActionMenu"],
            translation: [0, 0, 0.08],
            width: this.actionMenuWindow._cardData.width,
            height: this.actionMenuWindow._cardData.height,
            type: "object",
            parent: this.actionMenuWindow,
            noSave: true,
            target: target.id});

        this.subscribe(this.actionMenu.id, "extentChanged", "actionMenuExtentChanged")
        this.subscribe(this.actionMenu.id, "doAction", "doAction")
        this.actionMenu.call("ActionMenu$ActionMenuActor", "show");
        this.listen("dismiss", "dismiss");
    }

    menuExtentChanged(data) {
        if (this.menuWindow) {
            this.menuWindow.setCardData({width: data.x + 0.05, height: data.y + 0.05});
        }
    }

    actionMenuExtentChanged(data) {
        console.log("actionMenuExtentChanged", data);
        if (this.actionMenuWindow) {
            this.actionMenuWindow.setCardData({width: data.x + 0.05, height: data.y + 0.05});
        }
    }

    doAction(data) {
        if (!this.target) {return;}
        if (data.action === "Delete") {
            this.target.destroy();
            this.destroy();
            return;
        }
        if (data.action === "Duplicate") {
            this.target.duplicate();
            return;
        }
        console.log(data);
    }

    cardSpecString(target) {
        let data = target.collectCardData();
        let intrinsic = this.intrinsicProperties();

        let result = [];
        // okay! risking to be over engineering, I'll make the display nicer.

        intrinsic.forEach((p) => {
            let value = data[p];
            if (value === undefined) {return;}
            result.push("    ");
            result.push(p);
            result.push(": ");
            result.push(this.specValue(p, value));
            result.push(",\n");
        });

        let keys = Object.keys(data);
        keys.sort();
        keys.forEach((p) => {
            if (intrinsic.includes(p)) {return;}
            let value = data[p];
            result.push("    ");
            result.push(p);
            result.push(": ");
            result.push(this.specValue(p, value));
            result.push(",\n");
        });

        return result.join('');
    }

    specValue(p, value) {
        if (Array.isArray(value)) {
            let frags = value.map((v) => JSON.stringify(v));
            return `[${frags.join(', ')}]`;
        }

        return JSON.stringify(value);
    }

    cardSpecAccept(data) {
        let {text} = data;

        let array = text.split('\n');
        let simpleRE = /^[ \t]*([^:]+)[ \t]*:[ \t]*(.*)$/;
        let spec = {};

        let something = false;

        array.forEach((line) => {
            let match = simpleRE.exec(line);
            if (match) {
                something = true;
                let key = match[1];
                let value = match[2];
                if (value && value.endsWith(",")) {
                    value = value.slice(0, value.length - 1);
                }
                try {
                    value = JSON.parse(value);
                } catch(e) {
                    console.log(e);
                }
                if (key === "rotation" || key === "dataRotation") {
                    if (Array.isArray(value) && value.length === 3) {
                        value = Worldcore.q_euler(...value);
                    }
                }
                spec[key] = value;
            }
        });

        if (!something) {return;}
        if (!this.target.doomed) {
            this.target.updateOptions(spec);
        }
    }
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

        let extent = {x: this.actor._cardData.width, y: this.actor._cardData.height};

        let frameGeometry = this.roundedCornerGeometry(extent.x, extent.y, 0.04, 0.02);
        let frameMaterial = this.makePlaneMaterial(0.02, 0xcccccc, 0xcccccc, false);

        this.frame = new Worldcore.THREE.Mesh(frameGeometry, frameMaterial);
        this.shape.add(this.frame);

        let backGeometry = this.roundedCornerGeometry(extent.x - 0.02, extent.y - 0.02, 0.0001, 0.02);
        let backMaterial = this.makePlaneMaterial(0.02, 0x525252, 0x525252, false);
        this.back = new Worldcore.THREE.Mesh(backGeometry, backMaterial);
        this.back.position.set(0, 0, 0.04);
        this.shape.add(this.back);

        this.addEventListener("pointerMove", "pointerMove");
    }

    pointerMove(evt) {
        if (!evt.xyz) {return;}
        if (!this.downInfo) {return;}
        let vec = new Worldcore.THREE.Vector3(...evt.xyz);
        let pInv = this.renderObject.matrixWorld.clone().invert();
        vec = vec.applyMatrix4(pInv);

        let origDownPoint = this.downInfo.downPosition;
        let origTranslation = this.downInfo.childTranslation;

        let deltaX = vec.x - origDownPoint.x;
        let deltaY = vec.y - origDownPoint.y;

        this.downInfo.child.say("setTranslation", [origTranslation[0] + deltaX, origTranslation[1] + deltaY, origTranslation[2]]);
        // console.log(this.downInfo, pVec2);
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
        return [this._cardData.width / 2 - (0.062), this._cardData.height / 2 - (0.062), 0.031];
    }

    dismissWindow(_id) {
        this.destroy();
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

        let extent = {x: this.actor._cardData.width, y: this.actor._cardData.height};

        let frameGeometry = this.roundedCornerGeometry(extent.x, extent.y, 0.0001, 0.02);
        let frameMaterial = this.makePlaneMaterial(0.02, 0x000000, 0x000000, false);
        this.frame = new Worldcore.THREE.Mesh(frameGeometry, frameMaterial);
        this.frame.position.set(0, 0, 0.021);
        this.shape.add(this.frame);

        let backGeometry = this.roundedCornerGeometry(extent.x - 0.02, extent.y - 0.02, 0.0001, 0.02);
        let backMaterial = this.makePlaneMaterial(0.02, 0xffffff, 0xffffff, false);
        this.back = new Worldcore.THREE.Mesh(backGeometry, backMaterial);
        this.back.position.set(0, 0, 0.022);
        this.shape.add(this.back);

        this.addEventListener("pointerDown", "pointerDown");
        this.addEventListener("pointerUp", "pointerUp");
        this.listen("_cardData", "cardDataUpdated");
    }

    cardDataUpdated() {
        console.log(this.actor._cardData.width, this.actor._cardData.height);
    }

    pointerDown(evt) {
        if (!evt.xyz) {return;}
        let vec = new Worldcore.THREE.Vector3(...evt.xyz);
        let inv = this.renderObject.matrixWorld.clone().invert();
        vec = vec.applyMatrix4(inv);

        let extent = {x: this.actor._cardData.width, y: this.actor._cardData.height};
        let edge = {};

        if (vec.x < -(extent.x / 2) + 0.02) {edge.x = "left";}
        if (vec.x > (extent.x / 2) - 0.02) {edge.x = "right";}
        if (vec.y < -(extent.y / 2) + 0.02) {edge.y = "bottom";}
        if (vec.y > (extent.y / 2) - 0.02) {edge.y = "top";}

        if (!edge.x && !edge.y) {return;}

        let parent = this._parent;
        let vec2 = new Worldcore.THREE.Vector3(...evt.xyz);
        let pInv = parent.renderObject.matrixWorld.clone().invert();
        vec2 = vec2.applyMatrix4(pInv);

        let downInfo = {...edge, child: this, childTranslation: this._translation, downPosition: vec2};
        this._parent.downInfo = downInfo

        this.didSetDownInfo = true;

        let avatar = this.service("PawnManager").get(evt.pointerId);
        if (avatar) {
            avatar.pointerCapture(this._parent);
        }
    }

    pointerUp() {
        if (this.didSetDownInfo && this._parent) {
            delete this._parent.downInfo;
        }
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

        let backGeometry = new Worldcore.THREE.BoxGeometry(0.08, 0.08, 0.00001);
        let backMaterial = new Worldcore.THREE.MeshStandardMaterial({
            color: 0xcccccc,
            side: Worldcore.THREE.DoubleSide
        });

        this.back = new Worldcore.THREE.Mesh(backGeometry, backMaterial);

        let dismissGeometry = new Worldcore.THREE.BoxGeometry(0.07, 0.02, 0.001);
        let dismissMaterial = new Worldcore.THREE.MeshStandardMaterial({
            color: 0x222222,
            side: Worldcore.THREE.DoubleSide
        });

        let button = new Worldcore.THREE.Mesh(dismissGeometry, dismissMaterial);
        button.position.set(0, 0, 0.00001);

        this.back.add(button)

        this.shape.add(this.back);
    }

    tap(_p3d) {
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

    tap(_p3d) {
        this.publish(this.actor.id, "dismiss", this.actor.parent.id);
    }
}

class BehaviorMenuActor {
    show() {
        if (this.menu) {
            this.menu.destroy();
        }

        this.menu = this.createCard({
            name: 'behavior menu',
            behaviorModules: ["Menu"],
            multiple: true,
            parent: this,
            type: "2d",
            noSave: true,
            depth: 0.01,
            cornerRadius: 0.05,
        });

        this.subscribe(this.menu.id, "itemsUpdated", "itemsUpdated");
        this.updateSelections();

        this.listen("fire", "setBehaviors");
        this.subscribe(this._cardData.target, "behaviorUpdated", "updateSelections");
    }

    updateSelections() {
        console.log("updateSelections");
        let target = this.service("ActorManager").get(this._cardData.target);
        let items = [];

        let behaviorModules = [...this.behaviorManager.modules].filter(([_key, value]) => {
            return !value.systemModule;
        });

        behaviorModules.forEach(([k, _v]) => {
            let selected = target._behaviorModules && target._behaviorModules.indexOf(k) >= 0;
            let obj = {label: k, selected};
            items.push(obj);
        });

        items.push({label: "------------"});
        items.push({label: 'apply'});
        this.menu.call("Menu$MenuActor", "setItems", items);
    }

    setBehaviors(data) {
        console.log("setBehaviors");
        let target = this.service("ActorManager").get(this._cardData.target);
        target.setBehaviors(data.selection);
    }

    itemsUpdated() {
        this.publish(this.id, "extentChanged", {x: this.menu._cardData.width, y: this.menu._cardData.height});
    }
}

class ActionMenuActor {
    show() {
        if (this.menu) {
            this.menu.destroy();
        }

        this.menu = this.createCard({
            name: 'action menu',
            behaviorModules: ["Menu"],
            parent: this,
            type: "2d",
            noSave: true,
            depth: 0.01,
            cornerRadius: 0.05,
        });

        this.subscribe(this.menu.id, "itemsUpdated", "itemsUpdated");
        this.updateSelections();

        this.listen("fire", "doAction");
    }

    updateSelections() {
        console.log("action updateSelections");
        let items = [
            {label: "actions"},
            {label: "------------"},
            {label: "Duplicate"},
            {label: "Delete"},
        ];

        this.menu.call("Menu$MenuActor", "setItems", items);
    }

    doAction(data) {
        this.publish(this.id, "doAction", data);
    }

    itemsUpdated() {
        this.publish(this.id, "extentChanged", {x: this.menu._cardData.width, y: this.menu._cardData.height});
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
        {
            name: "BehaviorMenu",
            actorBehaviors: [BehaviorMenuActor]
        },
        {
            name: "ActionMenu",
            actorBehaviors: [ActionMenuActor]
        }
    ]
}
/*globals Worldcore */
