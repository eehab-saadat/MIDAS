import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LabResult, ClinicalNotes, MedicalImagery } from "@/lib/patients";
import { Beaker, FileText, ImageIcon } from "lucide-react";

interface LabAssetsTableProps {
  labResults: LabResult[];
  clinicalNotes?: ClinicalNotes;
  medicalImagery?: MedicalImagery[];
}

export function LabAssetsTable({ labResults, clinicalNotes, medicalImagery }: LabAssetsTableProps) {
  const getTestNames = (results: { [key: string]: any }): string => {
    return Object.keys(results).join(", ");
  };

  return (
    <div className="h-full overflow-hidden">
      <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-foreground [&::-webkit-scrollbar-thumb]:rounded-r-full">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow>
              <TableHead className="text-xs">ID</TableHead>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {labResults.length === 0 && !clinicalNotes && (!medicalImagery || medicalImagery.length === 0) ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-4">
                  No assets available
                </TableCell>
              </TableRow>
            ) : (
              <>
                {clinicalNotes && (
                  <TableRow>
                    <TableCell className="text-xs font-medium">CN-001</TableCell>
                    <TableCell className="text-xs">Clinical Notes</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center space-x-1">
                        <FileText className="h-4 w-4" />
                        <span>Clinical Report</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">Current</TableCell>
                  </TableRow>
                )}
                {medicalImagery && medicalImagery.map((imagery, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-xs font-medium">{imagery.id}</TableCell>
                    <TableCell className="text-xs">{imagery.name}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center space-x-1">
                        <ImageIcon className="h-4 w-4" />
                        <span>{imagery.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(imagery.date).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
                {labResults.map((result, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-xs font-medium">LB-{String(idx + 1).padStart(3, "0")}</TableCell>
                    <TableCell className="text-xs">{getTestNames(result.results)}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center space-x-1">
                        <Beaker className="h-4 w-4" />
                        <span>Lab Report</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(result.date).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
