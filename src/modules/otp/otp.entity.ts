import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../user/user.entity";

@Entity('otps')
export class Otp {
    // Define OTP entity properties here
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, { nullable: false })   
    user: User;

    @Column()
    code: string;

    @Column({ type: 'timestamptz' })
    expires_at: Date;

    @Column({ default: false, nullable: true })
    is_used: boolean;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;
}