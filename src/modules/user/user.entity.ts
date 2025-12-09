import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Wishlist } from 'src/whistlist/whistlist.entity';

export enum GenderType {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

@Entity('users')
export class User {
  // Define user entity properties here
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(() => Wishlist, (wishlist) => wishlist.users, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  wishlists: Wishlist[] | null;

  // Add other properties like name, email, etc.
  @Column({ unique: true })
  username: string;

  @Column({ nullable: true })
  full_name: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ type: 'enum', enum: GenderType, nullable: true })
  gender: GenderType;

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
