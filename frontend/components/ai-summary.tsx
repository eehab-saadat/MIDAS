import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AiSummaryProps {
  summary?: string;
}

export const AiSummary = ({ summary }: AiSummaryProps) => {
  // If no summary provided, show a message
  if (!summary || summary.trim() === "") {
    return (
      <div className="h-full overflow-hidden">
        <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-foreground [&::-webkit-scrollbar-thumb]:rounded-r-full">
          <Card className="h-full">
            <CardContent className="space-y-4 flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground text-center">
                No AI summary available for this patient yet.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-foreground [&::-webkit-scrollbar-thumb]:rounded-r-full">
        <Card className="h-full">
          <CardContent className="space-y-4">
            <div className="text-xs text-muted-foreground whitespace-pre-wrap">
              {summary}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
