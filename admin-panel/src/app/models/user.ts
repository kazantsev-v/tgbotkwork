export class User {
    id!: number;
    telegramId!: number;
    role?: string;
    name?: string;
    photo?: string;
    phone?: string;
    scene?: string;
    step?: string;
    balance?: number;
}

export interface Role {
    name?: string;
    internal?: string;
}

export class Customer {
    id!: number;
    user!: User;
    company?: string;
    additionalContacts?: string;
    paymentTerms!:boolean;
    documentPath?: string;
}

export class Worker {
    id!: number;
    user!: User;
    metro!: string;
    location?: {
        longitude: number;
        latitude: number;
    };
    address!: string;
    workTimeStart?: string; // Время в формате "HH:mm"
    workTimeEnd?: string; // Время в формате "HH:mm"
    paymentDetails?: string;
    rating!: number;
    weeklyIncome!: number;
    vehicleDetails?: {
      length: number;
      width: number;
      height: number;
      volume: number;
      capacity: number;
      brand: string;
      availableSpots: number;
    };
    hasStraps?: boolean;
    hasTools?: boolean;
    hasFurnitureTools?: boolean;
    workInRegion?: boolean;
    bonus?: number;
    declinedTasks?: number;
    lateTasks?: number;
    completedTasks?: number;
}

export class Moderator {
    id!: number;
    user!: User;
}