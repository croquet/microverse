class MenuActor {
    setItems(list) {
        console.log("setItems");
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
                    noDismissButton: true,
                    runs: [{text: item.label}],
                    behaviorModules: ["MenuItem"],
                    width: 1,
                    textScale: 0.0020,
                    height: 0.15,
                    noSave: true,
                    fullBright: true,
                    backgroundColor: item.selected ? 0x606060 : 0xFFFFFF
                });
            }

            let icon;
            let iconCard;
            if (this._cardData.menuIcons) {
                icon = this._cardData.menuIcons[item.label];
                if (icon === undefined) {
                    icon = this._cardData.menuIcons["_"];
                }
            }

            if (icon) {
                iconCard = this.createCard({
                    name: `${item.label} icon`,
                    translation: [0, 0, 0],
                    parent: this,
                    type: "2d",
                    behaviorModules: ["PropertySheetEdit"],
                    dataLocation: "./assets/SVG/edit.svg",
                    width: 0.1,
                    height: 0.1,
                    scale: [0.04, 0.04, 0.04],
                    depth: 0.02,
                    noSave: true,
                    fullBright: true,
                    color: item.selected ? 0x222222 : 0x222222
                });
            }

            let measurement = labelCard.measurement;
            this.extentMap.set(labelCard.id, measurement);

            labelCard._cardData.name = item.label;
            this.maxWidth = Math.max(this.maxWidth, measurement.width);

            this.items.push({label: item.label, card: labelCard, selected: !!item.selected, iconCard});
            this.subscribe(labelCard.id, "fire", "relay");
        }

        let maxHeight = 0;
        this.items.forEach((obj) => {
            let extent = this.extentMap.get(obj.card.id);
            let h = extent ? extent.height : 0.15;
            maxHeight += h;
        });

        let top = maxHeight / 2;
        this.items.forEach((obj) => {
            let extent = this.extentMap.get(obj.card.id);
            let h = extent ? extent.height : 0.15;
            obj.card.set({translation: [
                ((extent ? extent.width : 0) - this.maxWidth) / 2,
                top - h / 2,
                0
            ]});
            if (obj.iconCard) {
                let rightEdge = ((extent ? extent.width : 0) - this.maxWidth) / 2;
                rightEdge += extent.width / 2;

                obj.iconCard.set({translation: [
                    rightEdge + 0.01,
                    top - h / 2,
                    0.02
                ]});
            }
            top -= h !== undefined ? h : 0.15;
        });

        this.maxHeight = maxHeight + 0.10;

        this.setCardData({
            width: this.maxWidth + 0.2,
            height: this.maxHeight,
            depth: 0.05,
            color: 0xFFFFFF,
            frameColor: 0xcccccc,
            fullBright: true,
        });

        this.say("itemsUpdated");
    }

    relay(data) {
        let multiple = this._cardData.multiple;
        let card = this.service("ActorManager").get(data.id);

        let item = this.items.find((i) => i.card === card);
        if (!item) {return;} // most likely to be a bug
        this.items.forEach((i) => {
            if (i.card === item.card) {
                if (multiple) {
                    i.selected = !i.selected;
                    this.selectionChanged(i);
                } else {
                    this.publish(this._parent.id, "fire", {action: item.label, id: this.id});
                    return;
                }
            } else {
                if (!multiple) {
                    i.selected = false;
                    this.selectionChanged(i);
                }
            }
        });

        if (multiple && item.label === 'apply') {
            item.selected = false;
            this.selectionChanged(item);

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
        this.listen("cardDataSet", "cardDataUpdated");

        if (this.actor.items && this.actor.items.length > 0 && this.actor.maxWidth > 0 && this.actor.maxHeight > 0) {
            this.cardDataUpdated();
        }
    }

    cardDataUpdated() {
        let obj = this.shape.children.find((o) => o.name === "2d");
        obj.position.set(0, 0, -0.1);
    }
}

class MenuItemActor {
    setup() {
        this.addEventListener("pointerTap", "click");
    }

    click(_evt) {
        let text = this.value;
        if (text.startsWith("-") || text.startsWith(" ")) {return;}
        this.publish(this.id, "fire", {id: this.id, name: this._cardData.name});
    }
}

class MenuItemPawn {
    setup() {
        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.addEventListener("pointerDoubleDown", "nop");
    }
}

export default {
    modules: [
        {
            name: "Menu",
            actorBehaviors: [MenuActor],
            pawnBehaviors: [MenuPawn],
        },
        {
            name: "MenuItem",
            actorBehaviors: [MenuItemActor],
            pawnBehaviors: [MenuItemPawn],
        }
    ]
}
