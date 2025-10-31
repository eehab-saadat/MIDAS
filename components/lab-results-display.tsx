import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LabResult } from "@/lib/patients";
import { Beaker } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LabResultsDisplayProps {
  labResults: LabResult[];
}

export function LabResultsDisplay({ labResults }: LabResultsDisplayProps) {
  const renderValue = (value: any): string => {
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <Beaker className="h-5 w-5" />
          <CardTitle className="text-base">Lab Results</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="h-[calc(100%-60px)] overflow-y-auto space-y-4">
        {labResults.map((result, idx) => (
          <div key={idx} className="space-y-2 border-b pb-3 last:border-b-0">
            <Badge variant="outline" className="text-xs">
              {new Date(result.date).toLocaleDateString()}
            </Badge>
            <div className="space-y-2">
              {Object.entries(result.results).map(([testName, testData]) => (
                <div key={testName} className="space-y-1 text-xs">
                  <h4 className="font-semibold text-muted-foreground capitalize">
                    {testName.replace(/_/g, " ")}
                  </h4>
                  {typeof testData === "object" ? (
                    <div className="space-y-1 pl-2">
                      {Object.entries(testData).map(([key, value]) => (
                        <div key={key} className="grid grid-cols-2 gap-2">
                          <span className="text-muted-foreground">
                            {key.replace(/_/g, " ")}:
                          </span>
                          <span className="font-medium">
                            {renderValue(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs font-medium pl-2">
                      {renderValue(testData)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
