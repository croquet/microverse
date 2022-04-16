export function loadThreeLibs(THREE) {
    window.THREE = THREE;
    return import("./bundledThreeLibs.js");
}

