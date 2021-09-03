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
    get(key, fallback = undefined) {
        const value = window.localStorage.getItem(this.prefix + key);
        if (value !== null) {
            return value;
        }
        return fallback;
    }
    set(key, value) {
        if (value === null || typeof value === 'undefined') {
            return this.delete(key);
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
        const value = this.get(key);
        window.localStorage.removeItem(this.prefix + key);
        return value;
    }
}
export class TemporaryStorage {
    constructor() {
        this.data = {};
    }
    get(key, fallback = undefined) {
        if (typeof this.data[key] !== 'undefined') {
            return this.data[key];
        }
        return fallback;
    }
    set(key, value) {
        if (value === null || typeof value === 'undefined') {
            this.delete(key);
            return value;
        }
        this.data[key] = value;
        return this.data[key];
    }
    delete(key) {
        const value = this.get(key);
        if (key in this.data) {
            delete this.data[key];
        }
        return value;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2Fzc2V0cy5zcmMvamF2YXNjcmlwdHMvdDJyL3N0b3JhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBS0EsTUFBTSxPQUFPLFlBQVk7SUFHdkIsWUFBWSxNQUFjO1FBQ3hCLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBRXJCLElBQUksT0FBTyxNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssV0FBVyxFQUFFO1lBQ2pELE1BQU0sSUFBSSxLQUFLLENBQUMsdUNBQXVDLENBQUMsQ0FBQztTQUMxRDtJQUNILENBQUM7SUFFRCxJQUFJLE1BQU07UUFDUixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDckIsQ0FBQztJQUVELEdBQUcsQ0FBTyxHQUFXLEVBQUUsV0FBNkIsU0FBUztRQUMzRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFBO1FBQzVELElBQUksS0FBSyxLQUFLLElBQUksRUFBRTtZQUNsQixPQUFPLEtBQUssQ0FBQTtTQUNiO1FBRUQsT0FBTyxRQUFRLENBQUE7SUFDakIsQ0FBQztJQUVELEdBQUcsQ0FBTyxHQUFXLEVBQUUsS0FBVztRQUNoQyxJQUFJLEtBQUssS0FBSyxJQUFJLElBQUksT0FBTyxLQUFLLEtBQUssV0FBVyxFQUFFO1lBQ2xELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtTQUN4QjtRQUVELElBQUk7WUFDRixNQUFNLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEdBQUcsRUFBRyxLQUFhLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtZQUN6RSxPQUFPLEtBQUssQ0FBQztTQUNkO1FBQUMsT0FBTSxDQUFDLEVBQUU7WUFDVCxPQUFPLENBQUMsS0FBSyxDQUFDLG1DQUFtQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3pELE1BQU0sMkJBQTJCLENBQUE7U0FDbEM7SUFDSCxDQUFDO0lBRUQsTUFBTSxDQUFDLEdBQVc7UUFDaEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMzQixNQUFNLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFBO1FBQ2pELE9BQU8sS0FBSyxDQUFBO0lBQ2QsQ0FBQztDQUNGO0FBT0QsTUFBTSxPQUFPLGdCQUFnQjtJQUUzQjtRQUNFLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFBO0lBQ2hCLENBQUM7SUFFRCxHQUFHLENBQUMsR0FBVyxFQUFFLFdBQWdCLFNBQVM7UUFDeEMsSUFBSSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssV0FBVyxFQUFFO1lBQ3pDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtTQUN0QjtRQUVELE9BQU8sUUFBUSxDQUFBO0lBQ2pCLENBQUM7SUFFRCxHQUFHLENBQU8sR0FBVyxFQUFFLEtBQVc7UUFDaEMsSUFBSSxLQUFLLEtBQUssSUFBSSxJQUFJLE9BQU8sS0FBSyxLQUFLLFdBQVcsRUFBRTtZQUNsRCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2hCLE9BQU8sS0FBSyxDQUFBO1NBQ2I7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQTtRQUN0QixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDdkIsQ0FBQztJQUVELE1BQU0sQ0FBQyxHQUFXO1FBQ2hCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFM0IsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtZQUNwQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7U0FDdEI7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNkLENBQUM7Q0FDRiJ9