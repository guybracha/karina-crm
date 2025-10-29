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
  firebaseUid?: string | null;
  lastOrderAt?: number | null;
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
      firebaseUid: c.firebaseUid ?? undefined,
      lastOrderAt: c.lastOrderAt ? new Date(c.lastOrderAt).getTime() : undefined,
      createdAt: new Date(c.createdAt).getTime(),
      updatedAt: new Date(c.updatedAt).getTime(),
    };
  }

  private async upsertFollowUpTask(customerId: string, lastOrderAt: Date): Promise<void> {
    const due = new Date(lastOrderAt);
    if (Number.isNaN(+due)) return;
    due.setMonth(due.getMonth() + 6);

    await this.prisma.task.deleteMany({ where: { customerId, kind: 'followup' } }).catch(() => {});
    await this.prisma.task.create({
      data: {
        customerId,
        title: 'Follow-up call after last order',
        dueAt: due,
        status: 'open',
        kind: 'followup',
      },
    });
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
        firebaseUid: dto.firebaseUid,
        lastOrderAt: dto.lastOrderAt ? new Date(dto.lastOrderAt) : undefined,
        photos: dto.orderImageUrls && dto.orderImageUrls.length
          ? { create: dto.orderImageUrls.map((url) => ({ url })) }
          : undefined,
      },
      include: { photos: { orderBy: { createdAt: 'asc' } } },
    });
    // Schedule follow-up task if lastOrderAt was provided
    if (created.lastOrderAt) {
      await this.upsertFollowUpTask(created.id, created.lastOrderAt);
    }
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
        firebaseUid: dto.firebaseUid ?? undefined,
        lastOrderAt: dto.lastOrderAt ? new Date(dto.lastOrderAt) : undefined,
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
    // If lastOrderAt changed, upsert follow-up task
    if (dto.lastOrderAt) {
      const when = new Date(dto.lastOrderAt);
      if (!Number.isNaN(+when)) {
        await this.upsertFollowUpTask(id, when);
      }
    }
    return this.toApi(refreshed);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.customer.delete({ where: { id } });
  }

  // Add photos from uploaded files on disk; returns public URLs
  async addPhotosFromUploads(customerId: string, files: Express.Multer.File[]): Promise<string[]> {
    const exists = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!exists) throw new NotFoundException('Customer not found');

    const urls = (files || [])
      .filter((f) => !!f?.filename)
      .map((f) => `/uploads/${f.filename}`);

    if (urls.length) {
      await this.prisma.customerPhoto.createMany({
        data: urls.map((url) => ({ url, customerId })),
      });
    }

    return urls;
  }

  async removePhoto(customerId: string, photoId: string): Promise<void> {
    const photo = await this.prisma.customerPhoto.findUnique({ where: { id: photoId } });
    if (!photo || photo.customerId !== customerId) throw new NotFoundException('Photo not found');
    await this.prisma.customerPhoto.delete({ where: { id: photoId } });
    // Optionally delete file from disk if it's under /uploads
    try {
      if (photo.url?.startsWith('/uploads/')) {
        const fs = await import('fs/promises');
        const path = await import('path');
        const p = path.resolve(process.cwd(), photo.url.replace('/uploads/', 'uploads/'));
        await fs.unlink(p).catch(() => {});
      }
    } catch {}
  }

  async listPhotos(customerId: string) {
    const exists = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!exists) throw new NotFoundException('Customer not found');
    const list = await this.prisma.customerPhoto.findMany({ where: { customerId }, orderBy: { createdAt: 'asc' } });
    return list.map((p) => ({ id: p.id, url: p.url }));
  }

  async setLogoFromUpload(customerId: string, file?: Express.Multer.File): Promise<string> {
    const exists = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!exists) throw new NotFoundException('Customer not found');
    if (!file?.filename) return exists.logoUrl || '';

    const newUrl = `/uploads/${file.filename}`;

    // Delete previous file from disk if stored under uploads
    try {
      if (exists.logoUrl?.startsWith('/uploads/')) {
        const fs = await import('fs/promises');
        const path = await import('path');
        const p = path.resolve(process.cwd(), exists.logoUrl.replace('/uploads/', 'uploads/'));
        await fs.unlink(p).catch(() => {});
      }
    } catch {}

    await this.prisma.customer.update({ where: { id: customerId }, data: { logoUrl: newUrl } });
    return newUrl;
  }
}
