import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

type ApiCustomer = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  tag?: string | null;
  notes?: string | null;
  logoUrl?: string | null;
  orderImageUrls: string[];
  createdAt: number;
  updatedAt: number;
};

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private toApi(c: any): ApiCustomer {
    return {
      id: c.id,
      name: c.name,
      email: c.email ?? undefined,
      phone: c.phone ?? undefined,
      city: c.city ?? undefined,
      tag: c.tag ?? undefined,
      notes: c.notes ?? undefined,
      logoUrl: c.logoUrl ?? undefined,
      orderImageUrls: Array.isArray(c.photos)
        ? c.photos.map((p: any) => p.url)
        : [],
      createdAt: new Date(c.createdAt).getTime(),
      updatedAt: new Date(c.updatedAt).getTime(),
    };
  }

  async create(dto: CreateCustomerDto): Promise<ApiCustomer> {
    const created = await this.prisma.customer.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        city: dto.city,
        tag: dto.tag,
        notes: dto.notes,
        logoUrl: dto.logoUrl,
        photos: dto.orderImageUrls && dto.orderImageUrls.length
          ? { create: dto.orderImageUrls.map((url) => ({ url })) }
          : undefined,
      },
      include: { photos: { orderBy: { createdAt: 'asc' } } },
    });
    return this.toApi(created);
  }

  async findAll(): Promise<ApiCustomer[]> {
    const list = await this.prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      include: { photos: { orderBy: { createdAt: 'asc' } } },
    });
    return list.map((c) => this.toApi(c));
  }

  async findOne(id: string): Promise<ApiCustomer | null> {
    const found = await this.prisma.customer.findUnique({ where: { id }, include: { photos: { orderBy: { createdAt: 'asc' } } } });
    return found ? this.toApi(found) : null;
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<ApiCustomer> {
    const exists = await this.prisma.customer.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Customer not found');

    // update primitive fields first
    await this.prisma.customer.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        email: dto.email ?? undefined,
        phone: dto.phone ?? undefined,
        city: dto.city ?? undefined,
        tag: dto.tag ?? undefined,
        notes: dto.notes ?? undefined,
        logoUrl: dto.logoUrl ?? undefined,
      },
    });

    if (dto.orderImageUrls) {
      // Replace photos set
      await this.prisma.customerPhoto.deleteMany({ where: { customerId: id } });
      if (dto.orderImageUrls.length) {
        await this.prisma.customerPhoto.createMany({
          data: dto.orderImageUrls.map((url) => ({ url, customerId: id })),
        });
      }
    }

    const refreshed = await this.prisma.customer.findUnique({
      where: { id },
      include: { photos: { orderBy: { createdAt: 'asc' } } },
    });
    return this.toApi(refreshed);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.customer.delete({ where: { id } });
  }
}
