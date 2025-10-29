import { Controller, Get, Post, Body, Param, Put, Delete, NotFoundException, UploadedFiles, UploadedFile, UseInterceptors } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async list() {
    return this.customersService.findAll();
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const c = await this.customersService.findOne(id);
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }

  @Post()
  async create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.customersService.remove(id);
    return { ok: true };
  }

  // Upload photos as multipart/form-data (field name: files)
  @Post(':id/photos')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadPhotos(@Param('id') id: string, @UploadedFiles() files: Express.Multer.File[]) {
    if (!Array.isArray(files) || files.length === 0) return { added: 0, urls: [] };
    const urls = await this.customersService.addPhotosFromUploads(id, files);
    return { added: urls.length, urls };
  }

  @Get(':id/photos')
  async listPhotos(@Param('id') id: string) {
    return this.customersService.listPhotos(id);
  }

  @Delete(':id/photos/:photoId')
  async deletePhoto(@Param('id') id: string, @Param('photoId') photoId: string) {
    await this.customersService.removePhoto(id, photoId);
    return { ok: true };
  }

  // Upload customer logo (single file)
  @Post(':id/logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    const url = await this.customersService.setLogoFromUpload(id, file);
    return { url };
  }
}
