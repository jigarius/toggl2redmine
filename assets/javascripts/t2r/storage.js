export class LocalStorage {
    constructor(prefix) {
        this._prefix = prefix;
        if (typeof window['localStorage'] === 'undefined') {
            throw new Error("Missing browser feature: localStorage");
        }
    }
    get prefix() {
        return this._prefix;
    }
    get(key, fallback = null) {
        const value = window.localStorage.getItem(this.prefix + key);
        if (value !== null) {
            return value;
        }
        return fallback;
    }
    set(key, value) {
        if (value === null) {
            return this.delete(this.prefix + key);
        }
        window.localStorage.setItem(this.prefix + key, value);
        return value;
    }
    delete(key) {
        const value = this.get(this.prefix + key);
        window.localStorage.removeItem(this.prefix + key);
        return value;
    }
}
export class TemporaryStorage {
    constructor() {
        this.data = {};
    }
    get(key, fallback = null) {
        if (typeof this.data[key] !== 'undefined') {
            return this.data[key];
        }
        return fallback;
    }
    set(key, value) {
        this.data[key] = value || null;
        return this.data[key];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2Fzc2V0cy5zcmMvamF2YXNjcmlwdHMvdDJyL3N0b3JhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBS0EsTUFBTSxPQUFPLFlBQVk7SUFHdkIsWUFBWSxNQUFjO1FBQ3hCLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBRXJCLElBQUksT0FBTyxNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssV0FBVyxFQUFFO1lBQ2pELE1BQU0sSUFBSSxLQUFLLENBQUMsdUNBQXVDLENBQUMsQ0FBQztTQUMxRDtJQUNILENBQUM7SUFFRCxJQUFJLE1BQU07UUFDUixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDckIsQ0FBQztJQUVELEdBQUcsQ0FBQyxHQUFXLEVBQUUsV0FBZ0IsSUFBSTtRQUNuQyxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFBO1FBQzVELElBQUksS0FBSyxLQUFLLElBQUksRUFBRTtZQUNsQixPQUFPLEtBQUssQ0FBQTtTQUNiO1FBRUQsT0FBTyxRQUFRLENBQUE7SUFDakIsQ0FBQztJQUVELEdBQUcsQ0FBTyxHQUFXLEVBQUUsS0FBVztRQUNoQyxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUU7WUFDbEIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUE7U0FDdEM7UUFFRCxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNyRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxNQUFNLENBQUMsR0FBVztRQUNoQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUE7UUFDekMsTUFBTSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQTtRQUNqRCxPQUFPLEtBQUssQ0FBQTtJQUNkLENBQUM7Q0FDRjtBQU9ELE1BQU0sT0FBTyxnQkFBZ0I7SUFFM0I7UUFDRSxJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQTtJQUNoQixDQUFDO0lBRUQsR0FBRyxDQUFDLEdBQVcsRUFBRSxXQUFnQixJQUFJO1FBQ25DLElBQUksT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLFdBQVcsRUFBRTtZQUN6QyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7U0FDdEI7UUFFRCxPQUFPLFFBQVEsQ0FBQTtJQUNqQixDQUFDO0lBRUQsR0FBRyxDQUFPLEdBQVcsRUFBRSxLQUFXO1FBQ2hDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxJQUFJLElBQUksQ0FBQTtRQUM5QixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDdkIsQ0FBQztDQUNGIn0=