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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2Fzc2V0cy5zcmMvamF2YXNjcmlwdHMvdDJyL3N0b3JhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBS0EsTUFBTSxPQUFPLFlBQVk7SUFHdkIsWUFBWSxNQUFjO1FBQ3hCLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBRXJCLElBQUksT0FBTyxNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssV0FBVyxFQUFFO1lBQ2pELE1BQU0sSUFBSSxLQUFLLENBQUMsdUNBQXVDLENBQUMsQ0FBQztTQUMxRDtJQUNILENBQUM7SUFFRCxJQUFJLE1BQU07UUFDUixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDckIsQ0FBQztJQUVELEdBQUcsQ0FBTyxHQUFXLEVBQUUsV0FBd0IsSUFBSTtRQUNqRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFBO1FBQzVELElBQUksS0FBSyxLQUFLLElBQUksRUFBRTtZQUNsQixPQUFPLEtBQUssQ0FBQTtTQUNiO1FBRUQsT0FBTyxRQUFRLENBQUE7SUFDakIsQ0FBQztJQUVELEdBQUcsQ0FBTyxHQUFXLEVBQUUsS0FBVztRQUNoQyxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUU7WUFDbEIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUE7U0FDdEM7UUFFRCxJQUFJO1lBQ0YsTUFBTSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxHQUFHLEVBQUcsS0FBYSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7WUFDekUsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUFDLE9BQU0sQ0FBQyxFQUFFO1lBQ1QsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN6RCxNQUFNLDJCQUEyQixDQUFBO1NBQ2xDO0lBQ0gsQ0FBQztJQUVELE1BQU0sQ0FBQyxHQUFXO1FBQ2hCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQTtRQUN6QyxNQUFNLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFBO1FBQ2pELE9BQU8sS0FBSyxDQUFBO0lBQ2QsQ0FBQztDQUNGO0FBT0QsTUFBTSxPQUFPLGdCQUFnQjtJQUUzQjtRQUNFLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFBO0lBQ2hCLENBQUM7SUFFRCxHQUFHLENBQUMsR0FBVyxFQUFFLFdBQWdCLElBQUk7UUFDbkMsSUFBSSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssV0FBVyxFQUFFO1lBQ3pDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtTQUN0QjtRQUVELE9BQU8sUUFBUSxDQUFBO0lBQ2pCLENBQUM7SUFFRCxHQUFHLENBQU8sR0FBVyxFQUFFLEtBQVc7UUFDaEMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLElBQUksSUFBSSxDQUFBO1FBQzlCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUN2QixDQUFDO0NBQ0YifQ==