import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, AlertTriangle, Chrome, BookOpen, Settings } from "lucide-react";
import { useSubscription } from "@/lib/subscription-context";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Files() {
  const { limits } = useSubscription();
  const [downloadingExtension, setDownloadingExtension] = useState(false);
  const [downloadingData, setDownloadingData] = useState(false);

  const isPremium = limits?.hasExportReports || false;

  const handleDownloadExtension = async (e: React.MouseEvent) => {
    console.log("Button clicked!");
    e.preventDefault();
    e.stopPropagation();
    
    setDownloadingExtension(true);
    try {
      console.log("[1] Starting extension download...");
      
      const response = await fetch("/api/extension/download", {
        method: "GET",
        headers: {
          "Accept": "application/zip",
        },
      });
      
      console.log("[2] Response received:", {
        status: response.status,
        statusText: response.statusText,
        headers: {
          contentType: response.headers.get("content-type"),
          contentLength: response.headers.get("content-length"),
        },
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      
      console.log("[3] Reading blob...");
      const blob = await response.blob();
      console.log("[4] Blob received:", {
        size: blob.size,
        type: blob.type,
      });
      
      if (blob.size === 0) {
        throw new Error("Received empty blob");
      }
      
      console.log("[5] Creating object URL...");
      const url = URL.createObjectURL(blob);
      console.log("[6] URL created:", url);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = "subveris-extension.zip";
      link.style.display = "none";
      
      console.log("[7] Appending link to DOM...");
      document.body.appendChild(link);
      
      console.log("[8] Triggering click...");
      link.click();
      
      console.log("[9] Scheduling cleanup...");
      setTimeout(() => {
        console.log("[10] Cleaning up...");
        try {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          console.log("[11] Cleanup complete");
        } catch (cleanupError) {
          console.error("Cleanup error:", cleanupError);
        }
      }, 100);
      
      console.log("[12] Download initiated successfully");
    } catch (error) {
      console.error("[ERROR] Download failed:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to download extension: ${errorMessage}`);
    } finally {
      console.log("[13] Setting downloading to false");
      setDownloadingExtension(false);
    }
  };

  const handleDownload = async () => {
    setDownloadingData(true);
    try {
      console.log("[1] Starting extension download...");
      
      const response = await fetch("/api/extension/download", {
        method: "GET",
        headers: {
          "Accept": "application/zip",
        },
      });
      
      console.log("[2] Response received:", {
        status: response.status,
        statusText: response.statusText,
        headers: {
          contentType: response.headers.get("content-type"),
          contentLength: response.headers.get("content-length"),
        },
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      
      console.log("[3] Reading blob...");
      const blob = await response.blob();
      console.log("[4] Blob received:", {
        size: blob.size,
        type: blob.type,
      });
      
      if (blob.size === 0) {
        throw new Error("Received empty blob");
      }
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'subveris-extension.zip';
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      console.log("[5] Download initiated successfully");
    } catch (error) {
      console.error('[Download] Error:', error);
      alert(`Failed to download extension: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDownloadingData(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Files & Extensions</h1>
      </div>

      <Tabs defaultValue="tutorial" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tutorial" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Extension Setup
          </TabsTrigger>
          <TabsTrigger value="download" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download Extension
          </TabsTrigger>
        </TabsList>

        {/* Extension Installation Tutorial */}
        <TabsContent value="tutorial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Chrome className="h-5 w-5" />
                Browser Extension Installation Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <Alert className="bg-blue-50 border-blue-200">
                <Chrome className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  Our browser extension tracks your subscription usage patterns to provide you with AI-powered insights and recommendations.
                </AlertDescription>
              </Alert>

              {/* Chrome Installation */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="bg-gradient-to-r from-red-500 to-yellow-500 rounded-full w-6 h-6 flex items-center justify-center text-white text-sm font-bold">C</span>
                  Chrome / Edge Installation
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Download the Extension File</p>
                      <p className="text-sm text-muted-foreground">
                        Download the extension files package
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={handleDownloadExtension}
                        disabled={downloadingExtension}
                        type="button"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {downloadingExtension ? "Downloading..." : "Download Extension"}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Extract the Files</p>
                      <p className="text-sm text-muted-foreground">
                        The downloaded file contains all extension files. Create a folder and copy each file into it
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        You need: <code className="bg-muted px-2 py-1 rounded text-xs">manifest.json</code>, <code className="bg-muted px-2 py-1 rounded text-xs">popup.html</code>, <code className="bg-muted px-2 py-1 rounded text-xs">popup.js</code>, <code className="bg-muted px-2 py-1 rounded text-xs">content.js</code>, <code className="bg-muted px-2 py-1 rounded text-xs">background.js</code>, and <code className="bg-muted px-2 py-1 rounded text-xs">inject.js</code>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Open Chrome Extensions Page</p>
                      <p className="text-sm text-muted-foreground">
                        In Chrome or Edge, go to <code className="bg-muted px-2 py-1 rounded text-xs">chrome://extensions</code> (Chrome) or <code className="bg-muted px-2 py-1 rounded text-xs">edge://extensions</code> (Edge)
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Or manually: Click the three dots menu → More tools → Extensions
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      4
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Enable Developer Mode</p>
                      <p className="text-sm text-muted-foreground">
                        Toggle the "Developer mode" switch in the top-right corner of the Extensions page
                      </p>
                      <Alert className="bg-yellow-50 border-yellow-200 mt-1">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-900">
                          <strong>Note:</strong> some browsers or platforms may require a small one-time fee (≈€5) to activate developer mode before you can load unpacked extensions.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      5
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Load the Extension</p>
                      <p className="text-sm text-muted-foreground">
                        Click "Load unpacked" and select the extracted extension folder containing <code className="bg-muted px-2 py-1 rounded text-xs">manifest.json</code>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      6
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Verify Installation</p>
                      <p className="text-sm text-muted-foreground">
                        Look for the Subveris extension icon in your browser toolbar (top-right corner). You should see a "Subveris" entry in the Extensions list
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      7
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Pin the Extension (Optional)</p>
                      <p className="text-sm text-muted-foreground">
                        Click the puzzle icon in your toolbar, find "Subveris", and click the pin icon to keep it visible for easy access
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Firefox Installation */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="bg-gradient-to-r from-orange-500 to-red-500 rounded-full w-6 h-6 flex items-center justify-center text-white text-sm font-bold">F</span>
                  Firefox Installation (Coming Soon)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Firefox support for the Subveris extension is coming soon. Stay tuned for updates!
                </p>
              </div>

              {/* Troubleshooting */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Troubleshooting
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold text-sm">Extension not appearing in toolbar?</p>
                    <p className="text-sm text-muted-foreground">
                      Check the Extensions list to ensure it's enabled. If you don't see it, try refreshing your browser page.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Getting a "Manifest version not supported" error?</p>
                    <p className="text-sm text-muted-foreground">
                      Make sure you're using Chrome version 88 or later, or Edge version 88+. Update your browser if needed.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Extension disabled automatically?</p>
                    <p className="text-sm text-muted-foreground">
                      This sometimes happens when loading unpacked extensions. Re-enable it by toggling the switch next to "Subveris" in the Extensions list.
                    </p>
                  </div>
                </div>
              </div>

              {/* After Installation */}
              <div className="space-y-4 pt-4 border-t bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold">After Installation</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    The extension will automatically track your visits to subscription websites
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    Click the Subveris icon to see your usage statistics
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    Your data syncs with your Subveris dashboard for AI analysis
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    Visit the "Download Data" tab to export your usage reports
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Download Data Tab */}
        <TabsContent value="download" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Download Browser Extension
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Download the browser extension as a ZIP file. Extract and load it into your browser to start tracking subscription usage.
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">
                      Usage Tracking Behavior
                    </h3>
                    <div className="mt-2 text-sm text-amber-700">
                      <p>
                        The extension tracks time spent on subscription websites when you navigate away from or close tabs.
                        This means it may track usage even if tabs are left open in the background without active engagement.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleDownload}
                disabled={downloadingData}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                {downloadingData ? "Downloading..." : "Download Extension"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}