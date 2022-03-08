class ExpanderMenuActor {
    show() {
        if (this.menu) {
            this.menu.destroy();
        }
        this.menu = this.createCard({
            name: 'expander menu',
            actorCode: ["MenuActor"],
            multiple: true,
            parent: this
        });

        let codeMap = this.expanderManager.code;
        let items = [...codeMap.keys()].map((k) => ({label: k}));
        items.push({label: 'ok'});

        this.menu.call("MenuActor", "setItems", items);

        this.scriptListen("fire", "setExpanders");
    }

    setExpanders(data) {
        this.say("setExpanders", {...{menuId: this.id, target: this._cardData.target}, ...data});
    }
}

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
                labelCard = this.createCard({
                    name: item.label,
                    className: "TextFieldActor",
                    translation: [0, top, 0],
                    parent: this,
                    type: "text",
                    readOnly: true,
                    singleLine: true,
                    autoResize: true,
                    runs: [{text: item.label}],
                    actorCode: ["MenuItemActor"],
                    width: 1,
                    height: 0.15,
                    backgroundColor: item.selected ? 0xFFFFFF : 0x606060,
                });
            }

            top -= labelCard.height;
            labelCard._cardData.name = item.label;

            this.items.push({label: item.label, card: labelCard, selected: !!item.selected});
            this.scriptSubscribe(labelCard.id, "fire", "relay");
        }
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
            let selected = this.items.filter(i => i.selected).map(i => i.label);
            this.publish(this._parent.id, "fire", {selected: selected, id: this.id});
        }
    }

    selectionChanged(item) {
        item.card.setData({backgroundColor: item.selected ? 0xFFFFFF : 0x606060});
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

export let menu = {
    expanders: [ExpanderMenuActor, MenuActor, MenuItemActor]
};

