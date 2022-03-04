class MenuItemActor {
    setup() {
        this.addEventListener("click", "MenuItemActor.click");
    }

    click(evt) {
        this.publish(this.id, "fire", {id: this.id, name: this._cardData.name});
    }
}
