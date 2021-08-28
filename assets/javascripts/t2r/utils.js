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
export function dateStringToObject(date) {
    const dateParts = date.split(/[^\d]/).map((part) => {
        return parseInt(part);
    });
    if (dateParts.length < 3) {
        console.error('Invalid date', date);
        return;
    }
    for (let i = 3; i <= 6; i++) {
        if (typeof dateParts[i] === 'undefined') {
            dateParts[i] = 0;
        }
    }
    dateParts[1] -= 1;
    try {
        return new Date(dateParts[0], dateParts[1], dateParts[2], dateParts[3], dateParts[4], dateParts[5], dateParts[6]);
    }
    catch (e) {
        console.error('Invalid date', date);
        return;
    }
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
export function dateFormatYYYYMMDD(date) {
    const yyyy = date.getFullYear();
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9hc3NldHMuc3JjL2phdmFzY3JpcHRzL3Qyci91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssUUFBUSxNQUFNLGVBQWUsQ0FBQTtBQU16QyxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsR0FBVztJQUMxQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUM7U0FDaEIsSUFBSSxDQUFDLEdBQUcsQ0FBQztTQUNULElBQUksRUFBRTtTQUNOLE9BQU8sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDO1NBQ3ZCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDO1NBQ3ZCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDO1NBQ3JCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDM0IsQ0FBQztBQWFELE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxJQUFZO0lBRzdDLE1BQU0sU0FBUyxHQUFhLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDM0QsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDdkIsQ0FBQyxDQUFDLENBQUM7SUFHSCxJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3hCLE9BQU8sQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ25DLE9BQU07S0FDUDtJQUdELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDM0IsSUFBSSxPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxXQUFXLEVBQUU7WUFDdkMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNsQjtLQUNGO0lBR0QsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUdsQixJQUFJO1FBQ0YsT0FBTyxJQUFJLElBQUksQ0FDYixTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQ1osU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUNaLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFDWixTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQ1osU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUNaLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFDWixTQUFTLENBQUMsQ0FBQyxDQUFDLENBQ2IsQ0FBQztLQUNIO0lBQUMsT0FBTSxDQUFDLEVBQUU7UUFDVCxPQUFPLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNuQyxPQUFNO0tBQ1A7QUFDSCxDQUFDO0FBS0QsTUFBTSxVQUFVLHVCQUF1QjtJQUNyQyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQztJQUM1RSxJQUFJLENBQUMsT0FBTztRQUFFLE9BQU07SUFFcEIsTUFBTSxLQUFLLEdBQVcsT0FBTyxDQUFDLEdBQUcsRUFBWSxDQUFBO0lBQzdDLElBQUk7UUFDRixPQUFPLFFBQVEsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFBO0tBQ3hEO0lBQUMsT0FBTSxDQUFDLEVBQUU7UUFDVCxPQUFPLENBQUMsS0FBSyxDQUFDLG1DQUFtQyxDQUFDLENBQUE7S0FDbkQ7QUFDSCxDQUFDO0FBYUQsTUFBTSxVQUFVLGtCQUFrQixDQUFDLElBQVU7SUFDM0MsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ2hDLE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDNUQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFFckQsT0FBTyxHQUFHLElBQUksSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUM7QUFDL0IsQ0FBQyJ9