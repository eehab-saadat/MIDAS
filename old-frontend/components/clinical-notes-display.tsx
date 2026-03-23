import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClinicalNotes } from "@/lib/patients";
import { FileText, ListChecks } from "lucide-react";

interface ClinicalNotesDisplayProps {
  clinicalNotes: ClinicalNotes;
}

export function ClinicalNotesDisplay({
  clinicalNotes,
}: ClinicalNotesDisplayProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <CardTitle className="text-base">Clinical Notes</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs h-[calc(100%-60px)] overflow-y-auto">
        <div className="space-y-1">
          <h4 className="font-semibold text-muted-foreground">Summary</h4>
          <p className="text-sm leading-relaxed">
            {clinicalNotes.summary}
          </p>
        </div>

        <div className="space-y-1 border-t pt-2">
          <h4 className="font-semibold text-muted-foreground">Examination</h4>
          <p className="text-sm leading-relaxed">
            {clinicalNotes.examination}
          </p>
        </div>

        <div className="space-y-1 border-t pt-2">
          <h4 className="font-semibold text-muted-foreground">Assessment</h4>
          <p className="text-sm leading-relaxed">
            {clinicalNotes.assessment}
          </p>
        </div>

        {clinicalNotes.plan && clinicalNotes.plan.length > 0 && (
          <div className="space-y-1 border-t pt-2">
            <div className="flex items-center space-x-2">
              <ListChecks className="h-4 w-4" />
              <h4 className="font-semibold text-muted-foreground">Plan</h4>
            </div>
            <ul className="list-disc list-inside space-y-1">
              {clinicalNotes.plan.map((item, idx) => (
                <li key={idx} className="text-sm leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
