import { Model, Constants } from "@croquet/worldcore";
import { startWorld, basenames } from "./root.js";

let {basedir, basename} = basenames();
eval(`import("${basedir}worlds/${basename}.js")`)
// use bit-identical math for constant initialization
    .then((module) => Model.evaluate(() => module.init(Constants)))
    .then(() => eval(`import('${basedir}apiKey.js')`))
// Default parameters are filled in the body of startWorld. You can override them.
    .then((module) => startWorld(module.default))
    .catch((error) => {
        console.log(error);
        console.error("Please make sure that you have created a valid apiKey.js");
    });
