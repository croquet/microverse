//----------------------------------------------------------------------------------------------------
// View Asset Cache
//
// Stores view assets that are loaded by URL. When you load an asset you can supply a callback that will be
// triggered when it finishes loading. (If the asset is already loaded, the callback is ignored.)
//----------------------------------------------------------------------------------------------------

const assetCache = new Map();
let assetID = 0;

export function IsLoaded(url) {
    const entry = assetCache.get(url);
    return (entry && entry.isLoaded);
}

export function LoadFont(url, onLoad) {
    let entry;
    if (assetCache.has(url)) {
        entry = assetCache.get(url);
    } else {
        const name = "font" + assetID++;
        entry = {
            name,
            element: new FontFace(name, "url(" + url + ")"),
            isLoaded: false,
            callbacks: []
        };
        assetCache.set(url, entry);
        entry.element.load().then(
            () => {
                document.fonts.add(entry.element);
                entry.isLoaded = true;
                entry.callbacks.forEach(callback => callback());
                entry.callbacks = [];
            },
            () => console.log("Font " + url + " not found!")
        );
    }
    if (onLoad && !entry.isLoaded) entry.callbacks.push(onLoad);
    return entry.name;
}

export function LoadImage(url, onLoad) {
    let entry;
    if (assetCache.has(url)) {
        entry = assetCache.get(url);
        if (onLoad && !entry.isLoaded) {
            entry.callbacks.push(onLoad);
            return null;
        }
        return entry.element;
    }

    entry = {
        element: new Image(),
        isLoaded: false,
        callbacks: []
    };
    assetCache.set(url, entry);

    entry.element.onload = () => {
        entry.isLoaded = true;
        entry.callbacks.forEach(callback => callback(entry.element));
        entry.callbacks = [];
    };

    entry.element.onerror = () => console.log("Image " + url + " not found!");
    entry.element.src = url;

    if (onLoad && !entry.isLoaded) entry.callbacks.push(onLoad);
    return null;
}

