import * as datetime from "./datetime.js";
export function htmlEntityEncode(str) {
    return $('<div />')
        .text(str)
        .text()
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
export function getDateFromLocationHash() {
    const matches = window.location.hash.match(/^#?([\d]{4}-[\d]{2}-[\d]{2})$/);
    if (!matches)
        return;
    const match = matches.pop();
    try {
        return datetime.DateTime.fromString(match).toHTMLDate();
    }
    catch (e) {
        console.debug('Date not detected in URL fragment');
    }
}
export class EventManager {
    constructor() {
        this.listeners = {};
    }
    on(eventName, callback) {
        if (typeof this.listeners[eventName] === 'undefined') {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(callback);
    }
    trigger(eventName) {
        if (typeof this.listeners[eventName] === 'undefined')
            return;
        for (const listener of this.listeners[eventName]) {
            const result = listener();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9hc3NldHMuc3JjL2phdmFzY3JpcHRzL3Qyci91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssUUFBUSxNQUFNLGVBQWUsQ0FBQTtBQUt6QyxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsR0FBVztJQUMxQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUM7U0FDaEIsSUFBSSxDQUFDLEdBQUcsQ0FBQztTQUNULElBQUksRUFBRTtTQUNOLE9BQU8sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDO1NBQ3ZCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDO1NBQ3ZCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDO1NBQ3JCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDM0IsQ0FBQztBQUtELE1BQU0sVUFBVSx1QkFBdUI7SUFDckMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUM7SUFDNUUsSUFBSSxDQUFDLE9BQU87UUFBRSxPQUFNO0lBRXBCLE1BQU0sS0FBSyxHQUFXLE9BQU8sQ0FBQyxHQUFHLEVBQVksQ0FBQTtJQUM3QyxJQUFJO1FBQ0YsT0FBTyxRQUFRLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtLQUN4RDtJQUFDLE9BQU0sQ0FBQyxFQUFFO1FBQ1QsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFBO0tBQ25EO0FBQ0gsQ0FBQztBQWNELE1BQU0sT0FBTyxZQUFZO0lBR3ZCO1FBQ0UsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUE7SUFDckIsQ0FBQztJQUVNLEVBQUUsQ0FBQyxTQUFpQixFQUFFLFFBQXVCO1FBQ2xELElBQUksT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxLQUFLLFdBQVcsRUFBRTtZQUNwRCxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtTQUMvQjtRQUVELElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFTSxPQUFPLENBQU8sU0FBaUI7UUFDcEMsSUFBSSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEtBQUssV0FBVztZQUFFLE9BQU07UUFFNUQsS0FBSyxNQUFNLFFBQVEsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ2hELE1BQU0sTUFBTSxHQUFHLFFBQVEsRUFBRSxDQUFBO1NBQzFCO0lBQ0gsQ0FBQztDQUNGIn0=