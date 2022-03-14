class ExpanderMenuActor {
    show() {
        if (this.menu) {
            this.menu.destroy();
        }
        this.menu = this.createCard({
            name: 'expander menu',
            actorCode: ["MenuActor"],
            pawnCode: ["MenuPawn"],
            multiple: true,
            parent: this
        });

        let target = this.service("ActorManager").get(this._cardData.target);

        let items = [];

        let codeMap = this.expanderManager.code;
        for (let k of codeMap.keys()) {
            let selected = target._actorCode && target._actorCode.indexOf(k) >=  0 ||
                target._pawnCode && target._pawnCode.indexOf(k) >=  0;
            let obj = {label: k, selected};
            items.push(obj);
        }

        items.push({label: 'ok'});

        this.menu.call("MenuActor", "setItems", items);

        this.scriptListen("fire", "setExpanders");
    }

    setExpanders(data) {
        this.say("setExpanders", {...{menuId: this.id, target: this._cardData.target}, ...data});
    }
}

class MenuLayoutActor {
    layout(items) {
        items.forEach((item) => {
            item.setCardData({autoresize: false});
        });
    }        
}

class MenuActor {
    setup() {
        console.log("MenuActor", this.id);
        if (this.items) {
            this.items.forEach((obj) => {
                this.unsubscribe(obj.card.id, "fire", "fire");
                obj.card.destroy();
            });
        }
        this.items = [];
    }

    setItems(list) {
        // list takes the form of:
        // [{label<string>, card?<card>, selected<boolean>}]

        if (this.items) {
            this.items.forEach((obj) => {
                this.unsubscribe(obj.card.id, "fire", "fire");
                obj.card.destroy();
            });
        }
        this.items = [];
        this.maxWidth = 0;
        this.maxHeight = 0;

        this.maxWidth = 0;
        this.maxHeight = 0;
        this.extentMap = new Map();
        
        for (let i = 0; i < list.length; i++) {
            let item = list[i];

            let labelCard = item.card;
            if (!labelCard) {
                labelCard = this.createCard({
                    name: item.label,
                    className: "TextFieldActor",
                    translation: [0, 0, 0],
                    parent: this,
                    type: "text",
                    margins: {left: 8, top: 0, right: 16, bottom: 0},
                    readOnly: true,
                    singleLine: true,
                    autoResize: true,
                    runs: [{text: item.label}],
                    actorCode: ["MenuItemActor"],
                    pawnCode: ["MenuItemPawn"],
                    width: 1,
                    height: 0.15,
                    backgroundColor: item.selected ? 0x606060 : 0xFFFFFF
                });
            }

            let measurement = labelCard.measurement;
            this.extentMap.set(labelCard.id, measurement);

            labelCard._cardData.name = item.label;
            this.maxWidth = Math.max(this.maxWidth, measurement.width);

            this.items.push({label: item.label, card: labelCard, selected: !!item.selected});
            this.scriptSubscribe(labelCard.id, "fire", "relay");
        }

        let top = 1;
        let maxHeight = 0;
        this.items.forEach((obj) => {
            let extent = this.extentMap.get(obj.card.id);
            let h = extent ? extent.height : 0.15;
            obj.card.set({translation: [
                ((extent ? extent.width : 0) - this.maxWidth) / 2,
                top - h / 2,
                0
            ]});
            top -= h !== undefined ? h : 0.15;
            maxHeight += h;
        });
        this.maxHeight = maxHeight + 0.10;
        this.say("itemsUpdated");
    }

    relay(data) {
        let multiple = this._cardData.multiple;
        let card = this.service("ActorManager").get(data.id);

        let item = this.items.find((i) => i.card === card);
        if (!item) {return;} // most likely to be a bug
        this.items.forEach((i) => {
            if (i.card === item.card) {
                i.selected = !i.selected;
                this.selectionChanged(i);
            } else {
                if (!multiple) {
                    i.selected = false;
                    this.selectionChanged(i);
                }
            }
        });

        if (multiple && item.label === 'ok') {
            item.selected = false;

            let selection = this.items.map((i) => ({label: i.label, selected: i.selected}));
            this.publish(this._parent.id, "fire", {selection, id: this.id});
        }
    }

    selectionChanged(item) {
        item.card.setCardData({backgroundColor: item.selected ? 0x606060 : 0xFFFFFF});
    }
}

class MenuPawn {
    setup() {
        this.clear();
        this.listen("updateBackDrop", "updateBackDrop");

        if (this.actor.items && this.actor.items.length > 0 && this.actor.maxWidth > 0 && this.actor.maxHeight > 0) {
            this.updateBackDrop();
        }
    }

    clear() {
        if (this.backdrop) {
            this.backdrop.geometry.dispose();
            this.disposeMaterial();
            this.shape.remove(this.backdrop);
            this.backdrop = null;
        }
    }

    updateBackDrop() {
        this.cardDataUpdated({
            v: {
                width: this.actor.maxWidth + 0.2,
                height: this.actor.maxHeight,
                depth: 0.05,
                color: 0xE0E0E0,
                frameColor: 0x666666
            }
        });
    }

    cardDataUpdated(data) {
        this.clear();
        let {width, height, depth, color, frameColor} = data.v;
        this.backdrop = new WorldCore.THREE.Mesh(
            this.roundedCornerPlane(width, height, depth),
            this.makeMaterial(depth, color, frameColor)
        );
        this.backdrop.position.set(0, - height / 2 + 1.05, -0.1);
        this.shape.add(this.backdrop);
        console.log("this.backdroup", this.backdrop);
    }

    roundedCornerPlane(width, height, depth) {
        let x = - width / 2;
        let y = - height / 2;
        let radius = 0.1;
        
        let shape = new WorldCore.THREE.Shape();
        shape.moveTo(x, y + radius);
        shape.lineTo(x, y + height - radius);
        shape.quadraticCurveTo(x, y + height, x + radius, y + height);
        shape.lineTo(x + width - radius, y + height);
        shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
        shape.lineTo(x + width, y + radius);
        shape.quadraticCurveTo(x + width, y, x + width - radius, y);
        shape.lineTo(x + radius, y);
        shape.quadraticCurveTo( x, y, x, y + radius);

        let geometry = new WorldCore.THREE.ExtrudeGeometry(shape, {depth, bevelEnabled: false});
        geometry.parameters.width = width;
        geometry.parameters.height = height;
        geometry.parameters.depth = depth;
        return geometry;
    }

    disposeMaterial() {
        if (Array.isArray(this.material)) {
            this.material.forEach((m) => m.dispose());
        } else if (this.material) {
            this.material.dispose();
        }
        this.material = null;
    }

    makeMaterial(depth, backgroundColor, frameColor) {
        this.disposeMaterial();
        
        let material = new WorldCore.THREE.MeshStandardMaterial({color: backgroundColor, side: WorldCore.THREE.DoubleSide, emissive: backgroundColor});

        if (depth > 0) {
            material = [material, new WorldCore.THREE.MeshStandardMaterial({color: frameColor, side: WorldCore.THREE.DoubleSide, emissive: frameColor})];
        }

        this.material = material;
        return material;
    }
}

class MenuItemActor {
    setup() {
        this.addEventListener("click", "MenuItemActor.click");
    }

    click(_evt) {
        this.publish(this.id, "fire", {id: this.id, name: this._cardData.name});
    }
}

class MenuItemPawn {
    setup() {
        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.addEventListener("pointerDoubleDown", "nop");
    }
}

export let menu = {
    expanders: [ExpanderMenuActor, MenuActor, MenuPawn, MenuItemActor, MenuItemPawn]
};

