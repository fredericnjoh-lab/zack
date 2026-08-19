/** Fashion / clothing-brand vertical — shared prompt context & discovery seeds. */

export const FASHION_SYSTEM = `Tu es Zack, expert contenu Instagram pour MARQUES DE VÊTEMENTS
(streetwear, ready-to-wear, DTC mode, sneakers, denim, athleisure).
Tu parles aux fondateurs / social managers de marques, pas aux influenceurs génériques.
Angles prioritaires: drop, restock, fit check, packing/unboxing, behind the stitch,
lookbook, social proof UGC, manifesto/brand voice.
Réponds toujours en français sauf si la marque cible est clairement EN.`

export const FASHION_ANGLES = [
  'drop',
  'restock',
  'fit_check',
  'packing',
  'behind_the_stitch',
  'lookbook',
  'social_proof',
  'manifesto',
] as const

export type FashionAngle = (typeof FASHION_ANGLES)[number]

export const FASHION_DISCOVERY_SEEDS = [
  'representclo',
  'trapstarlondon',
  'corteizworld',
  'ami_paris',
  'jacquemus',
  'aimeleondore',
  'daily.paper',
  'patta',
  'newbalance',
  'carharttwip',
  'stussy',
  'palace.skateboards',
]

export function fashionAngleHint(caption = ''): string {
  const c = caption.toLowerCase()
  if (/drop|launch|sortie|nouvelle (pièce|collection)|new collection/.test(c)) return 'drop'
  if (/restock|retour|back in stock/.test(c)) return 'restock'
  if (/fit|outfit|porté|on me|ootd|look du jour/.test(c)) return 'fit_check'
  if (/pack|unbox|shipping|colis|order/.test(c)) return 'packing'
  if (/behind|atelier|stitch|sketch|coulisse|fabriqu/.test(c)) return 'behind_the_stitch'
  if (/lookbook|carousel|carrousel|collection/.test(c)) return 'lookbook'
  if (/customer|client|ugc|tagged|merci/.test(c)) return 'social_proof'
  return 'manifesto'
}
