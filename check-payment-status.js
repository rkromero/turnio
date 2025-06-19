const { MercadoPagoConfig, Payment } = require('mercadopago');
require('dotenv').config();

const mpClient = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN 
});

async function checkPaymentStatus() {
  try {
    console.log('🔍 Verificando pagos y suscripción...\n');

    // Buscar pagos en MercadoPago
    const paymentClient = new Payment(mpClient);
    const payments = await paymentClient.search({
      options: {
        criteria: 'desc',
        limit: 10
      }
    });

    console.log('📊 Últimos pagos en MercadoPago:');
    if (payments.results && payments.results.length > 0) {
      payments.results.forEach(payment => {
        console.log({
          id: payment.id,
          status: payment.status,
          external_reference: payment.external_reference,
          date_created: payment.date_created,
          amount: payment.transaction_amount
        });
      });
    } else {
      console.log('No se encontraron pagos');
    }

    // Verificar webhooks recibidos
    console.log('\n🔔 Verificando webhooks...');
    const webhookUrl = `${process.env.BACKEND_URL}/api/mercadopago/webhook`;
    console.log('URL del webhook:', webhookUrl);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.cause) {
      console.error('Causa:', error.cause);
    }
  }
}

// Ejecutar verificación
checkPaymentStatus(); 