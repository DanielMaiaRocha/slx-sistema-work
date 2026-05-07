import axios from 'axios';

export class WhatsAppService {
  /**
   * Placeholder for sending WhatsApp messages.
   * In a real scenario, this would use Evolution API, Twilio, or similar.
   */
  static async sendMessage(phone: string, text: string) {
    console.log('📱 [WhatsApp Service] Sending message to:', phone);
    console.log('💬 [WhatsApp Service] Content:', text);
    
    // Log to a file or similar for debug if needed
    // For now, we just simulate success
    return true;
  }

  static async sendMagicLink(phone: string, name: string, link: string) {
    const text = `Olá ${name}! Bem-vindo à SLX Imobiliária. \n\nPara definir sua senha e acessar sua Área do Inquilino, clique no link abaixo:\n${link}\n\nSe precisar de ajuda, estamos à disposição!`;
    return this.sendMessage(phone, text);
  }
}
