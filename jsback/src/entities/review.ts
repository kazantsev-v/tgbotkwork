import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from "typeorm";
import { Task } from "./task";

@Entity()
export class Review {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => Task, { nullable: false })
    @JoinColumn({ name: "taskId" })
    task!: Task;

    @Column('text', { nullable: false })
    title!: string;

    @Column("text", { nullable: false })
    description!: string;

    @Column("float", { nullable: false })
    rating!: number;

    @CreateDateColumn()
    created_at!: Date;
}