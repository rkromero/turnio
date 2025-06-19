const fetch = require('node-fetch');
require('dotenv').config();

const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
const API_BASE_URL = 'https://api.mercadopago.com';

async function testAutomaticSubscription() {
  try {
    console.log('🧪 === PRUEBA DE SUSCRIPCIÓN AUTOMÁTICA ===\n');

    // 1. Obtener la última suscripción creada
    const subscriptionsResponse = await fetch(`${API_BASE_URL}/preapproval/search?sort=id:desc&limit=1`, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    });

    const subscriptions = await subscriptionsResponse.json();

    if (!subscriptions.results || subscriptions.results.length === 0) {
      throw new Error('No se encontraron suscripciones');
    }

    const subscription = subscriptions.results[0];
    console.log('✅ Suscripción encontrada:', {
      id: subscription.id,
      status: subscription.status,
      payer_email: subscription.payer_email,
      reason: subscription.reason,
      amount: subscription.auto_recurring.transaction_amount
    });

    // 2. Verificar pagos de la suscripción
    const paymentsResponse = await fetch(
      `${API_BASE_URL}/v1/payments/search?sort=date_created:desc&external_reference=${subscription.external_reference}`, 
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        }
      }
    );

    const payments = await paymentsResponse.json();

    console.log('\n📊 Historial de pagos:');
    if (payments.results && payments.results.length > 0) {
      payments.results.forEach(payment => {
        console.log({
          id: payment.id,
          status: payment.status,
          date_created: payment.date_created,
          amount: payment.transaction_amount
        });
      });
    } else {
      console.log('No se encontraron pagos para esta suscripción');
    }

    // 3. Simular próximo cobro (solo para pruebas)
    console.log('\n🔄 Simulando próximo cobro automático...');
    const nextPaymentResponse = await fetch(`${API_BASE_URL}/preapproval/${subscription.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'authorized'
      })
    });

    const nextPayment = await nextPaymentResponse.json();
    
    console.log('✅ Cobro automático simulado:', {
      status: nextPayment.status,
      date: new Date().toISOString()
    });

    // 4. Verificar estado actualizado
    const updatedSubscriptionResponse = await fetch(`${API_BASE_URL}/preapproval/${subscription.id}`, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    });

    const updatedSubscription = await updatedSubscriptionResponse.json();
    console.log('\n📌 Estado actual de la suscripción:', {
      status: updatedSubscription.status,
      next_payment_date: updatedSubscription.next_payment_date,
      payments_made: updatedSubscription.summarized?.charged_quantity || 0
    });

  } catch (error) {
    console.error('\n❌ Error en la prueba:', error.message);
    if (error.cause) {
      console.error('Causa:', error.cause);
    }
  }
}

// Ejecutar prueba
testAutomaticSubscription(); 