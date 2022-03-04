// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { startWorld, Constants, q_euler } from "./root.js";

Constants.MaxAvatars = 6;
Constants.AvatarNames = [
    "generic/1", "generic/2", "generic/3", "generic/4", "generic/5", "generic/6",
    "alice", "newwhite", "fixmadhatter", "marchhare", "queenofhearts", "cheshirecat"
];

Constants.DefaultScripts = [{
    action: "add",
    name: "ExpanderMenuActor",
    content: `class ExpanderMenuActor {
    show() {
        if (this.menu) {
            this.menu.destroy();
        }
        this.menu = WorldCore.CardActor.create({
            name: 'expander menu',
            translation: [2, 0.5, -4],
            actorCode: ["MenuActor"],
            multiple: true,
            parent: this._target
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
`}, {
    action: "add",
    name: "MenuActor",
    content: `class MenuActor {
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

/*global WorldCore */
`}, {
    action: "add",
    name: "MenuItemActor",
    content: `class MenuItemActor {
    click(evt) {
        this.publish(this.id, "fire", {id: this.id, name: this._cardData.name});
    }
    
}
`}
];

Constants.DefaultCards = [
    {
        card: {
            name:'world model',
            translation:[25, -90.5, -60],
            scale:[200, 200, 200],
            rotation: q_euler(0, Math.PI, 0),
            layers: ['walk'],
            type: "model",
            // dataLocation: "./assets/3D/Refinery.glb.zip",
            singleSided: true,
            shadow: true,
            placeholder: true,
            placeholderSize: [40, 1, 40],
            placeholderColor: 0x808080,
            placeholderOffset: [0, -0.065, 0],
        }
    },
    {
        card: {
            name: 'lighting #1',
            type: "lighting",
            className: "DLight",
        }
    },
]

// Default parameters are filled in the body of startWorld
startWorld({
    appId: 'io.croquet.microverse',
    apiKey: '1_nsjqc1jktrot0iowp3c1348dgrjvl42hv6wj8c2i',
    tps: 30,
    eventRateLimit: 60,
}).then(() => {
    console.log(` 
  ________  ____  ____  __  ____________ 
 / ___/ _ \\/ __ \\/ __ \\/ / / / __/_  __/
/ /__/ , _/ /_/ / /_/ / /_/ / _/  / /   
\\___/_/|_|\\____/\\___\\_\\____/___/ /_/
`);
});
