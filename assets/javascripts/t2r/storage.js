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
        if (value === null || typeof value === 'undefined') {
            return this.delete(this.prefix + key);
        }
        try {
            window.localStorage.setItem(this.prefix + key, value.toString());
            return value;
        }
        catch (e) {
            console.error('Value not representable as string', value);
            throw 'Value could not be stored';
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2Fzc2V0cy5zcmMvamF2YXNjcmlwdHMvdDJyL3N0b3JhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBS0EsTUFBTSxPQUFPLFlBQVk7SUFHdkIsWUFBWSxNQUFjO1FBQ3hCLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBRXJCLElBQUksT0FBTyxNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssV0FBVyxFQUFFO1lBQ2pELE1BQU0sSUFBSSxLQUFLLENBQUMsdUNBQXVDLENBQUMsQ0FBQztTQUMxRDtJQUNILENBQUM7SUFFRCxJQUFJLE1BQU07UUFDUixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDckIsQ0FBQztJQUVELEdBQUcsQ0FBTyxHQUFXLEVBQUUsV0FBd0IsSUFBSTtRQUNqRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFBO1FBQzVELElBQUksS0FBSyxLQUFLLElBQUksRUFBRTtZQUNsQixPQUFPLEtBQUssQ0FBQTtTQUNiO1FBRUQsT0FBTyxRQUFRLENBQUE7SUFDakIsQ0FBQztJQUVELEdBQUcsQ0FBTyxHQUFXLEVBQUUsS0FBVztRQUNoQyxJQUFJLEtBQUssS0FBSyxJQUFJLElBQUksT0FBTyxLQUFLLEtBQUssV0FBVyxFQUFFO1lBQ2xELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFBO1NBQ3RDO1FBRUQsSUFBSTtZQUNGLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsR0FBRyxFQUFHLEtBQWEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1lBQ3pFLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFBQyxPQUFNLENBQUMsRUFBRTtZQUNULE9BQU8sQ0FBQyxLQUFLLENBQUMsbUNBQW1DLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDekQsTUFBTSwyQkFBMkIsQ0FBQTtTQUNsQztJQUNILENBQUM7SUFFRCxNQUFNLENBQUMsR0FBVztRQUNoQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUE7UUFDekMsTUFBTSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQTtRQUNqRCxPQUFPLEtBQUssQ0FBQTtJQUNkLENBQUM7Q0FDRjtBQU9ELE1BQU0sT0FBTyxnQkFBZ0I7SUFFM0I7UUFDRSxJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQTtJQUNoQixDQUFDO0lBRUQsR0FBRyxDQUFDLEdBQVcsRUFBRSxXQUFnQixJQUFJO1FBQ25DLElBQUksT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLFdBQVcsRUFBRTtZQUN6QyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7U0FDdEI7UUFFRCxPQUFPLFFBQVEsQ0FBQTtJQUNqQixDQUFDO0lBRUQsR0FBRyxDQUFPLEdBQVcsRUFBRSxLQUFXO1FBQ2hDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxJQUFJLElBQUksQ0FBQTtRQUM5QixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDdkIsQ0FBQztDQUNGIn0=