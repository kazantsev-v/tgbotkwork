import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate } from "typeorm";
import bcrypt from 'bcrypt';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ unique: true })
    telegramId!: number;

    @Column({ nullable: true })
    role?: string;

    @Column({ nullable: true })
    name?: string;

    @Column({ nullable: true })
    photo?: string;

    @Column({ nullable: true })
    phone?: string;

    @Column('text', { nullable: true })
    scene?: string;

    @Column('text', { nullable: true })
    step?: string;

    @Column('float', { nullable: true })
    balance?: number;
}

@Entity()
export class Customer {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: "userId" })
    user!: User;

    @Column({nullable:true})
    company?: string;

    @Column('text', { nullable: true })
    additionalContacts?: string;

    @Column({default:false})
    paymentTerms!:boolean;

    @Column('text', { nullable: true })
    documentPath?: string;
}

@Entity()
export class Worker {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: "userId" })
    user!: User;

    @Column("text", { nullable: true })
    metro!: string;

    @Column("json", {nullable: true})
    location?: {
        longitude: number;
        latitude: number;
    };

    @Column("text", { nullable: true })
    address!: string;

    @Column("time", { nullable: true })
    workTimeStart?: string; // Время в формате "HH:mm"

    @Column("time", { nullable: true })
    workTimeEnd?: string; // Время в формате "HH:mm"

    @Column("text", {nullable:true})
    paymentDetails?: string;

    @Column("float", {nullable:false, default:5.0})
    rating!: number;

    @Column("float", { default: 0 })
    weeklyIncome!: number;

    //For driver
    @Column("json", { nullable: true })
    vehicleDetails?: {
      length: number;
      width: number;
      height: number;
      volume: number;
      capacity: number;
      brand: string;
      availableSpots: number;
    };

    //For rigger
    @Column({nullable:true, default:false})
    hasStraps?: boolean;

    //For dismantler
    @Column({nullable:true, default:false})
    hasTools?: boolean;

    //For loader
    @Column({nullable:true, default:false})
    hasFurnitureTools?: boolean;

    //For handyman
    @Column({nullable:true, default:false})
    workInRegion?: boolean;

    @Column('float', {nullable:true, default:0})
    bonus?: number;

    @Column('int', {nullable:true, default:0})
    declinedTasks?: number;

    @Column('int', {nullable:true, default:0})
    lateTasks?: number;

    @Column('int', {nullable:true, default:0})
    completedTasks?: number;
}

@Entity()
export class Moderator {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: "userId" })
    user!: User;

    @Column()
    password!: string;

    @BeforeInsert()
    @BeforeUpdate()
    async hashPassword() {
        if (this.password) {
        const saltRounds = 7;
        this.password = await bcrypt.hash(this.password, saltRounds);
        }
    }

    async comparePassword(plainPassword: string): Promise<boolean> {
        return bcrypt.compare(plainPassword, this.password);
    }
}

module.exports = {
    User,
    Customer,
    Worker,
    Moderator
};