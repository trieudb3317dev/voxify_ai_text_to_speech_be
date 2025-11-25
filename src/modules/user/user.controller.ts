import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch } from "@nestjs/common";
import { UserService } from "./user.service";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";

@Controller('users')
export class UserController {
    // Implement user controller methods here
    constructor(
        private readonly userService: UserService
    ) { }

    @Get('/:id/profile')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get user profile' })
    @ApiResponse({ status: 200, description: 'User profile fetched successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async profile(
        @Param('id') id: number
    ) {
        /* Implement logic to get user profiles */
        return await this.userService.profile(id);
    }

    @Patch('/:id/update-profile')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update user profile' })
    @ApiResponse({ status: 200, description: 'User profile updated successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async updateProfile(
        @Param('id') id: number,
        @Body() updatedData: any
    ) {
        /* Implement logic to update user profiles */
        return await this.userService.updateProfile(id, updatedData);
    }
}