import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface FormErrorAlertProps {
  error: string | null;
  title?: string;
}

export const FormErrorAlert = ({
  error,
  title = "Submission Error",
}: FormErrorAlertProps) => {
  if (!error) return null;

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
};
