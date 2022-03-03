class MenuActor {
    setup() {
        if (!this.items) {
            this.items = [];
        }
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

        let top = 0;

        for (let i = 0; i < list.length; i++) {
            let item = list[i];

            let labelCard = item.card;
            if (!labelCard) {
                let world = this.wellKnownModel("ModelRoot");
                labelCard = WorldCore.CardActor.load([{
                    card: {
                        name: item.label,
                        className: "TextFieldActor",
                        translation: [0, top, 0],
                        type: "text",
                        readOnly: true,
                        singleLine: true,
                        autoResize: true,
                        runs: [{text: item.label}],
                        actorCode: ["MenuItemActor"],
                        width: 1,
                        height: 0.15,
                        backgroundColor: item.selected ? 0xFFFFFF : 0x606060,
                    }
                }], world, "1")[0];
            }

            top -= labelCard.height;
            labelCard.addEventListener("click", "MenuItemActor.click");
            console.log("7");
            labelCard.set({parent: this._target});
            labelCard._cardData.name = item.label;

            this.items.push({label: item.label, card: labelCard, selected: !!item.selected});
            this.scriptSubscribe(labelCard.id, "fire", "relay");
        }
        this.say("itemsUpdated");
    }

    relay(data) {
        let card = this.service("ActorManager").get(data.id);

        let item = this.items.find((i) => i.card === card);
        if (!item) {return;} // most likely to be a bug
        this.items.forEach((i) => {
            if (i.card === item.card) {
                i.selected = !i.selected;
                this.selectionChanged(i);
            } else {
                if (!this._cardData.multiple) {
                    i.selected = false;
                    this.selectionChanged(i);
                }
            }
        });

        this.say("fire", {id: this.id});
    }

    selectionChanged(item) {
        item.card.setData({backgroundColor: item.selected ? 0xFFFFFF : 0x606060});
    }
}

/*global WorldCore */
