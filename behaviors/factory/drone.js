class DroneAssemblyActor {
    setup() {
        if (this._cardData.createDrones) { this.droneCount = 0; this.future(5000).newDrone(); } // Create More Drones Behind

        this.path = [
            ["forwardBy", 3.425], ["arcBy", Math.PI / 2, Math.PI / 256], ["forwardBy", 43.450], // Tasks
            ["updateCard", "3yFBJf8lDIU6R5bsWCQlKzjHBxRgpW1BiyYT8x-MuNJ0EQ0NCQpDVlYfEBUcClcMClcaCxYIDBwNVxAWVgxWOiExMx89NhQMMB8QPCAWFjcgDikvADYbEkkfS1YaFhRXHAEYFAkVHFcNCxwPFgtXFAAUEBoLFg8cCwocVk4yAw0hAx8KERs1PThUFUg0ESlALTg7LTQPFB42ABAcFi81TD4jLjFJVDxWHRgNGFYPATUcCCYbEkAoH0FLDTM0PjE1GjE2KE4VFDNBNxEcTkEvMwweACE1HCY4"],
            ["forwardBy", 1.600], ["arcBy", -Math.PI / 2, Math.PI / 256], ["forwardBy", 23.900], ["arcBy", -(.255 * Math.PI), Math.PI / 800], ["forwardBy", 8.000],
            ["updateCard", "3y1A3wM6kc2r6u5X8bV8eIrNivz_tl5R8mvab6XNFyMcEQ0NCQpDVlYfEBUcClcMClcaCxYIDBwNVxAWVgxWOiExMx89NhQMMB8QPCAWFjcgDikvADYbEkkfS1YaFhRXHAEYFAkVHFcNCxwPFgtXFAAUEBoLFg8cCwocVkkcLD0fVAkeOh42TyAVNh0NKQA6FgANPxs_MCxLSkkmQBFAPEoWLDUJPSxWHRgNGFYPLxcUHjYIGAM7TDgOEDogE08xTSoyHR0KEhQqHTEcATVLETA1PyE8Cx0o"],
            ["forwardBy", 5.925], ["arcBy", (.255 * Math.PI), Math.PI / 800], ["forwardBy", 20.475], ["arcBy", -Math.PI / 2, Math.PI / 400], ["forwardBy", 24.800], ["arcBy", Math.PI, Math.PI / 356], ["forwardBy", 12.500],
            ["updateCard", "3fjxwcHfliOtrDpzSZL7og3Lliqr9FCszd4iO0AaOgfEDhISFhVcSUkADwoDFUgTFUgFFAkXEwMSSA8JSRNJJT4uLAAiKQsTLwAPIz8JCSg_ETYwHykEDVYAVEkFCQtIAx4HCxYKA0gSFAMQCRRICx8LDwUUCRADFBUDSS42ISsFLwIfKyoQIAsXUwI5Eg5UAxwiPgA5URI_MQUkKl9RP1YoCDEtAhVJAgcSB0kBPwgjHDMzXj8IDhIoMSJSJR5XFwteLSAuUykrDgsyARQlDQkANA1QIiMn"]];
        this.speed = 10.0; // (Meters / Second) Speed

        this.updateTask();
        this.step();
    }

    step() { // Decides Which Helper Function To Call
        if (this.currentTask[0] === "forwardBy") {
            if (Microverse.v3_equals(this.translation, this.taskEndPosition, 0.0001)) {
                this.updateTask(); // Update Current Task, Update Task End Requirements
            }
        }

        if (this.currentTask[0] === "rotateBy" || this.currentTask[0] === "arcBy") {
            if (Microverse.q_equals(this.rotation, this.taskEndRotation, 0.000001)) {
                this.updateTask(); // Update Current Task, Update Task End Requirements
            }
        }

        if (this.currentTask[0] === "updateCard") { this.updateCard(); this.updateTask(); } // Update Card
        else if (this.currentTask[0] === "forwardBy" && this.currentTask[1] < 0) { this.forwardBy(-0.025); } // 0.025 Standard Move Amount
        else if (this.currentTask[0] === "forwardBy" && this.currentTask[1] >= 0) { this.forwardBy(0.025); }

        else if (this.currentTask[0] === "rotateBy" && this.currentTask[1] < 0) { this.rotateBy(-this.currentTask[2]); } // Math.PI / 32 Standard Rotation Amount
        else if (this.currentTask[0] === "rotateBy" && this.currentTask[1] >= 0) { this.rotateBy(this.currentTask[2]); }

        else if (this.currentTask[0] === "arcBy" && this.currentTask[1] < 0) { this.arcBy(0.025, [0, -this.currentTask[2], 0]); } // See Above Standard Movement
        else if (this.currentTask[0] === "arcBy" && this.currentTask[1] >= 0) { this.arcBy(0.025, [0, this.currentTask[2], 0]); }

        this.future(100 / this.speed).step(); // Sets Speed (Miliseconds) of Drone
    }

    updateTask() { // Update Current Task, Update Task End Requirements
        // If Index Undefined, Set 0; Else If, Restart; Otherwise, Increment
        if (this.currentTaskIndex === undefined) { this.currentTaskIndex = 0; }
        else if (this.path.length === this.currentTaskIndex + 1) {
            this.translation = [53.48163857202977, 7.270324118143472, 30.903151540772612];
            this.rotateTo([0, -0.7071067811865483, 0, 0.7071067811865491]);
            this.currentTaskIndex = 0; }
        else { this.currentTaskIndex++ }

        this.currentTask = this.path[this.currentTaskIndex]; // ["forwardBy", 10 /*meters*/]

        if (this.currentTask[0] === "forwardBy") { // Find End Position (Rotation Unchanged)
            let forward = Microverse.v3_rotate([-this.currentTask[1], 0, 0], this.rotation);
            this.taskEndPosition = [
                this.translation[0] + forward[0],
                this.translation[1] + forward[1],
                this.translation[2] + forward[2]];
        }
        else if (this.currentTask[0] === "rotateBy" || this.currentTask[0] === "arcBy") { // Find End Rotation (Change Unknown)
            let rotating = Microverse.q_euler(...[0, this.currentTask[1], 0]);
            this.taskEndRotation = Microverse.q_multiply(this.rotation, rotating);
        }
    }

    // Helper Functions

    newDrone() {
        if (this.droneCount >= 13) { return; }

        this.droneCount++;
        let name = "drone " + this.droneCount;
        this.future(5000).newDrone();

        this.createCard({
            name,
            layers: ["pointer"],
            translation: [53.48163857202977, 7.270324118143472, 30.903151540772612], // translation: [50.709776263247214, 7.270324118143472, 25.427818377798733],
            rotation: [0, -Math.PI / 2, 0],
            dataScale: [1.6, 1.6, 1.6],
            dataLocation: "3GoJXGTqvuBdqaRBcIHp0qF_hCs14s_uw54cQONX7Nm0LzMzNzR9aGghLisiNGkyNGkkNSg2MiIzaS4oaDJoBB8PDSEDCCoyDiEuAh4oKAkeMBcRPgglLHchdWgkKCppIj8mKjcrImkzNSIxKDVpKj4qLiQ1KDEiNTQiaA90MhZ-JAt-PRNyPjMKIhI2KQYWLQMMDhATKA8QIQkXKQsQHxFwCSoQNw5oIyYzJmgDfgQhFXd_cDN-EwMOEiIuKxQKMHIPEj8yJi8Vdj8SFDErLiMJMCgODS4g",
            behaviorModules: ["DroneAssembly"],
            modelType: "glb",
            shadow: true,
            singleSided: true,
            type: "3d",
            createDrones: false,
        });
    }

    updateCard() {
        this.setCardData({dataLocation: this.currentTask[1]});
        // this.say("updateShape");  redundant
    }

    forwardBy(moveAmnt) { // Forward Movement
        let forward = Microverse.v3_rotate([-moveAmnt, 0, 0], this.rotation);
        this.translateTo([
            this.translation[0] + forward[0],
            this.translation[1] + forward[1],
            this.translation[2] + forward[2]]);
    }

    arcBy(moveAmnt, rotAmnt) { // Both Forward + Rotational Movement
        this.forwardBy(moveAmnt)
        this.rotateBy(rotAmnt);
    }
}

export default {
    modules: [
        {
            name: "DroneAssembly",
            actorBehaviors: [DroneAssemblyActor]
        },
    ]
}

/* globals Microverse */
