import { BlackFridayConfig, BlackFridayCoupon, Moto } from '../types';
import { db, doc, getDoc, setDoc, updateDoc } from '../firebase';

export const DEFAULT_BLACK_FRIDAY_CONFIG: BlackFridayConfig = {
  enabled: true,
  title: 'FRANKLIN BLACK — A BLACK FRIDAY DAS MOTOS',
  slogan: 'O PREÇO CAIU. A CHANCE ACELEROU.',
  // Set date to a realistic upcoming date or end of November
  endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  featuredMotoId: 'pnn8564',
  heroDiscountText: 'ECONOMIA REAL + BENEFÍCIOS EXCLUSIVOS',
  whatsappNumber: '558532332200',
  whatsappMessageTemplate: 'Olá! Vi a Black Friday da Franklin Motos e tenho interesse na [MODELO]. Gostaria de saber mais sobre a oferta [IDENTIFICADOR] e o cupom [CUPOM].',
  coupons: [
    {
      id: 'cupom-blackfranklin',
      code: 'BLACKFRANKLIN',
      discountText: 'R$ 1.000 OFF',
      description: 'Desconto direto no valor à vista ou entrada no financiamento.',
      conditions: 'Válido para todas as motos de média e alta cilindrada em estoque enquanto durar a campanha.',
      validUntil: '30/11/2026',
      active: true,
      tag: 'OFERTA PRINCIPAL'
    },
    {
      id: 'cupom-motoblack',
      code: 'MOTOBLACK',
      discountText: 'DUT + TRANSFERÊNCIA GRÁTIS',
      description: 'Transferência de propriedade e DUT 100% pagos pela Franklin Motos.',
      conditions: 'Válido para toda a linha de scooters (NMAX, PCX, ADV, Elite, SH). Economia média de R$ 650.',
      validUntil: '30/11/2026',
      active: true,
      tag: 'EXCLUSIVO SCOOTERS'
    },
    {
      id: 'cupom-acelerablack',
      code: 'ACELERABLACK',
      discountText: 'CAPACETE PRO + TANQUE CHEIO',
      description: 'Combo de boas-vindas: saia da loja com capacete novo e tanque abastecido.',
      conditions: 'Válido para qualquer motocicleta do estoque. Aplicável no ato da assinatura da proposta.',
      validUntil: '30/11/2026',
      active: true,
      tag: 'COMBO ACELERAÇÃO'
    }
  ]
};

export function buildWhatsAppLink(
  phoneNumber: string,
  template: string,
  moto?: Moto | null,
  couponCode?: string | null
): string {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const modelText = moto ? `${moto.marcaModelo} (${moto.anoModelo})` : 'uma moto em oferta';
  const idText = moto ? `Placa ${moto.placa}` : 'Black Friday';
  const couponText = couponCode ? couponCode : 'sem cupom adicional';

  let message = template
    .replace(/\[MODELO\]/g, modelText)
    .replace(/\[IDENTIFICADOR\]/g, idText)
    .replace(/\[CUPOM\]/g, couponText);

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

// Analytics event logger (tracks in localStorage and optional analytics collection)
export function trackBlackFridayEvent(eventName: string, metadata?: Record<string, any>) {
  try {
    const timestamp = new Date().toISOString();
    const event = { eventName, metadata, timestamp };
    const history = JSON.parse(localStorage.getItem('franklin_black_events') || '[]');
    history.push(event);
    if (history.length > 100) history.shift();
    localStorage.setItem('franklin_black_events', JSON.stringify(history));
    console.log(`[BLACK FRIDAY ANALYTICS] ${eventName}`, metadata);
  } catch {
    // ignore local storage errors
  }
}
