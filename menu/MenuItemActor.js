class MenuItemActor {
    click(evt) {
        this.publish(this.id, "fire", this._cardData.name);
    }
    
}
