import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { DataRow } from "@/hooks/useDataStore";

interface DataTableProps {
  rows: DataRow[];
  columns: string[];
  onDeleteRow: (id: string) => void;
}

const DataTable = ({ rows, columns, onDeleteRow }: DataTableProps) => {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">No data yet</p>
        <p className="text-sm">Add entries manually or upload a file to get started.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-auto max-h-[500px]">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[180px] font-semibold text-xs uppercase tracking-wider">
              Timestamp
            </TableHead>
            {columns.map((col) => (
              <TableHead key={col} className="font-semibold text-xs uppercase tracking-wider capitalize">
                {col}
              </TableHead>
            ))}
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows
            .slice()
            .reverse()
            .map((row) => (
              <TableRow key={row.id} className="group">
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {new Date(row.timestamp).toLocaleString()}
                </TableCell>
                {columns.map((col) => (
                  <TableCell key={col} className="font-mono text-sm">
                    {row[col] !== undefined ? String(row[col]) : "—"}
                  </TableCell>
                ))}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => onDeleteRow(row.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DataTable;
