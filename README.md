# Croquet Microverse (Beta)

![Microverse Screenshot](https://croquet.io/images/microversess.png)

[https://croquet.io](https://croquet.io)

## Description

Croquet Microverse is a framework to build multiplayer immersive 3D virtual worlds on the web. It is built on the Croquet OS and the Worldcore framework.

* [Croquet OS](https://croquet.io/docs/croquet) provides a clean substrate to build multiuser applications.
* [Worldcore Framework](https://croquet.io/docs/worldcore) provides an abstraction to build 3D applications on top of Croquet OS.
* "Cards" and "Behaviors" abstractions provides a uniform object model, and pluggable behavior descriptions for those objects.It also allows integration with your text editor to support multiuser live programming.
* [Three.JS](https://threejs.org) provides industrial strength 3D rendering backend.
* All Web technology in your browser is available to access different media, real world data into the virtual world, and vice versa.

By combining all together, Croquet Microverse helps developers to create a metaverse world interactively and quickly. And, the deployed web app requires zero-installation to run on users computers.

## License

The source code and assets in this repository are licensed under Apache License 2.0.

## Documentation

The documentation for the Croquet Microverse is located in the [docs](./docs) directory.

* [docs/QuickStart.md](./docs/QuickStart.md) - Quick Start guide to Microverse IDE
* [docs/Development.md](./docs/Development.md) - Development Guide on building Microverses
* [docs/Card.md](./docs/Card.md) - The methods and properties of the Card classes.
* [docs/Avatar.md](./docs/Avatar.md) - The methods and properties of the Avatar classes.
* [docs/CardSpec.md](./docs/CardSpec.md) - Specification for Microverse Cards
* [docs/Elected.md](./docs/Elected.md) - The Election mechanism to choose a peer.
* [docs/Rapier.md](./docs/Rapier.md) - Using the Rapier Physics Engine in Microverses
* [docs/Tutorial.md](./docs/Tutorial.md) - The introduction to tutorials
* [docs/Tutorial1.md](./docs/Tutorial1.md) - The tutorial part 1.
* [docs/Tutorial1.md](./docs/Tutorial2.md) - The tutorial part 2.

## Installation
Please refer to the [docs/QuickStart.md](./docs/QuickStart.md) to get started.

If you just want to try it out quickly, follow these steps:

1. Clone or fork the Github repository from <https://github.com/croquet/microverse>.
   <br>`git clone https://github.com/croquet/microverse.git`
2. Obtain your Croquet API Key from <https://croquet.io/keys/>.
3. Open a terminal and change the working directory to your new microverse folder.
   <br>`cd microverse`
4. Create the apiKey.js file from apiKey.js-example and the API Key above.
   <br>`cp apiKey.js-example apiKey.js # and edit apiKey.js`
5. In the terminal run:
   `npm i`
and then
   `npm start`


## 2. Make `apiKey.js`
Create a file called `apiKey.js` by copying `apiKey.js-example` to `apiKey.js` and then edit the two properties called `apiKey` and `appId` in the file.

```
const apiKey = "paste your apiKey from croquet.io/keys";
const appId = "type your own appId such as com.example.david.mymicroverse";
export default {apiKey, appId};

// you may export other Croquet session parameters to override default values.
```

## 3. Run `npm install`
Run `npm install` in the directory.

## 4. Run `npm install` in `servers`

Run `npm install` in the `servers` directory.

## 5. Run `npm start`
Run `npm start` in the directory. This will start a webpack dev server and the watch server. A modification to source code triggers recompilation of the dev build but automatic relaoding upon file change is disabled. This is because the common workflow is to modify behavior files. In addition to it, typically you need to create a new session by removing the session name parameters in the URL.

**Note:** If you want to run the watch server in a different directory, you can run the webpack dev server by running `npm run dev-server` and then specify the watch-server's target directory by `npm run watch-server -- aDirectory`.

## 6. Launch Microverse, and Connect to Watch Server
After launching Microverse by visiting http://localhost:9684 in a browser, bring up the world menu from top right, and press "Connect". This will establish the connection to the watch-server started in step 5.

**Note:** Instead of `localhost` you may want to visit the local network URL listed in the server output which will enable you to scan the QR code to join the session from a phone on the same Wi-Fi:

    [webpack-dev-server] Project is running at:
    [webpack-dev-server] Loopback: http://localhost:9684/
    [webpack-dev-server] On Your Network (IPv4): http://192.168.1.137:9684/

## 7. Edit or add a new behavior file
You can add a new behavior file in the watched directory (by default under `behaviors`), and if the file follows the structure of other files, it will become automatically available.

## 8. Other npm scripts.
- `npm run build` build a production build in the directory called `dist`.
`npm run build-dev` simulated the dev server's output and allows you to see what is generated as files.
- `npm run file-server` runs a vanilla file server. This is useful to test the files in `dist` directory.
- `npm run create-version` creates a one line file that contains the commit hash.
- `npm run build-lib` creates a minimum set of files needed to run a test installation in the directory called `dist`. This directory can be published as an npm package, and in turn, used to create a simple application by runniing `npm init croquet-microverse` in an empty directory.
- `npm run three-lib` creates a concatenated js file called `/three/bundledThreeLibs.js`. This generated file is included in this repository to help developers get started easily. If you decide to use a newer version of Three.js, or add more libraries, it is recommended to edit `scripts/getThreeLibs.sh` and run it to create a new `bundledThreeLibs.js`.

**Copyright (c) 2022 Croquet Corporation**
