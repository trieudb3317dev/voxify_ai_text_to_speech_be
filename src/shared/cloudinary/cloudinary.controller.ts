import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from './cloudinary.service';

@Controller('cloudinary')
export class CloudinaryController {
  // Implement cloudinary controller methods here
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  // Ensure client sends multipart/form-data with field name 'file'
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    // pass the single uploaded file to the service (not file[0])
    const result = await this.cloudinaryService.uploadImage(file);
    return { url: result.secure_url, public_id: result.public_id };
  }
}
