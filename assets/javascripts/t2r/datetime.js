export class DateTime {
    constructor(date = undefined) {
        this.date = date || new Date();
    }
    toHTMLDateString() {
        const yyyy = this.date.getFullYear();
        const mm = (this.date.getMonth() + 1).toString().padStart(2, '0');
        const dd = this.date.getDate().toString().padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }
    toISOString(zeroTime = false) {
        if (!zeroTime) {
            return this.date.toISOString();
        }
        return this.date.toISOString().split('T')[0] + 'T00:00:00.000Z';
    }
    static fromString(date) {
        const dateParts = date.split(/[^\d]/).map((part) => {
            return parseInt(part);
        });
        if (dateParts.length < 3) {
            throw `Invalid date: ${date}`;
        }
        for (let i = 3; i <= 6; i++) {
            if (typeof dateParts[i] === 'undefined') {
                dateParts[i] = 0;
            }
        }
        for (let i = 1; i <= 6; i++) {
            if (isNaN(dateParts[i]))
                throw `Invalid date: ${date}`;
        }
        if (dateParts[1] < 1 || dateParts[1] > 12) {
            throw `Invalid date: ${date}`;
        }
        try {
            return new DateTime(new Date(dateParts[0], dateParts[1] - 1, dateParts[2], dateParts[3], dateParts[4], dateParts[5], dateParts[6]));
        }
        catch (e) {
            console.error('Invalid date', date);
            throw `Invalid date: ${date}`;
        }
    }
}
export var DurationRoundingMethod;
(function (DurationRoundingMethod) {
    DurationRoundingMethod["Up"] = "U";
    DurationRoundingMethod["Down"] = "D";
    DurationRoundingMethod["Regular"] = "R";
})(DurationRoundingMethod || (DurationRoundingMethod = {}));
export class Duration {
    constructor(duration = 0) {
        this._seconds = 0;
        duration = duration || 0;
        if ('number' === typeof duration) {
            this.seconds = duration;
            return;
        }
        if (duration.match(/^\d+$/)) {
            this.seconds = parseInt(duration);
            return;
        }
        try {
            this.setHHMM(duration);
        }
        catch (e) {
            throw 'Error: "' + duration + '" is not a number or an hh:mm string.';
        }
    }
    get hours() {
        return Math.floor(this._seconds / 3600);
    }
    get minutes() {
        return Math.floor(this._seconds / 60);
    }
    get seconds() {
        return this._seconds;
    }
    set seconds(value) {
        if (value < 0) {
            throw `Value cannot be negative: ${value}`;
        }
        this._seconds = value;
    }
    setHHMM(hhmm) {
        let parts = [];
        let pattern;
        let hh;
        let mm;
        const error = `Invalid hh:mm format: ${hhmm}`;
        pattern = /^(\d{0,2})$/;
        if (hhmm.match(pattern)) {
            const matches = hhmm.match(pattern);
            hh = parseInt(matches.pop());
            this.seconds = hh * 60 * 60;
            return;
        }
        pattern = /^(\d{0,2}):(\d{0,2})$/;
        if (hhmm.match(pattern)) {
            const matches = hhmm.match(pattern);
            parts = matches.slice(-2);
            mm = parseInt(parts.pop() || '0');
            hh = parseInt(parts.pop() || '0');
            if (mm > 59)
                throw error;
            this.seconds = hh * 60 * 60 + mm * 60;
            return;
        }
        pattern = /^(\d{0,2})\.(\d{1,2})$/;
        if (hhmm.match(pattern)) {
            const matches = hhmm.match(pattern);
            parts = matches.slice(-2);
            hh = parseInt(parts[0] || '0');
            hh = Math.round(hh);
            mm = parseInt(parts[1] || '0');
            mm = (60 * mm) / Math.pow(10, parts[1].length);
            this.seconds = hh * 60 * 60 + mm * 60;
            return;
        }
        throw error;
    }
    asHHMM() {
        const hh = this.hours.toString().padStart(2, '0');
        const mm = (this.minutes % 60).toString().padStart(2, '0');
        return `${hh}:${mm}`;
    }
    asDecimal() {
        const hours = this.minutes / 60;
        const output = hours.toFixed(3);
        return output.substr(0, output.length - 1);
    }
    add(other) {
        this.seconds = this.seconds + other.seconds;
    }
    sub(other) {
        this.seconds = Math.max(this.seconds - other.seconds, 0);
    }
    roundTo(minutes, method) {
        if (0 === minutes)
            return;
        const seconds = minutes * 60;
        const correction = this.seconds % seconds;
        if (correction === 0)
            return;
        switch (method) {
            case DurationRoundingMethod.Regular:
                if (correction >= seconds / 2) {
                    this.roundTo(minutes, DurationRoundingMethod.Up);
                }
                else {
                    this.roundTo(minutes, DurationRoundingMethod.Down);
                }
                break;
            case DurationRoundingMethod.Up:
                this.add(new Duration(seconds - correction));
                break;
            case DurationRoundingMethod.Down:
                this.sub(new Duration(correction));
                break;
            default:
                throw 'Invalid rounding method.';
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0ZXRpbWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9hc3NldHMuc3JjL2phdmFzY3JpcHRzL3Qyci9kYXRldGltZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFHQSxNQUFNLE9BQU8sUUFBUTtJQUluQixZQUFZLE9BQXlCLFNBQVM7UUFDNUMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUUsQ0FBQTtJQUNoQyxDQUFDO0lBV0QsZ0JBQWdCO1FBQ2QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNyQyxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNqRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFFMUQsT0FBTyxHQUFHLElBQUksSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUE7SUFDOUIsQ0FBQztJQVVELFdBQVcsQ0FBQyxRQUFRLEdBQUcsS0FBSztRQUMxQixJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2IsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1NBQy9CO1FBRUQsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQTtJQUNqRSxDQUFDO0lBV0QsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFZO1FBRTVCLE1BQU0sU0FBUyxHQUFhLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFD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