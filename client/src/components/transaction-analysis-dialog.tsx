import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Transaction {
  merchant?: string;
  description?: string;
  amount?: number;
  date?: string;
}

interface RecurringCharge {
  merchant: string;
  frequency: string;
  averageAmount: number;
  confidence: number;
}

interface TransactionAnalysisResult {
  detected: RecurringCharge[];
  totalAnalyzed: number;
  foundRecurring: number;
}

interface TransactionAnalysisDialogProps {
  onAnalysisComplete?: (result: TransactionAnalysisResult) => void;
  isLoading?: boolean;
}

export function TransactionAnalysisDialog({ onAnalysisComplete, isLoading = false }: TransactionAnalysisDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pasteData, setPasteData] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<TransactionAnalysisResult | null>(null);
  const [error, setError] = useState<string>("");

  const parseTransactions = (data: string): Transaction[] => {
    try {
      const lines = data.trim().split("\n").filter((line) => line.trim());
      if (lines.length < 2) {
        throw new Error("Need at least header and one transaction row");
      }

      const results: Transaction[] = [];

      lines.forEach((line, index) => {
        const cells = line
          .split(",")
          .map((cell) => cell.trim().replace(/^["']|["']$/g, ""));

        if (index === 0) {
          // Skip header
          return;
        }

        results.push({
          merchant: cells[0],
          description: cells[1],
          amount: parseFloat(cells[2]),
          date: cells[3],
        });
      });

      return results;
    } catch (err) {
      throw new Error(
        "Could not parse data. Use CSV format: merchant,description,amount,date"
      );
    }
  };

  const handleAnalyze = async () => {
    if (!pasteData.trim()) {
      setError("Please paste transaction data");
      return;
    }

    setIsAnalyzing(true);
    setError("");

    try {
      const transactions = parseTransactions(pasteData);
      
      const result = await apiRequest("POST", "/api/subscriptions/analyze-transactions", {
        transactions,
      });
      
      const data = await result.json();
      
      if (!result.ok) {
        throw new Error(data.error || "Failed to analyze transactions");
      }

      setAnalysisResult(data);
      onAnalysisComplete?.(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setPasteData("");
    setAnalysisResult(null);
    setError("");
  };

  const handleClose = () => {
    handleReset();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <TrendingUp className="h-4 w-4 mr-2" />
          Analyze Transactions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl" aria-describedby="transaction-analysis-desc">
        <DialogHeader>
          <DialogTitle>Analyze Bank Transactions</DialogTitle>
          <DialogDescription id="transaction-analysis-desc">
            Paste your bank or payment app transactions to detect recurring charges that might be subscriptions.
          </DialogDescription>
        </DialogHeader>

        {!analysisResult ? (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2 text-slate-900 dark:text-slate-100">Format:</p>
              <code className="text-xs text-slate-600 dark:text-slate-400">
                merchant,description,amount,date
                <br />
                Netflix,Streaming Service,15.99,2024-01-10
                <br />
                Netflix,Streaming Service,15.99,2024-02-10
                <br />
                Netflix,Streaming Service,15.99,2024-03-10
              </code>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Transaction Data (CSV)</label>
              <Textarea
                placeholder="Paste transaction data as CSV: merchant, description, amount, date"
                value={pasteData}
                onChange={(e) => setPasteData(e.target.value)}
                className="min-h-40 font-mono text-xs"
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !pasteData.trim()}
                className="flex-1"
              >
                {isAnalyzing ? "Analyzing..." : "Analyze Transactions"}
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {analysisResult.foundRecurring > 0 ? (
              <>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">
                    ✓ Recurring Charges Detected
                  </h3>
                  <div className="space-y-3">
                    {analysisResult.detected.map((charge, i) => (
                      <div key={i} className="bg-white dark:bg-slate-800 p-3 rounded border border-blue-200 dark:border-blue-800">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-blue-900 dark:text-blue-200">
                            {charge.merchant}
                          </span>
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                            {(charge.confidence * 100).toFixed(0)}% confidence
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">
                            {charge.frequency}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            ${charge.averageAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Found {analysisResult.foundRecurring} recurring charge{analysisResult.foundRecurring !== 1 ? "s" : ""} from {analysisResult.totalAnalyzed} transactions analyzed.
                </p>
              </>
            ) : (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  No recurring charges detected in these transactions. Try including more transaction history (at least 2-3 months recommended).
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleClose} className="flex-1">
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setAnalysisResult(null);
                  setError("");
                }}
              >
                Analyze More Transactions
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
