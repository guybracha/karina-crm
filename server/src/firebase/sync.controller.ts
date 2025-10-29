import { Controller, Get } from '@nestjs/common';
import { FirebaseService } from './firebase.service';

@Controller('sync/firebase')
export class SyncController {
  constructor(private readonly fb: FirebaseService) {}

  @Get('status')
  async status() {
    const ok = await this.fb.canSync();
    return { configured: ok };
  }

  @Get('users')
  async syncUsers() {
    return this.fb.syncUsersFromFirestore();
  }

  @Get('orders')
  async syncOrders() {
    return this.fb.syncOrdersFromFirestore();
  }
}
