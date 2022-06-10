// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io
//
// enumerate all cards, including the ones that are embedded into others (that is, their parents are *not* model root.
// save the json that would be used for create, but along with the class name (hopefully we can retire this field, but may not be true.
//
// loading time: in general, the parent needs to be created before a child

import {intrinsicProperties} from "./card.js";
import {Constants} from "@croquet/worldcore-kernel";

export class WorldSaver {
    constructor(defaultClass) {
        this.map = new Map();
        this.id = 0;
        this.defaultClass = defaultClass;
    }

    newId() {
        return (++this.id).toString().padStart(4, '0');
    }

    save(model) {
        let cards = [];
        for (let [_id, actor] of model.service("ActorManager").actors) {
            if (actor.isCard && !actor.noSave) {
                cards.push(actor);
            }
        }
        let sortedMap = this.topologicalSort(cards);
        let resultArray = this.collectData(sortedMap);

        let behaviorModules = model.service("BehaviorModelManager").save();

        let result = {behaviorModules, cards: resultArray};

        if (Constants.UseRapier) {
            result.useRapier = true;
        }
        return result;
    }

    topologicalSort(cards) {
        let result = new Map();
        let toSort = [...cards];
        let checked = new Map();

        while (toSort.length > 0) {
            let n = toSort.shift();
            if (!n._parent || result.get(n._parent.id)) {
                // it is a root child, or its parent is already in result
                result.set(n.id, n);
            } else {
                // Its parent may be still in the toSort array
                if (checked.get(n)) {throw new Error("actors make a cycle");}
                toSort.push(n);
                checked.set(n, true);
            }
        }
        return result;
    }

    collectData(cardsMap) {
        let result = [];
        for (let [_id, actor] of cardsMap) {
            let obj = {id: this.newId()};
            this.map.set(actor, obj);
            let data = this.collectCardData(actor);
            obj.card = data;
            result.push(obj);
        };
        return result;
    }

    collectCardData(card, useRealId) {
        let result = {};
        if (card.constructor !== this.defaultClass) {
            result.className = card.constructor.name;
        }
        intrinsicProperties.forEach((prop) => {
            if (card[`_${prop}`]) {
                if (prop === "parent") {
                    if (!useRealId) {
                        let entry = this.map.get(card[prop]);
                        if (!entry) {throw new Error("undefined parent used");}
                        result[prop] = entry.id;
                    } else {
                        let entry = card[prop];
                        if (!entry) {throw new Error("undefined parent used");}
                        result[prop] = entry.id;
                    }
                } else {
                    result[prop] = card[`_${prop}`];
                }
            }
        });

        if (card._cardData) {
            let keys = Object.keys(card._cardData);
            keys.sort();
            keys.forEach((k) => {
                result[k] = card._cardData[k];
            });
        }
        return result;
    }

    stringifyInner(node, seen) {
        if (node === undefined) return undefined;
        if (typeof node === 'number') return Number.isFinite(node) ? `${node}` : 'null';
        if (typeof node !== 'object') return JSON.stringify(node);

        let out;
        if (Array.isArray(node)) {
            out = '[';
            for (let i = 0; i < node.length; i++) {
                if (i > 0) out += ',';
                out += this.stringifyInner(node[i], seen) || 'null';
            }
            return out + ']';
        }

        if (node === null) return 'null';

        if (seen.has(node)) {
            throw new TypeError('Converting circular structure to JSON');
        }

        seen.add(node);

        if (node.constructor === window.Map) {
            let replacement = {__map: true, values: [...node]};
            return this.stringifyInner(replacement, seen);
        }

        let keys = Object.keys(node).sort();
        out = '';
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            let value = this.stringifyInner(node[key], seen, out);
            if (!value) continue;
            if (out !== '') out += ',';
            out += JSON.stringify(key) + ':' + value;
        }
        seen.delete(node);
        return '{' + out + '}';
    }

    stringify(obj) {
        let seen = new Set();
        return this.stringifyInner(obj, seen);
    }

    parse(string) {
        return JSON.parse(string, (_key, value) => {
            if (typeof value === "object" && value !== null && value.__map) {
                return new Map(value.values);
            }
            return value;
        });
    }
}
