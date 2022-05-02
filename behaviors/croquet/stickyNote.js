class StickyNoteActor {
    setup() {
        this.subscribe(this.id, "text", "cardSpecAccept");
    }

    cardSpecAccept(data) {
        let {text} = data;

        let array = text.split('\n');
        let simpleRE = /^[ \t]*([^:]+)[ \t]*:[ \t]*(.*)$/;
        let spec = {};

        try {
            array.forEach((line) => {
                if (line.trim().length === 0) {return;}
                let match = simpleRE.exec(line);
                if (match) {
                    let key = match[1];
                    let value = match[2];
                    if (value && value.endsWith(",")) {
                        value = value.slice(0, value.length - 1);
                    }
                    try {
                        value = JSON.parse(value);
                    } catch(e) {
                        console.log(e);
                        throw e;
                    }
                    if (key === "rotation" || key === "dataRotation") {
                        if (Array.isArray(value) && value.length === 3) {
                            value = Worldcore.q_euler(...value);
                        }
                    }
                    spec[key] = value;
                } else {
                    throw "not a cardSpec line";
                }
            });
        } catch (e) {
            console.log("text is not a card spec");
            return;
        }

        if (!spec.type) {
            console.log("spec does not have type");
            return;
        }

        if (!spec.rotation) {
            spec.rotation = this._rotation;
        }

        if (!spec.translation) {
            spec.translation = this._translation;
        }
        this.createCard(spec);
    }
}

export default {
    modules: [
        {
            name: "StickyNote",
            actorBehaviors: [StickyNoteActor]
        },
    ]
}
/*globals Worldcore */
