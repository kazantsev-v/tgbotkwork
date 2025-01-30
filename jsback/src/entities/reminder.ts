import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, CreateDateColumn, JoinColumn } from "typeorm";
import { User } from "./user";


@Entity()
export class Reminder {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => User, {nullable: false})
    @JoinColumn({ name: "userId" })
    user!: User;
    

    @Column('text')
    message!: string;

    @Column('text')
    remindAt!: Date;

    @Column('text', {nullable: true, default: 'pending' })
    status!: 'pending' | 'sent';

    @CreateDateColumn()
    createdAt!: Date;
}
