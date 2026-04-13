'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, Loader2, Search, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

  const defaultMap: Record<string, string> = {
    buyer_fee_percent: '0.5',
    seller_fee_percent: '0.75',
    rider_release_fee: '1.00',
    delivery_code_length: '7',
    partial_code_length: '4',
    code_expiry_hours: '72',
    max_code_attempts: '5',
    lockout_minutes: '30',
    payout_max_retries: '5',
    auto_release_hours: '72',
    whatsapp_support_number: '+233000000000',
    auto_release_enabled: 'true',
    seller_verification_required: 'false',
    seller_verification_threshold: '5000',
    kyc_required_buyer: 'true',
    kyc_required_seller: 'true',
    kyc_auto_approve: 'false',
    kyc_block_on_reject: 'true',
    kyc_expiry_days: '365',
    fraud_detection_enabled: 'true',
    fraud_auto_hold_score: '75',
  };

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

  async function resetDefaults() {
    setBulkSaving(true);
    try {
      for (const [key, value] of Object.entries(defaultMap)) {
        await api.updateSetting(key, value);
      }
      toast.success('Platform defaults restored');
      const res = await api.getSettings();
      setSettings(res.data);
      const vals: Record<string, string> = {};
      res.data.forEach((s: any) => { vals[s.key] = typeof s.value === 'string' ? s.value : JSON.stringify(s.value); });
      setEditValues(vals);
    } catch {
      toast.error('Failed to reset defaults');
    } finally {
      setBulkSaving(false);
    }
  }

  const filtered = settings.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return s.key.toLowerCase().includes(q) || String(s.description || '').toLowerCase().includes(q);
  });

  function getGroupName(key: string) {
    if (key.includes('fee') || key.includes('payout')) return 'Fees & Payouts';
    if (key.includes('fraud') || key.includes('lockout') || key.includes('attempt')) return 'Risk & Security';
    if (key.includes('code') || key.includes('release')) return 'Secure Release Flow';
    if (key.includes('whatsapp') || key.includes('verification') || key.includes('kyc')) return 'Support & Compliance';
    return 'General';
  }

  const grouped = filtered.reduce((acc: Record<string, any[]>, item: any) => {
    const group = getGroupName(item.key);
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

  if (loading) return <div className="space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>;

  return (
    <div className="space-y-5 max-w-7xl w-full">
      <Card className="overflow-hidden rounded-2xl border-0 bg-gradient-to-r from-slate-900 via-slate-800 to-primary text-white shadow-lg">
        <CardContent className="py-5">
          <p className="text-xs uppercase tracking-[0.12em] text-white/70">Admin Configuration</p>
          <h1 className="mt-1 text-2xl font-bold">Platform Settings Console</h1>
          <p className="mt-1 text-sm text-white/80">Tune pricing, fraud controls, and secure payment behavior with instant save actions.</p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Find and manage settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search settings..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <Button variant="outline" onClick={() => void resetDefaults()} disabled={bulkSaving}>
              {bulkSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RotateCcw className="h-4 w-4 mr-1" />}
              Restore Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
          {Object.entries(grouped).map(([groupName, items]) => (
            <Card key={groupName} className="rounded-2xl border-slate-200/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{groupName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
              {items.map((s: any) => (
                <div key={s.key} className="space-y-2 rounded-xl border bg-slate-50/70 p-3">
                  <Label className="text-sm font-semibold">{s.key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</Label>
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
                      className="w-full shrink-0 sm:w-auto"
                    >
                      {saving === s.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ))}
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
