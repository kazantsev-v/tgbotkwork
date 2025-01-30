import { User } from "./user";

export class Task {
    id!: number;
    creator!: User;
    executor?: User;
    moderator?: User;
    title!: string;
    description!: string;
    location!: string;
    payment!: number;
    pack_needed!: boolean;
    tool_needed!: boolean;
    assemble_needed!: boolean;
    pack_description?: string;
    tool_description?: string;
    assemble_description?: string;
    moderator_description?: string;
    status!: string;
    created_at!: Date;
    dates?: string[]
    duration?: number
    start_time?: string;
}

export class TaskPhoto {
    id!: number;
    task!: Task;
    photo_url!: string; // Ссылка на сохраненное фото
}

