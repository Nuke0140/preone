/**
 * Permission DTOs — read-only permission catalog.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'students.create.execute' })
  code!: string;

  @ApiProperty({ example: 'Create Student' })
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ example: 'student' })
  module!: string;

  @ApiProperty({ example: 'create' })
  action!: string;

  @ApiProperty({ example: 'student' })
  resource!: string;

  @ApiProperty({ example: 'BRANCH' })
  scopeType!: string;

  @ApiProperty()
  isDangerous!: boolean;
}

export class PermissionGroupDto {
  @ApiProperty({ example: 'identity' })
  module!: string;

  @ApiProperty({ type: [PermissionResponseDto] })
  permissions!: PermissionResponseDto[];
}
