/**
 * Constantes globales du hub.
 * Toutes les coordonnées « monde » sont exprimées en pixels de l'image de la ville (3168 × 1344).
 */
export const WORLD = { width: 3168, height: 1344 } as const;

export const PARALLAX = {
  /** Le ciel défile plus lentement que la ville → profondeur. */
  sky: 0.55,
  /** Brume lointaine (entre le ciel et la ville). */
  farFog: 0.75,
  /** Premier plan (brume basse, cendres) : plus rapide que la ville. */
  front: 1.18,
  /** Amplitude (px monde) du léger décalage suivant la souris. */
  mouse: { sky: 18, city: 6, front: 26 },
} as const;

export const SKY = {
  /** Le ciel est légèrement agrandi pour couvrir toute la zone de défilement. */
  scale: 1.1,
  /** Position X de la Tour de l'Infini dans la texture du ciel. */
  towerX: 1570,
  /** Position X (monde) derrière laquelle la Tour doit apparaître quand la caméra est centrée. */
  alignWorldX: 1727,
} as const;

/** Cristal d'invocation extrait de l'image (il flotte au-dessus de l'autel). */
export const CRYSTAL = { x: 1584, y: 294, w: 286, h: 390 } as const;

export const CAMERA = {
  dragInertia: 5.5,
  follow: 12,
  wheelSpeed: 1.4,
  keySpeed: 1400,
  edgeSize: 36,
  edgeSpeed: 900,
  rubberBand: 140,
} as const;
