
import React, { useState } from "react"
import { FileInput } from "@/components/ui/file-input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"

export function FileAttachmentDemo() {
  const [files, setFiles] = useState<File[]>([])

  const handleFileChange = (newFiles: File[]) => {
    setFiles(newFiles)
    if (newFiles.length > 0 && newFiles.length > files.length) {
      toast({
        title: "Files added",
        description: `${newFiles.length - files.length} file(s) have been added.`
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to upload first.",
        variant: "destructive"
      })
      return
    }
    
    // Here you would typically upload the files to a server
    console.log("Files to upload:", files)
    
    toast({
      title: "Upload started",
      description: `Uploading ${files.length} file(s)...`
    })
    
    // Simulate upload
    setTimeout(() => {
      toast({
        title: "Upload complete",
        description: `Successfully uploaded ${files.length} file(s).`
      })
    }, 2000)
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>File Attachments</CardTitle>
        <CardDescription>
          Upload files and documents to the application.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FileInput 
            onFileChange={handleFileChange}
            maxFiles={5}
            acceptedFileTypes=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
          />
          
          <div className="flex justify-end">
            <Button type="submit" disabled={files.length === 0}>
              Upload Files
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
