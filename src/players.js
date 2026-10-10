// ============================================================
//  TUS JUGADORES
//  Cada jugador: { id, pos, nombre, img }
//  pos: 'POR' | 'DEF' | 'MED' | 'DEL'
//  Pon las imágenes de las cartas en /public/cartas/
//  (ej: public/cartas/por-1.png se usa como "/cartas/por-1.png")
// ============================================================

const lista = (pos, prefijo, nombres) =>
  nombres.map((nombre, i) => ({
    id: `${prefijo}-${i + 1}`,
    pos,
    nombre,
    img: `/cartas/${prefijo}-${i + 1}.png`,
  }))

// Reemplaza estos nombres de relleno por los reales (mismo orden que tus imágenes).
export const JUGADORES = [
  ...lista('POR', 'por', Array.from({ length: 5 }, (_, i) => `Portero ${i + 1}`)),
  ...lista('DEF', 'def', Array.from({ length: 10 }, (_, i) => `Defensa ${i + 1}`)),
  ...lista('MED', 'med', Array.from({ length: 10 }, (_, i) => `Medio ${i + 1}`)),
  ...lista('DEL', 'del', Array.from({ length: 12 }, (_, i) => `Delantero ${i + 1}`)),
]
