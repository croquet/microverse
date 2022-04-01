import { Model, Constants } from "@croquet/worldcore";
import { startWorld } from "./root.js";

let baseName = new URL(window.location).searchParams.get("world");

if (!baseName) {
    let pathName = window.location.pathName;
    let match = /([^/]+)\.html$/.exec(pathName);
    baseName = match ? match[1] : "defaultDemo";
}

eval(`import("./${baseName}.js")`)
    .then((module) => module.init(Model, Constants))
    .then(() => eval("import('./apiKey.js')"))
// Default parameters are filled in the body of startWorld. You can override them.
    .then((module) => startWorld(module.default))
    .then(() => {
        console.log(`
  ________  ____  ____  __  ____________
 / ___/ _ \\/ __ \\/ __ \\/ / / / __/_  __/
/ /__/ , _/ /_/ / /_/ / /_/ / _/  / /
\\___/_/|_|\\____/\\___\\_\\____/___/ /_/
`);
    });

