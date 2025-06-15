
import React, { useCallback, useState } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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

  const dropzoneBaseClasses = "flex flex-col items-center justify-center p-8 border-2 rounded-lg transition-colors";
  const dropzoneDisabledClasses = "opacity-50 cursor-not-allowed border-dashed border-input-border";
  const dropzoneEnabledClasses = "cursor-pointer";
  const dropzoneDraggingClasses = "border-solid border-accent bg-accent/10";
  const dropzoneIdleClasses = "border-dashed border-input-border hover:border-solid hover:border-accent";

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
          className={cn(
            dropzoneBaseClasses,
            disabled ? dropzoneDisabledClasses : [
              dropzoneEnabledClasses,
              dragging ? dropzoneDraggingClasses : dropzoneIdleClasses
            ]
          )}
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
              <UploadCloud className={`w-16 h-16 mx-auto mb-3 ${dragging ? 'text-accent' : 'text-muted-foreground'}`} />
              <p className={`font-semibold ${dragging ? 'text-accent' : 'text-foreground'}`}>
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
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Your CSV should have a 'feedback' column. {' '}
          <a href="/sample-feedback.csv" download="sample-feedback.csv" className="text-accent hover:underline font-medium">
            Download a sample file.
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
