/**
 * SettingsPage.tsx - Dashboard Settings UI
 * Tabs:
 *  - Notifications: email/SMS toggles and quiet hours
 *  - Privacy: visibility toggles + leaderboard visibility
 *  - System: language + theme
 *  - Export: GDPR/RTI CSV export
 */

import React, { useEffect, useMemo, useState } from "react"; // Import React hooks.
import { Bell, Shield, Cog, Download } from 'lucide-react'; // Import icons.
import apiClient from "@/lib/apiClient"; // Import axios for API calls.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components.
import { Button } from "@/components/ui/button"; // Import Button.
import { Label } from "@/components/ui/label"; // Import Label.
import { Switch } from "@/components/ui/switch"; // Import Switch.
import { Input } from "@/components/ui/input"; // Import Input.
import { useTheme } from "@/components/theme-provider"; // Import theme hook.
import { toast } from 'sonner'; // Import sonner for toast notifications.

type Language = "en" | "ml"; // Supported language codes.
type Theme = "light" | "dark" | "system"; // Supported theme codes.

type NotificationsSettings = {
  announcementsEmail: boolean;
  attendanceAlertsEmail: boolean;
  gradesEmail: boolean;
  eventsEmail: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

type PrivacySettings = {
  parentsCanViewAttendance: boolean;
  parentsCanViewGrades: boolean;
  teachersCanViewAttendance: boolean;
  teachersCanViewGrades: boolean;
  showInLeaderboard: boolean;
};

type SystemSettings = {
  language: Language;
  theme: Theme;
};

type UserSettings = {
  notifications: NotificationsSettings;
  privacy: PrivacySettings;
  system: SystemSettings;
};

type TabKey = "notifications" | "privacy" | "system" | "export"; // Tab keys.

const defaultSettings: UserSettings = {
  notifications: {
    announcementsEmail: true,
    attendanceAlertsEmail: true,
    gradesEmail: true,
    eventsEmail: true,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
  },
  privacy: {
    parentsCanViewAttendance: true,
    parentsCanViewGrades: true,
    teachersCanViewAttendance: true,
    teachersCanViewGrades: true,
    showInLeaderboard: true,
  },
  system: {
    language: "en",
    theme: "system",
  },
};

export default function SettingsPage() {
  const [tab, setTab] = useState<TabKey>("notifications"); // Track active tab.
  const [settings, setSettings] = useState<UserSettings>(defaultSettings); // Settings state.
  const [loading, setLoading] = useState(false); // Loading state.
  const [saving, setSaving] = useState(false); // Saving state.
  const [error, setError] = useState<string>(""); // Error message.

  const { setTheme } = useTheme(); // Read theme setter.

  const canExport = useMemo(() => {
    const role = localStorage.getItem("userRole"); // Read user role.
    return role === "student"; // Only student export is supported right now.
  }, []); // Memoize value.

  const loadSettings = async () => {
    setLoading(true); // Set loading true.
    setError(""); // Clear error.
    try {
      const res = await apiClient.get<UserSettings>("/api/v1/settings/me"); // Fetch settings.
      setSettings(res.data); // Store loaded settings.
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to load settings"); // Store error.
    } finally {
      setLoading(false); // Clear loading.
    }
  };

  const saveSettings = async (next: UserSettings) => {
    setSaving(true); // Set saving.
    setError(""); // Clear error.
    try {
      const res = await apiClient.put<UserSettings>("/api/v1/settings/me", next); // Save to API.
      setSettings(res.data); // Store server-normalized settings.
      toast.success("Settings saved successfully!");

      // Apply theme immediately on save. // Keep UI in sync.
      setTheme(res.data.system.theme); // Update theme provider.

      // Persist language locally for UI usage (translation work can use this key later). // Store for future i18n.
      localStorage.setItem("appLanguage", res.data.system.language); // Save language.
    } catch (e: any) {
      toast.error("Failed to save settings: " + (e?.response?.data?.error || "Unknown error"));
    } finally {
      setSaving(false); // Clear saving.
      setError(""); // Clear local error state
    }
  };

  useEffect(() => {
    loadSettings(); // Load settings on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once.

  const updateNotifications = (key: keyof NotificationsSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    })); // Update notifications state.
  };

  const updatePrivacy = (key: keyof PrivacySettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      privacy: { ...prev.privacy, [key]: value },
    })); // Update privacy state.
  };

  const updateSystem = (key: keyof SystemSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      system: { ...prev.system, [key]: value },
    })); // Update system state.
  };

  const downloadExport = async () => {
    setError(""); // Clear error.
    try {
      const res = await apiClient.get("/api/v1/settings/me/export", { responseType: "blob" }); // Download CSV.
      const blob = new Blob([res.data], { type: "text/csv" }); // Create CSV blob.
      const url = window.URL.createObjectURL(blob); // Create object URL.
      const a = document.createElement("a"); // Create link.
      a.href = url; // Assign URL.
      a.download = "educonnect_export.csv"; // Set default filename.
      document.body.appendChild(a); // Append link.
      a.click(); // Trigger click.
      a.remove(); // Remove link.
      window.URL.revokeObjectURL(url); // Cleanup object URL.
      toast.success("Export downloaded successfully!");
    } catch (e: any) {
      toast.error("Failed to export CSV: " + (e?.response?.data?.error || "Unknown error"));
    } finally {
      setError(""); // Clear local error state
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="md:w-64 border-r bg-card p-4 md:flex-shrink-0">
        <nav className="space-y-2">
          <Button
            variant={tab === "notifications" ? "default" : "ghost"}
            className="w-full justify-start gap-2"
            onClick={() => setTab("notifications")}
          >
            <Bell className="h-4 w-4" />
            Notifications
          </Button>
          <Button
            variant={tab === "privacy" ? "default" : "ghost"}
            className="w-full justify-start gap-2"
            onClick={() => setTab("privacy")}
          >
            <Shield className="h-4 w-4" />
            Privacy
          </Button>
          <Button
            variant={tab === "system" ? "default" : "ghost"}
            className="w-full justify-start gap-2"
            onClick={() => setTab("system")}
          >
            <Cog className="h-4 w-4" />
            System
          </Button>
          <Button
            variant={tab === "export" ? "default" : "ghost"}
            className="w-full justify-start gap-2"
            onClick={() => setTab("export")}
            disabled={!canExport}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 bg-muted/40">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>

        {/* Loading / Error / Success Messages */}
        {loading && (
          <div className="text-muted-foreground mb-4">Loading settings...</div>
        )}


        {/* Conditional rendering for each tab content */}
        {tab === "notifications" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-primary">Notifications</h2>
            <p className="text-muted-foreground">Control how EduConnect contacts you about announcements, attendance, grades, and events.</p>
            {/* Notifications content */}
            <div className="space-y-4"> {/* Toggle list. */}
              <Card className="p-4">
                <div className="flex items-center justify-between gap-4"> {/* Row. */}
                  <div>
                    <div className="font-medium">Announcements</div> {/* Label. */}
                    <div className="text-sm text-muted-foreground">Receive updates on important announcements.</div> {/* Helper. */}
                  </div>
                  <div className="flex items-center gap-3"> {/* Controls. */}
                    <Switch checked={settings.notifications.announcementsEmail} onCheckedChange={(v) => updateNotifications("announcementsEmail", v)} title="Enable email notifications" /> {/* Email switch. */}
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between gap-4"> {/* Row. */}
                  <div>
                    <div className="font-medium">Attendance alerts</div> {/* Label. */}
                    <div className="text-sm text-muted-foreground">Alert when attendance &lt; 75%.</div> {/* Helper. */}
                  </div>
                  <div className="flex items-center gap-3"> {/* Controls. */}
                    <Switch checked={settings.notifications.attendanceAlertsEmail} onCheckedChange={(v) => updateNotifications("attendanceAlertsEmail", v)} title="Enable email notifications" /> {/* Email switch. */}
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between gap-4"> {/* Row. */}
                  <div>
                    <div className="font-medium">Grades</div> {/* Label. */}
                    <div className="text-sm text-muted-foreground">Receive notifications about new grade releases.</div> {/* Helper. */}
                  </div>
                  <div className="flex items-center gap-3"> {/* Controls. */}
                    <Switch checked={settings.notifications.gradesEmail} onCheckedChange={(v) => updateNotifications("gradesEmail", v)} title="Enable email notifications" /> {/* Email switch. */}
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between gap-4"> {/* Row. */}
                  <div>
                    <div className="font-medium">Events</div> {/* Label. */}
                    <div className="text-sm text-muted-foreground">Stay informed about upcoming college events and deadlines.</div> {/* Helper. */}
                  </div>
                  <div className="flex items-center gap-3"> {/* Controls. */}
                    <Switch checked={settings.notifications.eventsEmail} onCheckedChange={(v) => updateNotifications("eventsEmail", v)} title="Enable email notifications" /> {/* Email switch. */}
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-4 space-y-4"> {/* Quiet hours box. */}
              <div className="flex items-center justify-between"> {/* Row. */}
                <div>
                  <div className="font-medium">Quiet hours</div> {/* Label. */}
                  <div className="text-sm text-muted-foreground">Silence notifications during these hours.</div> {/* Helper. */}
                </div>
                <Switch checked={settings.notifications.quietHoursEnabled} onCheckedChange={(v) => updateNotifications("quietHoursEnabled", v)} /> {/* Toggle. */}
              </div>
              {settings.notifications.quietHoursEnabled && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Time inputs. */}
                    <div className="space-y-2"> {/* Start. */}
                      <Label>Start</Label> {/* Label. */}
                      <Input type="time" value={settings.notifications.quietHoursStart} onChange={(e) => updateNotifications("quietHoursStart", e.target.value)} /> {/* Input. */}
                    </div>
                    <div className="space-y-2"> {/* End. */}
                      <Label>End</Label> {/* Label. */}
                      <Input type="time" value={settings.notifications.quietHoursEnd} onChange={(e) => updateNotifications("quietHoursEnd", e.target.value)} /> {/* Input. */}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Notifications will be muted between {settings.notifications.quietHoursStart} and {settings.notifications.quietHoursEnd}.</p>
                </>
              )}
            </Card>

            <Button onClick={() => saveSettings(settings)} disabled={saving} className="btn-primary">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}

        {tab === "privacy" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-primary">Privacy</h2>
            <p className="text-muted-foreground">Manage who can view your academic and personal information.</p>
            {/* Privacy content */}
            <div className="space-y-4"> {/* Toggle list. */}
              <Card className="p-4">
                <div className="flex items-center justify-between"> {/* Parents attendance. */}
                  <div>
                    <div className="font-medium">Parents can view attendance</div>
                    <div className="text-sm text-muted-foreground">Allow your parents to track your attendance records.</div>
                  </div>
                  <Switch checked={settings.privacy.parentsCanViewAttendance} onCheckedChange={(v) => updatePrivacy("parentsCanViewAttendance", v)} />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between"> {/* Parents grades. */}
                  <div>
                    <div className="font-medium">Parents can view grades</div>
                    <div className="text-sm text-muted-foreground">Allow your parents to view your grades.</div>
                  </div>
                  <Switch checked={settings.privacy.parentsCanViewGrades} onCheckedChange={(v) => updatePrivacy("parentsCanViewGrades", v)} />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between"> {/* Teachers attendance. */}
                  <div>
                    <div className="font-medium">Teachers can view attendance</div>
                    <div className="text-sm text-muted-foreground">Allow teachers to view your attendance records.</div>
                  </div>
                  <Switch checked={settings.privacy.teachersCanViewAttendance} onCheckedChange={(v) => updatePrivacy("teachersCanViewAttendance", v)} />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between"> {/* Teachers grades. */}
                  <div>
                    <div className="font-medium">Teachers can view grades</div>
                    <div className="text-sm text-muted-foreground">Allow teachers to view your grades.</div>
                  </div>
                  <Switch checked={settings.privacy.teachersCanViewGrades} onCheckedChange={(v) => updatePrivacy("teachersCanViewGrades", v)} />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between"> {/* Leaderboard visibility. */}
                  <div>
                    <div className="font-medium">Show me in leaderboard</div>
                    <div className="text-sm text-muted-foreground">Control visibility on the Home page main exam leaderboard.</div>
                  </div>
                  <Switch checked={settings.privacy.showInLeaderboard} onCheckedChange={(v) => updatePrivacy("showInLeaderboard", v)} />
                </div>
              </Card>
            </div>

            <Button onClick={() => saveSettings(settings)} disabled={saving} className="btn-primary">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}

        {tab === "system" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-primary">System</h2>
            <p className="text-muted-foreground">Configure application language and theme settings.</p>
            {/* System content */}
            <Card className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Grid. */}
                <div className="space-y-2"> {/* Language select. */}
                  <Label>Language</Label> {/* Label. */}
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm" // Styling.
                    value={settings.system.language} // Bind.
                    onChange={(e) => updateSystem("language", e.target.value as Language)} // Update.
                  >
                    <option value="en">English</option> {/* English. */}
                    <option value="ml">Malayalam</option> {/* Malayalam. */}
                  </select>
                </div>
                <div className="space-y-2"> {/* Theme select. */}
                  <Label>Theme</Label> {/* Label. */}
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm" // Styling.
                    value={settings.system.theme} // Bind.
                    onChange={(e) => updateSystem("theme", e.target.value as Theme)} // Update.
                  >
                    <option value="system">System</option> {/* System. */}
                    <option value="light">Light</option> {/* Light. */}
                    <option value="dark">Dark</option> {/* Dark. */}
                  </select>
                </div>
              </div>
            </Card>

            <Button onClick={() => saveSettings(settings)} disabled={saving} className="btn-primary">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}

        {tab === "export" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-primary">Data Export</h2>
            <p className="text-muted-foreground">Download your attendance and grades as a CSV file. Only available for student accounts.</p>
            {/* Export content */}
            <Card className="p-4">
              <Button onClick={downloadExport} disabled={!canExport}>Download CSV</Button> {/* Button. */}
              {!canExport && (
                <div className="text-sm text-muted-foreground mt-2">Export is currently available for student accounts only.</div>
              )}
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
