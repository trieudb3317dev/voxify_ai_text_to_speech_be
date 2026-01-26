import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { Admin } from '../admin/admin.entity';

@Entity('otps')
export class Otp {
  // Define OTP entity properties here
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  user: User | null;

  @ManyToOne(() => Admin, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  admin: Admin | null;

  @Column()
  code: string;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @Column({ default: false, nullable: true })
  is_used: boolean;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
