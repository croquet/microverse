// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

/* global VoxeetSDK */

import { Data, ViewService, v3_equals, q_equals, q_yaw } from "@croquet/worldcore-kernel";

let chatAudioMuted = false; // this state has to persist through dormancy
let userSelectedMicLabel = null; // ditto
let activeManager = null;

async function getAccessToken() {
    const functionURL = 'https://us-central1-dolby-croquet.cloudfunctions.net/generateToken';
    const response = await fetch(functionURL);
console.log("Dolby token generated");

    const json = await response.json();
    return json.token;
}

export class DolbyChatManager extends ViewService {
    constructor(name) {
        super(name || "DolbyChatManager");
        activeManager = this;

        if (!window.isSecureContext) {
            console.warn("Audio Chat failed to get microphone permissions. If you are running it off http, please enable https");
            return;
        }

        if (!window.dolbyPromise) {
            window.dolbyPromise = new Promise(resolve => {
                const s = document.createElement('script');
                s.setAttribute('src', 'https://unpkg.com/@voxeet/voxeet-web-sdk');
                s.onload = async () => {
                    console.log("initialize Dolby SDK");
                    const accessToken = await getAccessToken();
                    // The callback is invoked when the token needs to be refreshed.
                    VoxeetSDK.initializeToken(accessToken, getAccessToken);
                    this.addConferenceEventHandlers();
                    resolve();
                };
                document.body.appendChild(s);
            });
        }

        this.subscribe("playerManager", "enter", "playerEnter");
        this.subscribe("playerManager", "leave", "playerLeave");

        this.sessionP = null;
        this.joinState = 'left';

        this.initChatUI();
        this.initAudio(); // async

        // if this view's player is already in the world, make sure the chat app
        // is initialised.
        const player = this.localPlayer;
        const alreadyHere = player && player.inWorld;
        if (alreadyHere) this.prepareSession();
console.log(`DolbyChatManager (local actor ${alreadyHere ? "already" : "not yet"} here)`, this);
    }

    get localPlayer() { return this.model.service("PlayerManager").players.get(this.viewId); }

    initChatUI() {
        let chatHolder = document.getElementById('chatHolder');
        if (!chatHolder) {
            const div = document.createElement("div");
            div.innerHTML =
`<div id='chatHolder' class='hidden hide-settings unconnected'>
    <div id='chatUI'>
        <div id='chatState' class='noselect'>
            <!-- <div id='worldName'></div> -->
            <div id='chatSymbol'></div>
            <div id='peopleSymbol'></div>
            <div id='chatCount' class='noselect'><span id='chatCountText'>-</span></div>
        </div>
        <div id='chatButtons'>
            <div id='toggleConnection' tabindex='4'>
                <div class='buttonImage joined' title='leave voice chat'></div>
                <div class='buttonImage notJoined' title='join voice chat'></div>
                <div id='connection-tooltip' class='bouncing'>
                    <div id='connection-tooltip-arrow'></div>
                    <div id='connection-tooltip-contents' class='noselect'>join voice chat</div>
                </div>
            </div>
            <div id='toggleAudio' tabindex='1'>
                <div class='buttonImage enabled' title='mute mic'></div>
                <div class='buttonImage disabled' title='unmute mic'></div>
                <div class='buttonImage unavailable' title='mic unavailable'></div>
            </div>
            <div id='toggleSettings' tabindex='4'>
                <div class='buttonImage enabled' title='hide settings'></div>
                <div class='buttonImage disabled' title='show settings'></div>
            </div>
        </div>
    </div>
    <div id='settings'>
        <div id='local'>
            <audio playsinline autoplay></audio>
        </div>
        <div id='loudness'>
            <div class='bar'>
                <div class='max'></div>
                <div class='value'></div>
            </div>
        </div>
        <div id='settingsButtons'>
            <span class='settingsText noselect'>Audio Source</span>
            <select id='audioInputs' title='Select Audio Source'></select>
            <div id='toggleMicrophoneTest'></div>
        </div>
    </div>
</div>
`;
            chatHolder = div.firstChild;
            document.body.appendChild(chatHolder);

            ['toggleConnection', 'toggleAudio', 'toggleSettings', 'toggleMicrophoneTest'].forEach(buttonName => {
                const elem = document.getElementById(buttonName);
                elem.addEventListener('pointerdown', evt => evt.stopPropagation());
                elem.addEventListener('click', () => this[buttonName]());
            });
            const audioInputs = document.getElementById('audioInputs');
            audioInputs.addEventListener('pointerdown', evt => evt.stopPropagation());
            audioInputs.addEventListener('input', () => this.setAudioInput());
            navigator.mediaDevices.addEventListener('devicechange', () => this.updateAudioInputs());

            // if rebuilding after dormancy, re-impose the previous mute state
            if (chatAudioMuted) chatHolder.classList.add('mute-audio');
        }

        this.elements = {
            chatHolder,
            connectionTooltip: document.getElementById('connection-tooltip'),
            toggleAudio: document.getElementById('toggleAudio'),
            audioInputs: document.getElementById('audioInputs'),

            localAudio: document.querySelector(`#local > audio`),
            toggleMicrophoneTest: document.getElementById('toggleMicrophoneTest'),

            loudness: document.querySelector('#loudness'),
            loudnessBar: document.querySelector('#loudness .bar'),
            loudnessMax: document.querySelector('#loudness .max'),
            loudnessValue: document.querySelector('#loudness .value'),
        };

        this.uiStyles = {
            preConnect: { width: '220px', height: '50px', transform: 'translate(-116px, 0px)' },
            connected: { width: '220px', height: '50px', transform: 'translate(-116px, 0px)' },
            settings: { width: '220px', height: '188px', transform: 'translate(-116px, 0px)' }
        };
        this.setUIStyle('preConnect');

        chatHolder.classList.remove('hidden');
    }

    setUIStyle(mode) {
        const settings = this.uiStyles[mode];
        const isNarrow = window.innerWidth < 600;
        settings.left = isNarrow ? '60%' : '';
        settings.top = isNarrow ? '60px' : '';
        Object.assign(this.elements.chatHolder.style, settings);
    }

    toggleConnection() {
        this.resumeAudioContextIfNeeded();
        this.elements.connectionTooltip.style.display = "none";
        const now = Date.now();
        if (now - (this.lastToggle || 0) < 2000 || this.joinState === 'joining' || this.joinState === 'leaving') return;
        this.lastToggle = now;

        if (this.joinState === 'left') this.joinConference();
        else this.leaveConference();
    }

    toggleAudio() {
        if (chatAudioMuted) {
            this.unmuteChatAudio();
        } else {
            this.muteChatAudio(); // keep the stream running (but empty)
        }
    }

    toggleSettings() {
        this.resumeAudioContextIfNeeded();
        this.elements.chatHolder.classList.toggle('hide-settings');
        this.setUIStyle(this.elements.chatHolder.classList.contains('hide-settings') ? 'connected' : 'settings');
    }

    toggleMicrophoneTest() {
        if (this.elements.chatHolder.classList.contains('testing-microphone')) {
            this.stopTestingMicrophone();
        } else {
            this.testMicrophone();
        }
    }

    computeSessionHandles() {
        // derive handles { persistent, ephemeral } from the
        // persistentId and sessionId respectively.
        const hasher = id => Data.hash(id).slice(0, 8); // chat app only uses 8 chars
        const persistent = this.session.persistentId;
        const ephemeral = this.sessionId;
        return { persistent: hasher(persistent), ephemeral: hasher(ephemeral)};
    }

    addConferenceEventHandlers() {
        // media stream was added
        VoxeetSDK.conference.on("streamAdded", (participant, stream) => {
            console.log(`stream added for ${participant.info.name}`); //, stream);
            if (activeManager) activeManager.updateActiveInChat();
        });

        // media stream updated, which happens once an attendee starts sharing video
        VoxeetSDK.conference.on("streamUpdated", (participant, stream) => {
            console.log(`stream updated for ${participant.info.name}`);
            if (activeManager) activeManager.updateActiveInChat();
        });

        // app has stopped receiving the media stream for some remote participant
        VoxeetSDK.conference.on("streamRemoved", (participant, stream) => {
            console.log(`stream removed for ${participant.info.name}`);
            if (activeManager) activeManager.updateActiveInChat();
        });

        // local participant has left the conference
        VoxeetSDK.conference.on("left", async () => {
            // await VoxeetSDK.session.close();  handled in leaveConference
            console.log("participant has left Dolby conference.");
        });
    }

    prepareSession() {
        if (!this.sessionP) {
            this.sessionP = new Promise(async resolve => {
                // sessionName is typically the participant name.  not clear if it's meant
                // to be unique.
                console.log("open Dolby session");
                const start = Date.now();
                await window.dolbyPromise;
                // on return from dormancy, jumping on the player info too quickly can
                // mean it hasn't yet been restored fully.  make sure we've waited a full
                // second before looking.
                const waited = Date.now() - start;
                if (waited < 1000) await new Promise(resolve => setTimeout(resolve, 1000 - waited));
                // fingers crossed that all's well now
                const participant = this.localPlayer._name;
                try {
                    await VoxeetSDK.session.open({ name: participant });
                    console.log(`Dolby session for participant ${participant}`);
                    resolve(true);
                } catch (error) {
                    console.error(error);
                    resolve(false);
                }
            });
        }
        return this.sessionP;
    }

    async createConference() {
        console.log("create Dolby conference");
        const { persistent, ephemeral } = this.computeSessionHandles();
        const conferenceAlias = `${persistent.slice(0, 8)}:${ephemeral.slice(0, 8)}`;
        const conferenceOptions = {
            alias: conferenceAlias,
            params: {
                audioOnly: true,
                spatialAudioStyle: "shared"
            }
        }
        let conference = null;
        try {
            // it's fine for multiple users to ask to create the conference.  if it
            // already exists, we'll get access to the existing one.
            conference = await VoxeetSDK.conference.create(conferenceOptions);
        } catch (error) {
            console.error(error);
        }
        return conference;
    }

    async joinConference() {
        this.joinState = 'joining';
        this.elements.chatHolder.classList.add('joining');
        const conference = await this.prepareSession() && await this.createConference();
        if (!conference) {
            this.elements.chatHolder.classList.remove('joining');
            this.joinState = 'left';
            return;
        }

        console.log("join Dolby conference");
        const joinOptions = {
            spatialAudio: true,
            constraints: { audio: true, video: false }
        };
        try {
            await VoxeetSDK.conference.join(conference, joinOptions);
            await this.setAudioInput();
            if (chatAudioMuted) await VoxeetSDK.conference.mute(VoxeetSDK.session.participant, true);
            this.joinState = 'joined';
            this.elements.chatHolder.classList.remove('unconnected');
            this.startTestingAudioLevel();
            this.updateActiveInChat();

            const right = { x: 1, y: 0, z: 0 };
            const up = { x: 0, y: 1, z: 0 };
            const forward = { x: 0, y: 0, z: 1 };

            const axis_scale = 6; // make the fade gradual (to zero at 600 units)
            const scale = { x: axis_scale, y: axis_scale, z: axis_scale };

            VoxeetSDK.conference.setSpatialEnvironment(scale, forward, up, right);

            // start regular setting of the local participant’s position
            this.setMyPosition();
        } catch (error) {
            console.error(error);
            this.joinState = 'left';
        }

        this.elements.chatHolder.classList.remove('joining');
    };

    async leaveConference() {
        console.log("Leave Dolby conference");
        const prevJoinState = this.joinState;
        this.joinState = 'leaving';
        this.sessionP = null;
        this.myLastPosition = null;
        this.elements.chatHolder.classList.add('unconnected');
        this.stopTestingMicrophone();
        this.stopTestingAudioLevel();
        if (!this.elements.chatHolder.classList.contains('hide-settings')) this.toggleSettings();
        if (prevJoinState === 'joined') {
            try {
                await VoxeetSDK.conference.leave();
            } catch (error) {
                console.error(error);
            }
        }
        if (VoxeetSDK.session.isOpen()) {
            try {
                await VoxeetSDK.session.close();
                console.log("Dolby session closed");
            } catch (error) {
                console.error(error);
            }
        }
        this.joinState = 'left';
        this.updateActiveInChat();
    }

    setMyPosition() {
        if (this.joinState !== 'joined') return;

        const { _translation: newPos, _rotation: newRot } = this.localPlayer;
        let moved = true;
        if (this.myLastPosition) {
            const { pos, rot } = this.myLastPosition;
            moved = !v3_equals(pos, newPos) || !q_equals(rot, newRot);
        }
        this.myLastPosition = { pos: newPos, rot: newRot };
        if (moved) {
            const [x, y, z] = newPos;
            const myPosition = { x, y, z };
            const yaw = q_yaw(newRot) * 180 / Math.PI;
            const myRotation = { x: 0, y: yaw, z: 0 };
            VoxeetSDK.conference.setSpatialPosition(VoxeetSDK.session.participant, myPosition);
            VoxeetSDK.conference.setSpatialDirection(VoxeetSDK.session.participant, myRotation);
        }
        this.future(100).setMyPosition();
    }

    playerEnter(p) {
        if (p.playerId !== this.viewId) {
            this.updateActiveInChat();
            return;
        }

        console.log("our player entered");
        this.prepareSession();
    }

    playerLeave(p) {
        this.updateActiveInChat(); // whichever player left, its actor.inWorld will already have been updated
        if (p.playerId !== this.viewId) return;

        console.log("our player left");
        this.leaveConference(); // if we had in fact joined
    }

    updateActiveInChat() {
        const elem = document.getElementById('chatCountText');
        if (this.joinState === 'joined') {
            // show which users are currently in the chat
            const participants = Array.from(VoxeetSDK.conference.participants.values());
            const inChat = participants.filter(p => p.audioTransmitting).map(p => p.info.name).sort();
            if (this.lastInChat?.length === inChat.length && !inChat.some((nick, i) => this.lastInChat[i] !== nick)) return;

            this.lastInChat = inChat;
            elem.textContent = String(inChat.length);
            elem.setAttribute("title", inChat.join("\n"));
        } else {
            elem.textContent = "-";
            elem.setAttribute("title", "");
        }
    }

    async initAudio() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)(); // default sample rate

        // create a gain node that is always
        // connected to an analyser to measure level (even if the
        // stream to the call is muted), and to testAudioNode for
        // listening to one's own mic.
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = 1;

        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 4096; // approx 85ms at 48k
        this.byteTimeDomainData = new Uint8Array(this.analyser.fftSize);
        this.gainNode.connect(this.analyser);

        this.testAudioNode = this.audioContext.createMediaStreamDestination();
        this.elements.localAudio.srcObject = this.testAudioNode.stream;
        this.gainNode.connect(this.testAudioNode);
        this.elements.localAudio.muted = true;

        await window.dolbyPromise;
        await this.updateAudioInputs();

        // on Safari (at least), the audioContext doesn't start
        // in 'running' state.  it seems we can start it here, now
        // we have the user permissions.
        this.resumeAudioContextIfNeeded();
    }

    resumeAudioContextIfNeeded() {
        // on Safari (at least), the audioContext doesn't start
        // in 'running' state.
        if (this.audioContext.state !== 'running' && this.audioContext.state !== 'closed') {
            console.log("attempting to resume audioContext");
            this.audioContext.resume();
        }
    }

    stopStream(stream) {
        if (!stream) return;
        stream.getTracks().forEach(track => track.stop());
    }

    stopAudioStream() {
        if (this.measurableAudioStream) {
            this.stopStream(this.measurableAudioStream);
            delete this.measurableAudioStream;
        }

        if (this.measurableAudioStreamSource) {
            this.measurableAudioStreamSource.disconnect();
            delete this.measurableAudioStreamSource;
        }
    }

    updateAudioInputs() {
        // refresh the audio-selection list with all available built-in devices
        if (this._updateAudioInputsPromise) return this._updateAudioInputsPromise;

        const previousSelection = this.elements.audioInputs.selectedOptions[0];
        const previousLabel = (previousSelection && previousSelection.label)
            || (this.chatAudioTrack && this.chatAudioTrack.label)
            || userSelectedMicLabel;
        let lookingForPrevious = !!previousLabel;
        let firstOption;

        const audioInputs = this.elements.audioInputs;
        audioInputs.innerHTML = '';
        const audioPlaceholderOption = document.createElement('optgroup');
        audioPlaceholderOption.disabled = true;
        audioPlaceholderOption.selected = false;
        audioPlaceholderOption.label = "Select Microphone";
        audioInputs.appendChild(audioPlaceholderOption);

        // Firefox won't provide labels for audio devices unless we get an audio input first. https://stackoverflow.com/questions/46648645/navigator-mediadevices-enumeratedevices-not-display-device-label-on-firefox
        const prelimPromise = navigator.userAgent.indexOf("Firefox") === -1 ? Promise.resolve() : navigator.mediaDevices.getUserMedia({ audio: true, video: false });

        const promise = this._updateAudioInputsPromise = prelimPromise
            .then(() => VoxeetSDK.mediaDevice.enumerateAudioInputDevices())
            .then(devices => {
                devices.forEach(device => {
                    const { deviceId, label } = device;

                    if (deviceId === 'default' || deviceId === 'communications') {
                        // console.log(`rejecting "default" device (${label})`);
                        return;
                    }

                    // re-apply any earlier selection
                    const selected = lookingForPrevious && previousLabel === label;
                    if (selected) lookingForPrevious = false;

                    // (text, value, defaultSelected, selected)
                    const option = new Option(label, deviceId, selected, selected);
                    if (!firstOption) firstOption = option;
                    audioInputs.appendChild(option);
                });

                // if previous selection has gone, select the first entry
                // and (if the chat stream is already running) force a
                // change to that device.
                if (lookingForPrevious && firstOption) {
                    console.warn(`previous device "${previousLabel}" is gone; switching to "${firstOption.label}"`);
                    audioInputs.value = firstOption.value;
                    if (this.mediaStarted) this.setAudioInput();
                }
            }).catch(err => {
                console.error("error in updateAudioInputs", err);
            }).finally(() => {
                delete this._updateAudioInputsPromise;
            });

        return promise;
    }

    setAudioInput(force) {
        if (this._setAudioInputPromise) return this._setAudioInputPromise;

        const audioInputs = this.elements.audioInputs;
        const option = audioInputs.selectedOptions[0];
        if (!option) {
            console.warn("no audio selections available");
            return Promise.resolve();
        }

        const selectedId = option.value;
        const selectedLabel = option.label;

        const currentAudioTrack = this.chatAudioTrack;
        if (!force && currentAudioTrack && currentAudioTrack.label === selectedLabel && currentAudioTrack.readyState === 'live') {
            console.log("audio stream already matches selection");
            return Promise.resolve();
        }

        // once a selection has been made, it should persist across dormancy
        userSelectedMicLabel = selectedLabel;

        // how audio input works:

        // we pass the selected device id to VoxeetSDK.  we also get the stream
        // for the device, clone it, and from the clone make a mediaStreamSource
        // (stored as this.measurableAudioStreamSource), which is connected to
        // the gainNode that was set up on initialisation.  the gainNode is
        // connected to a mediaStreamDestination node for local feedback testing
        // (this.testAudioNode), and to an analyser for measuring
        // local audio level.

        // switching input device therefore involves
        //   - requesting a stream from the specified device
        //   - stopping the stream (if any) supplying local feedback
        //   - making a mediaStreamSource from a clone of the new stream
        //   - connecting the mediaStreamSource to the long-lived gainNode

        // jan 2021: avoid re-running getUserMedia on iPad, because there
        // is only ever one audio input device, and a repeated getUserMedia
        // causes the device to be somehow silenced (though not obviously
        // muted, disabled, or ended).
        let startPromise;
        const isIPad = navigator.userAgent.match(/\biPad\b/);
        const okToReplace = !isIPad || !this.chatAudioStream;
        if (!okToReplace) {
            console.log(`not invoking getUserMedia`);
            startPromise = Promise.resolve(this.chatAudioStream);
        } else {
            console.log(`getUserMedia with device ID "${selectedId}"`);
            startPromise = navigator.mediaDevices.getUserMedia({ audio: { deviceId: selectedId } });
        }
        const promise = this._setAudioInputPromise = startPromise
            .then(stream => {
                const chatAudioTrack = stream.getAudioTracks()[0];
                const prevAudioTrack = this.chatAudioTrack;
                if (!force && chatAudioTrack === prevAudioTrack) {
                    console.warn(`same audio track found; no replacement needed`);
                    return;
                }

                this.chatAudioStream = stream;
                this.chatAudioTrack = chatAudioTrack;
                chatAudioTrack.onmute = () => {
                    console.log('audio track muted itself');
                };
                chatAudioTrack.onunmute = () => {
                    console.log('audio track unmuted itself');
                };
                chatAudioTrack.onended = _event => {
                    // if the track unexpectedly ends, it probably means
                    // that something in the host's audio settings has
                    // been changed or replaced.  force a refresh of
                    // the audio input.
                    console.warn("audio track ended");
                    this.setAudioInput(true); // force re-init
                };

                // clone the stream (and its tracks) before using its track to
                // create an Agora audio track.
                const audioStreamClone = stream.clone();

                // replace the cloned stream that feeds the
                // level meter and the feedback test
                this.stopAudioStream(); // also disconnects mediaStreamSource, if any
                this.measurableAudioStream = audioStreamClone;
                const mediaStreamSource = this.audioContext.createMediaStreamSource(audioStreamClone);
                mediaStreamSource.connect(this.gainNode);
                this.measurableAudioStreamSource = mediaStreamSource;
                audioStreamClone.getAudioTracks()[0].onended = () => console.log(`local subsidiary audio track ended unexpectedly`);

                VoxeetSDK.mediaDevice.selectAudioInput(selectedId).then(response => {
                    console.log(response);
                });
                this.elements.toggleAudio.classList.remove('error');
                this.mediaStarted = true;
            }).catch(err => {
                console.warn(`setAudioInput failed for id ${selectedId}: ${err}`);
                this.elements.toggleAudio.classList.add('error');
            }).finally(() => {
                delete this._setAudioInputPromise;
            });

        return promise;
    }

    async muteChatAudio() {
console.log("muting local audio");
        await this.ensureAudioMuteState(true);
    }

    async unmuteChatAudio() {
console.log("unmuting local audio");
        this.stopTestingMicrophone();

        await this.ensureAudioMuteState(false);
    }

    async ensureAudioMuteState(muted) {
        // used to mute/unmute our audio in the call.
        if (chatAudioMuted !== muted) {
            await VoxeetSDK.conference.mute(VoxeetSDK.session.participant, muted);
            chatAudioMuted = muted;
            this.elements.chatHolder.classList.toggle('mute-audio', muted);
        }
    }

    startTestingAudioLevel() {
        this._testAudioInterval = 100;
        this._testAudioLevelIntervalId = window.setInterval(this.testAudioLevel.bind(this), this._testAudioInterval);
    }

    testAudioLevel() {
        const audioLevel = this.getLocalAudioLevel();

        // no need to display audio level if the meter isn't on view.
        if (this.elements.chatHolder.classList.contains('hide-settings') || !this.measurableAudioStream) return;

        if (this._maxAudioLevelLongTerm === undefined || audioLevel > this._maxAudioLevelLongTerm) {
            this._maxAudioLevelLongTerm = audioLevel;
            window.clearTimeout(this._maxAudioLevelLongTermTimeoutId);
            this._maxAudioLevelLongTermTimeoutId = window.setTimeout(() => {
                delete this._maxAudioLevelLongTerm;
                delete this._maxAudioLevelLongTermTimeoutId;

                this.elements.loudnessMax.style.bottom = '';
                this.elements.loudnessMax.style.left = '';
            }, 1500);

            const { flexDirection } = getComputedStyle(this.elements.loudnessBar);
            if (flexDirection.includes('row')) {
                this.elements.loudnessMax.style.left = `${94 * audioLevel}%`;
                this.elements.loudnessMax.style.bottom = '-3px';
            } else {
                this.elements.loudnessMax.style.left = '-1px';
                this.elements.loudnessMax.style.bottom = `${94 * audioLevel}%`;
            }
        }

        if (this._maxAudioLevelShortTerm === undefined || audioLevel > this._maxAudioLevelShortTerm) {
            this._maxAudioLevelShortTerm = audioLevel;
            window.clearTimeout(this._maxAudioLevelShortTermTimeoutId);
            this._maxAudioLevelShortTermTimeoutId = window.setTimeout(() => {
                delete this._maxAudioLevelShortTerm;
                delete this._maxAudioLevelShortTermTimeoutId;

                this.elements.loudnessValue.style.flex = 0;
                this.elements.loudnessValue.style.backgroundColor = 'green';
            }, 100);

            this.elements.loudnessValue.style.flex = audioLevel;

            const color = `hsl(${120 * (1 - (audioLevel ** 2))}, 100%, 50%)`;

            this.elements.loudnessValue.style.backgroundColor = color;
        }
    }

    stopTestingAudioLevel() {
        if (this._testAudioLevelIntervalId) {
            window.clearInterval(this._testAudioLevelIntervalId);
            delete this._testAudioLevelIntervalId;
        }
    }

    getLocalAudioLevel() {
        const data = this.byteTimeDomainData;
        this.analyser.getByteTimeDomainData(data);
        // for efficiency, don't examine every sampled value.
        // examining one in 19 implies an inter-measurement
        // interval of 1000/(48000/19), approx 0.4ms.
        const numSamples = this.analyser.fftSize;
        let value, max = 0;
        for (let i = 0; i < numSamples; i += 19) {
            value = data[i];
            value = Math.abs(value - 128);
            max = Math.max(max, value);
        }
        max /= 128;
        return max;
    }

    // TEST MICROPHONE
    testMicrophone() {
        if (this.elements.localAudio.paused) this.elements.localAudio.play();

        if (!chatAudioMuted) this.muteChatAudio();

        this.elements.localAudio.muted = false; // make it audible
        this.elements.chatHolder.classList.add('testing-microphone');
    }
    stopTestingMicrophone() {
        this.elements.localAudio.muted = true; // silence, but don't remove
        this.elements.chatHolder.classList.remove('testing-microphone');
    }

    destroy() {
        console.log("DolbyChatMgr: destroy");
        this.stopTestingAudioLevel();
        try {
            this.leaveConference().then(() => this.elements.chatHolder.remove());
        } catch(e) { /* ignore */ }
        activeManager = null; // stop handling events
        super.destroy();
    }
}
