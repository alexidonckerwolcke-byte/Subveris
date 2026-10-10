import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccountSettingsModals } from "@/components/account-settings-modals";
import { SubscriptionManager } from "@/components/subscription-manager";
import { NotificationPreferences } from "@/components/notification-preferences";
import {
  Settings as SettingsIcon,
  Bell,
  Mail,
  Shield,
  User,
  Palette,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { CurrencySelector } from '@/components/currency-selector';
import { useState, useRef, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/lib/subscription-context";
import { getAccountTimeZone, storeAccountTimeZone } from "@/lib/account-time-zone";
import { isValidTimeZone } from "@shared/month-boundary";
import { supabase } from "@/lib/supabase";

export default function Settings() {
  const showGmailScanning = false;
  const { toast } = useToast();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailExtensionAuthorized, setGmailExtensionAuthorized] = useState(false);
  const [gmailReauthorizationRequired, setGmailReauthorizationRequired] = useState(false);
  const [gmailConnecting, setGmailConnecting] = useState(false);
  const { user, hasPassword } = useAuth();
  const [accountTimeZone, setAccountTimeZone] = useState(() => getAccountTimeZone());
  const [savingTimeZone, setSavingTimeZone] = useState(false);
  const { tier } = useSubscription();
  const gmailAllowed = tier === "premium" || tier === "family";
  const gmailIsConnected = gmailExtensionAuthorized;
  const gmailNeedsReauthorization = gmailReauthorizationRequired || (gmailConnected && !gmailExtensionAuthorized);
  const userEmail = user?.email ?? "";

  useEffect(() => {
    const savedTimeZone = user?.user_metadata?.timezone;
    if (isValidTimeZone(savedTimeZone)) setAccountTimeZone(savedTimeZone);
  }, [user?.user_metadata?.timezone]);

  // Check if 2FA is enabled when user data loads
  useEffect(() => {
    if (user?.user_metadata?.mfa_always_required) {
      setTwoFAEnabled(true);
    }
  }, [user]);

  // Check Gmail connection status
  useEffect(() => {
    const extensionRequestId = crypto.randomUUID();
    const handleExtensionStatus = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      if (event.data?.type === "SUBVERIS_GMAIL_AUTHORIZATION_RESTORED") {
        setGmailExtensionAuthorized(true);
        setGmailConnected(true);
        setGmailReauthorizationRequired(false);
        return;
      }
      if (event.data?.type === "SUBVERIS_GMAIL_REAUTHORIZATION_REQUIRED") {
        setGmailExtensionAuthorized(false);
        setGmailReauthorizationRequired(true);
        return;
      }
      if (event.data?.type !== "SUBVERIS_GMAIL_STATUS_RESULT" || event.data.requestId !== extensionRequestId) return;
      const extensionAuthorized = Boolean(event.data.authorized);
      setGmailExtensionAuthorized(extensionAuthorized);
      if (extensionAuthorized) {
        setGmailConnected(true);
      }
      console.info("[Subveris Gmail] Extension status:", event.data.authorized ? "access token stored; validity is checked during scan" : "no access token stored");
    };
    window.addEventListener("message", handleExtensionStatus);
    console.info("[Subveris Gmail] Checking extension authorization status");
    window.postMessage({ type: "SUBVERIS_GMAIL_STATUS", requestId: extensionRequestId }, window.location.origin);

    const checkGmailStatus = async () => {
      try {
        const response = await apiFetch("/api/auth/gmail-status");
        if (response.ok) {
          const data = await response.json();
          // The extension token is the scanner's durable source of truth. Do not
          // let a slower backend status response overwrite a connected state.
          setGmailConnected((currentlyConnected) => currentlyConnected || Boolean(data.connected));
        }
      } catch (error) {
        console.error("Failed to check Gmail status:", error);
      }
    };
    checkGmailStatus();
    return () => window.removeEventListener("message", handleExtensionStatus);
  }, []);

  // Refs for modal triggers
  const emailModalRef = useRef<any>(null);
  const passwordModalRef = useRef<any>(null);
  const twoFAModalRef = useRef<any>(null);
  const deleteAccountModalRef = useRef<any>(null);

  const handleSavePreferences = () => {
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const handleSaveTimeZone = async () => {
    const timeZone = accountTimeZone.trim();
    if (!isValidTimeZone(timeZone)) {
      toast({ title: "Invalid timezone", description: "Enter a valid IANA timezone, such as Europe/Brussels.", variant: "destructive" });
      return;
    }

    setSavingTimeZone(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { timezone: timeZone } });
      if (error) throw error;
      storeAccountTimeZone(timeZone);
      setAccountTimeZone(timeZone);
      toast({ title: "Timezone saved", description: "Monthly usage and reports will follow this timezone." });
    } catch (error) {
      toast({
        title: "Could not save timezone",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingTimeZone(false);
    }
  };

  const openEmailModal = () => {
    const button = document.querySelector("[data-testid='open-email-modal']") as HTMLButtonElement;
    button?.click();
  };

  const openPasswordModal = () => {
    const button = document.querySelector("[data-testid='open-password-modal']") as HTMLButtonElement;
    button?.click();
  };

  const openTwoFAModal = () => {
    twoFAModalRef.current?.openTwoFAModal();
  };

  const openDeleteAccountModal = () => {
    const button = document.querySelector("[data-testid='open-delete-alert']") as HTMLButtonElement;
    button?.click();
  };

  const handleConnectGmail = async (forceReauthorize = false) => {
    if ((!forceReauthorize && gmailExtensionAuthorized) || gmailConnecting) {
      return;
    }

    setGmailConnecting(true);
    try {
      if (forceReauthorize) {
        const disconnectResponse = await apiFetch("/api/auth/gmail-disconnect", { method: "POST" });
        if (!disconnectResponse.ok) {
          const data = await disconnectResponse.json().catch(() => ({}));
          throw new Error(data.error || "Could not clear the previous Gmail authorization");
        }

        const disconnectRequestId = crypto.randomUUID();
        await new Promise<void>((resolve) => {
          const timeout = window.setTimeout(() => {
            window.removeEventListener("message", handleDisconnectResult);
            resolve();
          }, 2000);
          const handleDisconnectResult = (event: MessageEvent) => {
            if (event.source !== window || event.origin !== window.location.origin) return;
            if (event.data?.type !== "SUBVERIS_DISCONNECT_GMAIL_RESULT" || event.data.requestId !== disconnectRequestId) return;
            window.clearTimeout(timeout);
            window.removeEventListener("message", handleDisconnectResult);
            resolve();
          };
          window.addEventListener("message", handleDisconnectResult);
          window.postMessage({ type: "SUBVERIS_DISCONNECT_GMAIL", requestId: disconnectRequestId }, window.location.origin);
        });
        setGmailConnected(false);
        setGmailExtensionAuthorized(false);
        setGmailReauthorizationRequired(false);
      }

      const requestId = crypto.randomUUID();
      const result = await new Promise<{ success?: boolean; error?: string }>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          window.removeEventListener("message", handleResult);
          reject(new Error("The extension is not available. Open the Subveris extension and try again."));
        }, 30000);
        const handleResult = (event: MessageEvent) => {
          if (event.source !== window || event.origin !== window.location.origin) return;
          if (event.data?.type !== "SUBVERIS_CONNECT_GMAIL_RESULT" || event.data.requestId !== requestId) return;
          window.clearTimeout(timeout);
          window.removeEventListener("message", handleResult);
          resolve(event.data.response || {});
        };
        window.addEventListener("message", handleResult);
        window.postMessage({ type: "SUBVERIS_CONNECT_GMAIL", requestId }, window.location.origin);
      });

      if (!result.success) throw new Error(result.error || "Gmail authorization failed");
      setGmailExtensionAuthorized(true);
      setGmailConnected(true);
      setGmailReauthorizationRequired(false);
      toast({
        title: "Gmail connected!",
        description: "Your inbox will now be scanned for subscription receipts.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to connect Gmail";
      const extensionWasReloaded = /extension context invalidated|context.*invalidated/i.test(errorMessage);
      toast({
        title: "Connection failed",
        description: extensionWasReloaded
          ? "The extension was reloaded. Refresh this Settings page, then reconnect Gmail."
          : errorMessage,
        variant: "destructive",
      });
    } finally {
      setGmailConnecting(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (gmailConnecting) return;
    setGmailConnecting(true);
    try {
      const response = await apiFetch("/api/auth/gmail-disconnect", {
        method: "POST",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to disconnect Gmail");
      }

      const requestId = crypto.randomUUID();
      const extensionResult = await new Promise<{ success?: boolean }>((resolve) => {
        const timeout = window.setTimeout(() => {
          window.removeEventListener("message", handleResult);
          resolve({ success: false });
        }, 3000);
        const handleResult = (event: MessageEvent) => {
          if (event.source !== window || event.origin !== window.location.origin) return;
          if (event.data?.type !== "SUBVERIS_DISCONNECT_GMAIL_RESULT" || event.data.requestId !== requestId) return;
          window.clearTimeout(timeout);
          window.removeEventListener("message", handleResult);
          resolve(event.data.response || { success: false });
        };
        window.addEventListener("message", handleResult);
        window.postMessage({ type: "SUBVERIS_DISCONNECT_GMAIL", requestId }, window.location.origin);
      });

      setGmailConnected(false);
      setGmailExtensionAuthorized(false);
      setGmailReauthorizationRequired(false);
      toast({
        title: "Gmail disconnected",
        description: extensionResult.success
          ? "Gmail access was revoked and scanning has stopped."
          : "Gmail access was revoked. Reopen the extension to clear its local authorization.",
      });
    } catch (error) {
      toast({
        title: "Disconnection failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to disconnect Gmail",
        variant: "destructive",
      });
    } finally {
      setGmailConnecting(false);
    }
  }

  const handleExportData = async () => {
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('supabase.auth.token');
      const accessToken = token ? JSON.parse(token).access_token : null;

      const response = await apiFetch("/api/account/export", {
        headers: accessToken ? { "Authorization": `Bearer ${accessToken}` } : {},
      });
      if (!response.ok) throw new Error("Failed to export");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `subveris-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "Your data has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <AccountSettingsModals 
        ref={twoFAModalRef} 
        currentEmail={userEmail}
        onTwoFAEnabled={() => {
          setTwoFAEnabled(true);
        }}
      />
      <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
        <div className="mb-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Control your account and preferences
          </p>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Currency</CardTitle>
              <CardDescription>Your preferred display currency for all amounts.</CardDescription>
            </CardHeader>
            <CardContent>
              <CurrencySelector />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Account timezone</CardTitle>
              <CardDescription>Monthly usage, savings, and reports follow this timezone.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="account-time-zone">IANA timezone</Label>
                  <Input
                    id="account-time-zone"
                    value={accountTimeZone}
                    onChange={(event) => setAccountTimeZone(event.target.value)}
                    placeholder="Europe/Brussels"
                    autoComplete="off"
                  />
                </div>
                <Button onClick={handleSaveTimeZone} disabled={savingTimeZone}>
                  {savingTimeZone ? "Saving..." : "Save timezone"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {showGmailScanning && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <Zap className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Connected Services</CardTitle>
                <CardDescription>Auto-discover subscriptions from your accounts</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="font-medium">📧 Gmail</p>
                <p className="text-sm text-muted-foreground">
                  {gmailNeedsReauthorization
                    ? "Reconnect Gmail to grant read-only access for message scanning"
                    : !gmailAllowed && !gmailIsConnected
                    ? "Premium feature - connect Gmail to scan receipts automatically"
                    : gmailConnected && gmailExtensionAuthorized
                    ? "Connected - recent Gmail messages are scanned periodically"
                    : gmailIsConnected
                      ? "Gmail access is connected; extension authorization needs attention"
                      : "Connect to auto-detect subscriptions from email receipts"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {gmailIsConnected && (
                  <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Connected
                  </div>
                )}
                <Button
                  variant={gmailIsConnected && !gmailNeedsReauthorization ? "outline" : "default"}
                  size="sm"
                  onClick={gmailNeedsReauthorization ? () => handleConnectGmail(true) : gmailIsConnected ? handleDisconnectGmail : handleConnectGmail}
                  disabled={gmailConnecting || ((!gmailIsConnected || gmailNeedsReauthorization) && !gmailAllowed)}
                >
                  {gmailConnecting
                    ? "Please wait..."
                    : gmailNeedsReauthorization
                      ? "Reconnect Gmail"
                    : gmailIsConnected
                      ? "Disconnect"
                      : gmailAllowed ? "Connect Gmail" : "Premium required"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <Palette className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Appearance</CardTitle>
                <CardDescription>Customize how Subveris looks</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Switch between light and dark mode
                </p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        <SubscriptionManager />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Getting Started</CardTitle>
                <CardDescription>Learn how to use Subveris</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Onboarding Tutorial</Label>
                <p className="text-sm text-muted-foreground">
                  Retake the tutorial to learn about Subveris features
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.setItem('showTutorial', 'true');
                  window.location.reload();
                }}
              >
                Retake Tutorial
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Notifications</CardTitle>
                <CardDescription>Choose what updates you receive</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <NotificationPreferences />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Account</CardTitle>
                <CardDescription>Control your account preferences</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
              <Button variant="outline" size="sm" onClick={openEmailModal} data-testid="button-change-email">
                Change
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="font-medium">Password</p>
                <p className="text-sm text-muted-foreground">
                  {hasPassword
                    ? "Manage your website password"
                    : "Set a password to sign in without Google"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={openPasswordModal} data-testid="button-change-password">
                {hasPassword ? "Change" : "Set Password"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Privacy & Security</CardTitle>
                <CardDescription>Protect your account and data</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">
                  {twoFAEnabled ? "Enabled - Extra security active" : "Add an extra layer of security"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={openTwoFAModal} data-testid="button-enable-2fa">
                {twoFAEnabled ? "Edit" : "Enable"}
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="font-medium">Export Data</p>
                <p className="text-sm text-muted-foreground">Download all your subscription data</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportData} data-testid="button-export-data">
                Export
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="font-medium">Privacy Policy</p>
                <p className="text-sm text-muted-foreground">Review how Subveris accesses, uses, stores, and shares data</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <a href="/privacy">View</a>
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <div>
                <p className="font-medium text-destructive">Delete Account</p>
                <p className="text-sm text-muted-foreground">Permanently delete your account and data</p>
              </div>
              <Button variant="destructive" size="sm" onClick={openDeleteAccountModal} data-testid="button-delete-account">
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
