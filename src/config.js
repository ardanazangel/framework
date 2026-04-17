import { home } from './pages/home.js'
import { about } from './pages/about.js'
import { morphing } from './pages/morphing.js'
import { slider } from './pages/slider.js'

// Tipos de ruta que se prefetchean al arrancar
export const PREFETCH_TYPES = new Set(['home', 'about', 'project'])

// Módulos por ruta: preload, init, on, off, destroy
export const pageModules = {
  '/':         home,
  '/about':    about,
  '/morphing': morphing,
  '/slider':   slider,
}
