import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Diagnosis } from "@/lib/patients";
import { Stethoscope, Lightbulb, BookOpen } from "lucide-react";

interface DiagnosisDisplayProps {
  diagnosis: Diagnosis;
}

export function DiagnosisDisplay({ diagnosis }: DiagnosisDisplayProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <Stethoscope className="h-5 w-5" />
          <CardTitle className="text-base">Diagnosis & Plan</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs h-[calc(100%-60px)] overflow-y-auto">
        {diagnosis.probable_conditions && diagnosis.probable_conditions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-muted-foreground flex items-center space-x-2">
              <Stethoscope className="h-4 w-4" />
              <span>Probable Conditions</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {diagnosis.probable_conditions.map((condition, idx) => (
                <Badge key={idx} variant="default">
                  {condition}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {diagnosis.treatment_suggestions && diagnosis.treatment_suggestions.length > 0 && (
          <div className="space-y-2 border-t pt-2">
            <h4 className="font-semibold text-muted-foreground flex items-center space-x-2">
              <Lightbulb className="h-4 w-4" />
              <span>Treatment Suggestions</span>
            </h4>
            <ul className="list-disc list-inside space-y-1">
              {diagnosis.treatment_suggestions.map((suggestion, idx) => (
                <li key={idx} className="leading-relaxed">
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {diagnosis.medical_advice && diagnosis.medical_advice.length > 0 && (
          <div className="space-y-2 border-t pt-2">
            <h4 className="font-semibold text-muted-foreground flex items-center space-x-2">
              <BookOpen className="h-4 w-4" />
              <span>Medical Advice</span>
            </h4>
            <ul className="list-disc list-inside space-y-1">
              {diagnosis.medical_advice.map((advice, idx) => (
                <li key={idx} className="leading-relaxed">
                  {advice}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
