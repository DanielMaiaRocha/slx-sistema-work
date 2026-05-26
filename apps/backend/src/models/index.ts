import mongoose, { Schema, model, Model, Document as MongooseDocument } from 'mongoose';

// ─── Enums ───────────────────────────────────────────────────────────────────
export const Role = {
  ADMIN: 'ADMIN',
  OWNER: 'OWNER',
  TENANT: 'TENANT',
  LANDLORD: 'LANDLORD',
} as const;
export type RoleType = (typeof Role)[keyof typeof Role];

export const FinancialStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
} as const;
export type FinancialStatusType = (typeof FinancialStatus)[keyof typeof FinancialStatus];

export const FinancialType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;
export type FinancialTypeType = (typeof FinancialType)[keyof typeof FinancialType];

// ─── cuid generator (matches original Prisma id format) ──────────────────────
import { randomBytes } from 'crypto';
function cuid(): string {
  // not RFC cuid, but close enough — collision-resistant random id
  return 'c' + Date.now().toString(36) + randomBytes(8).toString('hex');
}

// ─── Common options for every model ──────────────────────────────────────────
const stringIdOpts: any = {
  _id: false,
  id: false,
  timestamps: false,
  versionKey: false,
  toJSON: { virtuals: false, getters: false, transform: (_doc: any, ret: any) => { delete ret.__v; return ret; } },
  toObject: { virtuals: false, getters: false },
};

const idField = { type: String, default: cuid };

// ─── Tenant ──────────────────────────────────────────────────────────────────
const tenantSchema = new Schema({
  _id: idField,
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  logoUrl: String,
  primaryColor: { type: String, default: '#6D28D9' },
  secondaryColor: { type: String, default: '#06B6D4' },
  config: { type: String, default: '{}' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
}, stringIdOpts);
tenantSchema.pre('save', function (next) { this.set('updatedAt', new Date()); next(); });
tenantSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) { this.set({ updatedAt: new Date() }); next(); });

// ─── User ────────────────────────────────────────────────────────────────────
const userSchema = new Schema({
  _id: idField,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  phone: String,
  role: { type: String, default: 'TENANT' },
  permissions: { type: String, default: '{}' },
  cpf: { type: String, unique: true, sparse: true, default: undefined },
  isEmailVerified: { type: Boolean, default: false },
  photoUrl: String,
  creci: String,
  asaasId: { type: String, unique: true, sparse: true, default: undefined },
  tenantId: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
}, stringIdOpts);
userSchema.pre('save', function (next) { this.set('updatedAt', new Date()); next(); });
userSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) { this.set({ updatedAt: new Date() }); next(); });

// ─── Document ────────────────────────────────────────────────────────────────
const documentSchema = new Schema({
  _id: idField,
  name: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, required: true },
  amount: Number,
  address: String,
  duration: String,
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  visibility: { type: String, default: 'ALL' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
}, stringIdOpts);
documentSchema.pre('save', function (next) { this.set('updatedAt', new Date()); next(); });
documentSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) { this.set({ updatedAt: new Date() }); next(); });

// ─── FinancialRecord ─────────────────────────────────────────────────────────
const financialRecordSchema = new Schema({
  _id: idField,
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  paymentDate: Date,
  type: { type: String, enum: Object.values(FinancialType), required: true },
  status: { type: String, enum: Object.values(FinancialStatus), default: 'PENDING' },
  asaasId: { type: String, unique: true, sparse: true, default: undefined },
  asaasUrl: String,
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
}, stringIdOpts);
financialRecordSchema.pre('save', function (next) { this.set('updatedAt', new Date()); next(); });
financialRecordSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) { this.set({ updatedAt: new Date() }); next(); });

// ─── Inspection ──────────────────────────────────────────────────────────────
const inspectionSchema = new Schema({
  _id: idField,
  propertyAddress: { type: String, required: true },
  propertyNumber: String,
  cep: String,
  propertyType: String,
  date: { type: Date, default: Date.now },
  landlordData: { type: String, default: '{}' },
  tenantData: { type: String, default: '{}' },
  inspectorData: { type: String, default: '{}' },
  status: { type: String, default: 'DRAFT' },
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
}, stringIdOpts);
inspectionSchema.pre('save', function (next) { this.set('updatedAt', new Date()); next(); });
inspectionSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) { this.set({ updatedAt: new Date() }); next(); });

// ─── InspectionRoom ──────────────────────────────────────────────────────────
const inspectionRoomSchema = new Schema({
  _id: idField,
  name: { type: String, required: true },
  order: { type: Number, default: 0 },
  inspectionId: { type: String, required: true, index: true },
}, stringIdOpts);

// ─── InspectionItem ──────────────────────────────────────────────────────────
const inspectionItemSchema = new Schema({
  _id: idField,
  description: { type: String, required: true },
  observations: String,
  status: String,
  videoUrl: String,
  roomId: { type: String, required: true, index: true },
}, stringIdOpts);

// ─── InspectionPhoto / InspectionVideo ───────────────────────────────────────
const inspectionPhotoSchema = new Schema({
  _id: idField,
  url: { type: String, required: true },
  roomId: { type: String, index: true },
  itemId: { type: String, index: true },
}, stringIdOpts);

const inspectionVideoSchema = new Schema({
  _id: idField,
  url: { type: String, required: true },
  roomId: { type: String, index: true },
  itemId: { type: String, index: true },
}, stringIdOpts);

// ─── Property ────────────────────────────────────────────────────────────────
const propertySchema = new Schema({
  _id: idField,
  address: { type: String, required: true },
  number: String,
  complement: String,
  neighborhood: String,
  city: String,
  state: String,
  zipCode: String,
  type: String,
  landlordId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
}, stringIdOpts);
propertySchema.pre('save', function (next) { this.set('updatedAt', new Date()); next(); });
propertySchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) { this.set({ updatedAt: new Date() }); next(); });

// ─── Log ─────────────────────────────────────────────────────────────────────
const logSchema = new Schema({
  _id: idField,
  action: { type: String, required: true },
  details: String,
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
}, stringIdOpts);

// ─── Media ───────────────────────────────────────────────────────────────────
const mediaSchema = new Schema({
  _id: idField,
  filename: { type: String, required: true },
  mimeType: { type: String, required: true },
  data: { type: Buffer, required: true },
  size: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
}, stringIdOpts);

// ─── Exports ─────────────────────────────────────────────────────────────────
function getOrDefine<T>(name: string, schema: Schema, collection: string): Model<any> {
  return (mongoose.models[name] as Model<any>) || model(name, schema, collection);
}

export const Tenant = getOrDefine('Tenant', tenantSchema, 'Tenant');
export const User = getOrDefine('User', userSchema, 'User');
export const DocumentModel = getOrDefine('Document', documentSchema, 'Document');
export const FinancialRecord = getOrDefine('FinancialRecord', financialRecordSchema, 'FinancialRecord');
export const Inspection = getOrDefine('Inspection', inspectionSchema, 'Inspection');
export const InspectionRoom = getOrDefine('InspectionRoom', inspectionRoomSchema, 'InspectionRoom');
export const InspectionItem = getOrDefine('InspectionItem', inspectionItemSchema, 'InspectionItem');
export const InspectionPhoto = getOrDefine('InspectionPhoto', inspectionPhotoSchema, 'InspectionPhoto');
export const InspectionVideo = getOrDefine('InspectionVideo', inspectionVideoSchema, 'InspectionVideo');
export const Property = getOrDefine('Property', propertySchema, 'Property');
export const Log = getOrDefine('Log', logSchema, 'Log');
export const Media = getOrDefine('Media', mediaSchema, 'Media');

export type UserDoc = mongoose.InferSchemaType<typeof userSchema> & { _id: string };
export type TenantDoc = mongoose.InferSchemaType<typeof tenantSchema> & { _id: string };
