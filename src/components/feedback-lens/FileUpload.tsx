import React, { useCallback, useState } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function FileUpload({ onFileSelect, disabled }: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      if (disabled) return;

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          setFileName(file.name);
          onFileSelect(file);
        } else {
          alert('Please upload a CSV file.');
        }
        e.dataTransfer.clearData();
      }
    },
    [onFileSelect, disabled]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFileName(file.name);
      onFileSelect(file);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-center">Upload Feedback File</CardTitle>
        <CardDescription className="text-center">
          Drag and drop your CSV file here or click to select.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors
            ${dragging ? 'border-primary bg-primary/10' : 'border-input-border hover:border-accent'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onClick={() => !disabled && document.getElementById('file-upload-input')?.click()}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="File upload area"
        >
          <input
            id="file-upload-input"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            disabled={disabled}
          />
          {fileName ? (
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto text-primary mb-3" />
              <p className="font-semibold text-foreground">{fileName}</p>
              <p className="text-sm text-muted-foreground mt-1">Ready to be mapped</p>
            </div>
          ) : (
            <div className="text-center">
              <UploadCloud className={`w-16 h-16 mx-auto mb-3 ${dragging ? 'text-primary' : 'text-muted-foreground'}`} />
              <p className={`font-semibold ${dragging ? 'text-primary' : 'text-foreground'}`}>
                {dragging ? 'Drop file here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">CSV files only</p>
            </div>
          )}
        </div>
        <Button
          onClick={() => document.getElementById('file-upload-input')?.click()}
          variant="outline"
          className="w-full mt-4"
          disabled={disabled}
          aria-label="Select file from computer"
        >
          {fileName ? 'Change File' : 'Select File'}
        </Button>
      </CardContent>
    </Card>
  );
}
