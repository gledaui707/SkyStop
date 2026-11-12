// Airline registry. Logos live in /public/assets/airlines and are keyed by IATA code,
// so they can be replaced without touching UI components.
export interface Airline { code: string; name: string; logo: string }

export const AIRLINES: Record<string, Airline> = {
  SQ: { code: 'SQ', name: 'Singapore Airlines', logo: '/assets/airlines/SQ.png' },
  EK: { code: 'EK', name: 'Emirates', logo: '/assets/airlines/EK.png' },
  AF: { code: 'AF', name: 'Air France', logo: '/assets/airlines/AF.png' },
  KL: { code: 'KL', name: 'KLM', logo: '/assets/airlines/KL.png' },
  TK: { code: 'TK', name: 'Turkish Airlines', logo: '/assets/airlines/TK.png' },
}
