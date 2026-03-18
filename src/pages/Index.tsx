import { useDataStore } from "@/hooks/useDataStore";
import { exportToCsv } from "@/lib/csvExport";
import DataEntryForm from "@/components/DataEntryForm";
import FileUpload from "@/components/FileUpload";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, Database, Trash2 } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const { rows, columns, isLoaded, addRow, addRows, deleteRow, clearAll } = useDataStore();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Database className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">DataVault</h1>
              <p className="text-xs text-muted-foreground">
                {rows.length} record{rows.length !== 1 ? "s" : ""} stored locally
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                exportToCsv(rows, columns);
                toast.success("CSV downloaded");
              }}
              disabled={rows.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearAll();
                toast.success("All data cleared");
              }}
              disabled={rows.length === 0}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6 max-w-5xl">
        {/* Top Row: Form + Upload */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Manual Entry</CardTitle>
              <CardDescription>Enter values for each column below</CardDescription>
            </CardHeader>
            <CardContent>
              <DataEntryForm
                columns={columns}
                onSubmit={(vals) => {
                  addRow(vals);
                  toast.success("Entry added");
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Import File</CardTitle>
              <CardDescription>Upload CSV or Excel (.xlsx) to append data</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload onImport={addRows} />
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Data Table
              {rows.length > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({rows.length} rows)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable rows={rows} columns={columns} onDeleteRow={deleteRow} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Index;
