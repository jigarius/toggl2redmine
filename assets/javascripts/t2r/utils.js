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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9hc3NldHMuc3JjL2phdmFzY3JpcHRzL3Qyci91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssUUFBUSxNQUFNLGVBQWUsQ0FBQTtBQUt6QyxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsR0FBVztJQUMxQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUM7U0FDaEIsSUFBSSxDQUFDLEdBQUcsQ0FBQztTQUNULElBQUksRUFBRTtTQUNOLE9BQU8sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDO1NBQ3ZCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDO1NBQ3ZCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDO1NBQ3JCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDM0IsQ0FBQztBQUtELE1BQU0sVUFBVSx1QkFBdUI7SUFDckMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUM7SUFDNUUsSUFBSSxDQUFDLE9BQU87UUFBRSxPQUFNO0lBRXBCLE1BQU0sS0FBSyxHQUFXLE9BQU8sQ0FBQyxHQUFHLEVBQVksQ0FBQTtJQUM3QyxJQUFJO1FBQ0YsT0FBTyxRQUFRLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtLQUN4RDtJQUFDLE9BQU0sQ0FBQyxFQUFFO1FBQ1QsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFBO0tBQ25EO0FBQ0gsQ0FBQyJ9