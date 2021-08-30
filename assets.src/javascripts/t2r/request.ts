/**
 * Request Queue.
 *
 * Sequentially executes AJAX requests.
 */
export class RequestQueue {

  /**
   * Requests to be processed.
   * @private
   */
  private _items: JQuery.AjaxSettings[]

  /**
   * Whether a request is in progress.
   * @private
   */
  private _requestInProgress: boolean

  constructor() {
    this._items = []
    this._requestInProgress = false
  }

  /**
   * Number of requests currently in the queue.
   */
  get length(): number {
    return this._items.length
  }

  /**
   * Adds an AJAX request to the execution queue.
   *
   * Requests be executed one after the other until all items in the queue have
   * been processed.
   */
  addItem(opts: JQuery.AjaxSettings): void {
    this._items.push(opts)
    this.processItem()
  }

  /**
   * Processes the next request.
   */
  processItem(): void {
    if (this.length === 0 || this._requestInProgress) return
    this._requestInProgress = true;

    const that = this
    const opts = this._items.shift()
    if (opts === undefined) {
      return
    }

    console.debug('Processing AJAX queue (' + this.length + ' remaining).', opts)

    const originalCallback = opts.complete as JQuery.Ajax.CompleteCallback<Element>
    opts.complete = function (xhr: JQuery.jqXHR, status: JQuery.Ajax.TextStatus) {
      if (typeof originalCallback !== 'undefined') {
        (originalCallback).call(this, xhr, status)
      }

      // Process the next item in the queue, if any.
      that._requestInProgress = false
      that.processItem()
    };

    // Process current item.
    $.ajax(opts);
  }

}
