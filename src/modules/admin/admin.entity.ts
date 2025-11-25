import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

enum GenderType {
  Male = 'male',
  Female = 'female',
  Other = 'other',
}

enum AdminRole {
  SUPPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  EDITOR = 'editor',
}

@Entity('user-admins')
export class Admin {
  // Define user entity properties here
  @PrimaryGeneratedColumn()
  id: number;

  // Add other properties like name, email, etc.
  @Column({ unique: true })
  username: string;

  @Column({ nullable: true })
  full_name: string;

  @Column({ type: 'enum', enum: GenderType, nullable: true })
  gender: GenderType;

  @Column({ type: 'enum', enum: AdminRole, default: AdminRole.ADMIN })
  role: AdminRole;

  @Column({ nullable: true })
  day_of_birth: Date;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: false })
  password: string;

  @Column({ nullable: true })
  phone_number: string;

  @Column({ default: false })
  is_verified: boolean;

  @Column({ default: false })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
