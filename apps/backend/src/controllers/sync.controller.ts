import { Request, Response } from 'express';
import { SyncService } from '../services/sync.service';

export class SyncController {
  static async triggerSync(req: Request, res: Response) {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    try {
      const results = await SyncService.syncAll(tenantId);
      res.json({
        message: 'Synchronization completed successfully',
        data: results
      });
    } catch (error: any) {
      console.error('Sync controller error:', error);
      res.status(500).json({ 
        error: 'Synchronization failed', 
        details: error.message 
      });
    }
  }
}
