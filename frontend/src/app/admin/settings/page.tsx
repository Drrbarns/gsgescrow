'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    api.getSettings()
      .then(res => {
        setSettings(res.data);
        const vals: Record<string, string> = {};
        res.data.forEach((s: any) => { vals[s.key] = typeof s.value === 'string' ? s.value : JSON.stringify(s.value); });
        setEditValues(vals);
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(key: string) {
    setSaving(key);
    try {
      await api.updateSetting(key, editValues[key]);
      toast.success(`Updated ${key}`);
    } catch { toast.error('Failed'); } finally { setSaving(null); }
  }

  if (loading) return <div className="space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;

  return (
    <div className="space-y-4 max-w-2xl w-full">
      <Card>
        <CardHeader><CardTitle>Platform Settings</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {settings.map(s => (
            <div key={s.key} className="space-y-2">
              <Label className="text-sm font-medium">{s.key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</Label>
              {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={editValues[s.key] || ''}
                  onChange={e => setEditValues(prev => ({ ...prev, [s.key]: e.target.value }))}
                  className="flex-1 w-full"
                />
                <Button
                  size="sm"
                  onClick={() => handleSave(s.key)}
                  disabled={saving === s.key || editValues[s.key] === (typeof s.value === 'string' ? s.value : JSON.stringify(s.value))}
                  className="w-full sm:w-auto shrink-0"
                >
                  {saving === s.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
