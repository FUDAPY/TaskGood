import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import * as fs from 'fs';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TasksModule } from './tasks/tasks.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { PushModule } from './push/push.module';

import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { FirstLoginGuard } from './auth/guards/first-login.guard';
import { RolesGuard } from './auth/guards/roles.guard';

// Determinar la ruta de los archivos estáticos compilados de Vite
const resolveStaticPath = (): string => {
  const dockerPath = join(__dirname, '..', '..', 'frontend', 'dist');
  const localDistPath = join(process.cwd(), '..', 'frontend', 'dist');
  const frontendDist = join(process.cwd(), 'frontend', 'dist');

  if (fs.existsSync(dockerPath)) return dockerPath;
  if (fs.existsSync(localDistPath)) return localDistPath;
  if (fs.existsSync(frontendDist)) return frontendDist;
  return dockerPath;
};

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://localhost:27017/taskgood',
    ),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: resolveStaticPath(),
      exclude: ['/api/(.*)', '/socket.io/(.*)'],
    }),
    AuthModule,
    UsersModule,
    TasksModule,
    WhatsappModule,
    PushModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: FirstLoginGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
