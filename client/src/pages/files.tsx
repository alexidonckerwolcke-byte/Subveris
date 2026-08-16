import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, AlertTriangle, Chrome, BookOpen, Settings } from "lucide-react";
import { PremiumGate } from "@/components/premium-gate";
import { useSubscription } from "@/lib/subscription-context";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Files() {
  const { limits } = useSubscription();
  const [downloadingExtension, setDownloadingExtension] = useState(false);
  const [downloadingData, setDownloadingData] = useState(false);

  const hasAutopilotAccess = limits?.hasAutopilot || false;

  const handleDownloadExtension = async (e: React.MouseEvent) => {
    console.log("Button clicked!");
    e.preventDefault();
    e.stopPropagation();
    
    setDownloadingExtension(true);
    try {
      console.log("[1] Starting extension download...");
      const downloadUrl = `${window.location.origin}/subveris-extension.zip`;
      const response = await fetch(downloadUrl, { method: "GET" });
      
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
      const downloadUrl = `${window.location.origin}/subveris-extension.zip`;
      const response = await fetch(downloadUrl, { method: "GET" });
      
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
        <h1 className="text-3xl font-bold">Autopilot</h1>
      </div>

      <PremiumGate feature="Autopilot" showBlurred={false}>
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
                Extension Installation Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <Alert className="bg-blue-50 border-blue-200">
                <Chrome className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  Our extension now works on all major browsers: <strong>Chrome, Edge, Firefox, and Safari</strong>. Install it to capture subscription usage patterns for AI-powered insights and optimization recommendations. Each browser has platform-specific installation steps below.
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
                      <p className="font-semibold text-sm">Click the Download Button</p>
                      <p className="text-sm text-muted-foreground">
                        Download the extension file below.
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
                      <p className="font-semibold text-sm">Extract the File</p>
                      <p className="text-sm text-muted-foreground">
                        Double-click the downloaded ZIP file to extract it (usually called <code className="bg-muted px-2 py-1 rounded text-xs">subveris-extension.zip</code>). A folder will appear.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Open Extensions Settings</p>
                      <p className="text-sm text-muted-foreground">
                        Type this in your address bar: <code className="bg-muted px-2 py-1 rounded text-xs">chrome://extensions</code> (Chrome) or <code className="bg-muted px-2 py-1 rounded text-xs">edge://extensions</code> (Edge) and press Enter
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      4
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Turn On Developer Mode</p>
                      <p className="text-sm text-muted-foreground">
                        Look for "Developer mode" switch in the top-right corner and click it to turn it ON.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      5
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Load the Extension Folder</p>
                      <p className="text-sm text-muted-foreground">
                        Click the "Load unpacked" button that appears, then select the extracted extension folder.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      ✓
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Done!</p>
                      <p className="text-sm text-muted-foreground">
                        The Subveris extension is now installed. You'll see it in your toolbar.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Firefox Installation */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="bg-gradient-to-r from-orange-500 to-red-500 rounded-full w-6 h-6 flex items-center justify-center text-white text-sm font-bold">🦊</span>
                  Firefox Installation
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Click Download Button</p>
                      <p className="text-sm text-muted-foreground">
                        Download the extension file below.
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
                      <p className="font-semibold text-sm">Extract the File</p>
                      <p className="text-sm text-muted-foreground">
                        Double-click the downloaded ZIP file to extract it.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Open Firefox Debug Page</p>
                      <p className="text-sm text-muted-foreground">
                        Type <code className="bg-muted px-2 py-1 rounded text-xs">about:debugging</code> in the Firefox address bar and press Enter.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      4
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Load the Extension</p>
                      <p className="text-sm text-muted-foreground">
                        Click "This Firefox" on the left, then "Load Temporary Add-on", and select the <code className="bg-muted px-2 py-1 rounded text-xs">manifest.json</code> file from the extracted folder.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      ✓
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Done!</p>
                      <p className="text-sm text-muted-foreground">
                        The extension is now installed and ready to use.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Safari Installation */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="bg-gradient-to-r from-gray-600 to-gray-800 rounded-full w-6 h-6 flex items-center justify-center text-white text-sm font-bold">🧭</span>
                  Safari Installation (macOS)
                </h3>
                <p className="text-sm text-muted-foreground">
                  <strong>Requirements:</strong> macOS 11+ and Safari 15+
                </p>
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Click Download Button</p>
                      <p className="text-sm text-muted-foreground">
                        Download the extension file using the button below (same as Chrome).
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
                      <p className="font-semibold text-sm">Extract and Rename Folder</p>
                      <p className="text-sm text-muted-foreground">
                        Double-click the ZIP to extract it. Rename the extracted folder to <code className="bg-muted px-2 py-1 rounded text-xs">subveris-tracker.safariextension</code>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Double-Click to Install</p>
                      <p className="text-sm text-muted-foreground">
                        Double-click the renamed folder. Safari will automatically prompt you to allow the extension.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      4
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Enable in Safari</p>
                      <p className="text-sm text-muted-foreground">
                        Open Safari, go to Safari → Settings → Extensions, find "Subveris", and check the box to enable it.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      ✓
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Done!</p>
                      <p className="text-sm text-muted-foreground">
                        The extension is now installed and ready to use.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                  <p className="text-sm text-blue-900">
                    <strong>Having issues?</strong> See our <a href="https://github.com/subveris/extension/blob/main/INSTALL_SAFARI.md" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">detailed Safari guide</a> for help.</p>
                </div>
              </div>

              {/* Troubleshooting */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Troubleshooting & Additional Resources
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold text-sm">Need more detailed help?</p>
                    <p className="text-sm text-muted-foreground">
                      We have comprehensive guides for each browser:
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <li>• <a href="https://github.com/subveris/extension/blob/main/BROWSER_EXTENSION_GUIDE.md" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Master Installation Guide (All Browsers)</a></li>
                      <li>• <a href="https://github.com/subveris/extension/blob/main/INSTALL_FIREFOX.md" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Detailed Firefox Guide</a></li>
                      <li>• <a href="https://github.com/subveris/extension/blob/main/INSTALL_SAFARI.md" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Detailed Safari Guide</a></li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold text-sm">Extension not appearing in toolbar?</p>
                    <p className="text-sm text-muted-foreground">
                      Check the Extensions list to ensure it's enabled. If you don't see it, try refreshing your browser page.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Browser version compatibility</p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Chrome:</strong> Version 88+ | <strong>Edge:</strong> Version 88+ | <strong>Firefox:</strong> Version 48+ | <strong>Safari:</strong> macOS 11+ with Safari 15+
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
                    The extension will automatically monitor your visits to linked subscription websites
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
                Download the browser extension as a ZIP file. Works on Chrome, Edge, Firefox, and Safari. Extract and load it into your browser to start optimizing subscription usage. See the "Extension Setup" tab above for browser-specific installation instructions.
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">
                      Usage Optimization Behavior
                    </h3>
                    <div className="mt-2 text-sm text-amber-700">
                      <p>
                        The extension measures time spent on linked subscription websites when you navigate away from or close tabs.
                        This means it may record usage even if tabs are left open in the background without active engagement.
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
      </PremiumGate>
    </div>
  );
}