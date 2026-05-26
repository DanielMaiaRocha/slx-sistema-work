import { Request, Response } from 'express';
import { DocumentModel } from '../models';
import { AsaasService } from '../services/asaas.service';

export class TenantController {
  static async getBills(req: Request, res: Response) {
    const asaasId = (req as any).user?.asaasId;

    if (!asaasId) {
      return res.status(400).json({ error: 'Usuário não possui integração com financeiro' });
    }

    try {
      const charges = await AsaasService.listCharges(asaasId);
      
      // Format response for the mobile app
      const formattedBills = charges.data.map((bill: any) => {
        let description = bill.description || 'Aluguel';
        
        // Intelligent identification based on common keywords
        const lowerDesc = description.toLowerCase();
        if (lowerDesc.includes('aluguel')) {
          description = 'Aluguel';
        } else if (lowerDesc.includes('condominio') || lowerDesc.includes('condomínio') || lowerDesc.includes('taxa')) {
          description = 'Condomínio + Taxas';
        }

        return {
          id: bill.id,
          description: description,
          originalDescription: bill.description,
          amount: bill.value,
          dueDate: bill.dueDate,
          status: bill.status === 'RECEIVED' || bill.status === 'RECEIVED_IN_CASH' || bill.status === 'CONFIRMED' ? 'PAGO' : 
                  new Date(bill.dueDate) < new Date() ? 'VENCIDO' : 'PENDENTE',
          barCode: bill.identificationField || bill.nossoNumero || '',
          invoiceUrl: bill.invoiceUrl,
          bankSlipUrl: bill.bankSlipUrl,
          paymentLink: bill.paymentLink
        };
      });

      res.json(formattedBills);
    } catch (error: any) {
      console.error('Get bills error:', error);
      res.status(500).json({ error: 'Erro ao buscar boletos' });
    }
  }

  static async getContract(req: Request, res: Response) {
    const userId = (req as any).user?.id;

    try {
      // Find contracts (Documents of type CONTRACT linked to this user)
      const contracts = await DocumentModel.find({
        userId,
        type: { $regex: '^CONTRACT' }
      }).lean();

      res.json(contracts);
    } catch (error: any) {
      console.error('Get contract error:', error);
      res.status(500).json({ error: 'Erro ao buscar contratos' });
    }
  }
}
