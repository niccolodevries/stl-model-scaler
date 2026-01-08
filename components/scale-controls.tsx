"use client"

import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ModelDimensions } from "./stl-scaler"

interface ScaleControlsProps {
  scale: number
  onScaleChange: (scale: number) => void
  originalDimensions: ModelDimensions | null
}

const PRESET_SCALES = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]

export function ScaleControls({ scale, onScaleChange, originalDimensions }: ScaleControlsProps) {
  const [mode, setMode] = useState<"factor" | "percent">("percent")

  const percentage = scale * 100
  const displayValue = mode === "factor" ? scale : percentage

  const handleInputChange = (value: string) => {
    const numValue = Number.parseFloat(value)
    if (isNaN(numValue) || numValue <= 0) return

    if (mode === "factor") {
      if (numValue <= 10) {
        onScaleChange(numValue)
      }
    } else {
      // Percentage mode: convert to factor
      const factor = numValue / 100
      if (factor > 0 && factor <= 10) {
        onScaleChange(Math.round(factor * 1000) / 1000)
      }
    }
  }

  const handleDimensionInput = (axis: keyof ModelDimensions, value: string) => {
    if (!originalDimensions) return
    const targetSize = Number.parseFloat(value)
    if (!isNaN(targetSize) && targetSize > 0) {
      const newScale = targetSize / originalDimensions[axis]
      if (newScale > 0 && newScale <= 10) {
        onScaleChange(Math.round(newScale * 1000) / 1000)
      }
    }
  }

  return (
    <div className="space-y-6 p-6 border-2 border-border rounded-sm bg-card">
      <div>
        <label className="text-sm font-medium text-foreground mb-3 block">Input Mode</label>
        <Tabs value={mode} onValueChange={(v) => setMode(v as "factor" | "percent")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="percent">Percentage (%)</TabsTrigger>
            <TabsTrigger value="factor">Factor (x)</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Scale Slider */}
      <div>
        <label className="text-sm font-medium text-foreground mb-3 block">
          {mode === "factor" ? "Scale Factor" : "Scale Percentage"}
        </label>
        <div className="flex items-center gap-4">
          <Slider
            value={[scale]}
            onValueChange={([value]) => onScaleChange(value)}
            min={0.1}
            max={5}
            step={0.01}
            className="flex-1"
          />
          <div className="flex items-center">
            <Input
              type="number"
              value={mode === "factor" ? scale.toFixed(2) : percentage.toFixed(0)}
              onChange={(e) => handleInputChange(e.target.value)}
              className="w-24 text-center"
              step={mode === "factor" ? 0.1 : 10}
              min={mode === "factor" ? 0.1 : 10}
              max={mode === "factor" ? 10 : 1000}
            />
            <span className="ml-1 text-muted-foreground w-4">{mode === "factor" ? "×" : "%"}</span>
          </div>
        </div>
      </div>

      {/* Preset Buttons */}
      <div>
        <label className="text-sm font-medium text-foreground mb-3 block">Quick Presets</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_SCALES.map((preset) => (
            <Button
              key={preset}
              variant={scale === preset ? "default" : "outline"}
              size="sm"
              onClick={() => onScaleChange(preset)}
              className="min-w-[4rem]"
            >
              {mode === "factor" ? `${preset}×` : `${preset * 100}%`}
            </Button>
          ))}
        </div>
      </div>

      {/* Target Dimensions */}
      {originalDimensions && (
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">Target Dimensions (mm)</label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Width (X)</label>
              <Input
                type="number"
                value={(originalDimensions.width * scale).toFixed(2)}
                onChange={(e) => handleDimensionInput("width", e.target.value)}
                step={1}
                min={0.1}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Height (Y)</label>
              <Input
                type="number"
                value={(originalDimensions.height * scale).toFixed(2)}
                onChange={(e) => handleDimensionInput("height", e.target.value)}
                step={1}
                min={0.1}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Depth (Z)</label>
              <Input
                type="number"
                value={(originalDimensions.depth * scale).toFixed(2)}
                onChange={(e) => handleDimensionInput("depth", e.target.value)}
                step={1}
                min={0.1}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
