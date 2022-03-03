class MenuItemActor {
    click(evt) {
        this.publish(this.id, "fire", {id: this.id, name: this._cardData.name});
    }
    
}
