import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const AiSummary = () => (
  <div className="h-full overflow-hidden">
    <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted [&::-webkit-scrollbar-thumb]:rounded-full">
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">AI Medical Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-xs mb-2">Patient Overview</h4>
            <p className="text-xs text-muted-foreground">
              John Doe, a 35-year-old male patient, presents with
              well-controlled hypertension and Type 2 diabetes. Recent lab
              results show stable HbA1c levels and blood pressure within target
              ranges.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-xs mb-2">Key Findings</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>
                • Latest blood chemistry panel (2025-10-15) indicates normal
                kidney function
              </li>
              <li>
                • Chest X-ray (2025-10-10) shows clear lung fields with no acute
                abnormalities
              </li>
              <li>
                • Lipid profile (2025-09-28) demonstrates improved cholesterol
                levels
              </li>
              <li>
                • Recent cardiology consultation recommends continued medication
                adherence
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-xs mb-2">Risk Assessment</h4>
            <p className="text-xs text-muted-foreground">
              Low immediate risk for cardiovascular events. Patient demonstrates
              good compliance with prescribed regimen. Recommend quarterly
              follow-ups and annual comprehensive metabolic panel.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-xs mb-2">Recommendations</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Continue current medication regimen without changes</li>
              <li>• Maintain healthy diet and regular exercise routine</li>
              <li>• Schedule next appointment in 3 months</li>
              <li>• Monitor blood pressure daily at home</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);
