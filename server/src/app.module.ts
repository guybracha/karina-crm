import { Module } from '@nestjs/common';
import { CustomersModule } from './customers/customers.module';
import { TasksModule } from './tasks/tasks.module';
import { PrismaModule } from './prisma/prisma.module';
import { FirebaseModule } from './firebase/firebase.module';

@Module({
  imports: [PrismaModule, CustomersModule, TasksModule, FirebaseModule],
})
export class AppModule {}
