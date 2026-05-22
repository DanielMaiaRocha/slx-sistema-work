import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { AuthController } from '../controllers/auth.controller';
import { FinancialController } from '../controllers/financial.controller';
import { DocumentController } from '../controllers/document.controller';
import { UserController } from '../controllers/user.controller';
import { DashboardController } from '../controllers/dashboard.controller';
import { SyncController } from '../controllers/sync.controller';
import { SettingsController } from '../controllers/settings.controller';
import { InspectionController } from '../controllers/inspection.controller';
import { upload } from '../config/multer';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Get API URL from environment or use production URL
const getApiUrl = () => {
  return process.env.API_URL || 'https://slx-sistema-work-production.up.railway.app';
};

// Public routes (but still require tenant context for white-label/isolation)
router.post('/auth/register', tenantMiddleware, AuthController.register);
router.post('/auth/login', tenantMiddleware, AuthController.login);
router.get('/auth/verify', AuthController.verifyEmail);
router.get('/public/inspections/:id', tenantMiddleware, InspectionController.getById);

// Tenant (Inquilino) Area Routes
import { TenantAuthController } from '../controllers/tenant-auth.controller';
import { TenantController } from '../controllers/tenant.controller';

router.post('/auth/login-tenant', tenantMiddleware, TenantAuthController.login);
router.post('/auth/first-access', tenantMiddleware, TenantAuthController.firstAccess);
router.post('/auth/set-password', tenantMiddleware, TenantAuthController.setPassword);

router.get('/tenant/bills', tenantMiddleware, authMiddleware([Role.TENANT]), TenantController.getBills);
router.get('/tenant/contract', tenantMiddleware, authMiddleware([Role.TENANT]), TenantController.getContract);

// Owner (Proprietário) Area Routes
import { LandlordController } from '../controllers/landlord.controller';
router.get('/landlord/properties', tenantMiddleware, authMiddleware([Role.ADMIN, Role.OWNER, Role.LANDLORD]), LandlordController.getProperties);
router.get('/landlord/documents', tenantMiddleware, authMiddleware([Role.ADMIN, Role.OWNER, Role.LANDLORD]), LandlordController.getDocuments);

// Settings / Branding
router.get('/settings/branding', tenantMiddleware, SettingsController.getBranding);
router.put('/settings/branding', tenantMiddleware, authMiddleware([Role.ADMIN, Role.OWNER]), SettingsController.updateBranding);
router.post('/settings/upload-logo', tenantMiddleware, authMiddleware([Role.ADMIN, Role.OWNER]), upload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  const url = `${getApiUrl()}/uploads/${req.file.filename}`;
  res.json({ url });
});

// Real Data routes
router.get('/dashboard/stats', tenantMiddleware, authMiddleware([Role.ADMIN, Role.OWNER, Role.TENANT]), DashboardController.getStats);
router.get('/financial/all', tenantMiddleware, authMiddleware([Role.ADMIN, Role.OWNER, Role.TENANT], 'financial_view'), FinancialController.listAll);
router.get('/users/all', tenantMiddleware, authMiddleware([Role.ADMIN, Role.OWNER, Role.TENANT], 'users_view'), UserController.listAll);
router.get('/users/team', tenantMiddleware, authMiddleware([Role.ADMIN, Role.OWNER]), UserController.listTeam);
router.post('/users', tenantMiddleware, authMiddleware([Role.ADMIN, Role.OWNER]), UserController.create);
router.get('/users/:userId/properties', tenantMiddleware, authMiddleware([Role.ADMIN, Role.OWNER]), UserController.getUserProperties);
router.put('/users/:userId/properties', tenantMiddleware, authMiddleware([Role.ADMIN, Role.OWNER]), UserController.updateUserProperties);
router.put('/users/:id', tenantMiddleware, authMiddleware([Role.ADMIN, Role.OWNER]), UserController.update);
router.delete('/users/:id', tenantMiddleware, authMiddleware([Role.ADMIN, Role.OWNER]), UserController.delete);
router.put('/users/customer/:asaasId', tenantMiddleware, authMiddleware([Role.ADMIN, Role.OWNER, Role.TENANT], 'users_edit'), UserController.updateCustomer);

// Sync route
router.post('/sync', tenantMiddleware, authMiddleware([Role.ADMIN, Role.OWNER, Role.TENANT], 'asaas_sync'), SyncController.triggerSync);

// Inspection routes
router.get('/inspections/all', tenantMiddleware, authMiddleware(), InspectionController.listAll);
router.get('/inspections/:id', tenantMiddleware, authMiddleware(), InspectionController.getById);
router.get('/inspections/:id/pdf', tenantMiddleware, authMiddleware(), InspectionController.generatePdf);
router.post('/inspections', tenantMiddleware, authMiddleware(), InspectionController.create);
router.put('/inspections/:id', tenantMiddleware, authMiddleware(), InspectionController.update);

// Rooms and Items
router.post('/inspections/:inspectionId/rooms', tenantMiddleware, authMiddleware(), InspectionController.addRoom);
router.put('/inspections/rooms/:roomId', tenantMiddleware, authMiddleware(), InspectionController.updateRoom);
router.delete('/inspections/rooms/:roomId', tenantMiddleware, authMiddleware(), InspectionController.deleteRoom);

router.post('/inspections/rooms/:roomId/items', tenantMiddleware, authMiddleware(), InspectionController.addItem);
router.put('/inspections/items/:itemId', tenantMiddleware, authMiddleware(), InspectionController.updateItem);
router.delete('/inspections/items/:itemId', tenantMiddleware, authMiddleware(), InspectionController.deleteItem);

// Media
router.post('/inspections/rooms/:roomId/photos', tenantMiddleware, authMiddleware(), upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma foto enviada' });
    const url = `${getApiUrl()}/uploads/${req.file.filename}`;
    
    const { itemId } = req.body;
    
    const photo = await prisma.inspectionPhoto.create({
      data: { 
        url, 
        roomId: !itemId ? req.params.roomId : null,
        itemId: itemId || null
      }
    });
    res.json(photo);
  } catch (error: any) {
    console.error('Photo upload error:', error);
    res.status(500).json({ 
      error: 'Erro ao salvar foto no banco de dados', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.post('/inspections/rooms/:roomId/videos', tenantMiddleware, authMiddleware(), upload.single('video'), async (req, res) => {
  try {
    const { itemId } = req.body;
    let url = req.body.url;

    if (req.file) {
      url = `${getApiUrl()}/uploads/${req.file.filename}`;
    }

    if (!url) return res.status(400).json({ error: 'Nenhum vídeo ou link enviado' });

    const video = await prisma.inspectionVideo.create({
      data: { 
        url, 
        roomId: !itemId ? req.params.roomId : null,
        itemId: itemId || null
      }
    });
    res.json(video);
  } catch (error: any) {
    console.error('Video upload error:', error);
    res.status(500).json({ error: 'Erro ao salvar vídeo' });
  }
});

// Protected routes
router.get('/financial/me', tenantMiddleware, authMiddleware(), FinancialController.listMyFinancials);
router.get('/financial/invoice/:recordId', tenantMiddleware, authMiddleware(), FinancialController.getInvoiceData);

router.get('/documents/me', tenantMiddleware, authMiddleware(), DocumentController.listMyDocuments);
router.post('/documents/upload', tenantMiddleware, authMiddleware(), DocumentController.upload);

// Admin routes
// router.get('/admin/dashboard', tenantMiddleware, authMiddleware([Role.ADMIN]), AdminController.dashboard);

// Document routes
router.get('/documents/all', tenantMiddleware, authMiddleware([Role.ADMIN, Role.OWNER]), DocumentController.listAll);
router.get('/documents/me', tenantMiddleware, authMiddleware(), DocumentController.listMyDocuments);
router.get('/documents/user/:userId', tenantMiddleware, authMiddleware([Role.ADMIN, Role.OWNER]), DocumentController.listUserDocuments);
router.post('/documents', tenantMiddleware, authMiddleware(), DocumentController.upload);
router.put('/documents/:id', tenantMiddleware, authMiddleware([Role.ADMIN, Role.OWNER]), DocumentController.update);
router.post('/documents/reparse/:userId', tenantMiddleware, authMiddleware([Role.ADMIN, Role.OWNER]), DocumentController.reparseUserContracts);
router.delete('/documents/:id', tenantMiddleware, authMiddleware([Role.ADMIN, Role.OWNER]), DocumentController.delete);

router.post('/upload', tenantMiddleware, authMiddleware(), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  const url = `${getApiUrl()}/uploads/${req.file.filename}`;
  res.json({ url, name: req.file.originalname });
});

export default router;
