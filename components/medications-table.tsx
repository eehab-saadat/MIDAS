import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Medication } from "@/lib/patients";

interface MedicationsTableProps {
  medications: Medication[];
}

export function MedicationsTable({ medications }: MedicationsTableProps) {
  return (
    <div className="h-full overflow-hidden">
      <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-foreground [&::-webkit-scrollbar-thumb]:rounded-r-full">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow>
              <TableHead className="text-xs">Medication</TableHead>
              <TableHead className="text-xs">Dose</TableHead>
              <TableHead className="text-xs">Frequency</TableHead>
              <TableHead className="text-xs">Indication</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {medications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-4">
                  No medications available
                </TableCell>
              </TableRow>
            ) : (
              medications.map((med, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-xs font-medium">{med.name}</TableCell>
                  <TableCell className="text-xs">{med.dose}</TableCell>
                  <TableCell className="text-xs">{med.frequency}</TableCell>
                  <TableCell className="text-xs">{med.indication}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
