export const SEARCH_CATEGORIES = [
  { value: 'vehicles', label: 'Veículos', hint: 'Carros, vans e utilitários' },
  { value: 'audio', label: 'Som Automotivo', hint: 'Subwoofer, módulo, multimídia, alto-falante' },
  { value: 'engine_parts', label: 'Motor e Peças', hint: 'Motor, cabeçote, câmbio, injeção, peças' },
  { value: 'wheels_tires', label: 'Rodas e Pneus', hint: 'Rodas, pneus, aro, tala' },
  { value: 'suspension', label: 'Suspensão', hint: 'Rosca, fixa, mola, amortecedor, suspensão a ar' },
  { value: 'accessories', label: 'Acessórios', hint: 'Farol, volante, banco, multimídia, estética' },
  { value: 'performance', label: 'Performance / Turbo', hint: 'Turbina, intercooler, wastegate, preparação' },
] as const

export type SearchCategory = typeof SEARCH_CATEGORIES[number]['value']

export function categoryLabel(value?: string | null) {
  return SEARCH_CATEGORIES.find(x => x.value === value)?.label || 'Veículos'
}

export function normalizeCategory(value?: string | null): SearchCategory {
  return SEARCH_CATEGORIES.some(x => x.value === value)
    ? value as SearchCategory
    : 'vehicles'
}

export function categorySearchBoost(category: SearchCategory) {
  switch (category) {
    case 'audio':
      return 'som automotivo'
    case 'engine_parts':
      return 'motor peças automotivas'
    case 'wheels_tires':
      return 'rodas pneus automotivos'
    case 'suspension':
      return 'suspensão automotiva'
    case 'accessories':
      return 'acessórios automotivos'
    case 'performance':
      return 'turbo performance automotiva'
    default:
      return ''
  }
}

export function categorySearchBase(category: SearchCategory) {
  // Veículos usa a área específica. Para as demais categorias usamos Autos e Peças
  // em modo amplo, evitando depender de slugs internos da OLX que podem mudar.
  if (category === 'vehicles') {
    return 'https://www.olx.com.br/autos-e-pecas/carros-vans-e-utilitarios'
  }
  return 'https://www.olx.com.br/autos-e-pecas'
}
