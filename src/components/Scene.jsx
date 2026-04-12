import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'

function Cube() {
  const ref = useRef()

  useFrame((_, delta) => {
    ref.current.rotation.x += delta * 0.6
    ref.current.rotation.y += delta * 0.6
  })

  return (
    <mesh ref={ref}>
      <boxGeometry args={[1, 1, 1]} />
      <meshNormalMaterial />
    </mesh>
  )
}

export function Scene() {
  return (
    <Canvas style={{ width: '100%', height: '400px' }}>
      <Cube />
    </Canvas>
  )
}
