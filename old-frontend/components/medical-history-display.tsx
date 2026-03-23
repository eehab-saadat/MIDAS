import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

interface MedicalHistoryDisplayProps {
  medicalHistory: string[];
}

export function MedicalHistoryDisplay({
  medicalHistory,
}: MedicalHistoryDisplayProps) {
  return (
    <Card className="h-full">
      <CardContent className="h-full overflow-y-auto p-3">
        <div className="flex flex-wrap gap-2">
          {medicalHistory.map((item, idx) => (
            <Badge key={idx} variant="secondary">
              {item}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
