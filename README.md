# The Croquet Microverse Repository

## 1. Clonse worldcore repository

This repo tends to depend on the cutting edge version of worldcore https://github.com/croquet/worldcore. Clone that also and put it at the side of this directory. And initialize worldcore repo by running `lerna bootstrap`.

## 2. Make `apiKey.js`
Create a file called `apiKey.js` by copying `apiKey.js-example` to `apiKey.js` and then edit the two properties called `apiKey` and `appId` in the file.  The following is our canonical one.

```
const apiKey = "1ivna6yP50E8pCxsddl57BtKLA6vidlrIBc7zcmmj";
const appId = "io.croquet.microverse";
export default {apiKey, appId};
```

## 3. Run `npm install`
Run `npm install` in the directory.

## 4. Run `npm install` in `servers`

Run `npm install` in the `servers` directory.

## 5. Run `npm start`
Run `npm start` in the directory. This will start a webpack dev server.  A modification to source code triggers recompilation of the dev build but live reloading is disabled as a common workflow is to modify behavior file, and also often times you want to create a new session by removing the parameters from URL anyway.

If you do want to use live-reloading of a page, try `npm run non-scripting`.

## 5. Run `npm run watch-server`
You can start the watch server by running `npm run watch-server`.  The watch-server by default starts watching the directory called `behaviors`.  If you want to create a separate set of behavior files in a different directory, you supply an argument to the watch-server by `npm run watch-server -- aDirectory`.

## 6. Press the Connect button in the world menu
After launching Microverse by visiting http://localhost:9684 in Chrome bring up the world menu from bottom left, and press "Connect". This will establish the connection to the watch-server started in step 4.

## 7. Edit or add a new file
You can simply add a new file in the watched directory (by default `behaviors/default/`), and if the file follows the structure of other files, it will become automatically available.

## 8. Other npm scripts.
`npm run file-server` runs a vanilla file server (but notice that index.html at the top is not runnable, so the file server itself may not much of use here.) `npm run build` build a production build. `npm run build-dev` simulated the dev server's output and allows you to see what is generated as files. `npm run build-public` creates a directory called `dist` with file contentss for a possible npm package and deployment. `npm run create-version` creates a one line file that contains the commit hash. `npm run copy-to-git` copies files to a directory at `../microverse-min`. The wonderland/croquet/microverse/deploy.js script runs `npm run build` adds the version file by running `npm run create-version`, and then copy the `apiKey.js`.
