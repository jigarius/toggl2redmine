export class LocalStorage {
    constructor() {
        if (typeof window['localStorage'] === 'undefined') {
            throw new Error("Missing browser feature: localStorage");
        }
    }
    get(key, fallback = null) {
        let value = window.localStorage.getItem(key);
        if (value !== null) {
            return value;
        }
        return fallback;
    }
    set(key, value) {
        window.localStorage.setItem(key, value);
        return value;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9jYWxTdG9yYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vYXNzZXRzLnNyYy9qYXZhc2NyaXB0cy90MnIvc3RvcmFnZS9Mb2NhbFN0b3JhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR0EsTUFBTSxPQUFPLFlBQVk7SUFDdkI7UUFDRSxJQUFJLE9BQU8sTUFBTSxDQUFDLGNBQWMsQ0FBQyxLQUFLLFdBQVcsRUFBRTtZQUNqRCxNQUFNLElBQUksS0FBSyxDQUFDLHVDQUF1QyxDQUFDLENBQUM7U0FDMUQ7SUFDSCxDQUFDO0lBRUQsR0FBRyxDQUFDLEdBQVcsRUFBRSxXQUFnQixJQUFJO1FBQ25DLElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzVDLElBQUksS0FBSyxLQUFLLElBQUksRUFBRTtZQUNsQixPQUFPLEtBQUssQ0FBQTtTQUNiO1FBRUQsT0FBTyxRQUFRLENBQUE7SUFDakIsQ0FBQztJQUVELEdBQUcsQ0FBQyxHQUFXLEVBQUUsS0FBVTtRQUN6QixNQUFNLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdkMsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0NBQ0YifQ==