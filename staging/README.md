# Installation Guide for Croquet Microverse (April 5th, 2022)

## 1. Clone this repo

Clone this git repository in your convenient manner.

## 2. Make `apiKey.js`
Create a file called `apiKey.js` by copying `apiKey.js-example` to `apiKey.js` and then edit the two properties called `apiKey` and `appId` in the file.

## 3. Run `npm install`
Run `npm install` in the directory.

## 4. Run `npm start`
Run `npm start` in the directory. This will run two servers. One is the file server on localhost:9684, and another is the watch-server to inject code changes into a running session. You can also run them separately by running `npm run file-server` and `npm run watch-server`.

## 5. Note on the watch-server
The watch-server by default starts watching the directory called `behaviors`.  If you want to create a separate set of behavior files in a different directory, you supply an argument to the watch-server by `npm run watch-server -- aDirectory`.

## 6. Press the Connect button in the world menu
After launching Microverse by visiting http://localhost:9684 in Chrome bring up the world menu from bottom left, and press "Connect". This will establish the connection to the watch-server started in step 4.

## 7. Edit or add a new file
You can simply add a new file in the watched directory (by default `behaviors/default/`), and if the file follows the structure of other files, it will become automatically available.
