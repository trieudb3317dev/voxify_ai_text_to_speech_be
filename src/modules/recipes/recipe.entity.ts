import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Category } from '../categories/category.entity';
import { Admin } from '../admin/admin.entity';

@Entity('recipes')
export class Recipe {
  // Define recipe entity properties and relations here
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Admin, (admin) => admin.id, {
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

  @Column({ default: false })
  is_active: boolean;
}
