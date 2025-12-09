import {
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Recipe } from '../modules/recipes/recipe.entity';
import { User } from '../modules/user/user.entity';

@Entity('wishlists')
export class Wishlist {
  // Define wishlist entity properties and relations here
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Recipe, (recipe) => recipe.id, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  recipes: Recipe | null;

  @ManyToOne(() => User, (user) => user.id, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  users: User | null;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
