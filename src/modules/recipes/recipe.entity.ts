import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Category } from '../categories/category.entity';
import { Admin } from '../admin/admin.entity';
import { RecipeDetail } from './recipe-detail.entity';
import { User } from '../user/user.entity';
import { Wishlist } from '../../whistlist/whistlist.entity';

@Entity('recipes')
export class Recipe {
  // Define recipe entity properties and relations here
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Admin, (admin) => admin.id, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'admin_id', referencedColumnName: 'id' })
  admin: Admin | null;

  @Column()
  title: string;

  @Column()
  slug: string;

  @Column()
  image_url: string;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Category, (category) => category.recipes, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  category: Category;

  @OneToMany(() => Wishlist, (wishlist) => wishlist.recipes, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  wishlists: Wishlist[] | null;

  @Column({ default: false })
  is_active: boolean;
}
