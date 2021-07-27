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
  private _items: any[]

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
  addItem(opts: any) {
    this._items.push(opts)
    this.processItem()
  }

  /**
   * Processes the next request.
   */
  processItem() {
    if (this._items.length === 0 || this._requestInProgress) return
    this._requestInProgress = true;

    const that = this
    const opts = this._items.shift()
    console.debug('Processing AJAX queue (' + this.length + ' remaining).', opts);

    const originalCallback = opts.complete
    opts.complete = function (xhr: any, status: string) {
      // Call the original callback.
      if (originalCallback) {
        originalCallback.call(this, xhr, status);
      }

      // Process the next item in the queue, if any.
      that._requestInProgress = false;
      that.processItem();
    };

    // Process current item.
    $.ajax(opts);
  }

}
