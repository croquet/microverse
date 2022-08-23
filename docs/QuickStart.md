# Croquet Microverse Quick Start Guide

[https://croquet.io](https://croquet.io)

## TL;DR

    npm create croquet-microverse

    npm start

## Introduction

This guide will enable you to quickly set up your own Croquet Microverse project. Refer to tutorials in the [docs directory](.) for its key concepts and features that let you build shared worlds.

### Prerequisites

1. [Node](https://nodejs.org/)
2. Web browser (we recommend [Chrome](https://chrome.google.com/) at this time)

Our tools are written in JavaScript and need Node.js to run. In particular the `npm` command provided by Node is used to install JS packages.

The users of your worlds do not need these tools. Microverse worlds are deployed as static web pages so only a web browser is needed to visit them.

---
## Installation Steps

1. Create an empty directory for your project
2. In that directory, run the following command:

       npm create croquet-microverse

   This will create a ready-to-use folder structure for your project
3. Paste your API key from [croquet.io/keys](https://croquet.io/keys/) (be sure to select "Microverse") into a file named `apiKey.js`

        /* Copy this into a file named apiKey.js */
        const apiKey = '123abcd_Get_your_own_key';
        const appId = 'com.mycompany.myorg.myapp';
        export default {apiKey, appId};

    You can pick your own `appId` or go with the default shown in the template.

---
## Video Walkthrough
Here's a video walkthrough of the steps: https://vimeo.com/739770287


[![Walkthrough](https://croquet.io/images/videos/thumbnails/howto-microverse.jpg)](https://vimeo.com/739770287)

---
## Try your project locally

In the directory you just created, run

    npm start

This will start the development web server. In its output there will be lines like

    [webpack-dev-server] Project is running at:
    [webpack-dev-server] Loopback: http://localhost:9684/
    [webpack-dev-server] On Your Network (IPv4): http://192.168.1.145:9684/

Copy the Network URL (e.g. `http://192.168.1.145:9684/`) and paste it into your web browser. We recommend using this URL over the `localhost` one to be able to join the session from other devices, e.g. your phone.

Congratulations!

<p align="center">
<img src="https://gist.githubusercontent.com/yoshikiohshima/45848af5a19dddbe1ea77f5d238fced0/raw/1b60d234f785e84f31eff3b4385c1dcbeb8831ad/shared-space.jpg" width=640"/>
</p>

---

## Deploy your world to a web server

A Croquet app like Microverse is deployed as a static web app. You do not need any other kind of server.

1. Create a production key at [croquet.io/keys](https://croquet.io/keys/) and add a restriction to your target URL, then edit the key in your `apiKey.js`

        const apiKey = '123abcd_production_key_goes_here';

2. Copy the `lib` directory

    At runtime, Microverse only needs the files in `node_modules/@croquet/microverse-library/lib` so we recommend to copy that directory to your project directory, and edit `index.html` to refer to it.

        <script defer src="lib/index.js"></script>

3. Upload the whole project directory to any web server.

    One simple way is GitHub pages. Check your directory into git, publish to GitHub, and enable [pages](https://pages.github.com).

    Here's an example
    * code: https://github.com/codefrau/microverse-neon
    * live: https://codefrau.github.io/microverse-neon/

---
## Updating

In your project directory run

    npm i @croquet/microverse-library@latest

This will update your `package.json` and the installed version of Microverse to the latest. Then copy the updated `node_modules/@croquet/microverse-library/lib` directory again as described above.

## Resources
---

### Documentation

See the [docs directory](.).

### Croquet.io
[https://croquet.io/](https://croquet.io/) is the best place to get started with what the Croquet Microverse is and what it can do.

The Croquet Microverse uses the [Croquet Library](https://croquet.io/docs/croquet) and the [Worldcore framework](https://croquet.io/docs/worldcore). Additionally it depends on [Three.js](https://threejs.org/) for 3D rendering. To develop your own behaviors with new visual appearances, you will need to be familiar with those libraries.

### Discord

The best resource for help in developing Croquet Microverse worlds is our Discord community. The Croquet Discord server is where you can chat with fellow developers, ask questions, and show off your own creations. Join the [Croquet Discord server](https://croquet.io/discord/).

**Copyright (c) 2022 Croquet Corporation**
