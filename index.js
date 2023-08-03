// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { startShell, startMicroverse, setupController, setupFullScreenButton } from "./shell.js";

window.microverseEnablePortal = new URL(window.location).searchParams.has("enablePortal");

function isShellFrame() {
    const isOuterFrame = window.self === window.parent;
    if (isOuterFrame) return true;
    const portalId = new URL(location.href).searchParams.get("portal");
    return !portalId;
}

async function runPrelude() {
    let url = window.location.origin + window.location.pathname;
    let match = /([^/]+)\.html$/.exec(url);

    let baseurl;
    if (match) {
        baseurl = url.slice(0, match.index);
    } else {
        let slash = url.lastIndexOf("/");
        baseurl = url.slice(0, slash + 1);
    }

    try {
        const { prelude } = await eval(`import('${baseurl}prelude.js')`);
        await prelude();
    } catch(e) {
        console.log("error in the prelude function");
    }
}

async function start() {
    await runPrelude();
    if (!window.microverseEnablePortal) {
        startShell();
        setupController(true);
        startMicroverse();
        return;
    }
    if (isShellFrame()) {
        startShell(true);
        setupFullScreenButton();
    } else {
        setupController();
        startMicroverse();
    }
}

start();
