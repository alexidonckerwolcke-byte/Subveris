import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Upload, FileText } from "lucide-react";
import Papa from "papaparse";

interface BulkImportRow {
  name?: string;
  amount?: string;
  frequency?: string;
  nextBillingDate?: string;
  category?: string;
  websiteDomain?: string;
}

interface BulkImportProps {
  onImport: (subscriptions: BulkImportRow[]) => void;
  isLoading?: boolean;
}

export function BulkImportDialog({ onImport, isLoading = false }: BulkImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pasteData, setPasteData] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BulkImportRow[]>([]);
  const [error, setError] = useState<string>("");

  const parseCSVData = (data: string): BulkImportRow[] => {
    try {
      const lines = data.trim().split("\n").filter((line) => line.trim());
      if (lines.length === 0) {
        throw new Error("No data provided");
      }

      const results: BulkImportRow[] = [];
      let headerMap: { [key: string]: number } = {};
      let hasHeader = false;

      lines.forEach((line, index) => {
        // Parse CSV (simple implementation)
        const cells = line
          .split(",")
          .map((cell) => cell.trim().replace(/^["']|["']$/g, ""));

        if (index === 0) {
          // Try to detect if this is a header row
          const firstRow = cells.map((c) => c.toLowerCase());
          if (
            firstRow.some((c) => c.includes("name") || c.includes("service")) ||
            firstRow.some((c) => c.includes("amount") || c.includes("cost"))
          ) {
            hasHeader = true;
            // Map header positions
            firstRow.forEach((cell, idx) => {
              if (cell.includes("name") || cell.includes("service")) headerMap["name"] = idx;
              if (cell.includes("amount") || cell.includes("cost")) headerMap["amount"] = idx;
              if (cell.includes("frequency") || cell.includes("billing")) headerMap["frequency"] = idx;
              if (cell.includes("date") || cell.includes("renewal")) headerMap["nextBillingDate"] = idx;
              if (cell.includes("category") || cell.includes("type")) headerMap["category"] = idx;
              if (cell.includes("domain") || cell.includes("website")) headerMap["websiteDomain"] = idx;
            });
            return;
          }
        }

        if (hasHeader && index === 0) return; // Skip header row
        if (cells.some((c) => !c)) return; // Skip empty rows

        // If no header detected, assume standard column order
        if (!hasHeader && Object.keys(headerMap).length === 0) {
          headerMap = { name: 0, amount: 1, frequency: 2, nextBillingDate: 3, category: 4, websiteDomain: 5 };
        }

        const row: BulkImportRow = {
          name: cells[headerMap["name"] || 0]?.trim(),
          amount: cells[headerMap["amount"] || 1]?.trim(),
          frequency: cells[headerMap["frequency"] || 2]?.trim() || "monthly",
          nextBillingDate: cells[headerMap["nextBillingDate"] || 3]?.trim(),
          category: cells[headerMap["category"] || 4]?.trim() || "other",
          websiteDomain: cells[headerMap["websiteDomain"] || 5]?.trim(),
        };

        if (row.name && row.amount) {
          results.push(row);
        }
      });

      return results;
    } catch (err) {
      throw new Error(`Failed to parse CSV: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handlePaste = () => {
    setError("");
    try {
      const parsed = parseCSVData(pasteData);
      if (parsed.length === 0) {
        throw new Error("No valid subscriptions found in the data");
      }
      setPreview(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse data");
      setPreview([]);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSVData(text);
        if (parsed.length === 0) {
          throw new Error("No valid subscriptions found in the file");
        }
        setPreview(parsed);
        setPasteData(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse file");
        setPreview([]);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      setError("No subscriptions to import");
      return;
    }

    await onImport(preview);
    setIsOpen(false);
    setPasteData("");
    setCsvFile(null);
    setPreview([]);
    setError("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Subscriptions in Bulk</DialogTitle>
          <DialogDescription>
            Upload a CSV file or paste your subscription data. Format: Name, Amount, Frequency, Next Billing Date, Category
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* CSV Template */}
          <Card className="bg-slate-50 dark:bg-slate-950 p-4">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
              CSV TEMPLATE (optional header row):
            </p>
            <code className="text-xs text-slate-700 dark:text-slate-300 block overflow-auto">
              {`name,amount,frequency,nextBillingDate,category
Netflix,15.99,monthly,2026-09-14,streaming
Spotify,12.99,monthly,2026-09-10,streaming
Adobe,79.99,monthly,2026-10-01,software`}
            </code>
          </Card>

          {/* File Upload */}
          <div className="border-2 border-dashed rounded-lg p-4 text-center">
            <FileText className="h-8 w-8 mx-auto mb-2 text-slate-400" />
            <p className="text-sm font-medium mb-2">Upload CSV File</p>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="text-xs"
            />
          </div>

          {/* Or Paste Data */}
          <div>
            <label className="text-sm font-medium block mb-2">Or paste data here:</label>
            <Textarea
              placeholder={`Netflix,15.99,monthly,2026-09-14,streaming
Spotify,12.99,monthly,2026-09-10,streaming
Adobe,79.99,monthly,2026-10-01,software`}
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
              className="min-h-32 font-mono text-xs"
            />
            <Button onClick={handlePaste} variant="outline" className="mt-2 w-full">
              Parse Data
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded p-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Preview ({preview.length} subscriptions):</p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {preview.map((row, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-3 rounded text-sm">
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      ${row.amount} • {row.frequency} • {row.category}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Import Button */}
          <div className="flex gap-2">
            <Button
              onClick={() => setIsOpen(false)}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={preview.length === 0 || isLoading}
              className="flex-1"
            >
              {isLoading ? "Importing..." : `Import ${preview.length} Subscriptions`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
