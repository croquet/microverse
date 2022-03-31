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
                    textScale: 0.0015,
                    height: 0.15,
                    noSave: true,
                    fullBright: true,
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

        this.setCardData({
            width: this.maxWidth + 0.2,
            height: this.maxHeight,
            depth: 0.05,
            color: 0xFFFFFF,
            frameColor: 0x666666,
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
                i.selected = !i.selected;
                this.selectionChanged(i);
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
        this.scriptListen("_cardData", "cardDataUpdated");

        if (this.actor.items && this.actor.items.length > 0 && this.actor.maxWidth > 0 && this.actor.maxHeight > 0) {
            this.cardDataUpdated();
        }
    }

    cardDataUpdated() {
        let obj = this.shape.children.find((o) => o.name === "2d");
        obj.position.set(0, - this.properties2D.height / 2 + 1.05, -0.1);
    }
}

class MenuItemActor {
    setup() {
        this.addEventListener("pointerTap", "click");
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
