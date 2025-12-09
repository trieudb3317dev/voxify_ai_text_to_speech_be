import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Recipe } from './recipe.entity';

@Entity('recipe_details')
export class RecipeDetail {
  // Define recipe detail entity properties and relations here
  @PrimaryGeneratedColumn()
  id: number;

  // Owning side: holds recipe_id FK
  @OneToOne(() => Recipe, (recipe) => recipe.id, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'recipe_id', referencedColumnName: 'id' })
  recipe: Recipe;

  @Column()
  recipe_video: string;

  @Column()
  time_preparation: string;

  @Column()
  time_cooking: string;

  @Column()
  recipe_type: string;

  @Column({ type: 'jsonb', nullable: true, default: null })
  ingredients: { main: string; sauce?: string }[] | null;

  @Column({ type: 'jsonb', nullable: true, default: null })
  steps: { step: string; image?: string }[] | null;

  @Column({ type: 'jsonb', nullable: true, default: null })
  nutrition_info: string[] | null;

  @Column({ nullable: true })
  notes: string | null;

  @Column({ default: true })
  nutrition_facts: boolean;

  @Column({ default: false })
  is_active: boolean;
}
