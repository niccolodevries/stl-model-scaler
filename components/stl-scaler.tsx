"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Upload, X, FileBox } from "lucide-react"
import { StlViewer } from "./stl-viewer"
import { ScaleControls } from "./scale-controls"
import { ModelInfo } from "./model-info"
import { Button } from "@/components/ui/button"

export interface ModelDimensions {
  width: number
  height: number
  depth: number
}

export interface FileEntry {
  file: File
  id: string
  dimensions: ModelDimensions | null
}

export function StlScaler() {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [isDragging, setIsDragging] = useState(false)

  const selectedFile = files.find((f) => f.id === selectedFileId) || null

  const handleFilesSelect = useCallback((selectedFiles: FileList | File[]) => {
    const stlFiles = Array.from(selectedFiles).filter((file) => file.name.toLowerCase().endsWith(".stl"))

    if (stlFiles.length === 0) return

    const newEntries: FileEntry[] = stlFiles.map((file) => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      dimensions: null,
    }))

    setFiles((prev) => [...prev, ...newEntries])
    // Select first new file if nothing selected
    setSelectedFileId((prev) => prev || newEntries[0].id)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFilesSelect(e.dataTransfer.files)
    },
    [handleFilesSelect],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFilesSelect(e.target.files)
      }
      // Reset input so same files can be added again
      e.target.value = ""
    },
    [handleFilesSelect],
  )

  const handleRemoveFile = useCallback(
    (id: string) => {
      setFiles((prev) => prev.filter((f) => f.id !== id))
      if (selectedFileId === id) {
        setSelectedFileId((prev) => {
          const remaining = files.filter((f) => f.id !== id)
          return remaining.length > 0 ? remaining[0].id : null
        })
      }
    },
    [selectedFileId, files],
  )

  const handleClearAll = useCallback(() => {
    setFiles([])
    setSelectedFileId(null)
    setScale(1)
  }, [])

  const handleDimensionsCalculated = useCallback(
    (dimensions: ModelDimensions) => {
      setFiles((prev) => prev.map((f) => (f.id === selectedFileId ? { ...f, dimensions } : f)))
    },
    [selectedFileId],
  )

  const generateScaledFilename = (originalName: string, scaleValue: number): string => {
    const percentage = Math.round(scaleValue * 100)
    const nameParts = originalName.split(".")
    const extension = nameParts.pop()
    const baseName = nameParts.join(".")
    return `${baseName}_${percentage}percent.${extension}`
  }

  const scaleAndDownloadFile = async (fileEntry: FileEntry) => {
    const { file } = fileEntry
    const arrayBuffer = await file.arrayBuffer()
    const dataView = new DataView(arrayBuffer)

    const isBinary = arrayBuffer.byteLength > 84

    if (isBinary) {
      const numTriangles = dataView.getUint32(80, true)
      const newBuffer = arrayBuffer.slice(0)
      const newDataView = new DataView(newBuffer)

      for (let i = 0; i < numTriangles; i++) {
        const offset = 84 + i * 50
        for (let v = 0; v < 3; v++) {
          const vertexOffset = offset + 12 + v * 12
          const x = dataView.getFloat32(vertexOffset, true) * scale
          const y = dataView.getFloat32(vertexOffset + 4, true) * scale
          const z = dataView.getFloat32(vertexOffset + 8, true) * scale

          newDataView.setFloat32(vertexOffset, x, true)
          newDataView.setFloat32(vertexOffset + 4, y, true)
          newDataView.setFloat32(vertexOffset + 8, z, true)
        }
      }

      const blob = new Blob([newBuffer], { type: "application/octet-stream" })
      return { blob, filename: generateScaledFilename(file.name, scale) }
    } else {
      const text = new TextDecoder().decode(arrayBuffer)
      const scaledText = text.replace(/vertex\s+([-\d.e+]+)\s+([-\d.e+]+)\s+([-\d.e+]+)/gi, (_, x, y, z) => {
        return `vertex ${(Number.parseFloat(x) * scale).toFixed(6)} ${(Number.parseFloat(y) * scale).toFixed(6)} ${(Number.parseFloat(z) * scale).toFixed(6)}`
      })

      const blob = new Blob([scaledText], { type: "text/plain" })
      return { blob, filename: generateScaledFilename(file.name, scale) }
    }
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadSelected = useCallback(async () => {
    if (!selectedFile) return
    const { blob, filename } = await scaleAndDownloadFile(selectedFile)
    downloadBlob(blob, filename)
  }, [selectedFile, scale])

  const handleDownloadAll = useCallback(async () => {
    for (const fileEntry of files) {
      const { blob, filename } = await scaleAndDownloadFile(fileEntry)
      downloadBlob(blob, filename)
      // Small delay to prevent browser blocking multiple downloads
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }, [files, scale])

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">STL Scaler</h1>
        <p className="text-muted-foreground">Upload your STL files and scale them up or down for 3D printing</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Step 1: Upload */}
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground mb-4">Step 1: Upload Files</h2>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-sm p-8 text-center transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-foreground mb-2">Drag and drop your STL files here</p>
              <p className="text-muted-foreground text-sm mb-4">or</p>
              <label className="inline-block">
                <input type="file" accept=".stl" multiple onChange={handleFileInput} className="hidden" />
                <span className="px-6 py-2 bg-primary text-primary-foreground font-medium cursor-pointer hover:bg-primary/90 transition-colors">
                  Upload files
                </span>
              </label>
            </div>

            {files.length > 0 && (
              <div className="mt-4 border-2 border-border rounded-sm bg-card overflow-hidden">
                <div className="flex items-center justify-between p-3 border-b border-border">
                  <span className="text-sm font-medium">{files.length} file(s) loaded</span>
                  <Button variant="ghost" size="sm" onClick={handleClearAll}>
                    Clear all
                  </Button>
                </div>
                <div className="h-40 overflow-y-auto">
                  <div className="p-2 space-y-1">
                    {files.map((entry) => (
                      <div
                        key={entry.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                          entry.id === selectedFileId ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
                        }`}
                        onClick={() => setSelectedFileId(entry.id)}
                      >
                        <FileBox className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate flex-1">{entry.file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveFile(entry.id)
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Step 2: Scale Controls */}
          {files.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wide text-foreground mb-4">Step 2: Adjust Scale</h2>
              <ScaleControls
                scale={scale}
                onScaleChange={setScale}
                originalDimensions={selectedFile?.dimensions || null}
              />
            </section>
          )}

          {/* Step 3: Model Info & Download */}
          {files.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wide text-foreground mb-4">Step 3: Download</h2>
              <ModelInfo
                originalDimensions={selectedFile?.dimensions || null}
                scale={scale}
                onDownloadSelected={handleDownloadSelected}
                onDownloadAll={handleDownloadAll}
                fileCount={files.length}
                selectedFileName={selectedFile?.file.name || null}
              />
            </section>
          )}
        </div>

        {/* 3D Preview */}
        <div className="lg:sticky lg:top-8 h-fit">
          <h2 className="text-sm font-bold uppercase tracking-wide text-foreground mb-4">3D Preview</h2>
          <div className="border-2 border-border rounded-sm bg-card overflow-hidden aspect-square">
            <StlViewer
              file={selectedFile?.file || null}
              scale={scale}
              onDimensionsCalculated={handleDimensionsCalculated}
            />
          </div>
          {selectedFile && (
            <p className="mt-2 text-xs text-muted-foreground text-center">Click and drag to rotate - Scroll to zoom</p>
          )}
        </div>
      </div>
    </div>
  )
}
