export function nextWeekFrom(base = new Date()): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + 7)
  return d
}

export function nextWeekday(name: string, base = new Date()): Date {
  const map: Record<string, number> = {
    'domingo': 0, 'segunda': 1, 'segunda-feira': 1, 'terca': 2, 'terça': 2,
    'terça-feira': 2, 'quarta': 3, 'quarta-feira': 3, 'quinta': 4,
    'quinta-feira': 4, 'sexta': 5, 'sexta-feira': 5, 'sabado': 6, 'sábado': 6
  }
  const target = map[name.toLowerCase()]
  const d = new Date(base)
  if (target == null) return d
  const diff = (target + 7 - d.getDay()) % 7 || 7
  d.setDate(d.getDate() + diff)
  return d
}

export function toISODate(d: Date) {
  return d.toISOString().split('T')[0]
}

export function naturalToISO(text: string, base = new Date()): string | undefined {
  const t = text.toLowerCase().trim()
  if (/^hoje$/.test(t)) return toISODate(base)
  if (/^amanh(ã|a)$/.test(t)) return toISODate(new Date(base.getTime() + 86400000))
  if (/depois de amanh(ã|a)/.test(t)) return toISODate(new Date(base.getTime() + 2 * 86400000))
  if (/semana que vem/.test(t)) return toISODate(nextWeekFrom(base))
  if (/segunda|terça|terca|quarta|quinta|sexta|s[áa]bado|domingo/.test(t)) {
    const weekday = t.split(/\s/)[0]
    return toISODate(nextWeekday(weekday, base))
  }
  return undefined
}

