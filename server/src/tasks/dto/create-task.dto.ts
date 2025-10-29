import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTaskDto {
  @IsUUID()
  customerId!: string;

  @IsString()
  title!: string;

  // Accept ISO string date; server will parse
  @IsDateString()
  dueAt!: string;

  @IsOptional()
  @IsIn(['open', 'done'])
  status?: 'open' | 'done';

  @IsOptional()
  @IsString()
  kind?: string;
}

