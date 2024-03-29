import * as THREE from 'three'
import { createContext, useMemo, useRef, useState, useContext, useLayoutEffect, forwardRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { QuadraticBezierLine, Text, Line } from '@react-three/drei'
import { useDrag } from '@use-gesture/react'

const context = createContext()
const Circle = forwardRef(({ children, opacity = 1, radius = 0.05, segments = 32, color = '#ff1050', ...props }, ref) => (
  <mesh ref={ref} {...props}>
    <circleGeometry args={[radius, segments]} />
    <meshBasicMaterial transparent={opacity < 1} opacity={opacity} color={color} />
    {children}
  </mesh>
))

export const LineX = ({ cx, cy, distance }) => {
  return (
    <Line
      points={[
        [-cx, -cy, -distance],
        [cx, -cy, -distance],
        [cx, cy, -distance],
        [-cx, cy, -distance],
        [-cx, -cy, -distance],
      ]} // Array of points, Array<Vector3 | Vector2 | [number, number, number] | [number, number] | number>
      color={'#23aaff'} // Default
      lineWidth={1} // In pixels (default)
      // segments                        // If true, renders a THREE.LineSegments2. Otherwise, renders a THREE.Line2
    />
  )
}

export function Nodes({ children }) {
  const group = useRef()
  const [nodes, set] = useState([])
  const lines = useMemo(() => {
    const lines = []
    for (let node of nodes)
      node.connectedTo
        .map((ref) => [node.position, ref.current.position])
        .forEach(([start, end]) => lines.push({ start: start.clone().add({ x: 0.35, y: 0, z: 0 }), end: end.clone().add({ x: -0.35, y: 0, z: 0 }) }))
    return lines
  }, [nodes])
  useFrame((_, delta) => group.current.children.forEach((group) => (group.children[0].material.uniforms.dashOffset.value -= delta * 10)))
  return (
    <context.Provider value={set}>
      <group ref={group}>
        {lines.map((line, index) => (
          <group>
            <QuadraticBezierLine key={index} {...line} color="white" dashed dashScale={50} gapSize={20} />
            <QuadraticBezierLine key={index + 100} {...line} color="red" lineWidth={5} transparent opacity={0.1} />
          </group>
        ))}
      </group>
      {children}
      {lines.map(({ start, end }, index) => (
        <group key={'c' + index} position-z={1}>
          <Circle position={start} />
          <Circle position={end} />
        </group>
      ))}
      <LineX cx={2} cy={5} distance={5} />
    </context.Provider>
  )
}

export const Node = forwardRef(({ color = 'black', name, connectedTo = [], position = [0, 0, 0], ...props }, ref) => {
  const set = useContext(context)
  const { size, camera } = useThree()
  const [pos, setPos] = useState(() => new THREE.Vector3(...position))
  const state = useMemo(() => ({ position: pos, connectedTo }), [pos, connectedTo])
  // Register this node on mount, unregister on unmount
  useLayoutEffect(() => {
    set((nodes) => [...nodes, state])
    return () => void set((nodes) => nodes.filter((n) => n !== state))
  }, [state, pos])
  // Drag n drop, hover
  const [hovered, setHovered] = useState(false)
  useEffect(() => void (document.body.style.cursor = hovered ? 'grab' : 'auto'), [hovered])
  const bind = useDrag(({ args: ix, down, xy: [x, y], ...others }) => {
    console.log(ix)
    //console.log(others)
    others.event.stopPropagation()
    document.body.style.cursor = down ? 'grabbing' : 'grab'
    setPos(new THREE.Vector3((x / size.width) * 2 - 1, -(y / size.height) * 2 + 1, 0).unproject(camera).multiply({ x: 1, y: 1, z: 0 }).clone())
  })
  return (
    <Circle ref={ref} {...bind(name)} opacity={0.2} radius={0.5} color={color} position={pos} {...props}>
      <Circle
        radius={0.25}
        position={[0, 0, 0.1]}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          setHovered(false)
        }}
        userData={name}
        color={hovered ? '#ff1050' : color}>
        <Text position={[0, 0, 1]} fontSize={0.25}>
          {name}
        </Text>
      </Circle>
    </Circle>
  )
})
