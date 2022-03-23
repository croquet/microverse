class PropertyPanelActor {
    setObject(target) {
        this.target = target;
        this.expanderMenu = this.createCard({
            name: 'expander menu',
            actorCode: ["ExpanderMenuActor"],
            translation: [1, 0, 0],
            type: "object",
            parent: this,
            target: target.id});
        this.expanderMenu.call("ExpanderMenuActor", "show");

        this.cardSpec = this.createCard({
            className: "TextFieldActor",
            name: 'card spec',
            translation: [-1, 0, 0],
            parent: this,
            type: "text",
            multiuser: true,
            // margins: {left: 32, top: 32, right: 32, bottom: 32},
            textScale: 0.002,
            backgroundColor: 0xffffff,
            width: 2,
            height: 2,
            depth: 0.05,
            autoResize: false,
            noDismissButton: true,
            borderRadius: 0.02,
            runs: [{text: "hello\nbye"}]
        });

        this.dismissButton = this.createCard({
            className: "TextFieldActor",
            name: 'dismiss button',
            translation: [-1, 1.5, 1],
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
            runs: [{text: "ok"}]
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
