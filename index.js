// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

function isShellFrame() {
    const isOuterFrame = window.self === window.parent;
    if (isOuterFrame) return true;
    const portalId = new URL(location.href).searchParams.get("portal");
    return !portalId;
}

window.microverseUseShell = new URL(window.location).searchParams.has("useShell");

async function start() {
    if (!window.microverseUseShell) {
        const { startShell } = await import("./simpleShell.js");
        return startShell();
    }
    if (isShellFrame()) {
        const { startShell } = await import("./shell.js");
        startShell();
    } else {
        const { startMicroverse } = await import("./src/microverse.js");
        startMicroverse();
    }
}

start();
