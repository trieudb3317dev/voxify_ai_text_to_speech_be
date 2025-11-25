import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Recipe } from '../recipes/recipe.entity';

@Entity('categories')
export class Category {
  // Define category entity properties and relations here
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column()
  image_url: string;

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => Recipe, (recipe) => recipe.category, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  recipes: Recipe[];

  @Column({ default: false })
  is_active: boolean;
}
