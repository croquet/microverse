class FileDragAndDropActor {
    fileUploaded(data) {
        let {dataId, fileName, type, translation, rotation, animationClipIndex, dataScale} = data;

        let cardType = type === "exr" ? "lighting" : (type === "svg" || type === "img" || type === "pdf" ? "2d" : "3d");

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
