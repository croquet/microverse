// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { Model, Constants } from "@croquet/worldcore-kernel";
import { startShell, isShellFrame } from "./shell.js";
import { startWorld, basenames } from "./root.js";
import { WorldSaver } from "./src/worldSaver.js";
import { CodeLibrary } from "./src/code.js";

const defaultAvatarNames = [
    "newwhite", "madhatter", "marchhare", "queenofhearts", "cheshirecat", "alice"
];

const defaultSystemBehaviorDirectory = "behaviors/croquet";
const defaultSystemBehaviorModules = [
    "menu.js", "elected.js", "propertySheet.js", "stickyNote.js", "rapier.js", "pdfview.js", "avatarEvents.js", "singleUser.js"
];

async function startMicroverse() {
    let {basedir, basename} = basenames();

    if (!basename.endsWith(".vrse")) {
        // eval to hide import from webpack
        const worldModule = await eval(`import("${basedir}worlds/${basename}.js")`);
        // use bit-identical math for constant initialization
        Model.evaluate(() => worldModule.init(Constants));
    } else {
        const response = await fetch(basename);
        if (!response.ok) throw Error(`world not found: ${basename}`);
        const text = await response.text();
        const json = new WorldSaver().parse(text);
        Constants.AvatarNames = defaultAvatarNames;
        Constants.SystemBehaviorDirectory = defaultSystemBehaviorDirectory;
        Constants.SystemBehaviorModules = defaultSystemBehaviorModules;
        if (json.data.useRapier) {
            Constants.UseRapier = json.data.useRapier;
        }
        Constants.BehaviorModules = json.data.behaviormodules;
        Constants.DefaultCards = json.data.cards;
        Constants.Library = new CodeLibrary();
        Constants.Library.addModules(json.data.behaviorModules);
    }
    let apiKeysModule;
    try {
        // eval to hide import from webpack
        apiKeysModule = await eval(`import('${basedir}apiKey.js')`);
        const { apiKey, appId } = apiKeysModule.default;
        if (typeof apiKey !== "string") throw Error("apiKey.js: apiKey must be a string");
        if (typeof appId !== "string") throw Error("apiKey.js: appId must be a string");
        if (!apiKey.match(/^[_a-z0-9]+$/i)) throw Error(`invalid apiKey: "${apiKey}"`);
        if (!appId.match(/^[-_.a-z0-9]+$/i)) throw Error(`invalid appId: "${appId}"`);
    } catch (error) {
        console.log(error);
        throw Error("Please make sure that you have created a valid apiKey.js (see croquet.io/keys)");
    };
    // Default parameters are filled in the body of startWorld. You can override them.
    startWorld(apiKeysModule.default, `${basedir}/${basename}`);
}

function start() {
    if (isShellFrame()) startShell();
    else startMicroverse();
}

start();
