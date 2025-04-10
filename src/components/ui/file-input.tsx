
import React, { useState, useRef } from 'react';
import { Button } from './button';
import { Input } from './input';
import { X, Upload, FileText, Image, File as FileIcon } from 'lucide-react';

interface FileInputProps {
  onFileChange: (files: File[]) => void;
  maxFiles?: number;
  acceptedFileTypes?: string;
  initialFiles?: File[];
}

export function FileInput({
  onFileChange,
  maxFiles = 10,
  acceptedFileTypes,
  initialFiles = []
}: FileInputProps) {
  const [files, setFiles] = useState<File[]>(initialFiles);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const newFiles = Array.from(e.target.files);
    const updatedFiles = [...files, ...newFiles].slice(0, maxFiles);
    
    setFiles(updatedFiles);
    onFileChange(updatedFiles);
    
    // Reset input value so the same file can be uploaded again if removed
    e.target.value = '';
  };

  const handleRemoveFile = (indexToRemove: number) => {
    const updatedFiles = files.filter((_, index) => index !== indexToRemove);
    setFiles(updatedFiles);
    onFileChange(updatedFiles);
  };

  const handleBrowseClick = () => {
    inputRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (e.dataTransfer.files?.length) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const updatedFiles = [...files, ...droppedFiles].slice(0, maxFiles);
      
      setFiles(updatedFiles);
      onFileChange(updatedFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-6 w-6 text-blue-500" />;
    } else if (file.type.includes('pdf')) {
      return <FileText className="h-6 w-6 text-red-500" />;
    } else if (file.type.includes('word') || file.type.includes('document')) {
      return <FileText className="h-6 w-6 text-blue-500" />;
    } else if (file.type.includes('spreadsheet') || file.type.includes('excel')) {
      return <FileText className="h-6 w-6 text-green-500" />;
    } else {
      return <FileIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div 
        className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <Upload className="h-10 w-10 text-muted-foreground mb-2" />
        <p className="text-sm font-medium mb-1">Drag and drop files here</p>
        <p className="text-xs text-muted-foreground mb-4">or</p>
        
        <Button type="button" onClick={handleBrowseClick} variant="outline">
          Browse Files
        </Button>
        
        <Input
          type="file"
          ref={inputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple={maxFiles > 1}
          accept={acceptedFileTypes}
          aria-label="File upload"
        />
        
        {maxFiles && (
          <p className="text-xs text-muted-foreground mt-2">
            Maximum {maxFiles} file{maxFiles !== 1 ? 's' : ''}
            {acceptedFileTypes && ` (${acceptedFileTypes})`}
          </p>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Selected Files ({files.length}/{maxFiles})</p>
          <ul className="divide-y">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  {getFileIcon(file)}
                  <div className="ml-2">
                    <p className="text-sm font-medium truncate max-w-[180px] sm:max-w-xs">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFile(index)}
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
