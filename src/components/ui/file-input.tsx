
import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface FileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onFileChange?: (files: File[]) => void
  showSelectedFiles?: boolean
  maxFiles?: number
  acceptedFileTypes?: string
}

const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  ({ className, onFileChange, showSelectedFiles = true, maxFiles, acceptedFileTypes, ...props }, ref) => {
    const [selectedFiles, setSelectedFiles] = React.useState<File[]>([])
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      
      if (maxFiles && selectedFiles.length + files.length > maxFiles) {
        console.warn(`Maximum number of files (${maxFiles}) exceeded`)
        return
      }
      
      setSelectedFiles(prev => [...prev, ...files])
      if (onFileChange) {
        onFileChange([...selectedFiles, ...files])
      }
      
      // Reset the input value so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }

    const handleRemoveFile = (fileToRemove: File) => {
      const updatedFiles = selectedFiles.filter(file => file !== fileToRemove)
      setSelectedFiles(updatedFiles)
      if (onFileChange) {
        onFileChange(updatedFiles)
      }
    }

    const clearFiles = () => {
      setSelectedFiles([])
      if (onFileChange) {
        onFileChange([])
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }

    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="text-sm"
          >
            Select Files
          </Button>
          {selectedFiles.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFiles}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          )}
        </div>
        <input
          type="file"
          className="hidden"
          ref={(e) => {
            // Handle both the forwarded ref and our local ref
            if (typeof ref === 'function') {
              ref(e)
            } else if (ref) {
              ref.current = e
            }
            fileInputRef.current = e
          }}
          onChange={handleFileChange}
          multiple={maxFiles !== 1}
          accept={acceptedFileTypes}
          {...props}
        />
        {showSelectedFiles && selectedFiles.length > 0 && (
          <div className="mt-2 space-y-1">
            {selectedFiles.map((file, index) => (
              <div 
                key={`${file.name}-${index}`} 
                className="flex items-center justify-between rounded border border-border bg-muted/30 px-3 py-2"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFile(file)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Remove file</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
)

FileInput.displayName = "FileInput"

export { FileInput }
