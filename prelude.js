export async function prelude() {
    /*
      this function provides a customized settings before the entire
     system starts up.  For example, if you want to disable Rapier to
     reduce the load time, you uncomment the following line:
    */

    // window.RAPIERModule = {version: () => "stubbed out"};

    /*
      The portals are disabled by default but enabled by adding a URL
      option enablePortal=true.  Alternatively, you can set it from
      this file by uncomment the following line:
    */

    // window.microverseEnablePortal = true;

    /*
      There are two display quality options.  WebGL antialiasing is
      enabled or disabled based on the browser type but force a value
      with a URL option AA=true or AA=false

      Alternatively, you can set it from this file by uncomment the following line:
    */

    // window.microverseAAOption = true;

    /*
      The HighDPI rendering flag to support higher pixel density
      displays is off by default, but you can force a value with a URL
      option HighDPI=true.

      Alternatively, you can set it from this file by uncomment the folloing line:
    */

    // window.microverseHighDPIOption = true;

    /*
      If you want to load a CSS file, or additional JS files or such before
      Microverse starts up, you'd create a "link" type element or "script"
      type element and set its src and wait for load completion.

      await new Promise((resolve) => {
          let css = document.createElement("link");
          css.rel = "stylesheet";
          css.type = "text/css";
          css.
          css.id = "joystick-css";
          css.onload = resolve;
          css.href = "/assets/css/joystick.css";
          document.head.appendChild(css);
      });

    */

    /*
      The caller of this function in index.js await's the result. As
      this function is async the folllowing return is implicitly
      converted to a Promise. Your custom code may return an explicit
      Promise like the one above.
    */

    return null;
}
