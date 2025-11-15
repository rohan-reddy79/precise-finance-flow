import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ProjectUploadProps {
  projectId: string;
  onUploadComplete: () => void;
}

const ProjectUpload = ({ projectId, onUploadComplete }: ProjectUploadProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + selectedFiles.length > 12) {
      toast({
        title: "Too many files",
        description: "You can upload a maximum of 12 statements",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const tooLarge = files.filter(f => f.size > maxSize);
    if (tooLarge.length > 0) {
      toast({
        title: "Files too large",
        description: `${tooLarge.map(f => f.name).join(', ')} exceed 10MB limit`,
        variant: "destructive",
      });
      return;
    }

    // Verify MIME types
    const validMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf'
    ];
    
    const invalidMime = files.filter(f => !validMimeTypes.includes(f.type));
    if (invalidMime.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Please upload CSV, Excel, or PDF files only",
        variant: "destructive",
      });
      return;
    }

    // Validate file extensions
    const validFiles = files.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ext === 'csv' || ext === 'xlsx' || ext === 'xls' || ext === 'pdf';
    });

    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid file format",
        description: "Only CSV, Excel (XLSX/XLS), and PDF files are supported",
        variant: "destructive",
      });
      return;
    }

    setSelectedFiles([...selectedFiles, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${projectId}/${Date.now()}_${file.name}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('bank-statements')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Create statement record with proper MIME type
        const { data: statement, error: statementError } = await supabase
          .from('bank_statements')
          .insert({
            user_id: user.id,
            project_id: projectId,
            file_name: file.name,
            file_path: fileName,
            file_type: file.type || fileExt || 'csv',
            processing_status: 'pending',
          })
          .select()
          .single();

        if (statementError) throw statementError;

        // Trigger processing
        const { error: processError } = await supabase.functions.invoke(
          'process-bank-statement',
          {
            body: { statementId: statement.id },
          }
        );

        if (processError) {
          console.error('Processing error:', processError);
          toast({
            title: "Processing error",
            description: processError.message || "Failed to start processing",
            variant: "destructive",
          });
        }

        setUploadProgress(((i + 1) / selectedFiles.length) * 100);
      }

      toast({
        title: "Upload complete",
        description: `${selectedFiles.length} statements uploaded and processing`,
      });

      setSelectedFiles([]);
      onUploadComplete();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          type="file"
          accept=".csv,.xlsx,.xls,.pdf"
          multiple
          onChange={handleFileSelect}
          disabled={uploading || selectedFiles.length >= 12}
          className="flex-1"
        />
        <Button
          onClick={uploadFiles}
          disabled={uploading || selectedFiles.length === 0}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          Upload ({selectedFiles.length})
        </Button>
      </div>

      {uploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} />
          <p className="text-sm text-muted-foreground text-center">
            Uploading and processing... {Math.round(uploadProgress)}%
          </p>
        </div>
      )}

      {selectedFiles.length > 0 && !uploading && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Selected files ({selectedFiles.length}/12):</p>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-muted rounded-md"
              >
                <span className="text-sm truncate flex-1">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectUpload;
