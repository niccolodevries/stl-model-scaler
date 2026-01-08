"use client"

import { Button } from "@/components/ui/button"
import { Download, DownloadCloud } from "lucide-react"
import type { ModelDimensions } from "./stl-scaler"

interface ModelInfoProps {
  originalDimensions: ModelDimensions | null
  scale: number
  onDownloadSelected: () => void
  onDownloadAll: () => void
  fileCount: number
  selectedFileName: string | null
}

export function ModelInfo({
  originalDimensions,
  scale,
  onDownloadSelected,
  onDownloadAll,
  fileCount,
  selectedFileName,
}: ModelInfoProps) {
  const scaledDimensions = originalDimensions
    ? {
        width: originalDimensions.width * scale,
        height: originalDimensions.height * scale,
        depth: originalDimensions.depth * scale,
      }
    : null

  const formatDimension = (value: number) => value.toFixed(2)

  const percentage = Math.round(scale * 100)

  return (
    <div className="p-6 border-2 border-border rounded-sm bg-card space-y-4">
      {/* Dimensions Comparison */}
      {originalDimensions && scaledDimensions && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Original Size</h3>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">X:</span> {formatDimension(originalDimensions.width)} mm
              </p>
              <p>
                <span className="text-muted-foreground">Y:</span> {formatDimension(originalDimensions.height)} mm
              </p>
              <p>
                <span className="text-muted-foreground">Z:</span> {formatDimension(originalDimensions.depth)} mm
              </p>
            </div>
          </div>
          <div className="p-3 bg-primary/10 rounded-sm border border-primary/20">
            <h3 className="text-xs font-medium uppercase tracking-wide text-primary mb-2">Scaled Size</h3>
            <div className="space-y-1 text-sm font-medium">
              <p>
                <span className="text-muted-foreground">X:</span> {formatDimension(scaledDimensions.width)} mm
              </p>
              <p>
                <span className="text-muted-foreground">Y:</span> {formatDimension(scaledDimensions.height)} mm
              </p>
              <p>
                <span className="text-muted-foreground">Z:</span> {formatDimension(scaledDimensions.depth)} mm
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scale Change Summary */}
      <div className={originalDimensions ? "pt-4 border-t border-border" : ""}>
        <p className="text-sm text-muted-foreground mb-4">
          {scale === 1 ? (
            "No scaling applied - dimensions unchanged"
          ) : scale > 1 ? (
            <>
              Scaling up to <span className="text-primary font-medium">{percentage}%</span> ({scale}× factor)
            </>
          ) : (
            <>
              Scaling down to <span className="text-primary font-medium">{percentage}%</span> ({scale}× factor)
            </>
          )}
        </p>

        {selectedFileName && (
          <p className="text-xs text-muted-foreground mb-4">
            Output filename:{" "}
            <span className="font-mono text-foreground">
              {selectedFileName.replace(".stl", "").replace(".STL", "")}_{percentage}percent.stl
            </span>
          </p>
        )}

        <div className="space-y-2">
          <Button onClick={onDownloadSelected} className="w-full" size="lg" disabled={!selectedFileName}>
            <Download className="w-4 h-4 mr-2" />
            Download Selected
          </Button>

          {fileCount > 1 && (
            <Button onClick={onDownloadAll} variant="outline" className="w-full bg-transparent" size="lg">
              <DownloadCloud className="w-4 h-4 mr-2" />
              Download All ({fileCount} files)
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
