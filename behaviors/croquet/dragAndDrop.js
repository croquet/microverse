// the following import statement is solely for the type checking and
// autocompletion features in IDE.  A Behavior cannot inherit from
// another behavior or a base class but can use the methods and
// properties of the card to which it is installed.
// The prototype classes ActorBehavior and PawnBehavior provide
// the features defined at the card object.

import {ActorBehavior} from "../PrototypeBehavior";

class FileDragAndDropActor extends ActorBehavior {
    fileUploaded(data) {
        let {dataId, fileName, type, translation, rotation, animationClipIndex, dataScale} = data;

        if (type == "mov" || type === "mp4") {
            type = "video";
        }

        let cardType = type === "exr" ? "lighting" : (type === "svg" || type === "img" || type === "pdf" || type === "video" ? "2d" : "3d");

        let options = {
            name: fileName,
            translation,
            rotation,
            type: cardType,
            fileName,
            modelType: type,
            shadow: true,
            singleSided: true
        };

        if (animationClipIndex !== undefined) {
            options.animationClipIndex = animationClipIndex;
        }

        if (cardType === "3d" && dataScale) {
            options.dataScale = dataScale;
        }

        if (type === "img") {
            options = {
                ...options,
                textureLocation: dataId,
                textureType: "image",
                scale: [4, 4, 4],
                cornerRadius: 0.02,
                fullBright: true,
            };
        } else if (type === "pdf") {
            options = {
                ...options,
                behaviorModules: ["PDFView"],
                scale: [4, 4, 4],
                layers: ["pointer"],
                type: "2d",
                frameColor: 0xffffff,
                color: 0x888888,
                depth: 0.05,
                fullBright: true,
                pdfLocation: dataId
            };
        } else if (type === "video") {
            let textureWidth = data.width;
            let textureHeight = data.height;
            let width;
            let height;
            if (textureWidth > textureHeight) {
                width = 3;
                height = width * (textureHeight / textureWidth);
            } else {
                height = 3;
                width = width * (textureWidth / textureHeight);
            }
            options = {
                ...options,
                scale: [4, 4, 4],
                behaviorModules: ["VideoPlayer"],
                type: "2d",
                textureType: "video",
                frameColor: 0xffffff,
                color: 0xcccccc,
                depth: 0.05,
                fullBright: true,
                textureLocation: dataId,
                textureWidth, textureHeight, width, height
            };
        } else {
            options = {...options, dataLocation: dataId};
        }

        if (type !== "exr") {
            this.createCard(options);
        } else {
            let light = [...this.service("ActorManager").actors.values()].find(o => o._cardData.type === "lighting");
            if (light) {
                light.updateOptions({...light._cardData, dataLocation: dataId, dataType: "exr"});
            }
        }

        this.publish(this.sessionId, "triggerPersist");
    }
}

export default {
    modules: [
        {
            name: "FileDragAndDropHandler",
            actorBehaviors: [FileDragAndDropActor]
        }
    ]
}
