import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  ADMIN = 'admin',
  FUNCIONARIO = 'funcionario',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, enum: UserRole, default: UserRole.FUNCIONARIO })
  role: UserRole;

  @Prop({ default: '', trim: true })
  phone: string;

  @Prop({ default: false })
  isFirstLogin: boolean;

  @Prop({ default: false })
  passwordChangedManually: boolean;

  @Prop({ type: Object, default: null })
  pushSubscription: any;
}

export const UserSchema = SchemaFactory.createForClass(User);
