# Making a Card a Clickable Link

## Goals
This tutorial aims to teach you how to enable a user to click on a Card within a Microverse World and have their browser open a specified URL in a new tab.

## Prerequisites
This tutorial assumes that you have Microverse running locally. To do so, follow the [Quick Start Guide](./QuickStart.md).

## Instructions

The process for adding a clickable link to a card involves several steps:

1. Visit the following URL in your browser: https://raw.githubusercontent.com/croquet/microverse/main/behaviors/default/urlLink.js

2. Save that `urlLink.js` file to the `behaviors/default` directory within your Microverse directory.
	- You can save that file to your local disk by pressing CTRL+S (Windows) or CMD+S (Mac OS) with your browser window open.

3. Within your Microverse directory, navigate into the `worlds` directory.

4. Open `default.js` in a text editor.

5. In `default.js`, you will see lines of code that look similar to the following:
    ```
        Constants.UserBehaviorModules = [
            "csmLights.js"
        ];
    ```

    Edit those lines of code to add `urlLink.js` to this `Constants.UserBehaviorModules[]` array, like this:
    ```
        Constants.UserBehaviorModules = [
            "csmLights.js",
            "urlLink.js"
        ];
    ```

    - ⚠️ Don't forget to add a comma after `"csmLights.js"`.

6. If you are using Git, GitHub, or GitHub Pages, now is the time to commit the changes to `behaviors/default/urlLink.js` and `worlds/default.js` from steps 1-5 to your remote repository.
	- If you are using GitHub, you can drag the entire `behaviors` folder and the `worlds` folder into your GitHub repository window in your Web browser. GitHub will guide you through committing those modified files to your remote repository.

7. If you are using GitHub pages, wait for GitHub to deploy your changes.

8. Open your Microverse world in your browser.
	- If you are running Microverse locally, double click `index.html`.
	- If you are using GitHub Pages, visit the URL associated with your Microverse world.
	
9. Drag the object you want to make clickable into your Microverse world.
	- Microverse can import the following file formats: `GLB`, `OBJ`, `FBX`, `SVG`, `PNG`, `JPG`, `GIF`, `EXR`, `WRL`, `PDF`, `VRSE`

10. CTRL+Click on the object to enter editing mode, then click on the gray property sheet button above and to the left of the object.
	- Depending on the size of your object, you may have to zoom out to see the property sheet button.

11. Add the following two lines to the card's code on the left hand side of the property sheet:
    ```
    cardURL: "https://croquet.io",
    behaviorModules: ["URLLink"],
    ```
    - Replace "https://croquet.io" with whatever URL you want your visitors to go to when they click the link.
	
12. Click "Save" at the bottom right of the card's property sheet.
	- Alternatively, press CTRL+S.
	
13. You're done! Now, when you hover over the card, you should see a highlight overlay appear on the object, indicating that it is clickable. When you click the card, your browser should open a new tab to the URL you specified in the card's property sheet.

## Conclusion

We hope you enjoy linking people to places around the Web from within the Open Metaverse using Microverse World Builder. We look forward to interacting with your creations.

**Copyright (c) 2023 Croquet Corporation**
