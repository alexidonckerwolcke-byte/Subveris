import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, Calendar } from "lucide-react";

interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;
}

export function NotificationPreferences() {
  const { getToken } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    pushNotifications: true,
    weeklyDigest: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const token = await getToken();
      const response = await fetch("/api/account/notification-preferences", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch preferences");
      }

      const data = await response.json();
      setPreferences(data);
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      setMessage({ type: "error", text: "Failed to load preferences" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const token = await getToken();
      const response = await fetch("/api/account/notification-preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Save failed:", response.status, errorText);
        throw new Error(`Failed to save preferences: ${response.status} ${errorText}`);
      }

      setMessage({ type: "success", text: "Preferences saved successfully" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      setMessage({ type: "error", text: "Failed to save preferences" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading preferences...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Control how and when you receive notifications from Subveris
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Email Notifications */}
        <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-muted-foreground">
                Receive email for new subscriptions, deletions, and status changes
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.emailNotifications}
            onCheckedChange={() => handleToggle("emailNotifications")}
            disabled={isSaving}
          />
        </div>

        {/* Push Notifications */}
        <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-muted-foreground">
                Browser notifications for important events (coming soon)
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.pushNotifications}
            onCheckedChange={() => handleToggle("pushNotifications")}
            disabled={isSaving}
          />
        </div>

        {/* Weekly Digest */}
        <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Weekly Digest</p>
              <p className="text-sm text-muted-foreground">
                Receive a weekly summary of your subscriptions and savings every Monday
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.weeklyDigest}
            onCheckedChange={() => handleToggle("weeklyDigest")}
            disabled={isSaving}
          />
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full"
        >
          {isSaving ? "Saving..." : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}
