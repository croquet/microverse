// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { startShell, startMicroverse, setupController, setupFullScreenButton } from "./simpleShell.js";


function isShellFrame() {
    const isOuterFrame = window.self === window.parent;
    if (isOuterFrame) return true;
    const portalId = new URL(location.href).searchParams.get("portal");
    return !portalId;
}

window.microverseUseShell = new URL(window.location).searchParams.has("useShell");

async function start() {
    if (!window.microverseUseShell) {
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
