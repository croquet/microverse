class MenuTesterActor {
    setup() {
        if (this.menu) {
            this.menu.destroy();
        }
        this.menu = WorldCore.CardActor.create({
            name: 'menu tester',
            translation: [0, 0, -5],
            actorCode: ["MenuActor"],
        });
        this.menu.call("MenuActor", "setItems", [
            {label: "abc"},
            {label: "def"},
            {label: "hello"},
        ]);
    }
}
/*global WorldCore */
