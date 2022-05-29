import { THREE, GetPawn } from "@croquet/worldcore";

import { CardActor, CardPawn } from "./DCard.js";
import { addShellListener, removeShellListener, sendToShell, frameId, isPrimaryFrame } from "./frame.js";


export class PortalActor extends CardActor {
    get portalURL() { return this._cardData.portalURL; }

    get sparkle() { return this._cardData.sparkle; }

    get pawn() { return PortalPawn; }
}
PortalActor.register("PortalActor");

export class PortalPawn extends CardPawn {
    constructor(actor) {
        super(actor);

        this.createPortalMaterials();

        this.portalId = undefined;
        this.targetMatrix = new THREE.Matrix4();
        this.targetMatrixBefore = new THREE.Matrix4();
        this.loadTargetWorld();

        this.setGhostWorld({ v: this.actor._ghostWorld });
        this.listen("ghostWorldSet", this.setGhostWorld);

        this.addEventListener("pointerDown", "nop");
        this.addEventListener("keyDown", e => { switch (e.key) {
            case " ": this.enterPortal(); break;
            case "G": case "g": this.say("_set", { ghostWorld: !this.actor._ghostWorld }); break;
        }});

        this.shellListener = (command, data) => this.receiveFromShell(command, data);
        addShellListener(this.shellListener);
    }

    destroy() {
        removeShellListener(this.shellListener);
        super.destroy();
    }

    objectCreated(obj, options) {
        super.objectCreated(obj, options);
        this.applyPortalMaterial(obj);
        if (this.actor.sparkle) this.addParticles();
    }

    createPortalMaterials() {
        // plain "window" portal
        // we're erasing the framebuffer (overwriting with 0,0,0,0)
        // glBlendFunc(GL_ZERO, GL_ZERO);
        this.portalMaterialSimple = new THREE.MeshBasicMaterial({
            blending: THREE.CustomBlending,
            blendSrc: THREE.ZeroFactor,
            blendDst: THREE.ZeroFactor,
        });

        // "invisible" animated spiral portal
        this.portalMaterialFancy = new THREE.ShaderMaterial({
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
                    float alpha = sin(time * 5.0 - r * 10.0 + angle) + r - fract(time * 0.05) * 5.0 + 1.0;
                    gl_FragColor = vec4(0, 0, 0, 1.0 - alpha); // we only care about alpha
                }
            `,
            clipping: true,
            transparent: true,
            blending: THREE.CustomBlending,
            blendEquation: THREE.AddEquation,
            blendSrc: THREE.ZeroFactor,
            blendDst: THREE.OneMinusSrcAlphaFactor,
        });

        this.portalMaterial = this.portalMaterialSimple;
    }

    applyPortalMaterial(obj) {
        if (!obj) obj = this.shape;
        if (!obj.material) obj = obj.children[0];
        if (!obj) return;

        if (Array.isArray(obj.material)) {
            obj.material[0] = this.portalMaterial;
        } else {
            obj.material = this.portalMaterial;
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
        return [0, 0, 1];
    }

    update(t) {
        super.update();
        this.updatePortalCamera();
        this.updatePortalMaterial();
        this.updateParticles();
    }

    updatePortalCamera() {
        if (!this.portalId) return;
        const { targetMatrix, targetMatrixBefore, portalId } = this;
        targetMatrix.copy(this.renderObject.matrixWorld);
        targetMatrix.invert();
        targetMatrix.multiply(this.service("ThreeRenderManager").camera.matrixWorld);
        if (!targetMatrixBefore.equals(targetMatrix)) {
            sendToShell("portal-update", { portalId, cameraMatrix: targetMatrix.elements });
            targetMatrixBefore.copy(targetMatrix);
        }
    }

    updatePortalMaterial() {
        let { fancy } = this.actor._cardData;

        if (fancy) {
            if (this.portalMaterial !== this.portalMaterialFancy) {
                this.startTime = this.extrapolatedNow();
            }
            const time = (this.extrapolatedNow() - this.startTime) / 1000;
            if (time < 15) {
                this.portalMaterialFancy.uniforms.time.value = time;
            } else {
                fancy = false;
                this.say("setCardData", { fancy });
            }
        }

        const portalMaterial = fancy ? this.portalMaterialFancy : this.portalMaterialSimple;
        if (this.portalMaterial !== portalMaterial) {
            this.portalMaterial = portalMaterial;
            this.applyPortalMaterial();
        }
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
        if (this.didPropertyChange(data, "portalURL")) this.loadTargetWorld();
        if (this.didPropertyChange(data, "sparkle")) this.updateParticles();
    }

    loadTargetWorld() {
        const portalURL = this.resolvePortalURL();
        sendToShell("portal-load", {
            portalURL,
            portalId: this.portalId, // initially undefined
        });
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

    enterPortal() {
        // NOTE THIS IS NOT THE ONLY CODE PATH FOR ENTERING WORLDS
        // we also jump between worlds using the browser's "forward/back" buttons
        console.log(frameId, "player", this.viewId, "enter portal", this.portalId);
        const avatarActor = this.actor.service("PlayerManager").player(this.viewId);
        const avatarPawn = GetPawn(avatarActor.id);
        const avatarSpec = avatarPawn.specForPortal(this);
        sendToShell("portal-enter", { portalId: this.portalId, avatarSpec });
        // shell will swap iframes and trigger avatarPawn.frameTypeChanged() for this user in both worlds
    }

    setGhostWorld({v}) {
        const canvas = document.getElementById("ThreeCanvas");
        if (v && isPrimaryFrame) {
            // make our own world translucent, blurry, and desaturated so
            // the portal world becames visible
            canvas.style.filter = "opacity(80%) saturate(30%) contrast(80%) blur(4px)";
        } else {
            canvas.style.filter = "";
        }
    }

    receiveFromShell(command, { portalId }) {
        switch (command) {
            case "portal-opened":
                this.portalId = portalId;
                this.updatePortalCamera();
                break;
            case "frame-type":
                this.updatePortalCamera();
                this.setGhostWorld({v: this.actor._ghostWorld});
                break;
        }
    }
}
