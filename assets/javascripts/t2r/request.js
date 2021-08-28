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
        if (this.length === 0 || this._requestInProgress)
            return;
        this._requestInProgress = true;
        const that = this;
        const opts = this._items.shift();
        if (opts === undefined) {
            return;
        }
        console.debug('Processing AJAX queue (' + this.length + ' remaining).', opts);
        const originalCallback = opts.complete;
        opts.complete = function (xhr, status) {
            if (originalCallback !== undefined) {
                (originalCallback).call(this, xhr, status);
            }
            that._requestInProgress = false;
            that.processItem();
        };
        $.ajax(opts);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2Fzc2V0cy5zcmMvamF2YXNjcmlwdHMvdDJyL3JlcXVlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBS0EsTUFBTSxPQUFPLFlBQVk7SUFjdkI7UUFDRSxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQTtRQUNoQixJQUFJLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFBO0lBQ2pDLENBQUM7SUFLRCxJQUFJLE1BQU07UUFDUixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFBO0lBQzNCLENBQUM7SUFRRCxPQUFPLENBQUMsSUFBeUI7UUFDL0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdEIsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO0lBQ3BCLENBQUM7SUFLRCxXQUFXO1FBQ1QsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsa0JBQWtCO1lBQUUsT0FBTTtRQUN4RCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDO1FBRS9CLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQTtRQUNqQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ2hDLElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtZQUN0QixPQUFNO1NBQ1A7UUFFRCxPQUFPLENBQUMsS0FBSyxDQUFDLHlCQUF5QixHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRTdFLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFFBQWlELENBQUE7UUFDL0UsSUFBSSxDQUFDLFFBQVEsR0FBRyxVQUFVLEdBQWlCLEVBQUUsTUFBOEI7WUFDekUsSUFBSSxnQkFBZ0IsS0FBSyxTQUFTLEVBQUU7Z0JBQ2xDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQTthQUMzQztZQUdELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUE7WUFDL0IsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ3BCLENBQUMsQ0FBQztRQUdGLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDZixDQUFDO0NBRUYifQ==