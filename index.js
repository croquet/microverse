// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { startShell, startMicroverse, setupController, setupFullScreenButton } from "./shell.js";

function isShellFrame() {
    const isOuterFrame = window.self === window.parent;
    if (isOuterFrame) return true;
    const portalId = new URL(location.href).searchParams.get("portal");
    return !portalId;
}

window.microverseEnablePortal = new URL(window.location).searchParams.has("enablePortal");

async function start() {
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
