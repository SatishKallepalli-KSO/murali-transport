import { business, type Lang } from '../content'

export function waHref(lang: Lang) {
  const text =
    lang === 'te'
      ? `నమస్కారం, ${business.shortName} (దొమ్మేరు) నుండి లారీ/ట్రక్ బుక్ చేయాలనుకుంటున్నాను.`
      : `Namaste, I want to book a mini lorry / truck from ${business.shortName} (Dommeru).`
  return `https://wa.me/${business.whatsapp}?text=${encodeURIComponent(text)}`
}
