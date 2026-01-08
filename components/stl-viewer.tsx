"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import type { ModelDimensions } from "./stl-scaler"
import { Box } from "lucide-react"

interface StlViewerProps {
  file: File | null
  scale: number
  onDimensionsCalculated: (dimensions: ModelDimensions) => void
}

export function StlViewer({ file, scale, onDimensionsCalculated }: StlViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const meshRef = useRef<THREE.Mesh | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animationRef = useRef<number | null>(null)
  const originalGeometryRef = useRef<THREE.BufferGeometry | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Scene
    const scene = new THREE.Scene()
    // Use a neutral background that works with both light and dark themes
    const bgColor = getComputedStyle(container).getPropertyValue('background-color')
    const rgb = bgColor.match(/\d+/g)
    if (rgb && rgb.length >= 3) {
      scene.background = new THREE.Color(`rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`)
    } else {
      scene.background = new THREE.Color(0xf5f5f5)
    }
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000)
    camera.position.set(100, 100, 100)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controlsRef.current = controls

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight1.position.set(1, 1, 1)
    scene.add(directionalLight1)

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4)
    directionalLight2.position.set(-1, -1, -1)
    scene.add(directionalLight2)

    // Grid helper
    const gridHelper = new THREE.GridHelper(200, 20, 0xcccccc, 0xeeeeee)
    scene.add(gridHelper)

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Resize handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return
      const newWidth = container.clientWidth
      const newHeight = container.clientHeight
      camera.aspect = newWidth / newHeight
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, newHeight)
    }
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  // Load STL file
  useEffect(() => {
    if (!file || !sceneRef.current) return

    setIsLoading(true)
    const scene = sceneRef.current
    const loader = new STLLoader()

    // Remove existing mesh
    if (meshRef.current) {
      scene.remove(meshRef.current)
      meshRef.current.geometry.dispose()
      if (meshRef.current.material instanceof THREE.Material) {
        meshRef.current.material.dispose()
      }
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer
        const geometry = loader.parse(arrayBuffer)

        // Store original geometry
        originalGeometryRef.current = geometry.clone()

        // Center geometry
        geometry.computeBoundingBox()
        const boundingBox = geometry.boundingBox!
        const center = new THREE.Vector3()
        boundingBox.getCenter(center)
        geometry.translate(-center.x, -center.y, -center.z)

        // Calculate dimensions
        const size = new THREE.Vector3()
        boundingBox.getSize(size)
        onDimensionsCalculated({
          width: size.x,
          height: size.y,
          depth: size.z,
        })

        // Create mesh
        const material = new THREE.MeshStandardMaterial({
          color: 0xf97316,
          metalness: 0.1,
          roughness: 0.6,
        })
        const mesh = new THREE.Mesh(geometry, material)
        scene.add(mesh)
        meshRef.current = mesh

        // Fit camera to object
        if (cameraRef.current && controlsRef.current) {
          const maxDim = Math.max(size.x, size.y, size.z)
          const fov = cameraRef.current.fov * (Math.PI / 180)
          const cameraDistance = (maxDim / (2 * Math.tan(fov / 2))) * 1.5
          cameraRef.current.position.set(cameraDistance, cameraDistance, cameraDistance)
          controlsRef.current.target.set(0, 0, 0)
          controlsRef.current.update()
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Error parsing STL file:", error)
        setIsLoading(false)
      }
    }

    reader.onerror = () => {
      console.error("Error reading file")
      setIsLoading(false)
    }

    reader.readAsArrayBuffer(file)
  }, [file, onDimensionsCalculated])

  // Apply scale
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.scale.set(scale, scale, scale)
    }
  }, [scale])

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {!file && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
          <Box className="w-16 h-16 mb-4 opacity-30" />
          <p>Upload an STL file to preview</p>
        </div>
      )}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80">
          <div className="text-foreground">Loading model...</div>
        </div>
      )}
    </div>
  )
}
