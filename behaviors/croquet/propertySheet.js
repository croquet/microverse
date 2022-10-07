// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

/*

PropertySheet holds a few other "windows" as if it is a traditional
2.5 D display area. By default, it contains a menu (MenuActor) for the
list of available modules, another menu for typical actions, and a
text area where the user can enter a card spec to modify the card.

The content of the card spec area is not evaluated as JavaScript
code. Rather it splits the content into lines, and then each line is
splited at a colon (":"). The second part is parsed by JSON.parse()
and used as a value for the property name specified by the first part.

Properties known to
contain a rotation are special cased so that if the value is an array of
3-elements, it is converted to a quaternion.

*/

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

    dismissSheet(_id) {
        if (this.dismiss) {
            this.dismiss.destroy();
        }

        if (this.windows) {
            this.windows.forEach((w) => w.destroy());
        }
        this.destroy();
    }

    newWindow(extent, position) {
        let sheetWindow = this.createCard({
            name: 'window',
            behaviorModules: ["PropertySheetWindow"],
            parent: this,
            width: extent.x,
            height: extent.y,
            type: "object",
            fullBright: true,
            color: 0xcccccc,
            backgroundColor: 0xcccccc,
            noSave: true,
        });

        sheetWindow.set({translation: [position.x, position.y, 0.05]});
        return sheetWindow;
    }

    setObject(target) {
        console.log("setObject");
        this.target = target;
        // this.menuWindow = this.newWindow({x: 1, y: 1.5}, {x: 0.9, y: 0.4});

        this.cardSpecWindow = this.newWindow({x: 1.8, y: 2.8}, {x: -0.55, y: 0});

        this.cardSpec = this.createCard({
            className: "TextFieldActor",
            name: 'card spec',
            translation: [-0.05, 0, 0.025],
            parent: this.cardSpecWindow,
            type: "text",
            margins: {left: 8, top: 8, right: 8, bottom: 8},
            textScale: 0.0014,
            backgroundColor: 0xcccccc,
            scrollBar: true,
            barColor: 0x888888,
            knobColor: 0x606060,
            width: 1.7 - 0.04,
            height: 2.8 - 0.04,
            depth: 0.002,
            autoResize: false,
            noDismissButton: true,
            borderRadius: 0.013,
            fullBright: true,
            cornerRadius: 0,
            runs: [{text: ""}],
            noSave: true,
        });

        let cardDataString = this.cardSpecString(target);
        this.cardSpec.loadAndReset(cardDataString);
        this.subscribe(this.cardSpec.id, "text", "cardSpecAccept");

        this.actionMenuWindow = this.newWindow({x: 0.8, y: 0.6}, {x: 0.9, y: -1.1});
        this.actionMenu = this.createCard({
            name: 'action menu',
            behaviorModules: ["ActionMenu"],
            translation: [0, 0, 0.08],
            width: this.actionMenuWindow._cardData.width,
            height: this.actionMenuWindow._cardData.height,
            type: "object",
            parent: this.actionMenuWindow,
            noSave: true,
            color: 0xcccccc,
            fullBright: true,
            target: target.id});

        this.behaviorMenuPane = this.createCard({
            name: "behaivor scroll menu",
            behaviorModules: ["ScrollArea"],
            type: "object",
            translation: [0.85, 0.4, 0.04],
            width: 1.0 - 0.04,
            height: 2.0 - 0.04,
            depth: 0.002,
            color: 0xcccccc,
            backgroundColor: 0xcccccc,
            fullBright: true,
            parent: this,
            noSave: true,
        });

        this.behaviorMenu = this.createCard({
            name: 'behavior menu',
            behaviorModules: ["BehaviorMenu"],
            translation: [0, 0, 0.04],
            color: 0xcccccc,
            backgroundColor: 0xcccccc,
            width: 0.85,
            height: 2.0,
            type: "object",
            fullBright: true,
            parent: this.behaviorMenuPane,
            noSave: true,
            target: target.id});

        this.subscribe(this.behaviorMenu.id, "extentChanged", "menuExtentChanged")
        this.behaviorMenu.call("BehaviorMenu$BehaviorMenuActor", "show");

        this.behaviorMenuPane.call("ScrollArea$ScrollAreaActor", "setTarget", this.behaviorMenu);
        this.subscribe(this.actionMenu.id, "extentChanged", "actionMenuExtentChanged")
        this.subscribe(this.actionMenu.id, "doAction", "doAction")
        this.actionMenu.call("ActionMenu$ActionMenuActor", "show");
        this.listen("dismiss", "dismiss");
    }

    menuExtentChanged(data) {
        console.log("menuExtentChanged", data);
        if (this.behaviorMenu) {
            this.behaviorMenu.setCardData({
                width: data.x,
                height: data.y,
            });
        }
    }

    actionMenuExtentChanged(data) {
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
            this.target.duplicate(data);
            return;
        }
        if (data.action === "Save") {
            this.target.saveCard(data);
            return;
        }
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
        let errored = false;

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
                    errored = true;
                }
                if (key === "parent") {
                    if (typeof value === "string") {
                        let actor = this.getModel(value);
                        value = actor;
                    }
                }
                if (key === "rotation" || key === "dataRotation") {
                    if (Array.isArray(value) && value.length === 3) {
                        value = Microverse.q_euler(...value);
                    }
                }
                spec[key] = value;
            }
        });

        if (!something) {return;}
        if (errored) {return;}
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

        let extent = {x: this.actor._cardData.width, y: this.actor._cardData.height};

        let frameGeometry = this.roundedCornerGeometry(extent.x, extent.y, 0.04, 0.02);
        let frameMaterial = this.makePlaneMaterial(0.02, 0xcccccc, 0xcccccc, false);

        this.frame = new Microverse.THREE.Mesh(frameGeometry, frameMaterial);
        this.shape.add(this.frame);

        let backGeometry = this.roundedCornerGeometry(extent.x - 0.02, extent.y - 0.02, 0.0001, 0.02);
        let color = this.actor._cardData.frameColor || 0x525252;
        let frameColor = this.actor._cardData.frameColor || 0x525252;
        let backMaterial = this.makePlaneMaterial(0.02, color, frameColor, true);

        this.back = new Microverse.THREE.Mesh(backGeometry, backMaterial);
        this.back.position.set(0, 0, 0.04);
        this.shape.add(this.back);

        this.addEventListener("pointerMove", "pointerMove");
        this.listen("translationSet", "translated");
        this.listen("rotationSet", "translated");

        this.scrollAreaPawn = [...this.children].find((c) => {
            return c.actor._behaviorModules && c.actor._behaviorModules.indexOf("ScrollArea") >= 0;
        })
    }

    translated(data) {
        this.scrollAreaPawn.say("updateDisplay");
    }

    pointerMove(evt) {
        if (!evt.xyz) {return;}
        if (!this.downInfo) {return;}
        let vec = new Microverse.THREE.Vector3(...evt.xyz);
        let pInv = this.renderObject.matrixWorld.clone().invert();
        vec = vec.applyMatrix4(pInv);

        let origDownPoint = this.downInfo.downPosition;
        let origTranslation = this.downInfo.childTranslation;

        let deltaX = vec.x - origDownPoint.x;
        let deltaY = vec.y - origDownPoint.y;

        this.downInfo.child.translateTo([origTranslation[0] + deltaX, origTranslation[1] + deltaY, origTranslation[2]]);
        // console.log(this.downInfo, pVec2);
    }
}

/*

PropertySheetWindow is an area on the PropertySheet. It allows the
user to drag it on the PropertySheet by picking a narrow band from the
edge. (But as of writing, the pointer is not "captured" so it stops
moving when the pointer moves with in the area that also handles
pointerMove.

*/

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

        let extent = {x: this.actor._cardData.width, y: this.actor._cardData.height};

        let frameGeometry = this.roundedCornerGeometry(extent.x, extent.y, 0.0001, 0.02);
        let frameMaterial = this.makePlaneMaterial(0.02, 0x000000, 0x000000, false);
        this.frame = new Microverse.THREE.Mesh(frameGeometry, frameMaterial);
        this.frame.position.set(0, 0, 0.021);
        this.shape.add(this.frame);

        let backGeometry = this.roundedCornerGeometry(extent.x - 0.02, extent.y - 0.02, 0.0001, 0.02);
        let color = this.actor._cardData.color || 0xcccccc;
        let frameColor = this.actor._cardData.frameColor || 0xcccccc;
        let backMaterial = this.makePlaneMaterial(0.02, color, frameColor, true);
        this.back = new Microverse.THREE.Mesh(backGeometry, backMaterial);
        this.back.position.set(0, 0, 0.022);
        this.shape.add(this.back);

        this.addEventListener("pointerDown", "pointerDown");
        this.addEventListener("pointerUp", "pointerUp");
        this.listen("cardDataSet", "cardDataUpdated");
    }

    cardDataUpdated() {
        console.log(this.actor._cardData.width, this.actor._cardData.height);
    }

    pointerDown(evt) {
        if (!evt.xyz) {return;}
        let vec = new Microverse.THREE.Vector3(...evt.xyz);
        let inv = this.renderObject.matrixWorld.clone().invert();
        vec = vec.applyMatrix4(inv);

        let extent = {x: this.actor._cardData.width, y: this.actor._cardData.height};
        let edge = {};

        if (vec.x < -(extent.x / 2) + 0.05) {edge.x = "left";}
        if (vec.x > (extent.x / 2) - 0.05) {edge.x = "right";}
        if (vec.y < -(extent.y / 2) + 0.05) {edge.y = "bottom";}
        if (vec.y > (extent.y / 2) - 0.05) {edge.y = "top";}

        if (!edge.x && !edge.y) {return;}

        let parent = this._parent;
        let vec2 = new Microverse.THREE.Vector3(...evt.xyz);
        let pInv = parent.renderObject.matrixWorld.clone().invert();
        vec2 = vec2.applyMatrix4(pInv);

        let downInfo = {...edge, child: this, childTranslation: this._translation, downPosition: vec2};
        this._parent.downInfo = downInfo

        this.didSetDownInfo = true;

        let avatar = this.service("PawnManager").get(evt.avatarId);
        if (avatar) {
            avatar.addFirstResponder("pointerMove", {}, this._parent);
        }
    }

    pointerUp(evt) {
        if (this.didSetDownInfo && this._parent) {
            delete this._parent.downInfo;
            let avatar = this.service("PawnManager").get(evt.avatarId);
            if (avatar) {
                avatar.removeFirstResponder("pointerMove", {}, this._parent);
            }
        }
    }
}

/*

PropertySheetDismissButton publishes a dismiss event. The container is
expected to subscribe to it to destroy itself.

*/

class PropertySheetDismissActor {
    setup() {
    }
}

class PropertySheetDismissPawn {
    setup() {
        this.addEventListener("pointerTap", "tap");

        if (this.back) {
            this.shape.remove(this.back);
        }

        let backgroundColor = (this.actor._cardData.backgroundColor !== undefined)
            ? this.actor._cardData.backgroundColor
            : 0xcccccc;

        let color = (this.actor._cardData.color !== undefined)
            ? this.actor._cardData.color
            : 0x222222;

        let backGeometry = new Microverse.THREE.BoxGeometry(0.08, 0.08, 0.00001);
        let backMaterial = new Microverse.THREE.MeshStandardMaterial({
            color: backgroundColor,
            side: Microverse.THREE.DoubleSide
        });

        this.back = new Microverse.THREE.Mesh(backGeometry, backMaterial);

        let dismissGeometry = new Microverse.THREE.BoxGeometry(0.07, 0.02, 0.001);
        let dismissMaterial = new Microverse.THREE.MeshStandardMaterial({
            color: color,
            side: Microverse.THREE.DoubleSide
        });

        let button = new Microverse.THREE.Mesh(dismissGeometry, dismissMaterial);
        button.position.set(0, 0, 0.00001);

        this.back.add(button)

        this.shape.add(this.back);
    }

    tap(_p3d) {
        this.publish(this.actor.id, "dismiss", this.actor.parent.id);
    }
}

class PropertySheetEditActor {
    setup() {
        this.listen("launchCodeEditor", "launchCodeEditor");
    }

    launchCodeEditor(data) {
        console.log(data.pose);
        this.createCard({
            name:'code editor',
            translation: data.pose.translation,
            rotation: data.pose.rotation,
            layers: ['pointer'],
            type: "code",
            behaviorModule: data.name,
            margins: {left: 32, top: 32, right: 32, bottom: 32},
            textScale: 0.001,
            width: 1.5,
            height: 2,
            depth: 0.05,
            fullBright: true,
            frameColor: 0x888888,
            scrollBar: true,
        });
    }
}

class PropertySheetEditPawn {
    setup() {
        this.addEventListener("pointerTap", "tap");
    }

    tap(p3d) {
        let avatar = this.service("PawnManager").get(p3d.avatarId);
        if (!avatar) {return;}
        if (!this.shape.name) {return;}
        let space = this.shape.name.indexOf(" ");
        let moduleName = this.shape.name.slice(0, space);

        let toEdit;

        let module = this.actor.behaviorManager.modules.get(moduleName);
        if (!module) {return;}

        if (module.actorBehaviors && module.actorBehaviors.size > 0) {
            let [behaviorName, _behavior] = [...module.actorBehaviors][0];
            toEdit = `${module.name}.${behaviorName}`;
        }
        if (!toEdit) {
            if (module.pawnBehaviors && module.pawnBehaviors.size > 0) {
                let [behaviorName, _behavior] = [...module.pawnBehaviors][0];
                toEdit = `${module.name}.${behaviorName}`;
            }
        }

        let vec = new Microverse.THREE.Vector3();
        vec.setFromMatrixPosition(this.shape.matrixWorld);
        let pose = avatar.dropPose(6);
        pose.translation = [vec.x, vec.y, vec.z];

        if (toEdit) {
            this.say("launchCodeEditor", {name: toEdit, pose});
        }
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
        }

        let backGeometry = new Microverse.THREE.BoxGeometry(0.022, 0.022, 0.00001);
        let backMaterial = new Microverse.THREE.MeshStandardMaterial({
            color: 0x882222,
            side: Microverse.THREE.DoubleSide
        });

        this.back = new Microverse.THREE.Mesh(backGeometry, backMaterial);

        let dismissGeometry = new Microverse.THREE.BoxGeometry(0.02, 0.005, 0.001);
        let dismissMaterial = new Microverse.THREE.MeshStandardMaterial({
            color: 0x000000,
            side: Microverse.THREE.DoubleSide
        });

        let button = new Microverse.THREE.Mesh(dismissGeometry, dismissMaterial);
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

        let editIconLocation = "3rAfsLpz7uSBKuKxcjHvejhWp9mTBWh8hsqN7UnsOjJoGgYGAgFIXV0UGx4XAVwHAVwRAB0DBxcGXBsdXQddNRYkEAseOwEzGSMRMCoWQTUKEwQLBSc5JSsrQF0bHVwRAB0DBxcGXB8bEQAdBBcAARddKwMGHktLKksKNjocPyIiFBMfJRkzIyRKND4zIAZGRUVGCjECAEEFHRM6N10WEwYTXTUnEQYFHTsXOUQaAxUVFgVERR4kNxY8A0QiBAsQX0dDHTslBipENh83HQU";

        this.menu = this.createCard({
            name: 'behavior menu',
            behaviorModules: ["Menu"],
            multiple: true,
            parent: this,
            type: "2d",
            noSave: true,
            depth: 0.01,
            cornerRadius: 0.05,
            menuIcons: {"_": editIconLocation, "apply": null, "------------": null},
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

        this.targetSystemModules = [];
        let behaviorModules = [...this.behaviorManager.modules];

        behaviorModules.forEach(([k, v]) => {
            if (!v.systemModule) {
                let selected = target._behaviorModules?.indexOf(k) >= 0;
                let obj = {label: k, selected};
                items.push(obj);
            } else {
                if (target._behaviorModules?.indexOf(k) >= 0) {
                    this.targetSystemModules.push({label: k, selected: true});
                }
            }
        });

        items.push({label: "------------"});
        items.push({label: 'apply'});
        this.menu.call("Menu$MenuActor", "setItems", items);
    }

    setBehaviors(data) {
        console.log("setBehaviors");
        let target = this.service("ActorManager").get(this._cardData.target);
        let selection = [ ...this.targetSystemModules, ...data.selection];
        let behaviorModules = [];

        selection.forEach((obj) => {
            let {label, selected} = obj;
            if (target.behaviorManager.modules.get(label)) {
                if (selected) {
                    behaviorModules.push(label);
                }
            }
        });
        target.updateBehaviors({behaviorModules});
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
            {label: "Save"},
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
            name: "PropertySheetEdit",
            actorBehaviors: [PropertySheetEditActor],
            pawnBehaviors: [PropertySheetEditPawn]
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
/*globals Microverse */
