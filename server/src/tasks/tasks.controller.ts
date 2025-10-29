import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  async list() {
    return this.tasks.findAll();
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const t = await this.tasks.findOne(id);
    if (!t) throw new NotFoundException('Task not found');
    return t;
  }

  @Post()
  async create(@Body() dto: CreateTaskDto) {
    return this.tasks.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasks.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.tasks.remove(id);
    return { ok: true };
  }
}

