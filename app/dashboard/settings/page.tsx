"use client";

import { useState, useEffect } from "react";
import { getSettings, updateSettings } from "@/lib/settings-actions";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    appName: "Design Review Portal",
    primaryColor: "#71C6AC",
    secondaryColor: "#1B6378",
    logoUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const settings = await getSettings();
      setFormData(settings);
      setLoading(false);
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Convert to FormData
    const data = new FormData();
    Object.entries(formData).forEach(([k, v]) => data.append(k, v));

    const res = await updateSettings(data);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Settings saved successfully! You may need to refresh completely to see changes everywhere.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-poly-teal-light" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">Portal Settings</h1>
        <p className="text-slate-500 text-sm font-medium mt-1 uppercase tracking-widest">White-Labeling & Config</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        
        {/* Basic Brand Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-tight italic text-slate-800 border-b border-slate-100 pb-2">Branding Info</h2>
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Application Name</label>
            <input
              type="text"
              required
              className="w-full rounded-xl border-slate-200 shadow-sm focus:border-poly-teal-light focus:ring-poly-teal-light p-3 border bg-slate-50 text-slate-900"
              value={formData.appName}
              onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Logo URL (Optional)</label>
            <input
              type="url"
              placeholder="https://example.com/logo.png"
              className="w-full rounded-xl border-slate-200 shadow-sm focus:border-poly-teal-light focus:ring-poly-teal-light p-3 border bg-slate-50 text-slate-900 placeholder:text-slate-400"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
            />
            <p className="text-[10px] text-slate-400 mt-1">If provided, this image will replace the text in the navbar.</p>
          </div>
        </div>

        {/* Colors */}
        <div className="space-y-4 pt-4">
          <h2 className="text-lg font-bold uppercase tracking-tight italic text-slate-800 border-b border-slate-100 pb-2">Theme Colors</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Primary Color (Light Teal)</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  className="h-12 w-16 p-1 rounded-lg border border-slate-200 cursor-pointer"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                />
                <input
                  type="text"
                  className="flex-1 rounded-xl border-slate-200 shadow-sm focus:border-poly-teal-light focus:ring-poly-teal-light p-3 border uppercase font-mono bg-slate-50 text-slate-900"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Secondary Color (Dark Teal)</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  className="h-12 w-16 p-1 rounded-lg border border-slate-200 cursor-pointer"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                />
                <input
                  type="text"
                  className="flex-1 rounded-xl border-slate-200 shadow-sm focus:border-poly-teal-light focus:ring-poly-teal-light p-3 border uppercase font-mono bg-slate-50 text-slate-900"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-poly-teal-dark hover:bg-poly-teal-light text-white px-6 py-3 rounded-xl font-black uppercase italic tracking-widest shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
