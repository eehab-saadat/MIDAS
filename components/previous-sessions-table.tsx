import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const PreviousSessionsTable = () => (
  <div className="h-full overflow-hidden">
    <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-foreground [&::-webkit-scrollbar-thumb]:rounded-r-full">
      <Table>
        <TableHeader className="sticky top-0 z-10">
          <TableRow>
            <TableHead>Session ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>SES-001</TableCell>
            <TableCell>2025-10-20</TableCell>
            <TableCell>Dr. Smith</TableCell>
            <TableCell>Follow-up</TableCell>
            <TableCell>Blood pressure check</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>SES-002</TableCell>
            <TableCell>2025-10-15</TableCell>
            <TableCell>Dr. Johnson</TableCell>
            <TableCell>Consultation</TableCell>
            <TableCell>Diabetes management</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>SES-003</TableCell>
            <TableCell>2025-10-10</TableCell>
            <TableCell>Nurse Williams</TableCell>
            <TableCell>Check-up</TableCell>
            <TableCell>Vital signs monitoring</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>SES-004</TableCell>
            <TableCell>2025-10-05</TableCell>
            <TableCell>Dr. Smith</TableCell>
            <TableCell>Follow-up</TableCell>
            <TableCell>Medication adjustment</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>SES-005</TableCell>
            <TableCell>2025-09-28</TableCell>
            <TableCell>Dr. Davis</TableCell>
            <TableCell>Consultation</TableCell>
            <TableCell>Cardiology referral</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>SES-006</TableCell>
            <TableCell>2025-09-20</TableCell>
            <TableCell>Nurse Williams</TableCell>
            <TableCell>Check-up</TableCell>
            <TableCell>Lab results review</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>SES-007</TableCell>
            <TableCell>2025-09-15</TableCell>
            <TableCell>Dr. Johnson</TableCell>
            <TableCell>Follow-up</TableCell>
            <TableCell>Progress assessment</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>SES-008</TableCell>
            <TableCell>2025-09-10</TableCell>
            <TableCell>Dr. Smith</TableCell>
            <TableCell>Consultation</TableCell>
            <TableCell>Initial assessment</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
);
