import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

type ApiTask = {
  id: string;
  customerId: string;
  title: string;
  dueAt: number;
  status: 'open' | 'done';
  kind?: string | null;
  createdAt: number;
  updatedAt: number;
};

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  private toApi(t: any): ApiTask {
    return {
      id: t.id,
      customerId: t.customerId,
      title: t.title,
      dueAt: new Date(t.dueAt).getTime(),
      status: (t.status as 'open' | 'done') ?? 'open',
      kind: t.kind ?? undefined,
      createdAt: new Date(t.createdAt).getTime(),
      updatedAt: new Date(t.updatedAt).getTime(),
    };
  }

  async create(dto: CreateTaskDto) {
    const created = await this.prisma.task.create({
      data: {
        customerId: dto.customerId,
        title: dto.title,
        dueAt: new Date(dto.dueAt),
        status: (dto.status as any) ?? 'open',
        kind: dto.kind,
      },
    });
    return this.toApi(created);
  }

  async findAll() {
    const list = await this.prisma.task.findMany({ orderBy: { dueAt: 'asc' } });
    return list.map((t) => this.toApi(t));
  }

  async findOne(id: string) {
    const t = await this.prisma.task.findUnique({ where: { id } });
    return t ? this.toApi(t) : null;
  }

  async update(id: string, dto: UpdateTaskDto) {
    const exists = await this.prisma.task.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Task not found');
    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title ?? undefined,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        status: (dto.status as any) ?? undefined,
        kind: dto.kind ?? undefined,
      },
    });
    return this.toApi(updated);
  }

  async remove(id: string) {
    await this.prisma.task.delete({ where: { id } });
  }
}

