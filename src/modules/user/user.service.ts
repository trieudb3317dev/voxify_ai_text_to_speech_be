import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserResponseDto } from './user.dto';

@Injectable()
export class UserService {
  // Implement user service methods here
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async profile(userId: number): Promise<UserResponseDto> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId, is_active: false },
      });
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      return {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        gender: user.gender,
        day_of_birth: user.day_of_birth,
        email: user.email,
        phone_number: user.phone_number,
        created_at: user.created_at,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch user profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateProfile(
    userId: number,
    updatedData: Partial<User>,
  ): Promise<User> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      await this.userRepository.update(userId, updatedData);
      return this.userRepository.findOne({ where: { id: userId } });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to update user profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
