import { User } from "./user";

export class Reminder {
    id!: number;
    user!: User;
    message!: string;
    remindAt!: Date;
    status!: 'pending' | 'sent';
    createdAt!: Date;
}
