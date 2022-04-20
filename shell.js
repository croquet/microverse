export function startShell() {
}

// answer true if this frame is the outer shell of the app
// if false, then this frame is an inner iframe with a microverse
export async function isShellWindow() {
    return false;
}
