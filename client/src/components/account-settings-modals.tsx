import { useState, useImperativeHandle, forwardRef } from "react";
import { apiFetch } from "../lib/api.js";
import { useAuth } from "../lib/auth-context.js";
import { Button } from "./ui/button.js";
import { Input } from "./ui/input.js";
import { Label } from "./ui/label.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog.js";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog.js";
import { useToast } from "../hooks/use-toast.js";

interface AccountSettingsModalsProps {
  currentEmail: string;
  onTwoFAEnabled?: () => void;
}

export const AccountSettingsModals = forwardRef<
  { openTwoFAModal: () => void },
  AccountSettingsModalsProps
>(
  function AccountSettingsModals(
    {
      currentEmail,
      onTwoFAEnabled,
    }: AccountSettingsModalsProps,
    ref
  ) {
  const { toast } = useToast();
  const auth = useAuth();

  // Email change state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Password change state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // 2FA state
  const [twoFAModalOpen, setTwoFAModalOpen] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAQRCode, setTwoFAQRCode] = useState<string>("");
  const [twoFASecret, setTwoFASecret] = useState<string>("");
  const [twoFAOtpauthUrl, setTwoFAOtpauthUrl] = useState<string>("");
  const [twoFAFactorId, setTwoFAFactorId] = useState<string>("");
  const [twoFAQRCodeError, setTwoFAQRCodeError] = useState<string>("");
  const [twoFAQRCodeSource, setTwoFAQRCodeSource] = useState<string>("");

  function extractOtpSecretFromUri(uri: string | undefined, fallbackSecret = "") {
    if (fallbackSecret) return fallbackSecret;
    if (!uri) return "";

    const match = uri.match(/[?&]secret=([^&]+)/i);
    if (!match) return "";

    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }

  // Delete account state
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

  // Expose openTwoFAModal to parent via ref
  useImperativeHandle(ref, () => ({
    openTwoFAModal,
  }));

  const handleChangeEmail = async () => {
    if (!newEmail) {
      toast({
        title: "Error",
        description: "Please enter a new email address",
        variant: "destructive",
      });
      return;
    }

    setEmailLoading(true);
    try {
      const token = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}').access_token;
      const response = await apiFetch("/api/account/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ email: newEmail }),
      });

      if (!response.ok) throw new Error("Failed to change email");

      toast({
        title: "Email changed",
        description: "Your email address has been updated successfully.",
      });
      setEmailModalOpen(false);
      setNewEmail("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to change email address",
        variant: "destructive",
      });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    setPasswordLoading(true);
    try {
      const token = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}').access_token;
      const response = await apiFetch("/api/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!response.ok) throw new Error("Failed to change password");

      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
      setPasswordModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // After changing password, sign the user out so they must re-authenticate
      try { await auth.signOut(); } catch (e) { /* ignore */ }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleInit2FA = async () => {
    try {
      setTwoFALoading(true);
      const token = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}').access_token;
      const response = await apiFetch("/api/account/2fa/init", {
        method: "GET",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });

      if (!response.ok) throw new Error("Failed to initialize 2FA");

      const data = await response.json();
      const { id, secret, otpauthUrl } = data;
      const resolvedSecret = extractOtpSecretFromUri(otpauthUrl, secret);

      setTwoFAFactorId(id); // Store the factor ID for verification
      setTwoFASecret(resolvedSecret);
      setTwoFAOtpauthUrl(otpauthUrl);
      
      // If otpauthUrl is already a QR code data URL, use it directly
      // Otherwise, generate one using a QR code service
      let qrCodeUrl = "";
      if (otpauthUrl && otpauthUrl.startsWith('data:')) {
        qrCodeUrl = otpauthUrl;
      } else if (otpauthUrl) {
        // Generate QR code from otpauth URL using a service
        qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
      }
      setTwoFAQRCode(qrCodeUrl);
      setTwoFAQRCodeSource(qrCodeUrl || otpauthUrl || "(empty)");
      setTwoFAQRCodeError("");
      
      setTwoFAModalOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initialize two-factor authentication",
        variant: "destructive",
      });
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleEnable2FA = async () => {
    if (!twoFACode || twoFACode.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a valid 6-digit code",
        variant: "destructive",
      });
      return;
    }

    if (!twoFAFactorId) {
      toast({
        title: "Error",
        description: "2FA session expired. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setTwoFALoading(true);
    try {
      const token = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}').access_token;
      const response = await apiFetch("/api/account/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ code: twoFACode, factorId: twoFAFactorId }),
      });

      if (!response.ok) throw new Error("Failed to enable 2FA");

      toast({
        title: "2FA enabled",
        description:
          "Two-factor authentication has been enabled on your account.",
      });
      setTwoFAModalOpen(false);
      setTwoFACode("");
      setTwoFASecret("");
      setTwoFAQRCode("");
      setTwoFAOtpauthUrl("");
      setTwoFAFactorId("");
      // Refresh user data to show 2FA as enabled
      if (onTwoFAEnabled) {
        onTwoFAEnabled();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to enable two-factor authentication",
        variant: "destructive",
      });
    } finally {
      setTwoFALoading(false);
    }
  };

  const openTwoFAModal = () => {
    handleInit2FA();
  };

  const closeTwoFAModal = () => {
    setTwoFAModalOpen(false);
    setTwoFACode("");
    setTwoFASecret("");
    setTwoFAQRCode("");
    setTwoFAOtpauthUrl("");
  };

  const handleExportData = async () => {
    try {
      const token = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}').access_token;
      const response = await apiFetch("/api/account/export", {
        method: "GET",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });

      if (!response.ok) throw new Error("Failed to export data");

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

  const handleDeleteAccount = async () => {
    try {
      const token = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}').access_token;
      const response = await apiFetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });

      if (!response.ok) throw new Error("Failed to delete account");

      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });

      try {
        await auth.signOut();
      } catch (signOutError) {
        console.warn("Error signing out after account deletion:", signOutError);
        window.location.href = "/";
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {/* Change Email Modal */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent aria-describedby="change-email-desc">
          <DialogHeader>
            <DialogTitle>Change Email Address</DialogTitle>
            <DialogDescription id="change-email-desc">
              Enter your new email address. We'll send a confirmation link to verify the change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Email</Label>
              <Input value={currentEmail} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">New Email</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="name@company.com"
                data-testid="input-new-email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEmailModalOpen(false)}
              disabled={emailLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangeEmail}
              disabled={emailLoading}
              data-testid="button-confirm-email-change"
            >
              {emailLoading ? "Updating..." : "Update Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent aria-describedby="change-password-desc">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription id="change-password-desc">
              Enter your current password and then your new password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="input-confirm-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordModalOpen(false)}
              disabled={passwordLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={passwordLoading}
              data-testid="button-confirm-password-change"
            >
              {passwordLoading ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enable 2FA Modal */}
      <Dialog open={twoFAModalOpen} onOpenChange={closeTwoFAModal}>
        <DialogContent aria-describedby="enable-2fa-desc">
          <DialogHeader>
            <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
            <DialogDescription id="enable-2fa-desc">
              Scan the QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, Authy, etc.) and enter the 6-digit code.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {twoFAQRCode ? (
              <>
                <div className="flex items-center justify-center bg-white p-4 rounded-lg border border-gray-200">
                  <img
                    src={twoFAQRCode}
                    alt="2FA QR Code"
                    className="w-48 h-48"
                    onError={() => setTwoFAQRCodeError('Failed to load QR image')}
                  />
                </div>
                <div className="text-xs text-muted-foreground bg-muted p-3 rounded text-center">
                  Can't scan? Enter this code manually: <br />
                  <code className="font-mono font-bold text-sm">{twoFASecret}</code>
                </div>
                {twoFAQRCodeError ? (
                  <div className="text-xs text-destructive mt-2">{twoFAQRCodeError}</div>
                ) : null}
                <div className="text-xs text-muted-foreground mt-2 break-all">
                  <strong>Debug QR source:</strong> {twoFAQRCodeSource}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center bg-muted p-8 rounded-lg h-56">
                <div className="text-sm text-muted-foreground">Generating QR code...</div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="2fa-code">Enter 6-Digit Code</Label>
              <Input
                id="2fa-code"
                type="text"
                value={twoFACode}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setTwoFACode(digits);
                }}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                data-testid="input-2fa-code"
                disabled={!twoFAQRCode}
              />
              <p className="text-xs text-muted-foreground">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeTwoFAModal}
              disabled={twoFALoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEnable2FA}
              disabled={twoFALoading || !twoFACode || twoFACode.length !== 6}
              data-testid="button-confirm-2fa"
            >
              {twoFALoading ? "Verifying..." : "Verify & Enable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Alert */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All your data, including subscriptions and insights, will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete-account"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export Button Handler */}
      <button
        onClick={handleExportData}
        style={{ display: "none" }}
        data-testid="export-data-handler"
      />

      {/* Modal Triggers - Export for external use */}
      <button
        onClick={() => setEmailModalOpen(true)}
        style={{ display: "none" }}
        data-testid="open-email-modal"
      />
      <button
        onClick={() => setPasswordModalOpen(true)}
        style={{ display: "none" }}
        data-testid="open-password-modal"
      />
      <button
        onClick={() => setTwoFAModalOpen(true)}
        style={{ display: "none" }}
        data-testid="open-2fa-modal"
      />
      <button
        onClick={() => setDeleteAlertOpen(true)}
        style={{ display: "none" }}
        data-testid="open-delete-alert"
      />
    </>
  );
}
);

export { useAccountSettingsModals } from "../hooks/use-account-settings-modals";
