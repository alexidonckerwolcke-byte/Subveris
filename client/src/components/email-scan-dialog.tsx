import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface EmailScanResult {
  detected: boolean;
  services: string[];
  amounts: (number | null)[];
  estimatedRenewalDate?: string;
}

interface EmailScanDialogProps {
  onScanComplete?: (result: EmailScanResult) => void;
  isLoading?: boolean;
}

export function EmailScanDialog({ onScanComplete, isLoading = false }: EmailScanDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<EmailScanResult | null>(null);
  const [error, setError] = useState<string>("");

  const handleScan = async () => {
    if (!emailBody.trim()) {
      setError("Please paste email content");
      return;
    }

    setIsScanning(true);
    setError("");

    try {
      const result = await apiRequest("POST", "/api/subscriptions/scan-email", {
        emailSubject,
        emailText: emailBody,
      });
      
      const data = await result.json();
      
      if (!result.ok) {
        throw new Error(data.error || "Failed to scan email");
      }

      setScanResult(data);
      onScanComplete?.(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleReset = () => {
    setEmailSubject("");
    setEmailBody("");
    setScanResult(null);
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
          <Mail className="h-4 w-4 mr-2" />
          Scan Email
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Scan Email for Subscriptions</DialogTitle>
          <DialogDescription>
            Paste a subscription confirmation or receipt email to automatically detect services and amounts.
          </DialogDescription>
        </DialogHeader>

        {!scanResult ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Email Subject (Optional)</label>
              <input
                type="text"
                placeholder="e.g., 'Your subscription has been renewed'"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Email Body</label>
              <Textarea
                placeholder="Paste the email content here..."
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="min-h-40"
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleScan}
                disabled={isScanning || !emailBody.trim()}
                className="flex-1"
              >
                {isScanning ? "Scanning..." : "Scan Email"}
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {scanResult.detected ? (
              <>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">
                    ✓ Subscriptions Detected
                  </h3>
                  <div className="space-y-2">
                    {scanResult.services.map((service, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-green-800 dark:text-green-300">{service}</span>
                        {scanResult.amounts[i] && (
                          <span className="font-medium text-green-800 dark:text-green-300">
                            ${scanResult.amounts[i]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {scanResult.estimatedRenewalDate && (
                    <p className="text-sm text-green-700 dark:text-green-400 mt-3">
                      Estimated Renewal: {scanResult.estimatedRenewalDate}
                    </p>
                  )}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {scanResult.services.length} subscription{scanResult.services.length !== 1 ? "s" : ""} found. You can add these to your account.
                </p>
              </>
            ) : (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  No subscription receipts found in this email. Try pasting a confirmation or renewal notice.
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
                  setScanResult(null);
                  setError("");
                }}
              >
                Scan Another Email
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
