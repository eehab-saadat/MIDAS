import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

interface SymptomsDisplayProps {
  symptoms: string[];
}

export function SymptomsDisplay({ symptoms }: SymptomsDisplayProps) {
  return (
    <Card className="h-full">
      <CardContent className="h-full overflow-y-auto p-3">
        <div className="flex flex-wrap gap-2">
          {symptoms.map((symptom, idx) => (
            <Badge key={idx} variant="secondary">
              {symptom}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
