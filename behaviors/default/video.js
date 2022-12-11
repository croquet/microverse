/*
  A video player for Croquet Microverse.

  It plays a video synchronously (with in the error margin of setting currentTime property)

  Logically, a video has two states (playing and paused/not playing).
  When it is not playing however, there are cases whether:
  - the browser has given permission to play the video
  - the next play (currentTime) should be changed based on whether the video had played
    into a position.

  There is a case that the session comes back from dormant. so care is taken that the video element recreated won't start playing.
*/

class VideoActor {
    setup() {
        this.listen("setSize", "setSize");
        this.listen("ended", "ended");
        if (this.state === undefined) {
            this.state = "idle";
            this.size = null;
            this.REWIND_TIME = 0.03; // same as default for a video-content card
            this._cardData.pauseTime = this.REWIND_TIME;
        }
        this.addButtons();
        this.subscribe(this.id, "playPressed", "playPressed");
        this.subscribe(this.id, "pausePressed", "pausePressed");
        this.subscribe(this.id, "rewindPressed", "rewindPressed");
    }

    addButtons() {
        const buttonSpecs = {
            // from play-solid
            play: { svg: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzODQgNTEyIj48IS0tISBGb250IEF3ZXNvbWUgUHJvIDYuMi4xIGJ5IEBmb250YXdlc29tZSAtIGh0dHBzOi8vZm9udGF3ZXNvbWUuY29tIExpY2Vuc2UgLSBodHRwczovL2ZvbnRhd2Vzb21lLmNvbS9saWNlbnNlIChDb21tZXJjaWFsIExpY2Vuc2UpIENvcHlyaWdodCAyMDIyIEZvbnRpY29ucywgSW5jLiAtLT48cGF0aCBkPSJNNzMgMzljLTE0LjgtOS4xLTMzLjQtOS40LTQ4LjUtLjlTMCA2Mi42IDAgODBWNDMyYzAgMTcuNCA5LjQgMzMuNCAyNC41IDQxLjlzMzMuNyA4LjEgNDguNS0uOUwzNjEgMjk3YzE0LjMtOC43IDIzLTI0LjIgMjMtNDFzLTguNy0zMi4yLTIzLTQxTDczIDM5eiIvPjwvc3ZnPg==", scale: 0.55, position: [0.1, 0] },
            // from pause-solid
            pause: { svg: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMjAgNTEyIj48IS0tISBGb250IEF3ZXNvbWUgUHJvIDYuMi4xIGJ5IEBmb250YXdlc29tZSAtIGh0dHBzOi8vZm9udGF3ZXNvbWUuY29tIExpY2Vuc2UgLSBodHRwczovL2ZvbnRhd2Vzb21lLmNvbS9saWNlbnNlIChDb21tZXJjaWFsIExpY2Vuc2UpIENvcHlyaWdodCAyMDIyIEZvbnRpY29ucywgSW5jLiAtLT48cGF0aCBkPSJNNDggNjRDMjEuNSA2NCAwIDg1LjUgMCAxMTJWNDAwYzAgMjYuNSAyMS41IDQ4IDQ4IDQ4SDgwYzI2LjUgMCA0OC0yMS41IDQ4LTQ4VjExMmMwLTI2LjUtMjEuNS00OC00OC00OEg0OHptMTkyIDBjLTI2LjUgMC00OCAyMS41LTQ4IDQ4VjQwMGMwIDI2LjUgMjEuNSA0OCA0OCA0OGgzMmMyNi41IDAgNDgtMjEuNSA0OC00OFYxMTJjMC0yNi41LTIxLjUtNDgtNDgtNDhIMjQweiIvPjwvc3ZnPg==", scale: 0.55 },
            // from backward-step
            rewind: { svg: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMjAgNTEyIj48IS0tISBGb250IEF3ZXNvbWUgUHJvIDYuMi4xIGJ5IEBmb250YXdlc29tZSAtIGh0dHBzOi8vZm9udGF3ZXNvbWUuY29tIExpY2Vuc2UgLSBodHRwczovL2ZvbnRhd2Vzb21lLmNvbS9saWNlbnNlIChDb21tZXJjaWFsIExpY2Vuc2UpIENvcHlyaWdodCAyMDIyIEZvbnRpY29ucywgSW5jLiAtLT48ZGVmcz48c3R5bGU+LmZhLXNlY29uZGFyeXtvcGFjaXR5Oi40fTwvc3R5bGU+PC9kZWZzPjxwYXRoIGNsYXNzPSJmYS1wcmltYXJ5IiBkPSJNMjY3LjUgNzEuNDFsLTE5MiAxNTkuMUM2Ny44MiAyMzcuOCA2NCAyNDYuOSA2NCAyNTZjMCA5LjA5NCAzLjgyIDE4LjE4IDExLjQ0IDI0LjYybDE5MiAxNTkuMWMyMC42MyAxNy4xMiA1Mi41MSAyLjc1IDUyLjUxLTI0LjYydi0zMTkuOUMzMTkuMSA2OC42NiAyODguMSA1NC4yOCAyNjcuNSA3MS40MXoiLz48cGF0aCBjbGFzcz0iZmEtc2Vjb25kYXJ5IiBkPSJNMzEuMSA2NC4wM2MtMTcuNjcgMC0zMS4xIDE0LjMzLTMxLjEgMzJ2MzE5LjljMCAxNy42NyAxNC4zMyAzMiAzMiAzMkM0OS42NyA0NDcuMSA2NCA0MzMuNiA2NCA0MTUuMVY5Ni4wM0M2NCA3OC4zNiA0OS42NyA2NC4wMyAzMS4xIDY0LjAzeiIvPjwvc3ZnPg==", scale: 0.55 },
            // from volume-high
            mute: { svg: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgNTEyIj48IS0tISBGb250IEF3ZXNvbWUgUHJvIDYuMi4xIGJ5IEBmb250YXdlc29tZSAtIGh0dHBzOi8vZm9udGF3ZXNvbWUuY29tIExpY2Vuc2UgLSBodHRwczovL2ZvbnRhd2Vzb21lLmNvbS9saWNlbnNlIChDb21tZXJjaWFsIExpY2Vuc2UpIENvcHlyaWdodCAyMDIyIEZvbnRpY29ucywgSW5jLiAtLT48ZGVmcz48c3R5bGU+LmZhLXNlY29uZGFyeXtvcGFjaXR5Oi40fTwvc3R5bGU+PC9kZWZzPjxwYXRoIGNsYXNzPSJmYS1wcmltYXJ5IiBkPSJNMzIwIDY0LjEydjM4My43YzAgMTIuNTgtNy4zMzcgMjMuOTktMTguODQgMjkuMTRDMjk2LjEgNDc4LjkgMjkyLjQgNDc5LjggMjg4IDQ3OS44Yy03LjY4OCAwLTE1LjI4LTIuODIyLTIxLjI3LTguMTI4bC0xMzQuOS0xMTkuOEg0OGMtMjYuNTEgMC00OC0yMS40OC00OC00Ny45NlYyMDhDMCAxODEuNiAyMS40OSAxNjAuMSA0OCAxNjAuMWg4My44NGwxMzQuOS0xMTkuOGM5LjQyMi04LjM2NSAyMi45My0xMC40NyAzNC40My01LjI5QzMxMi43IDQwLjEzIDMyMCA1MS41NSAzMjAgNjQuMTJ6Ii8+PHBhdGggY2xhc3M9ImZhLXNlY29uZGFyeSIgZD0iTTQ3My4xIDEwOC4yYy0xMC4yMi04LjMzNC0yNS4zNC02Ljg5OC0zMy43OCAzLjM0Yy04LjQwNiAxMC4yNC02LjkwNiAyNS4zNSAzLjM0NCAzMy43NEM0NzYuNiAxNzIuMSA0OTYgMjEzLjMgNDk2IDI1NS4xcy0xOS40NCA4Mi4xLTUzLjMxIDExMC43Yy0xMC4yNSA4LjM5Ni0xMS43NSAyMy41LTMuMzQ0IDMzLjc0YzQuNzUgNS43NzUgMTEuNjIgOC43NzEgMTguNTYgOC43NzFjNS4zNzUgMCAxMC43NS0xLjc3OSAxNS4yMi01LjQzMUM1MTguMiAzNjYuOSA1NDQgMzEzIDU0NCAyNTUuMVM1MTguMiAxNDUgNDczLjEgMTA4LjJ6TTQxMi42IDE4MmMtMTAuMjgtOC4zMzQtMjUuNDEtNi44NjctMzMuNzUgMy40MDJjLTguNDA2IDEwLjI0LTYuOTA2IDI1LjM1IDMuMzc1IDMzLjc0QzM5My41IDIyOC40IDQwMCAyNDEuOCA0MDAgMjU1LjFjMCAxNC4xNy02LjUgMjcuNTktMTcuODEgMzYuODNjLTEwLjI4IDguMzk2LTExLjc4IDIzLjUtMy4zNzUgMzMuNzRjNC43MTkgNS44MDYgMTEuNjIgOC44MDIgMTguNTYgOC44MDJjNS4zNDQgMCAxMC43NS0xLjc3OSAxNS4xOS01LjM5OUM0MzUuMSAzMTEuNSA0NDggMjg0LjYgNDQ4IDI1NS4xUzQzNS4xIDIwMC40IDQxMi42IDE4MnpNNTM0LjQgMzMuNGMtMTAuMjItOC4zMzQtMjUuMzQtNi44NjctMzMuNzggMy4zNGMtOC40MDYgMTAuMjQtNi45MDYgMjUuMzUgMy4zNDQgMzMuNzRDNTU5LjkgMTE2LjMgNTkyIDE4My45IDU5MiAyNTUuMXMtMzIuMDkgMTM5LjctODguMDYgMTg1LjVjLTEwLjI1IDguMzk2LTExLjc1IDIzLjUtMy4zNDQgMzMuNzRDNTA1LjMgNDgxIDUxMi4yIDQ4NCA1MTkuMiA0ODRjNS4zNzUgMCAxMC43NS0xLjc3OSAxNS4yMi01LjQzMUM2MDEuNSA0MjMuNiA2NDAgMzQyLjUgNjQwIDI1NS4xUzYwMS41IDg4LjM0IDUzNC40IDMzLjR6Ii8+PC9zdmc+", backgroundOpacity: 0, scale: 0.8 },
            // from volume-slash
            unmute: { svg: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgNTEyIj48IS0tISBGb250IEF3ZXNvbWUgUHJvIDYuMi4xIGJ5IEBmb250YXdlc29tZSAtIGh0dHBzOi8vZm9udGF3ZXNvbWUuY29tIExpY2Vuc2UgLSBodHRwczovL2ZvbnRhd2Vzb21lLmNvbS9saWNlbnNlIChDb21tZXJjaWFsIExpY2Vuc2UpIENvcHlyaWdodCAyMDIyIEZvbnRpY29ucywgSW5jLiAtLT48ZGVmcz48c3R5bGU+LmZhLXNlY29uZGFyeXtvcGFjaXR5Oi40fTwvc3R5bGU+PC9kZWZzPjxwYXRoIGNsYXNzPSJmYS1wcmltYXJ5IiBkPSJNNjM0LjkgNTAyLjhjLTguMTI1IDEwLjQxLTIzLjE5IDEyLjI4LTMzLjY5IDQuMDc4TDkuMTg4IDQyLjg5Yy0xMC40NC04LjE3Mi0xMi4yNi0yMy4yNi00LjA2OC0zMy43QzkuODM5IDMuMTU4IDE2LjkxIDAgMjQuMDMgMEMyOS4xOSAwIDM0LjQxIDEuNjczIDM4LjgxIDUuMTExbDU5MS4xIDQ2My4xQzY0MS4yIDQ3Ny4zIDY0My4xIDQ5Mi40IDYzNC45IDUwMi44eiIvPjxwYXRoIGNsYXNzPSJmYS1zZWNvbmRhcnkiIGQ9Ik02NCAyMDhWMzA0YzAgMjYuNTEgMjEuNDkgNDcuMSA0OCA0Ny4xaDgzLjg0bDEzNC45IDExOS45QzMzNi43IDQ3Ny4yIDM0NC4zIDQ4MCAzNTIgNDgwYzQuNDM4IDAgOC45NTktLjkzMTIgMTMuMTYtMi44MzdDMzc2LjcgNDcyIDM4NCA0NjAuNiAzODQgNDQ4di01MC4zNEw4OC43NSAxNjYuM0M3NC4wNSAxNzQuNSA2NCAxODkuMSA2NCAyMDh6TTM2NS4yIDM0Ljg0Yy0xMS41LTUuMTg4LTI1LjAxLTMuMTE2LTM0LjQzIDUuMjU5TDIxNC45IDE0My4xTDM4NCAyNzUuN1Y2NEMzODQgNTEuNDEgMzc2LjcgMzkuMSAzNjUuMiAzNC44NHpNNDc2LjYgMTgxLjljLTEwLjI4LTguMzQ0LTI1LjQxLTYuODc1LTMzLjc1IDMuNDA2Yy04LjQwNiAxMC4yNS02LjkwNiAyNS4zOCAzLjM3NSAzMy43OEM0NTcuNSAyMjguNCA0NjQgMjQxLjggNDY0IDI1NnMtNi41IDI3LjYyLTE3LjgxIDM2Ljg4Yy03LjcxOSA2LjMxMS0xMC40OCAxNi40MS03LjgyNCAyNS4zOWwyMS41MyAxNi44OGMuNTAzOSAuMDMxMyAuOTcxMyAuMzI0OSAxLjQ3NyAuMzI0OWM1LjM0NCAwIDEwLjc1LTEuNzgxIDE1LjE5LTUuNDA2QzQ5OS4xIDMxMS42IDUxMiAyODQuNyA1MTIgMjU2QzUxMiAyMjcuMyA0OTkuMSAyMDAuNCA0NzYuNiAxODEuOXpNNTM3LjEgMTA4Yy0xMC4yMi04LjM0NC0yNS4zNC02LjkwNi0zMy43OCAzLjM0NGMtOC40MDYgMTAuMjUtNi45MDYgMjUuMzggMy4zNDQgMzMuNzhDNTQwLjYgMTcyLjkgNTYwIDIxMy4zIDU2MCAyNTZjMCA0Mi42OS0xOS40NCA4My4wOS01My4zMSAxMTAuOWMtMS4wNDUgLjg1NzQtMS41OTkgMi4wMjktMi40NiAzLjAxM2wzNy44IDI5LjYzQzU4My45IDM2Mi44IDYwOCAzMTAuOSA2MDggMjU2QzYwOCAxOTguOSA1ODIuMiAxNDQuOSA1MzcuMSAxMDh6Ii8+PC9zdmc+", backgroundOpacity: 0, scale: 0.8 },
            // from volume-xmark
            // blocked: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1NzYgNTEyIj48IS0tISBGb250IEF3ZXNvbWUgUHJvIDYuMi4xIGJ5IEBmb250YXdlc29tZSAtIGh0dHBzOi8vZm9udGF3ZXNvbWUuY29tIExpY2Vuc2UgLSBodHRwczovL2ZvbnRhd2Vzb21lLmNvbS9saWNlbnNlIChDb21tZXJjaWFsIExpY2Vuc2UpIENvcHlyaWdodCAyMDIyIEZvbnRpY29ucywgSW5jLiAtLT48ZGVmcz48c3R5bGU+LmZhLXNlY29uZGFyeXtvcGFjaXR5Oi40fTwvc3R5bGU+PC9kZWZzPjxwYXRoIGNsYXNzPSJmYS1wcmltYXJ5IiBkPSJNMzE5LjEgNjR2MzgzLjFjMCAxMi41OS03LjMyNSAyNC0xOC44MiAyOS4xNmMtNC4yMDMgMS45MDYtOC43MzcgMi44NDQtMTMuMTcgMi44NDRjLTcuNjg4IDAtMTUuMjgtMi43ODEtMjEuMjYtOC4wOTRsLTEzNC45LTExOS45SDQ4Yy0yNi41MSAwLTQ4LTIxLjQ5LTQ4LTQ3LjF2LTk1LjFjMC0yNi41MSAyMS40OS00Ny4xIDQ4LTQ3LjFoODMuODRsMTM0LjktMTE5LjljOS40MjItOC4zNzUgMjIuOTQtMTAuNDQgMzQuNDQtNS4yNTNDMzEyLjcgNDAgMzE5LjEgNTEuNDEgMzE5LjEgNjR6Ii8+PHBhdGggY2xhc3M9ImZhLXNlY29uZGFyeSIgZD0iTTU2MC4xIDMwM2M5LjM3NSA5LjM3NSA5LjM3NSAyNC41NiAwIDMzLjk0Yy05LjM4MSA5LjM4MS0yNC41NiA5LjM3My0zMy45NCAwTDQ4MCAyODkuOWwtNDcuMDMgNDcuMDNjLTkuMzgxIDkuMzgxLTI0LjU2IDkuMzczLTMzLjk0IDBjLTkuMzc1LTkuMzc1LTkuMzc1LTI0LjU2IDAtMzMuOTRsNDcuMDMtNDcuMDNsLTQ3LjAzLTQ3LjAzYy05LjM3NS05LjM3NS05LjM3NS0yNC41NiAwLTMzLjk0czI0LjU2LTkuMzc1IDMzLjk0IDBMNDgwIDIyMi4xbDQ3LjAzLTQ3LjAzYzkuMzc1LTkuMzc1IDI0LjU2LTkuMzc1IDMzLjk0IDBzOS4zNzUgMjQuNTYgMCAzMy45NGwtNDcuMDMgNDcuMDNMNTYwLjEgMzAzeiIvPjwvc3ZnPg=="
        }
        const size = this.buttonSize = 0.125;
        const CIRCLE_RATIO = 1.25; // ratio of button circle to inner svg
        const makeButton = symbol => {
            const { svg, scale, position, backgroundOpacity } = buttonSpecs[symbol];
            const button = this.createCard({
                name: "button",
                dataLocation: svg,
                fileName: "/svg.svg", // ignored
                modelType: "svg",
                shadow: true,
                singleSided: true,
                scale: [size * scale / CIRCLE_RATIO, size * scale / CIRCLE_RATIO, 1],
                // rotation,
                depth: 0.01,
                type: "2d",
                fullBright: true,
                behaviorModules: ["VideoButton"],
                parent: this,
                noSave: true,
            });
            button.call("VideoButton$VideoButtonActor", "setProperties", { name: symbol, svgScale: scale, svgPosition: position || [0, 0], backgroundOpacity: backgroundOpacity === undefined ? 1 : backgroundOpacity });
            return button;
        }

        this.buttons = {};
        [ "play", "pause", "rewind", "unmute", "mute" ].forEach(buttonName => {
            this.buttons[buttonName] = makeButton(buttonName);
        });
    }

    setSize(size) {
        if (!this.size) {
            this.size = size;
            const offsetX = this.buttonSize;
            const muteX = size.width / 2 + this.buttonSize * 3 / 4
            const offsetY = size.height / 2 + this.buttonSize * 3 / 4;
            const depth = this._cardData.depth || 0.05;
            const { play, pause, rewind, unmute, mute } = this.buttons;
            play.translateTo([offsetX, -offsetY, depth / 2]);
            pause.translateTo([offsetX, -offsetY, depth / 2]);
            rewind.translateTo([-offsetX, -offsetY, depth / 2]);
            unmute.translateTo([muteX, 0, depth / 2]);
            mute.translateTo([muteX, 0, depth / 2]);
            this.say("sizeSet");
        }
    }

    playPressed(videoCurrentTime) {
        // console.log("playPressed", videoCurrentTime, this.state, this._cardData.playStartTime);
        if (this.state === "idle") {
            this._cardData.playStartTime = this.now() / 1000.0 - videoCurrentTime;
            this._cardData.pauseTime = null; // no pause time while playing
            this.state = "startPlaying";
            this.say("playVideoRequested");
            // while in "startPlaying" state, playback can't be stopped... but it can be
            // stopped once we're in "playing" state.  not sure that 50ms is a particularly
            // meaningful debounce period.
            this.future(50).updateState("playing");
        }
    }

    pausePressed(videoCurrentTime) {
        // console.log("pausePressed", videoCurrentTime, this.state, this._cardData.playStartTime);
        if (this.state === "playing") {
            this.state = "pausePlaying";
            this._cardData.pauseTime = videoCurrentTime;
            this.say("pauseVideoRequested");
            this.future(50).updateState("idle");
        }
    }

    rewindPressed() {
        // console.log("rewindPressed", this.state, this._cardData.playStartTime);
        if (this.state === "idle") {
            this._cardData.pauseTime = this.REWIND_TIME;
            this.say("pauseVideoRequested");
        } else if (this.state === "playing") {
            // note that if an actual pause request comes in immediately after the rewind
            // request but before we resume, play will resume anyway.  slightly jarring
            // for the person who pressed pause, but no more so than the rewind itself.
            this.pausePressed(this.REWIND_TIME);
            this.future(100).playPressed(this.REWIND_TIME);
        }
    }

    updateState(newState) {
        this.state = newState;
    }

    ended() {
        // handle the replicated "ended" event sent by each view when its own video
        // playback ends.
        // this may be called multiple times
        if (this.state !== "idle") {
            this.state = "idle";
            delete this._cardData.playStartTime;
            this._cardData.pauseTime = this.REWIND_TIME;
            this.say("pauseVideoRequested");
        }
    }
}

class VideoPawn {
    setup() {
        this.addEventListener("pointerTap", "tapped");
        this.listen("cardDataSet", "videoChanged");
        this.listen("sizeSet", "sizeSet");
        this.listen("playVideoRequested", "playVideoRequested");
        this.listen("pauseVideoRequested", "pauseVideoRequested");
        this.subscribe(this.id, "2dModelLoaded", "videoReady");
        this.subscribe(this.id, "buttonPressed", "buttonPressed");
        this.subscribe(this.viewId, "synced", "synced");

        // policy on muted/unmuted and blocked state:
        //   - we treat audio as blocked until user explicitly interacts with video player
        //   - but if video is not playing when first seen, audio shows as being unmuted.
        //     pressing play will cause it to unblock (through a native event), then play
        //     unmuted.
        //   - if another user presses play before user has interacted with the player, the
        //     player will be forced into the muted state.
        //     we do this even if the user has already clicked somewhere else, meaning we
        //     have already frobbed the video element and thus unblocked it.
        //     this.audioUnblocked represents whether we have done the unblocking process.
        //     this.userHasInteracted represents whether the user has explicitly interacted.
        this.videoLoaded = false;
        this.audioUnblocked = false; // released by native event
        this.userHasInteracted = false;
        this.audioMuted = false; // start optimistic
        if (this.actor.size) this.updateButtons();
        else this.buttonState = null; // until size is set

        this.setUpUnblockHandler();

        const isSafari = navigator.userAgent.indexOf("Safari") !== -1 && navigator.userAgent.indexOf("Chrome") === -1;
        this.videoStartAllowance = isSafari ? 0.4 : 0.2; // seconds
    }

    setUpUnblockHandler() {
        this.unblockHandler = () => this.unblockAudio();
        document.addEventListener("pointerdown", this.unblockHandler, true);
    }

    async waitForUnblocking() {
        if (this.processingUnblockP) await this.processingUnblockP;
    }

    videoReady() {
        // every pawn will send the setSize event.  actor ignores all but the first.
        const { width, height } = this.properties2D;
        this.say("setSize", { width, height });

        this.video.playsInline = true; // may be needed for Safari
        this.video.muted = !this.audioUnblocked || this.audioMuted;
        this.video.onended = () => this.ended();
        this.video.ontimeupdate = () => this.adjustIfNecessary(); // typically fires around 4 times per second

        this.matchPlayState();

        // this.interval = setInterval(() => this.adjustIfNecessary(), 2000);
    }

    sizeSet() {
        this.updateButtons();
    }

    unblockAudio() {
        // this is triggered by a native event on the document.  we use it to interact with
        // the video element, thus unblocking its audio.
        // if the video is not currently playing, sending stop() is enough to do the
        // unblocking.
        // if the video is already playing (muted), we stop it and schedule a restart after
        // a short delay.
        // it may be that the event is on an element of the player itself.  in that case
        // we abandon the restart and proceed with the event's normal handling.
        if (!this.videoLoaded) return; // too soon

        document.removeEventListener("pointerdown", this.unblockHandler, true);
        delete this.unblockHandler;

        // console.log("unblocking");
        // on Safari, at least, sending pause() to a video that's already paused doesn't
        // do the unblocking.  it also takes a while for the video to take up its new
        // state.  so we toggle play/pause with 100ms between, then wait another 100ms
        // before letting any other actions through.
        const wasPlaying = !this.video.paused;
        const wasMuted = this.video.muted;
        if (wasPlaying) {
            this.video.pause();
        } else {
            this.video.muted = true; // make sure we don't make a sound
            this.video.play();
        }
        this.processingUnblockP = new Promise(resolve => {
            setTimeout(() => {
                // in the case of play() it'll have lost at least 100ms - but if that takes
                // it too far off the desired time, that'll get fixed in adjustIfNecessary()
                if (wasPlaying) this.video.play(); else this.video.pause();
                this.video.muted = wasMuted;
                setTimeout(() => {
                    this.audioUnblocked = true;
                    delete this.processingUnblockP;
                    resolve();
                }, 100);
            }, 100);
        });
    }

    updateButtons() {
        const { state } = this.actor;
        const isPlaying = state === "playing" || state === "startPlaying";
        const muted = this.audioMuted;
        this.buttonState = {
            play: !isPlaying,
            pause: isPlaying,
            rewind: true,
            unmute: muted,
            mute: !muted,
        };
        this.publish(this.id, "updateButtons");
    }

    setButtonHilite(buttonName, hilite) {
        // a bit hacky.  set the hilite for all buttons in a group (even though all but
        // one must be invisible), to ensure hiliting is consistent when the user
        // switches between them.
        const groups = [["play", "pause"], ["unmute", "mute"], ["rewind"] ];
        const group = groups.find(g => g.includes(buttonName));
        this.publish(this.id, "updateHilites", { buttons: group, hilite });
    }

    tapped() {
        // a tap on the main view:
        //   if play is currently paused, it's like a tap on "play"
        //   if play is in progress, it's a "pause"
        if (!this.videoLoaded || !this.buttonState) return;

        // use the button state to decide what action is available to the user
        const { play } = this.buttonState;
        if (play) this.buttonPressed("play");
        else this.buttonPressed("pause");
    }

    async buttonPressed(buttonName) {
        // invoked (asynchronously) from a button's tap handler, or a tap on the main view
        await this.waitForUnblocking();
        this.userHasInteracted = true;

        switch (buttonName) {
            case "play":
                if (this.videoLoaded) {
                    // video might have been forced into muted state due to lack of
                    // user interaction.  make sure it now reflects user's choice.
                    this.video.muted = this.audioMuted;
                    this.say("playPressed", this.video.currentTime);
                }
                break;
            case "pause":
                // to reduce run-ahead on the local video during the round trip processing
                // our request, we immediately pause it.  other users will be thrown back
                // a bit, but at least the local view will be close to what the pauser
                // expected.
                this.say("pausePressed", this.video.currentTime);
                this.video.pause();
                break;
            case "rewind":
                this.say("rewindPressed");
                break;
            case "mute":
            case "unmute":
                this.video.muted = this.audioMuted = buttonName === "mute";
                this.updateButtons();
                this.matchPlayState();
                break;
            default:
        }
    }

    cleanup() {
        this.stop();
        // we're currently not setting up an interval timer
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    synced(flag) {
        // each time synced becomes true, look for a setting indicating that video
        // playback had previously been enabled in this window, for the video
        // resource now attached to this actor.  if found, try to re-join whatever
        // state the playback is now in.
        if (!flag) {return;}

        /*
        console.log(
            "video synced",
            window[`videopawn-audio-${this.actor._cardData.textureLocation}`],
            this.actor.state
        );
        */

        const previousMuteState = window[`videopawn-audio-${this.actor._cardData.textureLocation}`];
        if (previousMuteState !== undefined) {
            delete window[`videopawn-audio-${this.actor._cardData.textureLocation}`];
            this.audioUnblocked = true;
            this.audioMuted = previousMuteState;
            this.matchPlayState();
        }
    }

    matchPlayState() {
        // make sure our video (if loaded) is doing what everyone else's is doing
        const actorState = this.actor.state;
        if (actorState === "playing" || actorState === "startPlaying") {
            this.playVideoRequested();
        } else if (actorState === "idle" || actorState === "pausePlaying") {
            this.pauseVideoRequested();
        }
    }

    async playVideoRequested() {
        // console.log("playVideoRequested: paused: ", this.video.paused);
        await this.waitForUnblocking();

        if (!this.videoLoaded) {return;}
        if (!this.video.paused) {return;}
        let actorState = this.actor.state;
        if (!(actorState === "playing" || actorState === "startPlaying")) {return;}

        if (!this.userHasInteracted) {
            const wasMuted = this.audioMuted;
            this.audioMuted = true;
            this.video.muted = true;
            if (!wasMuted) this.updateButtons();
        }
        let now = this.extrapolatedNow();
        // leave an allowance for video to take its time getting going
        this.video.currentTime = (now / 1000) - this.actor._cardData.playStartTime + this.videoStartAllowance;
        this.lastAdjustTime = Date.now();
        this.play();
    }

    async pauseVideoRequested() {
        // invoked by matchPlayState after certain local interactions, or as a result of
        // the model updating its state.
        // console.log("pauseVideoRequested");
        await this.waitForUnblocking();

        if (!this.videoLoaded) {return;}
        let actorState = this.actor.state;
        if (!(actorState === "idle" || actorState === "pausePlaying")) {return;}
        this.stop();
        let { pauseTime } = this.actor._cardData;
        if (pauseTime !== null) this.video.currentTime = pauseTime;
    }

    play() {
        // console.log("play", `muted = ${this.video.muted}`);
        if (this.video) {
            this.video.play();
            this.updateButtons();
        }
    }

    stop() {
        // console.log("stop");
        if (this.video) {
            this.video.pause();
            this.updateButtons();
        }
    }

    videoChanged() {
        console.log("videoChanged");
    }

    adjustIfNecessary() {
        const actorState = this.actor.state;
        if (actorState === "playing" && !this.video.paused) {
            const { playStartTime } = this.actor._cardData;
            const expectedTime = (this.extrapolatedNow() / 1000) - playStartTime;
            const actualTime = this.video.currentTime;
            const diffMS = Math.round((actualTime - expectedTime) * 1000);
            // console.log(diffMS);
            const dateNow = Date.now();
            const ADJUST_THRESHOLD = 250;
            const ADJUST_THROTTLE = 5000; // no more often than once in 5s
            if (Math.abs(diffMS) > ADJUST_THRESHOLD && dateNow - (this.lastAdjustTime || 0) > ADJUST_THROTTLE) {
                console.log(`repositioning video (playback error ${diffMS}ms)`);
                this.video.currentTime = expectedTime + this.videoStartAllowance;
                this.lastAdjustTime = dateNow;
            }
        }
    }

    ended() {
        if (this.video) {
            // console.log("ended");
            if (this.actor.state !== "idle") {
                this.say("ended");
            }
        }
    }

    teardown() {
        // console.log("videopawn teardown")
        // stop the video, and if audio has been unblocked set a flag so that
        // if the page gets revived we will know to re-join the video playback.
        this.cleanup();
        if (this.audioUnblocked) {
            window[`videopawn-audio-${this.actor._cardData.textureLocation}`] = this.audioMuted;
        }
    }
}


class VideoButtonActor {
    // setup() {
    // }

    setProperties(props) {
        const { name, svgScale, svgPosition, backgroundOpacity } = props;
        this.buttonName = name;
        this.svgScale = svgScale;
        this.svgPosition = svgPosition; // [x, y] to nudge position
        this.backgroundOpacity = backgroundOpacity;
    }
}

class VideoButtonPawn {
    setup() {
        this.subscribe(this.id, "2dModelLoaded", "svgLoaded");

        this.addEventListener("pointerMove", "nop");
        this.addEventListener("pointerEnter", "hilite");
        this.addEventListener("pointerLeave", "unhilite");
        this.addEventListener("pointerTap", "tapped");
        // effectively prevent propagation
        this.addEventListener("pointerDown", "nop");
        this.addEventListener("pointerUp", "nop");
        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.addEventListener("pointerDoubleDown", "nop");

        this.subscribe(this.parent.id, "updateButtons", "updateState");
        this.subscribe(this.parent.id, "updateHilites", "updateHilite");
    }

    svgLoaded() {
        // no hit-test response on anything but the hittable mesh set up below
        const { svgScale, svgPosition, backgroundOpacity } = this.actor;
        const svg = this.shape.children[0];
        // apply any specified position nudging
        svg.position.x += svgPosition[0];
        svg.position.y += svgPosition[1];
        this.shape.raycast = () => false;
        svg.traverse(obj => obj.raycast = () => false);
        const { depth } = this.actor._cardData;
        const radius = 1.25 / svgScale / 2;
        const segments = 32;
        const geometry = new Microverse.THREE.CylinderGeometry(radius, radius, depth, segments);
        const material = new Microverse.THREE.MeshBasicMaterial({ color: 0xa0a0a0, side: Microverse.THREE.DoubleSide, transparent: true, opacity: backgroundOpacity });
        const hittableMesh = new Microverse.THREE.Mesh(geometry, material);
        hittableMesh.rotation.x = Math.PI / 2;
        hittableMesh.position.z = -depth / 2;
        this.shape.add(hittableMesh);
        hittableMesh._baseRaycast = hittableMesh.raycast;
        hittableMesh.raycast = (...args) => this.shape.visible ? hittableMesh._baseRaycast(...args) : false;
        this.shape.visible = false; // until placed
        this.updateState();
    }

    updateState() {
        const { buttonState } = this.parent;
        if (!buttonState) return; // video size not set yet

        const visible = buttonState[this.actor.buttonName];
        this.shape.visible = visible;
        if (visible) this.setColor();
    }

    setColor() {
        let svg = this.shape.children[0];
        if (!svg) return;

        let color = this.entered ? 0x202020 : 0x404040;
        svg.children.forEach(child => child.material[0].color.setHex(color));
    }

    hilite() {
        this.parent.call("VideoPlayer$VideoPawn", "setButtonHilite", this.actor.buttonName, true);
        // this.publish(this.parent.id, "interaction");
    }

    unhilite() {
        this.parent.call("VideoPlayer$VideoPawn", "setButtonHilite", this.actor.buttonName, false);
    }

    updateHilite({ buttons, hilite }) {
        if (!buttons.includes(this.actor.buttonName)) return;

        this.entered = hilite;
        this.setColor();
    }

    tapped() {
        if (!this.shape.visible) return; // an invisible button still detects events

        this.parent.call("VideoPlayer$VideoPawn", "buttonPressed", this.actor.buttonName);
    }
}

export default {
    modules: [
        {
            name: "VideoPlayer",
            actorBehaviors: [VideoActor],
            pawnBehaviors: [VideoPawn]
        },
        {
            name: "VideoButton",
            actorBehaviors: [VideoButtonActor],
            pawnBehaviors: [VideoButtonPawn],
        }
    ]
}

/* global Microverse */
