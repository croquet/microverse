// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function loadThreeJSLib(lib, THREE) {
    if (!window.THREE) {
        window.THREE = THREE;
    }
    return new Promise((resolve, _reject) => {
        let script = document.createElement("script");
        let version = window.__THREE__;

        let src;
        if (typeof lib === "string") {
            src = `https://unpkg.com/three@0.${version}/examples/js/${lib}`;
        } else {
            src = `https://unpkg.com/${lib.package}@${lib.version}`;
        }

        let slash = lib.indexOf("/");
        let dot = lib.indexOf(".");

        script.setAttribute("defer", "");
        script.src = src;
        script.onload = () => {
            console.log(lib, !!THREE[lib.slice(slash + 1, dot)]);
            return resolve(window.THREE);
        };
        document.body.appendChild(script);
    });
}

