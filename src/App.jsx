import { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { JUGADORES } from './players'
import './App.css'

/* Formación 3-4-3 (x, y = centro de la carta en % del póster).
   Solo acepta jugadores de su misma posición. */
const SLOTS = [
  { id: 'del1', pos: 'DEL', x: 28.4, y: 25 },
  { id: 'del2', pos: 'DEL', x: 51, y: 30 },
  { id: 'del3', pos: 'DEL', x: 73, y: 25 },
  { id: 'ban1', pos: 'DEL', x: 16, y: 44.5 },
  { id: 'med1', pos: 'MED', x: 38.7, y: 49.5 },
  { id: 'med2', pos: 'MED', x: 62, y: 49.5 },
  { id: 'ban2', pos: 'DEL', x: 85, y: 44.5 },
  { id: 'def1', pos: 'DEF', x: 16.7, y: 67.5 },
  { id: 'por', pos: 'POR', x: 38.5, y: 73.5 },
  { id: 'def2', pos: 'DEF', x: 62, y: 73.5 },
  { id: 'def3', pos: 'DEF', x: 85, y: 67.5 },
]

const ORDEN = ['POR', 'DEF', 'MED', 'DEL']

// >>> Pon aquí tu URL (sale abajo en la imagen al terminar el equipo)
const URL_SITIO = 'https://totys.vercel.app/'

const IDIOMAS = [
  { c: 'es', l: 'ES' },
  { c: 'en', l: 'EN' },
  { c: 'pt', l: 'POR' },
]

const T = {
  es: {
    pos: { POR: 'POR', DEF: 'DEF', MED: 'MED', DEL: 'DEL' },
    grupos: { POR: 'Porteros', DEF: 'Defensas', MED: 'Medios', DEL: 'Delanteros' },
    titulo: 'Elige tu Equipo del Año',
    posterTitulo: 'EQUIPO DEL AÑO',
    ayuda: 'Toca una carta para colocarla, o mantenla presionada y arrástrala a la cancha. Toca una carta de la cancha para quitarla.',
    terminar: 'Terminar equipo',
    nombreQ: '¿Cuál es tu nombre?',
    placeholder: 'Escribe tu nombre',
    descargar: 'Descargar imagen con los resultados',
    generando: 'Generando…',
    editar: 'Editar mi equipo',
    bandaNombre: (n) => `EQUIPO DE ${n}`,
    bandaVacia: 'ARMA TU EQUIPO',
    cta: 'CREADO POR ZEE IO EN',
    soloAqui: (g) => `Ahí solo van ${g}`,
    error: 'No se pudo generar la imagen',
    quitar: 'Arrastra para mover o toca para quitar',
  },
  en: {
    pos: { POR: 'GK', DEF: 'DEF', MED: 'MID', DEL: 'FWD' },
    grupos: { POR: 'Goalkeepers', DEF: 'Defenders', MED: 'Midfielders', DEL: 'Forwards' },
    titulo: 'Pick your Team of the Year',
    posterTitulo: 'TEAM OF THE YEAR',
    ayuda: 'Tap a card to place it, or press and hold to drag it onto the pitch. Tap a card on the pitch to remove it.',
    terminar: 'Finish team',
    nombreQ: "What's your name?",
    placeholder: 'Type your name',
    descargar: 'Download image with the results',
    generando: 'Generating…',
    editar: 'Edit my team',
    bandaNombre: (n) => `${n}'S TEAM`,
    bandaVacia: 'BUILD YOUR TEAM',
    cta: 'CREATED BY ZEE IO AT',
    soloAqui: (g) => `Only ${g} go here`,
    error: 'Could not generate the image',
    quitar: 'Drag to move or tap to remove',
  },
  pt: {
    pos: { POR: 'GOL', DEF: 'ZAG', MED: 'MEI', DEL: 'ATA' },
    grupos: { POR: 'Goleiros', DEF: 'Defensores', MED: 'Meio-campistas', DEL: 'Atacantes' },
    titulo: 'Escolha seu Time do Ano',
    posterTitulo: 'TIME DO ANO',
    ayuda: 'Toque em uma carta para colocá-la, ou segure e arraste para o campo. Toque em uma carta no campo para removê-la.',
    terminar: 'Finalizar time',
    nombreQ: 'Qual é o seu nome?',
    placeholder: 'Digite seu nome',
    descargar: 'Baixar imagem com os resultados',
    generando: 'Gerando…',
    editar: 'Editar meu time',
    bandaNombre: (n) => `TIME DE ${n}`,
    bandaVacia: 'MONTE SEU TIME',
    cta: 'CRIADO POR ZEE IO EM',
    soloAqui: (g) => `Aqui só vão ${g}`,
    error: 'Não foi possível gerar a imagem',
    quitar: 'Arraste para mover ou toque para remover',
  },
}

function Marca({ src, alt, className, fallback }) {
  const [fallo, setFallo] = useState(false)
  if (fallo) return fallback
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      draggable={false}
      crossOrigin="anonymous"
      onError={() => setFallo(true)}
    />
  )
}

function Carta({ p, t }) {
  const [fallo, setFallo] = useState(false)
  if (fallo) {
    return (
      <div className="carta-fallback">
        <b>{p.nombre}</b>
        <span>{t.pos[p.pos]}</span>
      </div>
    )
  }
  return (
    <img
      className="carta-img"
      src={p.img}
      alt={p.nombre}
      draggable={false}
      crossOrigin="anonymous"
      onError={() => setFallo(true)}
    />
  )
}

export default function App() {
  const [lineup, setLineup] = useState({}) // slotId -> playerId
  const [tab, setTab] = useState('POR')
  const [drag, setDrag] = useState(null)
  const [nombre, setNombre] = useState('')
  const [modal, setModal] = useState(false)
  const [aviso, setAviso] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [w, setW] = useState(600)
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('toty-lang') || 'es'
    } catch {
      return 'es'
    }
  })
  const t = T[lang]

  const dragRef = useRef(null)
  const pendRef = useRef(null) // toque pendiente (esperando mantener presionado)
  const soltarRef = useRef(null)
  const posterRef = useRef(null)
  const avisoTimer = useRef(null)

  const porId = useMemo(
    () => Object.fromEntries(JUGADORES.map((j) => [j.id, j])),
    []
  )
  const usados = new Set(Object.values(lineup))
  const completo = Object.keys(lineup).length === SLOTS.length

  // Ancho real del póster (para escalar textos dentro de la captura)
  useEffect(() => {
    const el = posterRef.current
    const ro = new ResizeObserver(() => setW(el.offsetWidth))
    ro.observe(el)
    setW(el.offsetWidth)
    return () => ro.disconnect()
  }, [])

  // Al completar el equipo se abre el cuadro del nombre
  useEffect(() => {
    setModal(completo)
  }, [completo])

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem('toty-lang', lang)
    } catch {}
  }, [lang])

  const avisar = (msg) => {
    setAviso(msg)
    clearTimeout(avisoTimer.current)
    avisoTimer.current = setTimeout(() => setAviso(''), 2200)
  }

  /* ---------- Arrastrar (mouse y touch con pointer events) ---------- */
  const empezar = (e, player, from) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (e.pointerType === 'touch') {
      // En celular el deslizamiento hace scroll; para arrastrar hay que mantener presionado.
      const pend = { player, from, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY }
      pend.timer = setTimeout(() => {
        if (pendRef.current !== pend) return
        pendRef.current = null
        const d = { player, from, x: pend.x, y: pend.y, sx: pend.sx, sy: pend.sy, moved: true }
        dragRef.current = d
        setDrag(d)
        try { navigator.vibrate?.(15) } catch {}
      }, 230)
      pendRef.current = pend
      return
    }
    e.preventDefault()
    const d = {
      player,
      from,
      x: e.clientX,
      y: e.clientY,
      sx: e.clientX,
      sy: e.clientY,
      moved: false,
    }
    dragRef.current = d
    setDrag(d)
  }

  const soltar = (d, x, y) => {
    const { player, from } = d
    const quitar = () =>
      setLineup((l) => {
        const n = { ...l }
        delete n[from]
        return n
      })

    // Un toque simple: colocar en el primer hueco libre / quitar la carta
    if (!d.moved) {
      if (from) return quitar()
      setLineup((l) => {
        if (Object.values(l).includes(player.id)) return l
        const libre = SLOTS.find((s) => s.pos === player.pos && !l[s.id])
        return libre ? { ...l, [libre.id]: player.id } : l
      })
      return
    }

    const destino = document.elementFromPoint(x, y)?.closest('[data-slot]')
    if (!destino) {
      if (from) quitar()
      return
    }
    const slot = SLOTS.find((s) => s.id === destino.dataset.slot)
    if (slot.pos !== player.pos) {
      avisar(t.soloAqui(t.grupos[slot.pos].toLowerCase()))
      return
    }
    setLineup((l) => {
      const n = { ...l }
      const previo = n[slot.id]
      n[slot.id] = player.id
      if (from && from !== slot.id) {
        if (previo) n[from] = previo
        else delete n[from]
      }
      return n
    })
  }

  soltarRef.current = soltar
  useEffect(() => {
    const mover = (e) => {
      const pend = pendRef.current
      if (pend) {
        pend.x = e.clientX
        pend.y = e.clientY
        // Si el dedo se mueve antes de tiempo, es un scroll: no arrastrar
        if (Math.hypot(e.clientX - pend.sx, e.clientY - pend.sy) > 8) {
          clearTimeout(pend.timer)
          pendRef.current = null
        }
        return
      }
      const d = dragRef.current
      if (!d) return
      const moved =
        d.moved || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6
      const nd = { ...d, x: e.clientX, y: e.clientY, moved }
      dragRef.current = nd
      setDrag(nd)
    }
    const fin = (e) => {
      const pend = pendRef.current
      if (pend) {
        clearTimeout(pend.timer)
        pendRef.current = null
        // Toque corto (sin scroll): colocar / quitar la carta
        if (e.type === 'pointerup')
          soltarRef.current({ player: pend.player, from: pend.from, moved: false }, e.clientX, e.clientY)
        return
      }
      const d = dragRef.current
      dragRef.current = null
      setDrag(null)
      if (d && e.type === 'pointerup') soltarRef.current(d, e.clientX, e.clientY)
    }
    // Mientras se arrastra con el dedo, la página no debe hacer scroll
    const bloquear = (e) => {
      if (dragRef.current && e.cancelable) e.preventDefault()
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', fin)
    window.addEventListener('pointercancel', fin)
    window.addEventListener('touchmove', bloquear, { passive: false })
    return () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', fin)
      window.removeEventListener('pointercancel', fin)
      window.removeEventListener('touchmove', bloquear)
    }
  }, [])

  /* ---------- Descargar imagen ---------- */
  const descargar = async () => {
    setGuardando(true)
    try {
      await document.fonts?.ready
      const el = posterRef.current
      const canvas = await html2canvas(el, {
        scale: 1440 / el.offsetWidth,
        useCORS: true,
        backgroundColor: null,
      })
      const a = document.createElement('a')
      const limpio = nombre.trim().replace(/\s+/g, '-')
      a.download = `equipo-del-año-${limpio || 'dls'}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    } catch (err) {
      console.error(err)
      avisar(t.error)
    } finally {
      setGuardando(false)
    }
  }

  const nombreLimpio = nombre.trim()

  return (
    <div className="app">
      <div className="lang" role="group" aria-label="Idioma / Language">
        {IDIOMAS.map((i) => (
          <button
            key={i.c}
            aria-pressed={lang === i.c}
            onClick={() => setLang(i.c)}
          >
            {i.l}
          </button>
        ))}
      </div>

      {/* ================= PÓSTER (lo que se descarga) ================= */}
      <div className="poster-wrap">
        <div className="poster" ref={posterRef} style={{ '--w': `${w}px` }}>
          <div className="p-head">
            <div className="p-title">{t.posterTitulo}</div>
          </div>
          <div className="p-logo">
            <Marca
              src="/logo.png"
              alt="TOTY DLS"
              className="p-logo-img"
              fallback={
                <>
                  TOTY<small>DLS</small>
                </>
              }
            />
          </div>

          <div className="cancha" />

          {SLOTS.map((s) => {
            const p = porId[lineup[s.id]]
            const valida = drag?.moved && drag.player.pos === s.pos
            return (
              <div
                key={s.id}
                data-slot={s.id}
                className={`slot ${p ? 'lleno' : 'vacio'} ${valida ? 'valida' : ''}`}
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
              >
                {p ? (
                  <div
                    className={`arrastrable ${
                      drag?.moved && drag.from === s.id ? 'fantasma' : ''
                    }`}
                    title={t.quitar}
                    onPointerDown={(e) => empezar(e, p, s.id)}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <Carta p={p} t={t} />
                  </div>
                ) : (
                  <span>{t.pos[s.pos]}</span>
                )}
              </div>
            )
          })}

          <div className="p-foot">
            <div className="p-band">
              {nombreLimpio
                ? t.bandaNombre(nombreLimpio.toUpperCase())
                : t.bandaVacia}
            </div>
            <div className="p-brand">
              <Marca
                src="/marca.png"
                alt=""
                className="p-marca"
                fallback={<span>DLS</span>}
              />
            </div>
            {completo && (
              <div className="p-cta">
                <span>{t.cta}</span>
                <b>{URL_SITIO}</b>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= PANEL DE CANDIDATOS ================= */}
      <section className="panel">
        <h1>{t.titulo}</h1>
        <div className="tabs" role="tablist">
          {ORDEN.map((p) => {
            const total = SLOTS.filter((s) => s.pos === p).length
            const puestos = SLOTS.filter((s) => s.pos === p && lineup[s.id]).length
            return (
              <button
                key={p}
                role="tab"
                aria-selected={tab === p}
                onClick={() => setTab(p)}
              >
                {t.grupos[p]}
                <em>
                  {puestos}/{total}
                </em>
              </button>
            )
          })}
        </div>

        <div className="grid">
          {JUGADORES.filter((j) => j.pos === tab).map((j) => {
            const usado = usados.has(j.id)
            return (
              <div
                key={j.id}
                className={`op ${usado ? 'usado' : ''}`}
                title={j.nombre}
                onPointerDown={usado ? undefined : (e) => empezar(e, j, null)}
                onContextMenu={(e) => e.preventDefault()}
              >
                <Carta p={j} t={t} />
              </div>
            )
          })}
        </div>

        <p className="ayuda">
          {t.ayuda}
        </p>

        {completo && !modal && (
          <button className="btn" onClick={() => setModal(true)}>
            {t.terminar}
          </button>
        )}
      </section>

      {/* Carta que sigue al dedo / mouse */}
      {drag?.moved && (
        <div className="ghost" style={{ left: drag.x, top: drag.y }}>
          <Carta p={drag.player} t={t} />
        </div>
      )}

      {aviso && <div className="aviso">{aviso}</div>}

      {/* ================= CUADRO DEL NOMBRE ================= */}
      {modal && (
        <div className="modal-bg">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="mt">
            <h2 id="mt">{t.nombreQ}</h2>
            <input
              autoFocus
              value={nombre}
              maxLength={24}
              placeholder={t.placeholder}
              onChange={(e) => setNombre(e.target.value)}
            />
            {nombreLimpio && (
              <button className="btn" onClick={descargar} disabled={guardando}>
                {guardando ? t.generando : t.descargar}
              </button>
            )}
            <button className="link" onClick={() => setModal(false)}>
              {t.editar}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
