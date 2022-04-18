import { Model, Constants } from "@croquet/worldcore";
import { startWorld, basenames } from "./root.js";
import { WorldSaver } from "./src/worldSaver.js";
import { CodeLibrary } from "./src/code.js";

export const defaultMaxAvatars = 6;
export const defaultAvatarNames = [
    "generic/1", "generic/2", "generic/3", "generic/4", "generic/5", "generic/6",
    "alice", "newwhite", "fixmadhatter", "marchhare", "queenofhearts", "cheshirecat"
];

let {basedir, basename} = basenames();


function check() {
    return (basename.endsWith(".json")) ? Promise.resolve(null) : eval(`import("${basedir}worlds/${basename}.js")`)
}

check().then((module) => {
    if (basename.endsWith(".json")) {
        return fetch(basename).then((response) => {
            if (`${response.status}`.startsWith("2")) {
                return response.text();
            }
            throw new Error("initFile not found");
        }).then((text) => {
            let json = new WorldSaver().parse(text);
            Constants.MaxAvatars = defaultMaxAvatars;
            Constants.AvatarNames = defaultAvatarNames;
            Constants.BehaviorModules = json.data.behaviormodules;
            Constants.DefaultCards = json.data.cards;
            Constants.Library = new CodeLibrary();
            Constants.Library.addModules(json.data.behaviorModules);
        });
    }
    // use bit-identical math for constant initialization
    Model.evaluate(() => module.init(Constants));
    return Promise.resolve(null);
}).then(() => eval(`import('${basedir}apiKey.js')`))
// Default parameters are filled in the body of startWorld. You can override them.
    .then((module) => startWorld(module.default))
    .catch((error) => {
        console.log(error);
        console.error("Please make sure that you have created a valid apiKey.js");
    });
