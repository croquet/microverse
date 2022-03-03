class MenuActor {
    setup() {
        if (!this.items) {
            this.items = [];
        }
    }

    setItems(list) {
        // list takes the form of:
        // [{label<string>, card?<card>}]

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
                        height: 0.15
                    }
                }], world, "1")[0];
            }

            top -= labelCard.height;
            labelCard.addEventListener("click", "MenuItemActor.click");
            console.log("7");
            labelCard.set({parent: this._target});
            labelCard._cardData.name = item.label;

            this.items.push({label: item.label, card: labelCard});
            this.scriptSubscribe(labelCard.id, "fire", "fire");
        }
        this.say("itemsUpdated");
    }

    fire(data) {
        console.log("menu say", data);
        this.say("fire", data);
    }
}

/*global WorldCore */
