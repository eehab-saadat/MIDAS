import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const AssetsTable = () => (
  <div className="h-full overflow-hidden">
    <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted [&::-webkit-scrollbar-thumb]:rounded-full">
      <Table>
        <TableHeader className="sticky top-0 z-10">
          <TableRow>
            <TableHead>Report ID</TableHead>
            <TableHead>Report Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>LR-001</TableCell>
            <TableCell>Blood Chemistry Panel</TableCell>
            <TableCell>Lab Report</TableCell>
            <TableCell>2025-10-15</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>IR-002</TableCell>
            <TableCell>Chest X-Ray</TableCell>
            <TableCell>Imaging Report</TableCell>
            <TableCell>2025-10-10</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>LR-003</TableCell>
            <TableCell>Lipid Profile</TableCell>
            <TableCell>Lab Report</TableCell>
            <TableCell>2025-09-28</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>CR-004</TableCell>
            <TableCell>Cardiology Consultation</TableCell>
            <TableCell>Consultation Report</TableCell>
            <TableCell>2025-09-20</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>MR-005</TableCell>
            <TableCell>MRI Brain Scan</TableCell>
            <TableCell>Imaging Report</TableCell>
            <TableCell>2025-09-15</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>LR-006</TableCell>
            <TableCell>Complete Blood Count</TableCell>
            <TableCell>Lab Report</TableCell>
            <TableCell>2025-09-10</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>PR-007</TableCell>
            <TableCell>Pathology Report</TableCell>
            <TableCell>Pathology Report</TableCell>
            <TableCell>2025-08-30</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>ER-008</TableCell>
            <TableCell>Emergency Room Visit</TableCell>
            <TableCell>Emergency Report</TableCell>
            <TableCell>2025-08-25</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
);
