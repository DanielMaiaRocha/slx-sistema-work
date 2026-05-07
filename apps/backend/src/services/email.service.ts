import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_123';
console.log(`🔑 Resend API Key loaded (first 5 chars): ${RESEND_API_KEY.substring(0, 5)}...`);
const resend = new Resend(RESEND_API_KEY);

export class EmailService {
  static async sendVerificationEmail(email: string, token: string) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    try {
      await resend.emails.send({
        from: 'SLX Imobiliária <onboarding@resend.dev>',
        to: email,
        subject: 'Confirmação de E-mail',
        html: `
          <h1>Bem-vindo à SLX Imobiliária</h1>
          <p>Clique no link abaixo para confirmar seu e-mail:</p>
          <a href="${verificationUrl}">${verificationUrl}</a>
        `,
      });
    } catch (error) {
      console.error('Resend email error:', error);
      // In development, we might not have a valid key, so we just log
    }
  }

  static async sendMagicLink(email: string, name: string, link: string) {
    console.log(`📧 Attempting to send magic link to: ${email} (API Key prefix: ${RESEND_API_KEY.substring(0, 5)})`);
    try {
      if (!RESEND_API_KEY || RESEND_API_KEY === 'your_resend_key' || RESEND_API_KEY === 're_123') {
        console.log('\n📧 [MOCK EMAIL]: Link enviado para', name);
        console.log('PARA:', email);
        console.log('LINK:', link, '\n');
        return;
      }
      const result = await resend.emails.send({
        from: 'SLX Imobiliária <onboarding@resend.dev>',
        to: email,
        subject: 'Seu acesso à Área do Inquilino',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
            <h1 style="color: #6D28D9; text-align: center;">Olá, ${name}!</h1>
            <p style="font-size: 16px; color: #333; line-height: 1.6; text-align: center;">
              Para definir sua senha e acessar sua Área do Inquilino na SLX Imobiliária, clique no botão abaixo:
            </p>
            <div style="text-align: center; margin: 40px 0;">
              <a href="${link}" style="background-color: #6D28D9; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(109, 40, 217, 0.2);">
                Definir minha Senha
              </a>
            </div>
            <p style="font-size: 14px; color: #666; text-align: center;">
              Ou copie e cole o link abaixo no seu navegador:
            </p>
            <p style="word-break: break-all; background: #f9f9f9; padding: 15px; border-radius: 8px; font-size: 12px; color: #888; text-align: center;">
              ${link}
            </p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #999; font-size: 11px; text-align: center;">
              Este link é válido por 1 hora. Se você não solicitou este acesso, por favor ignore este e-mail.
            </p>
          </div>
        `,
      });
      console.log('📬 Resend API Response:', result);
    } catch (error: any) {
      console.error('❌ Resend API Error:', error.message || error);
    }
  }
}
