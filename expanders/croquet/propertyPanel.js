class PropertyPanelActor {
    setObject(target) {
        this.target = target;

        this.expanderMenu = this.createCard({
            name: 'expander menu',
            actorCode: ["ExpanderMenuActor"],
            translation: [0, 0.6, 0.055],
            type: "object",
            parent: this,
            noSave: true,
            target: target.id});
        this.expanderMenu.call("ExpanderMenuActor", "show");

        this.cardSpec = this.createCard({
            className: "TextFieldActor",
            name: 'card spec',
            translation: [0, -1, -0.02],
            parent: this,
            type: "text",
            multiuser: true,
            margins: {left: 8, top: 8, right: 8, bottom: 8},
            textScale: 0.0012,
            backgroundColor: 0xffffff,
            width: 1,
            height: 2,
            depth: 0.05,
            autoResize: false,
            noDismissButton: true,
            borderRadius: 0.013,
            fullBright: true,
            runs: [{text: ""}],
            noSave: true,
        });

        this.dismissButton = this.createCard({
            className: "TextFieldActor",
            name: "dismiss button",
            translation: [0.5, 1.65, 0.005],
            parent: this,
            type: "text",
            multiuser: true,
            textScale: 0.002,
            backgroundColor: 0xffffff,
            readOnly: true,
            singleLine: true,
            autoResize: true,
            noDismissButton: true,
            width: 2,
            height: 2,
            depth: 0.05,
            runs: [{text: "ok"}],
            noSave: true,
        });
        
        let cardDataString = this.cardSpecString(target);

        this.cardSpec.loadAndReset(cardDataString);

        this.scriptSubscribe(this.cardSpec.id, "text", "cardSpecAccept");
        this.scriptListen("dismiss", "dismiss");
        this.dismissButton.addEventListener("pointerTap", "PropertyPanelActor.close");
    }

    cardSpecString(target) {
        let data = target.collectCardData();
        // I'd remove quotes for keys
        return JSON.stringify(data, null, 4);
    }

    cardSpecAccept(data) {
        let {text} = data;

        let spec;

        try {
            spec = JSON.parse(text);
        } catch (e) {
            console.log("not JSON");
        }

        if (!spec) {return;}

        console.log(spec);

        if (!this.target.doomed) {
            this.target.updateOptions(spec);
        }
    }

    close() {
        this.sayDeck("dismiss");
    }

    dismiss() {
        if (this.dismissButton) {
            this.dismissButton.destroy();
        }

        if (this.cardSpec) {
            this.cardSpec.destroy();
        }
        
        if (this.expanderMenu) {
            this.expanderMenu.destroy();
        }

        this.destroy();
    }
}

export const propertyPanel = {
    actorExpanders: [PropertyPanelActor]
};
