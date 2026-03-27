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
} from "lucide-react";
import { CurrencySelector } from '@/components/currency-selector';
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const { user } = useAuth();
  const userEmail = user?.email ?? "";

  // Check if 2FA is enabled when user data loads
  useEffect(() => {
    if (user?.user_metadata?.mfa_always_required) {
      setTwoFAEnabled(true);
    }
  }, [user]);

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

  const handleExportData = async () => {
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('supabase.auth.token');
      const accessToken = token ? JSON.parse(token).access_token : null;

      const response = await fetch("/api/account/export", {
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
            Manage your account and preferences
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
        </div>

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
                <CardDescription>Manage your account settings</CardDescription>
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
                <p className="text-sm text-muted-foreground">Last changed 30 days ago</p>
              </div>
              <Button variant="outline" size="sm" onClick={openPasswordModal} data-testid="button-change-password">
                Change
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
                {twoFAEnabled ? "Manage" : "Enable"}
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
