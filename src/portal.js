// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { THREE } from "./ThreeRender.js";

import { CardActor, CardPawn } from "./card.js";
import { addShellListener, removeShellListener, sendToShell, frameName, isPrimaryFrame } from "./frame.js";


export class PortalActor extends CardActor {
    init(options) {
        super.init(options);
        this._isOpen = true;
        this.addLayer("portal");
        this._portalTime = this.now();
        this.listen("isOpenSet", this.setIsOpen);
    }

    get isPortal() { return true; }

    get isOpen() { return this._isOpen; }
    get portalTime() { return this._portalTime; }

    get portalURL() { return this._cardData.portalURL; }

    get sparkle() { return this._cardData.sparkle; }

    get pawn() { return PortalPawn; }

    setIsOpen() {
        if (this.isOpen) this.addLayer("portal");
        else this.removeLayer("portal");
    }
}
PortalActor.register("PortalActor");

export class PortalPawn extends CardPawn {
    constructor(actor) {
        super(actor);

        this.createPortalMaterials();

        this.portalId = undefined;
        this.targetMatrix = new THREE.Matrix4();
        this.targetMatrixBefore = new THREE.Matrix4();
        if (this.actor.isOpen) this.openPortal();

        this.setGhostWorld({ v: this.actor._ghostWorld });
        this.listen("ghostWorldSet", this.setGhostWorld);
        this.listen("isOpenSet", this.setIsOpen);

        this.addEventListener("pointerDown", this.onPointerDown);
        this.addEventListener("keyDown", e => { switch (e.key) {
            case " ": this.enterPortal(); break;
            case "G": case "g": this.say("_set", { ghostWorld: this.actor._ghostWorld === null ? 20 : null}); break;
        }});

        this.shellListener = (command, data) => this.receiveFromShell(command, data);
        addShellListener(this.shellListener);

        this.subscribe("avatar", { event: "gatherPortalSpecs", handling: "immediate" }, this.updatePortal);
    }

    destroy() {
        this.closePortal();
        removeShellListener(this.shellListener);
        super.destroy();
    }

    get globalPlane() {
        if (!this._globalPlane) {
            this._globalPlane = new THREE.Plane();
            this._globalPlane.normal.set(0, 0, 1);
            this._globalPlane.applyMatrix4(this.shape.matrixWorld);
        }
        return this._globalPlane;
    }

    objectCreated(obj, options) {
        super.objectCreated(obj, options);
        this.applyPortalMaterial(obj);
        if (this.actor.sparkle) this.addParticles();
    }

    createPortalMaterials() {
        // "invisible" animated spiral portal
        this.portalMaterial = new THREE.ShaderMaterial({
            uniforms: { time: { value: 0 } },
            vertexShader: `
                #include <clipping_planes_pars_vertex>
                varying vec3 vUv;
                void main() {
                    #include <begin_vertex>             // transformed = position
                    #include <project_vertex>           // mvPosition and gl_Position
                    #include <clipping_planes_vertex>   // vClipPosition
                    vUv = transformed;
                }
            `,
            fragmentShader: `
                uniform float time;
                varying vec3 vUv;
                #include <clipping_planes_pars_fragment>
                void main() {
                    #include <clipping_planes_fragment>
                    float r = length(vUv.xy);
                    float angle = atan(vUv.y, vUv.x);
                    float v = sin(time * 30.0 - r * 1.0 + 5.0 * angle) + r - time * 2.0 + 2.0;
                    float alpha = clamp(v, 0.0, 1.0);
                    // gl_FragColor = vec4(0, 0, 0, alpha); // if we only care about alpha
                    gl_FragColor = vec4(alpha*0.3, alpha*0.3, alpha*0.3, alpha); // add some grey
                }
            `,
            clipping: true,
            // transparent: true,
            // blending: THREE.CustomBlending,
            // blendEquation: THREE.AddEquation,
            // blendSrc: THREE.ZeroFactor,
            // blendDst: THREE.OneMinusSrcAlphaFactor,
        });
    }

    applyPortalMaterial(obj) {
        if (!obj) obj = this.shape;
        if (!obj.material) obj = obj.children[0];
        if (!obj) return;

        const { isOpen } = this.actor;
        if (Array.isArray(obj.material)) {
            if (obj.material[0] !== this.portalMaterial) this.originalMaterial = obj.material[0];
            obj.material[0] = isOpen ? this.portalMaterial : this.originalMaterial;
        } else {
            if (obj.material !== this.portalMaterial) this.originalMaterial = obj.material;
            obj.material = isOpen ? this.portalMaterial : this.originalMaterial;
        }
    }

    addParticles() {
        if (this.particleSystem) return;
        const width = this.actor._cardData.width * 0.5 + 0.002;
        const height = this.actor._cardData.height * 0.5 + 0.002;
        const particles = 1000;
        const uniforms = {
            pointTexture: { value: new THREE.TextureLoader().load( './assets/images/spark.png' ) }
        };
        const shaderMaterial = new THREE.ShaderMaterial( {
            uniforms,
            vertexShader: `
                attribute float size;
                #include <clipping_planes_pars_vertex>
                void main() {
                    #include <begin_vertex>
                    #include <project_vertex>
                    mvPosition += vec4( 0.0, 0.0, 0.1, 0.0 ); // offset towards camera to avoid z clipping
                    #include <clipping_planes_vertex>
                    gl_PointSize = size * ( 20.0 / -mvPosition.z );
                }
            `,
            fragmentShader: `
                uniform sampler2D pointTexture;
                #include <clipping_planes_pars_fragment>
                void main() {
                    #include <clipping_planes_fragment>
                    gl_FragColor = texture2D( pointTexture, gl_PointCoord );
                }
            `,
            clipping: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            vertexColors: true
        } );

        const positions = [];
        const sizes = [];
        for ( let i = 0; i < particles; i ++ ) {
            const edge = Math.random() * 2 - 1;
            const side = Math.random() < 0.5 ? 1 : -1;
            const swap = Math.random() < 0.5;
            positions.push((swap ? edge : side) * width);
            positions.push((swap ? side : edge) * height);
            positions.push(0);
            sizes.push(20);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
        geometry.setAttribute( 'size', new THREE.Float32BufferAttribute( sizes, 1 ).setUsage( THREE.DynamicDrawUsage ) );

        this.particleSystem = new THREE.Points( geometry, shaderMaterial );

        this.shape.add(this.particleSystem);
    }

    removeParticles() {
        if (!this.particleSystem) return;
        this.shape.remove(this.particleSystem);
        this.particleSystem = undefined;
    }

    // double-click should move avatar to the front of the portal
    get hitNormal() {
        return [0, 0, -1];
    }

    update(t) {
        super.update(t);
        this.updatePortalMaterial();
        this.updateParticles();
    }

    updatePortal({ callback, force }) {
        // invoked synchronously for message scope avatar:gatherPortalSpecs
        this.updatePortalCamera(callback, force);
    }

    updatePortalCamera(callback, force) {
        // if the portal's position with respect to the camera has changed, tell the
        // embedded world to re-render itself from the suitably adjusted camera angle.
        // while these changes continue, the shell will take over the scheduling of
        // the worlds' rendering with the goal of ensuring that the embedded world has
        // always finished its rendering by the time the outer world (and the portal)
        // is rendered.
        if (!this.portalId) return;

        const { targetMatrix, targetMatrixBefore, portalId } = this;
        const { camera } = this.service("ThreeRenderManager");
        // objects' matrices are not guaranteed to have been updated, because this is
        // decoupled from THREE rendering.
        camera.updateMatrixWorld(true);
        this.renderObject.updateMatrixWorld(true);
        targetMatrix.copy(this.renderObject.matrixWorld);
        targetMatrix.invert();
        targetMatrix.multiply(camera.matrixWorld);
        if (force || !targetMatrixBefore.equals(targetMatrix)) {
            const frustum = new THREE.Frustum();
            const matrix = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
            frustum.setFromProjectionMatrix(matrix);
            // if the portal isn't on view (though this is very approximate, based on
            // its bounding sphere), tell the shell there's no need to do synchronised
            // rendering right now - even though the portal is moving
            const remoteMatrix = frustum.intersectsObject(this.renderObject.children[0])
                ? targetMatrix.elements
                : null;
            callback({ portalId, cameraMatrix: remoteMatrix });
            targetMatrixBefore.copy(targetMatrix);
        }
    }

    updatePortalMaterial() {
        let { portalTime } = this.actor;
        const time = (this.extrapolatedNow() - portalTime) / 1000;
        this.portalMaterial.uniforms.time.value = time;
    }

    updateParticles() {
        if (this.actor.sparkle && !this.particleSystem) this.addParticles();
        else if (!this.actor.sparkle && this.particleSystem) this.removeParticles();
        if (!this.particleSystem) return;
        const { geometry} = this.particleSystem;
        const sizes = geometry.attributes.size.array;
        const time = Date.now() / 100;
        for ( let i = 0; i < sizes.length; i ++ ) {
            sizes[ i ] = 10 * ( 1 + Math.sin( 0.1 * i + time ) );
        }
        geometry.attributes.size.needsUpdate = true;
    }

    updateShape(options) {
        this.removeParticles();
        super.updateShape(options);
        this.updateParticles(); // rebuild with new shape
    }

    cardDataUpdated(data) {
        super.cardDataUpdated(data);
        // if (this.didPropertyChange(data, "portalURL")) this.openPortal();
        if (this.didPropertyChange(data, "sparkle")) this.updateParticles();
    }

    refreshDrawTransform() {
        super.refreshDrawTransform();
        this._globalPlane = null;
    }

    onPointerDown() {
        // currently toggles open/closed
        this.say("_set", {
            isOpen: !this.actor.isOpen,
            portalTime: this.now(),
        });
    }

    openPortal() {
        const portalURL = this.resolvePortalURL();
        sendToShell("portal-open", {
            portalURL,
            portalId: this.portalId, // initially undefined
        });
    }

    closePortal() {
        sendToShell("portal-close", { portalId: this.portalId });
        this.portalId = null;
        this.targetMatrixBefore.identity();
    }

    resolvePortalURL() {
        // if portalURL does not have a sessionName or password, we need to resolve it
        // we do this by appending our own sessionName and password to the URL
        let portalURL = this.actor.portalURL;
        const portalTempUrl = new URL(portalURL, location.href);
        const portalSearchParams = portalTempUrl.searchParams;
        const portalHashParams = new URLSearchParams(portalTempUrl.hash.slice(1));
        let sessionName = portalSearchParams.get("q");
        let password = portalHashParams.get("pw");
        if (!sessionName || !password) {
            const worldUrl = new URL(location.href);
            if (!sessionName) {
                sessionName = worldUrl.searchParams.get("q");
                password = '';
                portalSearchParams.set("q", sessionName);
            }
            if (!password) {
                const worldHashParams = new URLSearchParams(worldUrl.hash.slice(1));
                password = worldHashParams.get("pw");
                portalHashParams.set("pw", password);
                portalTempUrl.hash = portalHashParams.toString();
            }
        }
        // remove origin from portalURL if it is the same as the world URL
        // we could also construct an even shorter relative URL, but this is easier
        portalURL = portalTempUrl.toString();
        if (portalTempUrl.origin === location.origin) {
            portalURL = portalURL.slice(location.origin.length);
            if (portalTempUrl.pathname === location.pathname) {
                portalURL = portalURL.slice(location.pathname.length);
            }
        }
        if (this.actor.portalURL !== portalURL) this.say("setCardData", { portalURL });
        // send full URL to shell
        return portalTempUrl.toString();
    }

    setIsOpen({v}) {
        this.applyPortalMaterial();
        if (v) this.openPortal();
        else this.closePortal();
    }

    setGhostWorld({v}) {
        let canvas = document.getElementById("ThreeCanvas");
        let slider = document.getElementById("ghostSlider");
        if (typeof v === "number" && isPrimaryFrame) {
            // make our own world translucent, blurry, and desaturated so
            // the portal world becames visible
            slider.style.display = "block";
            slider.oninput = () => this.say("_set", { ghostWorld: +slider.value });
            canvas.style.filter = `opacity(${100 - v}%) saturate(${100-v}%) contrast(${80 + v * 0.2}%) blur(4px)`;
            slider.value = v;
        } else {
            slider.style.display = "none";
            canvas.style.filter = "";
        }
    }

    receiveFromShell(command, { portalId }) {
        switch (command) {
            case "portal-opened":
                this.portalId = portalId;
                break;
            case "frame-type":
                this.setGhostWorld({v: this.actor._ghostWorld});
                break;
        }
    }
}
