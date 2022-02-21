
import { Actor, Pawn } from "@croquet/worldcore";
import { CardActor, CardPawn} from "../src/DCard.js";

/////////// Model code is executed inside of synced VM /////////// 

export class MultiBlaster extends CardActor {
    get pawn(){ return MultiBlasterDisplay; }
    init(options) {
        super.init(options);
        this.beWellKnownAs("multiBlaster");
        this.ships = new Map();
        this.asteroids = new Set();
        this.blasts = new Set();
        this.subscribe(this.sessionId, "view-join", this.viewJoined);
        this.subscribe(this.sessionId, "view-exit", this.viewExited);
        this.subscribe(this.sessionId, "switch-pause", this.switchPause);
        Asteroid.create({});
        this.active = true;
        this.mainLoop();
    }

    switchPause() {
        console.log("switchPaused!!!!")
        this.active = !this.active;
    }

    viewJoined(viewId) {
        const ship = Ship.create({ viewId });
        this.ships.set(viewId, ship);
    }

    viewExited(viewId) {
        const ship = this.ships.get(viewId);
        this.ships.delete(viewId);
        ship.destroy();
    }

    checkCollisions() {
        for (const asteroid of this.asteroids) {
            if (asteroid.wasHit) continue;
            const minx = asteroid.x - asteroid.size;
            const maxx = asteroid.x + asteroid.size;
            const miny = asteroid.y - asteroid.size;
            const maxy = asteroid.y + asteroid.size;
            for (const blast of this.blasts) {
                if (blast.x > minx && blast.x < maxx && blast.y > miny && blast.y < maxy) {
                    asteroid.hitBy(blast);
                    break;
                }
            }
            for (const ship of this.ships.values()) {
                if (!ship.wasHit && ship.x + 10 > minx && ship.x - 10 < maxx && ship.y + 10 > miny && ship.y - 10 < maxy) {
                    if (!ship.score && Math.abs(ship.x-512) + Math.abs(ship.y-512) < 40) continue; // no hit if just spawned
                    ship.hitBy(asteroid);
                    break;
                }
            }
        }
    }

    mainLoop() {
        if(this.active){
            for (const ship of this.ships.values()) ship.move();
            for (const asteroid of this.asteroids) asteroid.move();
            for (const blast of this.blasts) blast.move();
            this.checkCollisions();
        }
        this.future(50).mainLoop(); // move & check every 50 ms
    }
}
MultiBlaster.register("MultiBlaster");

class Ship extends Actor {
    init({ viewId }) {
        super.init();
        this.viewId = viewId;
        this.reset();
        this.subscribe(viewId, "left-thruster", this.leftThruster);
        this.subscribe(viewId, "right-thruster", this.rightThruster);
        this.subscribe(viewId, "forward-thruster", this.forwardThruster);
        this.subscribe(viewId, "fire-blaster", this.fireBlaster);
    }

    reset() {
        this.x = 512;
        this.y = 512;
        this.a = -Math.PI / 2;
        this.dx = 0;
        this.dy = 0;
        this.left = false;
        this.right = false;
        this.forward = false;
        this.score = 0;
        this.wasHit = 0;
    }

    leftThruster(active) {
        if (this.wasHit) return;
        this.left = active;
    }

    rightThruster(active) {
        if (this.wasHit) return;
        this.right = active;
    }

    forwardThruster(active) {
        if (this.wasHit) return;
        this.forward = active;
    }

    fireBlaster() {
        if (this.wasHit) return;
        const dx = Math.cos(this.a) * 20;
        const dy = Math.sin(this.a) * 20;
        const x = this.x + dx;
        const y = this.y + dy;
        Blast.create({ x, y, dx, dy, ship: this });
    }

    move() {
        if (this.wasHit) {
            // keep drifting as debris for 3 seconds
            if (++this.wasHit > 60) this.reset();
        } else {
            // process thruster controls
            if (this.forward) {
                this.dx += Math.cos(this.a) * 0.5;
                this.dy += Math.sin(this.a) * 0.5;
                if (this.dx > 10) this.dx = 10;
                if (this.dx < -10) this.dx = -10;
                if (this.dy > 10) this.dy = 10;
                if (this.dy < -10) this.dy = -10;
            }
            if (this.left) this.a -= 0.2;
            if (this.right) this.a += 0.2;
            if (this.a < 0) this.a += Math.PI * 2;
            if (this.a > Math.PI * 2) this.a -= Math.PI * 2;
        }
        // drift through space
        this.x += this.dx;
        this.y += this.dy;
        if (this.x < 0) this.x += 1024;
        if (this.x > 1024) this.x -= 1024;
        if (this.y < 0) this.y += 1024;
        if (this.y > 1024) this.y -= 1024;
    }

    hitBy(asteroid) {
        // turn both into debris
        this.wasHit = 1;
        asteroid.wasHit = 1;
    }
}
Ship.register("Ship");

class Asteroid extends Actor {
    init({ size, x, y, a, dx, dy, da }) {
        super.init();
        if (size) {
            // init second asteroid after spliting
            this.size = size;
            this.x = x;
            this.y = y;
            this.a = a;
            this.dx = dx;
            this.dy = dy;
            this.da = da;
        } else {
            // init new large asteroid
            this.size = 40;
            this.x = Math.random() * 400 - 200;
            this.y = Math.random() * 400 - 200;
            this.a = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 1;
            this.dx = Math.cos(this.a) * speed;
            this.dy = Math.sin(this.a) * speed;
            this.da = (0.02 + Math.random() * 0.03) * (Math.random() < 0.5 ? 1 : -1);
            this.wasHit = 0;
            this.move();
        }
        this.wellKnownModel("multiBlaster").asteroids.add(this);
    }

    move() {
        if (this.wasHit) {
            // keep drifting as debris, larger pieces drift longer
            if (++this.wasHit > this.size) this.destroy();
        }
        this.x += this.dx;
        this.y += this.dy;
        if (this.x < 0) this.x += 1024;
        if (this.x > 1024) this.x -= 1024;
        if (this.y < 0) this.y += 1024;
        if (this.y > 1024) this.y -= 1024;
        if (!this.wasHit) {
            this.a += this.da;
            if (this.a < 0) this.a += Math.PI * 2;
            if (this.a > Math.PI * 2) this.a -= Math.PI * 2;
        }
    }

    hitBy(blast) {
        if (!blast.ship.wasHit) blast.ship.score++;
        if (this.size > 20) {
            // split into two smaller faster asteroids
            this.size *= 0.7;
            this.da *= 1.5;
            this.dx = -blast.dy * 10 / this.size;
            this.dy = blast.dx * 10 / this.size;
            Asteroid.create({ size: this.size, x: this.x, y: this.y, a: this.a, dx: -this.dx, dy: -this.dy, da: this.da });
        } else {
            // turn into debris
            this.wasHit = 1;
        }
        blast.destroy();
    }

    destroy() {
        const asteroids = this.wellKnownModel("multiBlaster").asteroids;
        asteroids.delete(this);
        super.destroy();
        // keep at least 5 asteroids around
        if (asteroids.size < 5) Asteroid.create({});
    }
}
Asteroid.register("Asteroid");

class Blast extends Actor {
    init({x, y, dx, dy, ship}) {
        super.init();
        this.ship = ship;
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.t = 0;
        this.wellKnownModel("multiBlaster").blasts.add(this);
    }

    move() {
        // move for 1.5 second before disappearing
        if (++this.t < 30) {
            this.x += this.dx;
            this.y += this.dy;
            if (this.x < 0) this.x += 1024;
            if (this.x > 1024) this.x -= 1024;
            if (this.y < 0) this.y += 1024;
            if (this.y > 1024) this.y -= 1024;
        } else {
            this.destroy();
        }
    }

    destroy() {
        this.wellKnownModel("multiBlaster").blasts.delete(this);
        super.destroy();
    }
}
Blast.register("Blast");


/////////// Code below is executed outside of synced VM /////////// 


class MultiBlasterDisplay extends CardPawn {
    constructor(actor) {
        super(actor);

        this.addEventListener("pointerDown", "onPointerDown");
        this.addEventListener("pointerMove", "onPointerMove");
        this.addEventListener("pointerUp", "onPointerUp");
        this.addEventListener("keyDown", "onKeyDown");
        this.addEventListener("keyUp", "onKeyUp");

        this.smoothing = new WeakMap(); // position cache for interpolated rendering

        this.context = this.canvas.getContext("2d");
        this.future(50).doUpdate();
    }

    onPointerDown(p3d) {
        if (!p3d.uv) {return;}
        this.joystick = this.uv2xy(p3d.uv);
        this.knob = this.joystick;
    }

    onPointerMove(p3d) {
        if (!p3d.uv) {return;}
        this.knob= this.uv2xy(p3d.uv);
        let dx = this.knob[0]- this.joystick[0];
        let dy = this.knob[1] - this.joystick[1];
        if (dx > 30) {
            if (!this.right) { this.publish(this.viewId, "right-thruster", true); this.right = true; }
        } else if (this.right) { this.publish(this.viewId, "right-thruster", false); this.right = false; }
        if (dx < -30) {
            if (!this.left) { this.publish(this.viewId, "left-thruster", true); this.left = true; }
        } else if (this.left) { this.publish(this.viewId, "left-thruster", false); this.left = false; }
        if (dy < -30) {
            if (!this.forward) { this.publish(this.viewId, "forward-thruster", true); this.forward = true; }
        } else if (this.forward) { this.publish(this.viewId, "forward-thruster", false); this.forward = false; }
    }

    onPointerUp(p3d) {
        if (!p3d.uv) {return;}
        if (!this.right && !this.left && !this.forward) {
            this.publish(this.viewId, "fire-blaster");
        }
        if (this.right) { this.publish(this.viewId, "right-thruster", this.false); this.right = false; }
        if (this.left) { this.publish(this.viewId, "left-thruster", false); this.left = false;  }
        if (this.forward) { this.publish(this.viewId, "forward-thruster", false); this.forward = false; }

        this.joystick = null;
        this.knob= null;
    }

    onPointerCancel(p3d) {
        this.onPointerUp(p3d);
    }

    onKeyDown(e) {
        //joystick.style.display = "none";
        if (e.repeat) return;
        switch (e.key) {
            case "a": case "A": case "ArrowLeft":  this.publish(this.viewId, "left-thruster", true); break;
            case "d": case "D": case "ArrowRight": this.publish(this.viewId, "right-thruster", true); break;
            case "w": case "W": case "ArrowUp":    this.publish(this.viewId, "forward-thruster", true); break;
            case " ":                              this.publish(this.viewId, "fire-blaster"); break;
            case "p": case "P":                    this.publish(this.actor.sessionId, "switch-pause"); break;
        }
    }

    onKeyUp(e) {
        if (e.repeat) return;
        switch (e.key) {
            case "a": case "A": case "ArrowLeft":  this.publish(this.viewId, "left-thruster", false); break;
            case "d": case "D": case "ArrowRight": this.publish(this.viewId, "right-thruster", false); break;
            case "w": case "W": case "ArrowUp":    this.publish(this.viewId, "forward-thruster", false); break;
        }
    }

    // update is called once per render frame
    // read from shared model, interpolate, render

    setup() {
    }

    doUpdate() {
        if(this.actor.active){
            this.context.clearRect(0, 0, 1024, 1024);
            this.context.font = '40px sans-serif';
            this.context.fillStyle = "rgba(255, 255, 255, 0.5)";
            this.context.lineWidth = 3;
            this.context.strokeStyle = "white";
            for (const ship of this.actor.ships.values()) {
                const { x, y, a } = this.smoothPosAndAngle(ship);
                this.context.save();
                this.context.translate(x, y);
                if (ship.score) this.context.fillText(ship.score, 30, 15);
                this.context.rotate(a);
                if (ship.wasHit) this.drawShipDebris(ship.wasHit);
                else this.drawShip(ship.forward, ship.viewId === this.viewId);
                this.context.restore();
            }
            for (const asteroid of this.actor.asteroids) {
                const { x, y, a } = this.smoothPosAndAngle(asteroid);
                this.context.save();
                this.context.translate(x, y);
                this.context.rotate(a);
                if (asteroid.wasHit) this.drawAsteroidDebris(asteroid.size, asteroid.wasHit * 2);
                else this.drawAsteroid(asteroid.size);
                this.context.restore();
            }
            for (const blast of this.actor.blasts) {
                const { x, y } = this.smoothPos(blast);
                this.context.save();
                this.context.translate(x, y);
                this.drawBlast();
                this.context.restore();
            }
            if(this.joystick)this.drawJoystick();
            this.texture.needsUpdate = true;
        }
        this.future(50).doUpdate();
    }

    smoothPos(obj) {
        if (!this.smoothing.has(obj)) {
            this.smoothing.set(obj, { x: obj.x, y: obj.y, a: obj.a });
        }
        const smoothed = this.smoothing.get(obj);
        const dx = obj.x - smoothed.x;
        const dy = obj.y - smoothed.y;
        if (Math.abs(dx) < 50) smoothed.x += dx * 0.3; else smoothed.x = obj.x;
        if (Math.abs(dy) < 50) smoothed.y += dy * 0.3; else smoothed.y = obj.y;
        return smoothed;
    }

    smoothPosAndAngle(obj) {
        const smoothed = this.smoothPos(obj);
        const da = obj.a - smoothed.a;
        if (Math.abs(da) < 1) smoothed.a += da * 0.3; else smoothed.a = obj.a;
        return smoothed;
    }

    drawJoystick() {
        this.drawCircle(this.joystick, 50, false);
        this.drawCircle(this.knob, 25, true);
    }

    drawCircle(pos, radius, filled) {
        this.context.fillStyle = '#ffffff';
        this.context.beginPath();
        this.context.arc(pos[0], pos[1], radius, 0, Math.PI*2, true);
        if(filled)this.context.fill();
        else this.context.stroke();
    }

    drawShip(thrust, highlight) {
        this.context.beginPath();
        this.context.moveTo(+20,   0);
        this.context.lineTo(-20, +10);
        this.context.lineTo(-20, -10);
        this.context.closePath();
        this.context.stroke();
        if (highlight) {
            this.context.fill();
        }
        if (thrust) {
            this.context.beginPath();
            this.context.moveTo(-20, +5);
            this.context.lineTo(-30,  0);
            this.context.lineTo(-20, -5);
            this.context.stroke();
        }
    }

    drawShipDebris(t) {
        this.context.beginPath();
        this.context.moveTo(+20 + t,   0 + t);
        this.context.lineTo(-20 + t, +10 + t);
        this.context.moveTo(-20 - t * 1.4, +10);
        this.context.lineTo(-20 - t * 1.4, -10);
        this.context.moveTo(-20 + t, -10 - t);
        this.context.lineTo(+20 + t,   0 - t);
        this.context.stroke();
    }

    drawAsteroid(size) {
        this.context.beginPath();
        this.context.moveTo(+size,  0);
        this.context.lineTo( 0, +size);
        this.context.lineTo(-size,  0);
        this.context.lineTo( 0, -size);
        this.context.closePath();
        this.context.stroke();
    }

    drawAsteroidDebris(size, t) {
        this.context.beginPath();
        this.context.moveTo(+size + t,  0 + t);
        this.context.lineTo( 0 + t, +size + t);
        this.context.moveTo(-size - t,  0 - t);
        this.context.lineTo( 0 - t, -size - t);
        this.context.moveTo(-size - t,  0 + t);
        this.context.lineTo( 0 - t, +size + t);
        this.context.moveTo(+size + t,  0 - t);
        this.context.lineTo( 0 + t, -size - t);
        this.context.stroke();
    }

    drawBlast() {
        this.context.beginPath();
        this.context.ellipse(0, 0, 2, 2, 0, 0, 2 * Math.PI);
        this.context.closePath();
        this.context.stroke();
    }
}
