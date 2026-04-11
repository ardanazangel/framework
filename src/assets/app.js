export const state = {
  route: {
    current: null,
    previous: null,
  },
}

// Hooks de lifecycle — callbacks directos, sin pub/sub.
// El router los llama, entry-client.js los asigna.
export const hooks = {
  beforeInsert: null, // ({ path, el }) => void
  mount:        null, // ({ path })      => void
  destroy:      null, // ({ path })      => void
}
