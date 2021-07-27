export class RequestQueue {
    constructor() {
        this._items = [];
        this._requestInProgress = false;
    }
    get length() {
        return this._items.length;
    }
    addItem(opts) {
        this._items.push(opts);
        this.processItem();
    }
    processItem() {
        if (this._items.length === 0 || this._requestInProgress)
            return;
        this._requestInProgress = true;
        const that = this;
        const opts = this._items.shift();
        console.debug('Processing AJAX queue (' + this.length + ' remaining).', opts);
        const originalCallback = opts.complete;
        opts.complete = function (xhr, status) {
            if (originalCallback) {
                originalCallback.call(this, xhr, status);
            }
            that._requestInProgress = false;
            that.processItem();
        };
        $.ajax(opts);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2Fzc2V0cy5zcmMvamF2YXNjcmlwdHMvdDJyL3JlcXVlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBS0EsTUFBTSxPQUFPLFlBQVk7SUFjdkI7UUFDRSxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQTtRQUNoQixJQUFJLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFBO0lBQ2pDLENBQUM7SUFLRCxJQUFJLE1BQU07UUFDUixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFBO0lBQzNCLENBQUM7SUFRRCxPQUFPLENBQUMsSUFBUztRQUNmLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3RCLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtJQUNwQixDQUFDO0lBS0QsV0FBVztRQUNULElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxrQkFBa0I7WUFBRSxPQUFNO1FBQy9ELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUM7UUFFL0IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFBO1FBQ2pCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDaEMsT0FBTyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLGNBQWMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUU5RSxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUE7UUFDdEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxVQUFVLEdBQVEsRUFBRSxNQUFjO1lBRWhELElBQUksZ0JBQWdCLEVBQUU7Z0JBQ3BCLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2FBQzFDO1lBR0QsSUFBSSxDQUFDLGtCQUFrQixHQUFHLEtBQUssQ0FBQztZQUNoQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDckIsQ0FBQyxDQUFDO1FBR0YsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNmLENBQUM7Q0FFRiJ9