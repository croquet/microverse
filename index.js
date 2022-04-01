import { Model, Constants } from "@croquet/worldcore";
import { startWorld } from "./root.js";

let pathname = window.location.pathname;
let match = /([^/]+)\.html$/.exec(pathname);
let basename = new URL(window.location).searchParams.get("world");
if (!basename) {
    basename = (!match || match[1] === "index") ? "defaultDemo" : match[1];
    console.log("base", basename);
}

let basedir;
if (match) {
    basedir = pathname.slice(0, match.index);
} else {
    let slash = pathname.lastIndexOf("/");
    basedir = pathname.slice(0, slash + 1);
}

eval(`import("${basedir}${basename}.js")`)
    .then((module) => module.init(Model, Constants))
    .then(() => eval(`import('${basedir}apiKey.js')`))
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
