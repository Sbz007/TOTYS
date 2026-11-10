import { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { JUGADORES } from './players'
import './App.css'

/* Formaciones (x, y = centro de la carta en % del póster).
   Cada hueco solo acepta jugadores de su misma posición.
   En esta app los extremos/bandas cuentan como delanteros (DEL).
   'compacto' reduce el tamaño de las cartas cuando hay 4 filas. */
const FORMACIONES = {
  '343': {
    nombre: '3-4-3',
    compacto: false,
    slots: [
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
    ],
  },
  '433': {
    nombre: '4-3-3',
    compacto: true,
    slots: [
      { id: 'del1', pos: 'DEL', x: 24, y: 23.5 },
      { id: 'del2', pos: 'DEL', x: 50, y: 23.5 },
      { id: 'del3', pos: 'DEL', x: 76, y: 23.5 },
      { id: 'med1', pos: 'MED', x: 26, y: 41.5 },
      { id: 'med2', pos: 'MED', x: 50, y: 41.5 },
      { id: 'med3', pos: 'MED', x: 74, y: 41.5 },
      { id: 'def1', pos: 'DEF', x: 14, y: 59.5 },
      { id: 'def2', pos: 'DEF', x: 38, y: 59.5 },
      { id: 'def3', pos: 'DEF', x: 62, y: 59.5 },
      { id: 'def4', pos: 'DEF', x: 86, y: 59.5 },
      { id: 'por', pos: 'POR', x: 50, y: 77 },
    ],
  },
  '442': {
    nombre: '4-4-2',
    compacto: true,
    slots: [
      { id: 'del1', pos: 'DEL', x: 38, y: 23.5 },
      { id: 'del2', pos: 'DEL', x: 62, y: 23.5 },
      { id: 'ban1', pos: 'DEL', x: 14, y: 41.5 },
      { id: 'med1', pos: 'MED', x: 38, y: 41.5 },
      { id: 'med2', pos: 'MED', x: 62, y: 41.5 },
      { id: 'ban2', pos: 'DEL', x: 86, y: 41.5 },
      { id: 'def1', pos: 'DEF', x: 14, y: 59.5 },
      { id: 'def2', pos: 'DEF', x: 38, y: 59.5 },
      { id: 'def3', pos: 'DEF', x: 62, y: 59.5 },
      { id: 'def4', pos: 'DEF', x: 86, y: 59.5 },
      { id: 'por', pos: 'POR', x: 50, y: 77 },
    ],
  },
}
const FORM_ORDEN = ['343', '433', '442']

// Navegadores integrados de apps (Facebook, Instagram, Messenger...): descargan y comparten mal.
const UA = typeof navigator !== 'undefined' ? navigator.userAgent : ''
const EN_APP = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|MicroMessenger|TikTok|musical_ly|Line\//i.test(UA)
const ES_ANDROID = /Android/i.test(UA)

// ¿Puede este jugador ir en este hueco?
const cabe = (slot, player) => slot.pos === player.pos

const ORDEN = ['POR', 'DEF', 'MED', 'DEL']

// >>> Pon aquí tu URL (sale abajo en la imagen al terminar el equipo)
const URL_SITIO = 'totys.vercel.app'

// >>> Estadísticas: pega aquí la URL de tu Apps Script (termina en /exec).
// Si queda vacía, no se envía nada.
const URL_VOTOS = 'https://script.google.com/macros/s/AKfycbxW_VWp-IPwzvwSwUeS9uHxT8sZSW4o-2DCSxm-mREZooTA1gVHwDFmLdra7KarlWyNLA/exec'

const IDIOMAS = [
  { c: 'es', l: 'ES' },
  { c: 'en', l: 'EN' },
  { c: 'pt', l: 'POR' },
]

const T = {
  es: {
    pos: { POR: 'POR', DEF: 'DEF', MED: 'MED', DEL: 'DEL' },
    grupos: { POR: 'Porteros', DEF: 'Defensas', MED: 'Medios', DEL: 'Delanteros' },
    fb: 'RECUERDA SEGUIR A ZEE IO EN FACEBOOK',
    titulo: 'Elige tu Equipo del Año',
    posterTitulo: 'EQUIPO DEL AÑO',
    ayuda: 'Toca una carta para colocarla en la cancha, o mantenla presionada y arrástrala hasta su puesto. Toca una carta de la cancha para quitarla.',
    terminar: 'Terminar equipo',
    tutTitulo: 'Arma tu equipo en 4 pasos',
    tutPasos: [
      { t: 'Elige tu formación', d: 'Después de este tutorial eliges entre 3-4-3, 4-3-3 y 4-4-2. Puedes cambiarla cuando quieras y tus jugadores se mantienen en su posición cuando es posible.' },
      { t: 'Elige la posición', d: 'Usa las pestañas para ver a los candidatos de cada línea: porteros, defensas, medios y delanteros.' },
      { t: 'Pon al jugador en su puesto', d: 'Toca una carta y irá al primer hueco libre, o mantenla presionada y arrástrala hasta su puesto. Toca una carta de la cancha para quitarla.' },
      { t: 'Guarda y comparte tu equipo', d: 'Cuando completes tu equipo, escribe tu nombre y descarga o comparte la imagen con tus elecciones.' },
    ],
    formTitulo: 'Elige tu formación',
    formCambiar: 'Formación',
    formCancelar: 'Cancelar',
    d343: '3 defensas · 2 medios · 5 delanteros',
    d433: '4 defensas · 3 medios · 3 delanteros',
    d442: '4 defensas · 2 medios · 4 delanteros',
    compartir: 'Compartir imagen',
    shareTexto: 'Mi Equipo del Año. Crea el tuyo en',
    shareNoDisp: 'Tu navegador no permite compartir; se descargó la imagen',
    appAviso: 'Estás viendo la página dentro de Facebook. Para descargar tu imagen sin problemas, ábrela en tu navegador.',
    appAbrir: 'Abrir en mi navegador',
    appCopiar: 'Copiar enlace',
    appCopiado: 'Enlace copiado. Pégalo en tu navegador',
    appMenu: 'Si no se abre, toca los tres puntos (⋯) y elige "Abrir en el navegador" o "Abrir en Safari".',
    vistaTitulo: 'Tu equipo está listo',
    vistaAyuda: 'Mantén presionada la imagen y elige "Guardar imagen" o "Descargar imagen".',
    cerrar: 'Cerrar',
    tutSig: 'Siguiente', tutAtras: 'Atrás', tutEmpezar: 'Empezar', tutSaltar: 'Saltar', tutAyuda: 'Cómo se juega',
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
    fb: 'REMEMBER TO FOLLOW ZEE IO ON FACEBOOK',
    titulo: 'Pick your Team of the Year',
    posterTitulo: 'TEAM OF THE YEAR',
    ayuda: 'Tap a card to place it on the pitch, or press and hold to drag it to its spot. Tap a card on the pitch to remove it.',
    terminar: 'Finish team',
    tutTitulo: 'Build your team in 4 steps',
    tutPasos: [
      { t: 'Pick your formation', d: 'After this tutorial you choose between 3-4-3, 4-3-3 and 4-4-2. You can change it any time and your players stay in their position when possible.' },
      { t: 'Pick a position', d: 'Use the tabs to see the candidates for each line: goalkeepers, defenders, midfielders and forwards.' },
      { t: 'Put the player in place', d: 'Tap a card and it goes to the first free spot, or press and hold to drag it to its spot. Tap a card on the pitch to remove it.' },
      { t: 'Save and share your team', d: 'When your team is complete, type your name and download or share the image with your picks.' },
    ],
    formTitulo: 'Pick your formation',
    formCambiar: 'Formation',
    formCancelar: 'Cancel',
    d343: '3 defenders · 2 midfielders · 5 forwards',
    d433: '4 defenders · 3 midfielders · 3 forwards',
    d442: '4 defenders · 2 midfielders · 4 forwards',
    compartir: 'Share image',
    shareTexto: 'My Team of the Year. Create yours at',
    shareNoDisp: 'Your browser can\'t share; the image was downloaded instead',
    appAviso: 'You\'re viewing this page inside Facebook. To download your image without problems, open it in your browser.',
    appAbrir: 'Open in my browser',
    appCopiar: 'Copy link',
    appCopiado: 'Link copied. Paste it in your browser',
    appMenu: 'If it doesn\'t open, tap the three dots (⋯) and choose "Open in browser" or "Open in Safari".',
    vistaTitulo: 'Your team is ready',
    vistaAyuda: 'Press and hold the image and choose "Save image" or "Download image".',
    cerrar: 'Close',
    tutSig: 'Next', tutAtras: 'Back', tutEmpezar: 'Start', tutSaltar: 'Skip', tutAyuda: 'How it works',
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
    fb: 'LEMBRE-SE DE SEGUIR O ZEE IO NO FACEBOOK',
    titulo: 'Escolha seu Time do Ano',
    posterTitulo: 'TIME DO ANO',
    ayuda: 'Toque em uma carta para colocá-la no campo, ou segure e arraste até o lugar. Toque em uma carta no campo para removê-la.',
    terminar: 'Finalizar time',
    tutTitulo: 'Monte seu time em 4 passos',
    tutPasos: [
      { t: 'Escolha sua formação', d: 'Depois deste tutorial você escolhe entre 3-4-3, 4-3-3 e 4-4-2. Você pode mudar quando quiser e seus jogadores continuam na posição quando possível.' },
      { t: 'Escolha a posição', d: 'Use as abas para ver os candidatos de cada linha: goleiros, defensores, meio-campistas e atacantes.' },
      { t: 'Coloque o jogador no lugar', d: 'Toque em uma carta e ela vai para a primeira vaga livre, ou segure e arraste até o lugar. Toque em uma carta do campo para removê-la.' },
      { t: 'Salve e compartilhe seu time', d: 'Quando seu time estiver completo, digite seu nome e baixe ou compartilhe a imagem com suas escolhas.' },
    ],
    formTitulo: 'Escolha sua formação',
    formCambiar: 'Formação',
    formCancelar: 'Cancelar',
    d343: '3 defensores · 2 meias · 5 atacantes',
    d433: '4 defensores · 3 meias · 3 atacantes',
    d442: '4 defensores · 2 meias · 4 atacantes',
    compartir: 'Compartilhar imagem',
    shareTexto: 'Meu Time do Ano. Crie o seu em',
    shareNoDisp: 'Seu navegador não permite compartilhar; a imagem foi baixada',
    appAviso: 'Você está vendo a página dentro do Facebook. Para baixar sua imagem sem problemas, abra no seu navegador.',
    appAbrir: 'Abrir no meu navegador',
    appCopiar: 'Copiar link',
    appCopiado: 'Link copiado. Cole no seu navegador',
    appMenu: 'Se não abrir, toque nos três pontos (⋯) e escolha "Abrir no navegador" ou "Abrir no Safari".',
    vistaTitulo: 'Seu time está pronto',
    vistaAyuda: 'Segure a imagem e escolha "Salvar imagem" ou "Baixar imagem".',
    cerrar: 'Fechar',
    tutSig: 'Próximo', tutAtras: 'Voltar', tutEmpezar: 'Começar', tutSaltar: 'Pular', tutAyuda: 'Como funciona',
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
      decoding="async"
      draggable={false}
      crossOrigin="anonymous"
      onError={() => setFallo(true)}
    />
  )
}

function FormacionMini({ slots }) {
  return (
    <svg className="mini" viewBox="0 8 100 82" aria-hidden="true">
      <rect x="3" y="11" width="94" height="76" rx="3" className="mini-campo" />
      <line x1="3" y1="49" x2="97" y2="49" className="mini-campo" />
      {slots.map((s) => (
        <circle key={s.id} cx={s.x} cy={s.y} r="5.2" className={s.pos === 'POR' ? 'mini-por' : 'mini-j'} />
      ))}
    </svg>
  )
}

function SelectorFormacion({ t, actual, obligatorio, onElegir, onCerrar }) {
  useEffect(() => {
    if (obligatorio) return
    const tecla = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [obligatorio, onCerrar])

  return (
    <div className="modal-bg">
      <div className="modal sel-form" role="dialog" aria-modal="true" aria-labelledby="sf-t">
        <h2 id="sf-t">{t.formTitulo}</h2>
        <div className="forms">
          {FORM_ORDEN.map((k) => (
            <button
              key={k}
              className={`form-card ${k === actual ? 'on' : ''}`}
              onClick={() => onElegir(k)}
            >
              <FormacionMini slots={FORMACIONES[k].slots} />
              <b>{FORMACIONES[k].nombre}</b>
              <span>{t['d' + k]}</span>
            </button>
          ))}
        </div>
        {!obligatorio && (
          <button className="link" onClick={onCerrar}>
            {t.formCancelar}
          </button>
        )}
      </div>
    </div>
  )
}

function Tutorial({ t, onClose }) {
  const [i, setI] = useState(0)
  const pasos = t.tutPasos
  const ultimo = i === pasos.length - 1

  useEffect(() => {
    const tecla = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [onClose])

  return (
    <div className="modal-bg">
      <div className="modal tut" role="dialog" aria-modal="true" aria-labelledby="tut-t">
        <h2 id="tut-t">{t.tutTitulo}</h2>

        <div className="tut-demo" aria-hidden="true">
          {i === 0 && (
            <div className="demo-forms">
              {FORM_ORDEN.map((k, n) => (
                <div key={k} style={{ animationDelay: `${n * 1.6}s` }}>
                  <FormacionMini slots={FORMACIONES[k].slots} />
                  <b>{FORMACIONES[k].nombre}</b>
                </div>
              ))}
            </div>
          )}
          {i === 1 && (
            <div className="demo-tabs">
              {['POR', 'DEF', 'MED', 'DEL'].map((p, k) => (
                <span key={p} style={{ animationDelay: `${k * 0.9}s` }}>
                  {t.grupos[p]}
                </span>
              ))}
            </div>
          )}
          {i === 2 && (
            <div className="demo-move">
              <div className="demo-slot" />
              <div className="demo-card" />
              <div className="demo-finger" />
            </div>
          )}
          {i === 3 && (
            <div className="demo-save">
              <div className="demo-btn">{t.descargar}</div>
              <div className="demo-btn sec">{t.compartir}</div>
              <div className="demo-check">✓</div>
            </div>
          )}
        </div>

        <div className="tut-paso" key={i}>
          <b>
            {i + 1}. {pasos[i].t}
          </b>
          <p>{pasos[i].d}</p>
        </div>

        <div className="tut-dots">
          {pasos.map((_, k) => (
            <span key={k} className={k === i ? 'on' : ''} />
          ))}
        </div>

        <div className="tut-nav">
          {i > 0 ? (
            <button className="link" onClick={() => setI(i - 1)}>
              {t.tutAtras}
            </button>
          ) : (
            <button className="link" onClick={onClose}>
              {t.tutSaltar}
            </button>
          )}
          <button className="btn" autoFocus onClick={() => (ultimo ? onClose() : setI(i + 1))}>
            {ultimo ? t.tutEmpezar : t.tutSig}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [lineup, setLineup] = useState({}) // slotId -> playerId
  const [tab, setTab] = useState('POR')
  const [drag, setDrag] = useState(null)
  const [nombre, setNombre] = useState('')
  const [modal, setModal] = useState(false)
  const [tutorial, setTutorial] = useState(true) // se muestra al entrar
  const [formacion, setFormacion] = useState('343')
  const [eligiendo, setEligiendo] = useState(false) // selector de formación abierto
  const [eligio, setEligio] = useState(false) // ya eligió formación al menos una vez
  const [bannerApp, setBannerApp] = useState(EN_APP) // aviso "ábrelo en tu navegador"
  const [vista, setVista] = useState(null) // imagen lista para guardar a mano (navegadores de apps)
  const SLOTS = FORMACIONES[formacion].slots
  const [aviso, setAviso] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [w, setW] = useState(600)

  // Precarga en segundo plano las cartas de las otras pestañas (cuando el navegador está libre),
  // para que al cambiar de posición ya estén en caché
  useEffect(() => {
    const cargar = () => JUGADORES.forEach((j) => { new Image().src = j.img })
    const id = 'requestIdleCallback' in window
      ? window.requestIdleCallback(cargar, { timeout: 4000 })
      : setTimeout(cargar, 1500)
    return () => {
      if ('cancelIdleCallback' in window) window.cancelIdleCallback(id)
      else clearTimeout(id)
    }
  }, [])
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
      // En celular: toque corto = colocar/quitar; deslizar = scroll; mantener presionado = arrastrar.
      const pend = { player, from, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY }
      // Mantener presionado un instante (sin mover) convierte el toque en arrastre
      pend.timer = setTimeout(() => {
        if (pendRef.current !== pend) return
        pendRef.current = null
        const d = { player, from, x: pend.x, y: pend.y, sx: pend.sx, sy: pend.sy, moved: true }
        dragRef.current = d
        setDrag(d)
        try {
          navigator.vibrate?.(15)
        } catch {}
      }, 280)
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
    if (!cabe(slot, player)) {
      avisar(t.soloAqui(t.grupos[slot.pos].toLowerCase()))
      return
    }
    // Al intercambiar, el jugador que estaba en el destino debe caber en el hueco de origen
    const previoDestino = lineup[slot.id]
    if (from && from !== slot.id && previoDestino) {
      const origen = SLOTS.find((s) => s.id === from)
      if (!cabe(origen, porId[previoDestino])) {
        avisar(t.soloAqui(t.grupos[origen.pos].toLowerCase()))
        return
      }
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

  // Al arrastrar cerca del borde superior/inferior, la página se desplaza sola
  // (en celular la lista de cartas y la cancha no caben juntas en pantalla)
  const arrastrando = !!drag?.moved
  useEffect(() => {
    if (!arrastrando) return
    let raf
    const paso = () => {
      const d = dragRef.current
      if (d) {
        const zona = 100
        const v = 18
        if (d.y < zona) window.scrollBy(0, -Math.ceil((v * (zona - d.y)) / zona))
        else if (d.y > window.innerHeight - zona)
          window.scrollBy(0, Math.ceil((v * (d.y - (window.innerHeight - zona))) / zona))
      }
      raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [arrastrando])

  /* ---------- Formación ---------- */
  // Los jugadores se conservan por posición, en el orden en que estaban, mientras haya huecos
  const cambiarFormacion = (key) => {
    const porPos = {}
    SLOTS.forEach((s) => {
      const id = lineup[s.id]
      if (id) (porPos[s.pos] = porPos[s.pos] || []).push(id)
    })
    const nuevo = {}
    FORMACIONES[key].slots.forEach((s) => {
      const fila = porPos[s.pos]
      if (fila && fila.length) nuevo[s.id] = fila.shift()
    })
    setLineup(nuevo)
    setFormacion(key)
    setEligio(true)
    setEligiendo(false)
  }

  const cerrarTutorial = () => {
    setTutorial(false)
    if (!eligio) setEligiendo(true) // después del tutorial toca elegir formación
  }

  /* ---------- Registrar el voto (Google Sheets) ---------- */
  // Se cuenta al descargar/compartir. El mismo equipo no suma dos veces en el mismo navegador.
  const registrarVoto = () => {
    if (!URL_VOTOS) return
    const jugadores = SLOTS.map((s) => porId[lineup[s.id]])
      .filter(Boolean)
      .map((j) => ({ id: j.id, nombre: j.nombre }))
    if (jugadores.length !== SLOTS.length) return
    const firma = formacion + ':' + jugadores.map((j) => j.id).sort().join(',')
    try {
      if (localStorage.getItem('toty-voto') === firma) return
    } catch {}
    fetch(URL_VOTOS, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ formacion, idioma: lang, jugadores }),
    })
      .then(() => {
        try {
          localStorage.setItem('toty-voto', firma)
        } catch {}
      })
      .catch(() => {})
  }

  /* ---------- Navegador de la app (Facebook, etc.) ---------- */
  const abrirExterno = () => {
    // Android: intenta abrir el enlace en el navegador predeterminado
    window.location.href = `intent://${window.location.host}${window.location.pathname}${window.location.search}#Intent;scheme=https;end`
  }
  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      avisar(t.appCopiado)
    } catch {
      window.prompt(t.appCopiar, window.location.href)
    }
  }

  /* ---------- Descargar y compartir imagen ---------- */
  const generar = async () => {
    await document.fonts?.ready
    const el = posterRef.current
    return html2canvas(el, {
      scale: 1440 / el.offsetWidth,
      useCORS: true,
      backgroundColor: null,
    })
  }
  const nombreArchivo = () =>
    `equipo-del-año-${nombre.trim().replace(/\s+/g, '-') || 'dls'}.png`
  const bajar = (canvas) => {
    if (EN_APP) {
      // Los navegadores de Facebook/Instagram bloquean las descargas: se muestra la imagen para guardarla a mano
      setVista(canvas.toDataURL('image/png'))
      return
    }
    const a = document.createElement('a')
    a.download = nombreArchivo()
    a.href = canvas.toDataURL('image/png')
    a.click()
  }

  const descargar = async () => {
    setGuardando(true)
    try {
      bajar(await generar())
      registrarVoto()
    } catch (err) {
      console.error(err)
      avisar(t.error)
    } finally {
      setGuardando(false)
    }
  }

  const compartir = async () => {
    setGuardando(true)
    try {
      const canvas = await generar()
      const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/png'))
      if (!blob) throw new Error('No se pudo crear la imagen')
      const file = new File([blob], nombreArchivo(), { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: t.posterTitulo,
          text: `${t.shareTexto} https://${URL_SITIO}`,
        })
        registrarVoto()
      } else {
        bajar(canvas) // navegador sin soporte: se descarga
        registrarVoto()
        if (!EN_APP) avisar(t.shareNoDisp)
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error(err)
        avisar(t.error)
      }
    } finally {
      setGuardando(false)
    }
  }

  const nombreLimpio = nombre.trim()

  return (
    <div className="app">
      {bannerApp && (
        <div className="banner-app" role="alert">
          <p>{t.appAviso}</p>
          <div className="banner-btns">
            {ES_ANDROID && (
              <button className="btn" onClick={abrirExterno}>
                {t.appAbrir}
              </button>
            )}
            <button className="btn sec" onClick={copiarEnlace}>
              {t.appCopiar}
            </button>
            <button className="link" onClick={() => setBannerApp(false)}>
              {t.cerrar}
            </button>
          </div>
          <small>{t.appMenu}</small>
        </div>
      )}

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
        <button className="lang-help" onClick={() => setTutorial(true)} title={t.tutAyuda} aria-label={t.tutAyuda}>
          ?
        </button>
      </div>

      {tutorial && <Tutorial t={t} onClose={cerrarTutorial} />}

      {eligiendo && !tutorial && (
        <SelectorFormacion
          t={t}
          actual={formacion}
          obligatorio={!eligio}
          onElegir={cambiarFormacion}
          onCerrar={() => setEligiendo(false)}
        />
      )}

      {/* ================= PÓSTER (lo que se descarga) ================= */}
      <div className="poster-wrap">
        <div className={`poster ${FORMACIONES[formacion].compacto ? 'compacto' : ''}`} ref={posterRef} style={{ '--w': `${w}px` }}>
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
            const valida = drag?.moved && cabe(s, drag.player)
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
                <em>{t.fb}</em>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= PANEL DE CANDIDATOS ================= */}
      <section className="panel">
        <h1>{t.titulo}</h1>
        <button className="form-btn" onClick={() => setEligiendo(true)}>
          {t.formCambiar}: <b>{FORMACIONES[formacion].nombre}</b>
        </button>
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

      {vista && (
        <div className="modal-bg">
          <div className="modal vista" role="dialog" aria-modal="true" aria-labelledby="vt">
            <h2 id="vt">{t.vistaTitulo}</h2>
            <img src={vista} alt={t.posterTitulo} />
            <p>{t.vistaAyuda}</p>
            <button className="btn" onClick={() => setVista(null)}>
              {t.cerrar}
            </button>
          </div>
        </div>
      )}

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
              <>
                <button className="btn" onClick={descargar} disabled={guardando}>
                  {guardando ? t.generando : t.descargar}
                </button>
                <button className="btn sec" onClick={compartir} disabled={guardando}>
                  {t.compartir}
                </button>
              </>
            )}
            <p className="modal-fb">{t.fb}</p>
            <button className="link" onClick={() => setModal(false)}>
              {t.editar}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
