// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { startShell, isShellFrame } from "./shell.js";

async function start() {
    if (isShellFrame()) startShell();
    else {
        const { startMicroverse } = await import("./src/microverse.js");
        startMicroverse();
    }
}

start();
