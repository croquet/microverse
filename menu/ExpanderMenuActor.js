class ExpanderMenuActor {
    show() {
        if (this.menu) {
            this.menu.destroy();
        }
        this.menu = this.createCard({
            name: 'expander menu',
            translation: [2, 0.5, -4],
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
/*global WorldCore */
