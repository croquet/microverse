// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

function isShellFrame() {
    const isOuterFrame = window.self === window.parent;
    if (isOuterFrame) return true;
    const portalId = new URL(location.href).searchParams.get("portal");
    return !portalId;
}

async function start() {
    if (false/*isShellFrame()*/) {
        const { startShell } = await import("./shell.js");
        startShell();
    } else {
        const { startMicroverse } = await import("./src/microverse.js");
        startMicroverse();
    }
}

start();
