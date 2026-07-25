import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { SystemSettings } from '../utils/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, Save, RefreshCw, AlertCircle, ToggleLeft, ToggleRight, Clock } from 'lucide-react';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch current settings
  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.settings.get();
      setSettings(data.settings);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve system settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await api.settings.update(settings);
      setSettings(data.settings);
      setSuccess('Support automation settings updated successfully!');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-teal-500" />
        <p className="text-sm font-medium text-muted-foreground">Loading system settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-2xl shadow-sm text-teal-600 dark:text-teal-400">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Automation Settings</h2>
            <p className="text-sm text-muted-foreground mt-1">Configure global AI email auto-replies, escalation thresholds, and business hours.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 text-sm flex items-center gap-2 animate-fadeIn">
          <Save className="w-4 h-4" />
          <span>{success}</span>
        </div>
      )}

      {settings && (
        <form onSubmit={handleSave} className="space-y-6">
          <Card className="border-border bg-card/85 backdrop-blur-md shadow-lg overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-teal-500 to-cyan-500" />
            <CardHeader className="pt-8 pb-4">
              <CardTitle className="text-xl font-bold">Email Automation Pipeline</CardTitle>
              <CardDescription>Configure auto-replies and how tickets are escalated when confidence is low.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pb-8">
              {/* Enable Auto Replies Switch */}
              <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-xl">
                <div>
                  <Label className="text-sm font-bold block mb-1">AI Auto Replies Enabled</Label>
                  <span className="text-xs text-muted-foreground">If enabled, AI will automatically resolve and reply to high-confidence tickets.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, aiAutoRepliesEnabled: !settings.aiAutoRepliesEnabled })}
                  className="p-1 cursor-pointer transition-colors duration-200"
                >
                  {settings.aiAutoRepliesEnabled ? (
                    <ToggleRight className="w-12 h-12 text-teal-600 dark:text-teal-400" />
                  ) : (
                    <ToggleLeft className="w-12 h-12 text-muted-foreground" />
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Confidence Threshold slider / input */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="threshold" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Auto-Reply Confidence Threshold (%)
                    </Label>
                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                      {Math.round(settings.confidenceThreshold * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      id="threshold-slider"
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={Math.round(settings.confidenceThreshold * 100)}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          confidenceThreshold: parseInt(e.target.value, 10) / 100,
                        })
                      }
                      className="flex-1 accent-teal-600"
                    />
                    <Input
                      id="threshold"
                      type="number"
                      min="10"
                      max="100"
                      value={Math.round(settings.confidenceThreshold * 100)}
                      onChange={(e) => {
                        let val = parseInt(e.target.value, 10);
                        if (isNaN(val)) val = 90;
                        setSettings({
                          ...settings,
                          confidenceThreshold: Math.min(100, Math.max(10, val)) / 100,
                        });
                      }}
                      className="w-20 bg-background border-border text-foreground text-center font-semibold"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Tickets evaluated with confidence below this threshold will bypass auto-replies and escalate to agents.
                  </p>
                </div>

                {/* Max Auto Replies Input */}
                <div className="space-y-2.5">
                  <Label htmlFor="max-replies" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Max Auto-Replies Per Ticket
                  </Label>
                  <Input
                    id="max-replies"
                    type="number"
                    min="1"
                    max="10"
                    value={settings.maxAutoRepliesPerTicket}
                    onChange={(e) => {
                      let val = parseInt(e.target.value, 10);
                      if (isNaN(val)) val = 3;
                      setSettings({
                        ...settings,
                        maxAutoRepliesPerTicket: Math.min(10, Math.max(1, val)),
                      });
                    }}
                    className="bg-background border-border text-foreground font-medium"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Prevent looping responses by limiting the number of times AI can auto-reply to a single ticket thread.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Hours Card */}
          <Card className="border-border bg-card/85 backdrop-blur-md shadow-lg overflow-hidden relative">
            <CardHeader className="pt-8 pb-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                Business Operating Hours
              </CardTitle>
              <CardDescription>Configure hours during which auto-replies are active. Auto-replies are paused and tickets escalated outside of these hours.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Operating Hours Start */}
                <div className="space-y-2.5">
                  <Label htmlFor="hours-start" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Working Hours Start (HH:MM)
                  </Label>
                  <Input
                    id="hours-start"
                    type="time"
                    value={settings.workingHoursStart}
                    onChange={(e) => setSettings({ ...settings, workingHoursStart: e.target.value })}
                    className="bg-background border-border text-foreground font-medium"
                  />
                </div>

                {/* Operating Hours End */}
                <div className="space-y-2.5">
                  <Label htmlFor="hours-end" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Working Hours End (HH:MM)
                  </Label>
                  <Input
                    id="hours-end"
                    type="time"
                    value={settings.workingHoursEnd}
                    onChange={(e) => setSettings({ ...settings, workingHoursEnd: e.target.value })}
                    className="bg-background border-border text-foreground font-medium"
                  />
                </div>
              </div>

              {/* Human Agent Fallback Switch */}
              <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-xl">
                <div>
                  <Label className="text-sm font-bold block mb-1">Fallback to Human Agent</Label>
                  <span className="text-xs text-muted-foreground">Assign escalated tickets directly to active agents when auto-replies fail or are outside operating hours.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, fallbackToHumanAgent: !settings.fallbackToHumanAgent })}
                  className="p-1 cursor-pointer transition-colors duration-200"
                >
                  {settings.fallbackToHumanAgent ? (
                    <ToggleRight className="w-12 h-12 text-teal-600 dark:text-teal-400" />
                  ) : (
                    <ToggleLeft className="w-12 h-12 text-muted-foreground" />
                  )}
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Form Action */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-semibold py-5 px-6 shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center gap-2 rounded-xl"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving Settings...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
