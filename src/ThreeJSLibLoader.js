export function loadThreeJSLib(lib, THREE) {
    if (!window.THREE) {
        window.THREE = THREE;
    }
    return new Promise((resolve, reject) => {
        let script = document.createElement("script");
        let version = window.__THREE__;
        script.src = `https://unpkg.com/three@0.${version}/examples/js/${lib}`;
        script.onload = () => {
            return resolve(window.THREE);
        };
        document.body.appendChild(script);
    });
}
    
