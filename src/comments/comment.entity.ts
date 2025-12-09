import { Recipe } from 'src/modules/recipes/recipe.entity';
import { User } from 'src/modules/user/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('comments')
export class Comment {
  // Define comment entity properties and relations here
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  content: string;

  @Column()
  star: number;

  @ManyToOne(() => Recipe, (recipe) => recipe.id, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  recipe: Recipe | null;

  @ManyToOne(() => User, (u) => u.id, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  post_by: User | null;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
