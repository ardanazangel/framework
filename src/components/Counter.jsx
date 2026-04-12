import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <p>count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>+</button>
      <button onClick={() => setCount(c => c - 1)} style={{ marginLeft: '1rem' }}>-</button>
    </div>
  )
}
