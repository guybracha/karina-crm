import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FirebaseService } from './firebase.service';
import { SyncController } from './sync.controller';

@Module({
  imports: [PrismaModule],
  providers: [FirebaseService],
  controllers: [SyncController],
  exports: [FirebaseService],
})
export class FirebaseModule {}

