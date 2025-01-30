import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from "typeorm";
import { User } from "./user";

@Entity()
export class Task {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => User, { nullable: false })
    @JoinColumn({ name: "creatorId" })
    creator!: User;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: "executorId"})
    executor?: User | null;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: "moderatorId" })
    moderator?: User | null;

    @Column('text', { nullable: false })
    title!: string;

    @Column("text", { nullable: false })
    description!: string;

    @Column('text', { nullable: false })
    location!: string;

    @Column("float", { nullable: false })
    payment!: number;

    @Column("boolean", { default: false })
    pack_needed!: boolean;

    @Column("boolean", { default: false })
    tool_needed!: boolean;

    @Column("boolean", { default: false })
    assemble_needed!: boolean;

    @Column("text", { nullable: true })
    pack_description?: string;

    @Column("text", { nullable: true })
    tool_description?: string;

    @Column("text", { nullable: true })
    assemble_description?: string;

    @Column("text", { nullable: true })
    moderator_description?: string;

    @Column("text", { default: "pending" })
    status!: string;

    @CreateDateColumn()
    created_at!: Date;

    @Column({ type: "json", nullable: true })
    dates?: string[]

    @Column({ type: "float", nullable: true })
    duration?: number

    @Column({ type: "int", nullable: true, default: 0 })
    priority?: number

    @Column({ type: "time", nullable: true })
    start_time?: string;
}

@Entity()
export class TaskPhoto {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => Task)
    task!: Task;

    @Column("text", { nullable: false })
    photo_url!: string; // Ссылка на сохраненное фото
}

