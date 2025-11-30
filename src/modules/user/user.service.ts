import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GenderType, User } from './user.entity';
import { UpdateUserDto, UserResponseDto } from './user.dto';

@Injectable()
export class UserService {
  // Implement user service methods here
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async profile(req: any): Promise<UserResponseDto> {
    try {
      if (!req || !req.id) {
        throw new HttpException('Invalid request', HttpStatus.BAD_REQUEST);
      }
      const user = await this.userRepository.findOne({
        where: { id: req.id, is_active: false },
      });
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      return {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        avatar: user.avatar,
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
        `Internal server error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateProfile(
    userId: number,
    updatedData: UpdateUserDto,
  ): Promise<{ message: string } | User> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      await this.userRepository.update(userId, {
        ...updatedData,
        full_name: updatedData.full_name ?? user.full_name,
        avatar: updatedData.avatar ?? user.avatar,
        gender:
          GenderType[updatedData.gender?.toUpperCase()] ?? user.gender,
        day_of_birth: updatedData.day_of_birth ?? user.day_of_birth,
        phone_number: updatedData.phone_number ?? user.phone_number,
      });
      return { message: 'User profile updated successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Internal server error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
