'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  EmptyState,
  MoneyDisplay,
  BottomSheet,
  Input,
  Textarea,
  useToast,
} from '@/design-system';
import {
  Plus,
  Upload,
  ShoppingBag,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2,
  FileText,
} from 'lucide-react';
import { purchaseRepository } from '@/lib/db/repositories';
import { Purchase } from '@/lib/db/types';
import {
  calculateReturnWindow,
  calculateWarranty,
  parsePastedPurchaseText,
} from '@/lib/rules/purchaseRules';

export const PurchasesPage: React.FC = () => {
  const router = useRouter();
  const { toast } = useToast();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  // Import state
  const [importText, setImportText] = useState('');
  const [importDraft, setImportDraft] = useState<any | null>(null);

  // Manual Add state
  const [store, setStore] = useState('');
  const [product, setProduct] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [amount, setAmount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [returnDays, setReturnDays] = useState('7');
  const [warrantyMonths, setWarrantyMonths] = useState('12');

  const loadPurchases = async () => {
    const all = await purchaseRepository.getAll();
    setPurchases(all);
  };

  useEffect(() => {
    loadPurchases();
  }, []);

  const handlePreviewImport = () => {
    if (!importText.trim()) {
      toast('Paste email or order text first.', 'warning');
      return;
    }
    const draft = parsePastedPurchaseText(importText);
    setImportDraft(draft);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = String(event.target?.result || '');
      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content);
          const raw = Array.isArray(parsed) ? parsed[0] : (parsed.data?.purchases?.[0] || parsed);
          setImportDraft({
            store: raw.store || 'Imported Store',
            product: raw.product || 'Imported Product',
            orderRef: raw.orderRef || '',
            amount: raw.amount ? Number(raw.amount) : null,
            purchaseDate: raw.purchaseDate || new Date().toISOString().slice(0, 10),
            deliveryDate: raw.deliveryDate || '',
            returnWindowDays: raw.returnWindowDays || 7,
            warrantyMonths: raw.warrantyMonths || 12,
          });
          toast('Parsed JSON purchase record successfully.', 'info');
        } catch {
          toast('Invalid JSON format.', 'error');
        }
      } else if (file.name.endsWith('.csv')) {
        const lines = content.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length > 1) {
          const cols = lines[1].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
          setImportDraft({
            store: cols[0] || 'CSV Store',
            product: cols[1] || 'CSV Item',
            orderRef: cols[2] || '',
            amount: cols[3] ? parseFloat(cols[3]) : null,
            purchaseDate: cols[4] || new Date().toISOString().slice(0, 10),
            deliveryDate: cols[5] || '',
            returnWindowDays: 7,
            warrantyMonths: 12,
          });
          toast('Parsed CSV purchase record successfully.', 'info');
        } else {
          toast('CSV file empty or missing headers.', 'warning');
        }
      } else {
        const draft = parsePastedPurchaseText(content);
        setImportDraft(draft);
        toast('Parsed purchase details successfully.', 'info');
      }
    };

    reader.readAsText(file);
  };

  const handleUpdatePurchase = async () => {
    if (!editingPurchase) return;
    try {
      await purchaseRepository.save(editingPurchase);
      toast('Purchase record updated.', 'success');
      setEditingPurchase(null);
      loadPurchases();
    } catch (err: any) {
      toast(`Update error: ${err.message}`, 'error');
    }
  };

  const handleSaveImport = async () => {
    if (!importDraft) return;

    try {
      const newPurchase: Purchase = {
        id: `PUR-${Date.now().toString().slice(-4)}`,
        store: importDraft.store || 'Online Store',
        product: importDraft.product || 'Purchased Item',
        orderRef: importDraft.orderRef,
        amount: importDraft.amount,
        purchaseDate: importDraft.purchaseDate,
        deliveryDate: importDraft.deliveryDate,
        returnWindowDays: importDraft.returnWindowDays || 7,
        warrantyMonths: importDraft.warrantyMonths || 12,
        notes: 'Imported from pasted text',
        createdAt: new Date().toISOString(),
      };

      await purchaseRepository.save(newPurchase);
      toast('Purchase saved to local vault.', 'success');
      setIsImportModalOpen(false);
      setImportText('');
      setImportDraft(null);
      loadPurchases();
    } catch (err: any) {
      toast(`Save error: ${err.message}`, 'error');
    }
  };

  const handleManualAdd = async () => {
    if (!store.trim() || !product.trim()) {
      toast('Please enter store and product name.', 'warning');
      return;
    }

    try {
      const newPurchase: Purchase = {
        id: `PUR-${Date.now().toString().slice(-4)}`,
        store,
        product,
        orderRef,
        amount: amount ? parseFloat(amount) : null,
        purchaseDate,
        deliveryDate,
        returnWindowDays: parseInt(returnDays, 10) || 7,
        warrantyMonths: parseInt(warrantyMonths, 10) || 12,
        createdAt: new Date().toISOString(),
      };

      await purchaseRepository.save(newPurchase);
      toast('Purchase added successfully.', 'success');
      setIsAddModalOpen(false);
      setStore('');
      setProduct('');
      setOrderRef('');
      setAmount('');
      setPurchaseDate('');
      setDeliveryDate('');
      loadPurchases();
    } catch (err: any) {
      toast(`Error adding purchase: ${err.message}`, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this purchase record?')) {
      await purchaseRepository.delete(id);
      toast('Purchase deleted.', 'info');
      loadPurchases();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-medium text-charcoal tracking-tight">
            Purchases & protection
          </h2>
          <p className="text-xs sm:text-sm text-steel-grey-600 mt-1 font-normal">
            Track return deadlines, warranty countdowns, and start dispute cases with one tap
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            onClick={() => setIsImportModalOpen(true)}
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span>Import orders</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Add purchase</span>
          </Button>
        </div>
      </div>

      {/* Purchases Grid */}
      {purchases.length === 0 ? (
        <EmptyState
          illustration="purchases"
          title="No purchases recorded yet"
          description="Keep track of your high-value gadgets, appliances, and return deadlines in one place."
          actionLabel="Add purchase"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {purchases.map((p) => {
            const retWindow = calculateReturnWindow(p.deliveryDate, p.returnWindowDays);
            const warranty = calculateWarranty(p.purchaseDate, p.warrantyMonths);

            return (
              <Card
                key={p.id}
                variant="default"
                className="p-5 flex flex-col justify-between space-y-4 bg-white border border-steel-grey-200 hover:border-steel-grey-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-medium text-steel-grey-600">
                      {p.store}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-steel-grey-500">{p.orderRef || p.id}</span>
                      <button
                        type="button"
                        onClick={() => setEditingPurchase(p)}
                        className="p-1 text-steel-grey-400 hover:text-charcoal transition-colors"
                        title="Edit purchase record"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="p-1 text-steel-grey-400 hover:text-coral transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base sm:text-lg font-medium text-charcoal">
                    {p.product}
                  </h3>

                  <div className="mt-2 flex items-center justify-between">
                    <MoneyDisplay amount={p.amount} size="md" />
                    {p.deliveryDate && (
                      <span className="text-xs text-steel-grey-500 font-normal">
                        Delivered {new Date(p.deliveryDate).toLocaleDateString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Return window & warranty countdown badges */}
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-steel-grey-50 border border-steel-grey-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="inline-flex items-center gap-2 leading-none">
                      <Clock
                        className={`w-3.5 h-3.5 shrink-0 ${
                          retWindow.status === 'active' || retWindow.status === 'last_day'
                            ? 'text-amber-700'
                            : 'text-steel-grey-500'
                        }`}
                      />
                      <span
                        className={`leading-none ${
                          retWindow.status === 'active' || retWindow.status === 'last_day'
                            ? 'text-amber-900 font-medium'
                            : 'text-steel-grey-600'
                        }`}
                      >
                        {retWindow.label}
                      </span>
                    </div>
                    <span className="text-steel-grey-500 shrink-0 whitespace-nowrap leading-none">
                      {warranty.label}
                    </span>
                  </div>
                </div>

                {/* Quick Action: Start Case */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    router.push(
                      `/app/cases?new=true&store=${encodeURIComponent(p.store)}&product=${encodeURIComponent(
                        p.product
                      )}&orderRef=${encodeURIComponent(p.orderRef || '')}&amount=${p.amount || ''}`
                    )
                  }
                  className="w-full"
                >
                  <span>Start a case from this purchase</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Import Orders Modal */}
      <BottomSheet
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import purchase confirmation"
        description="Paste email confirmation, invoice text, or order details. Local pattern extraction only"
        className="max-w-xl"
      >
        <div className="space-y-4">
          <Textarea
            label="Order confirmation text"
            rows={4}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste your order confirmation text here (e.g. 'Thank you for your order on Flipkart...')"
          />

          <Button variant="secondary" size="sm" onClick={handlePreviewImport}>
            Preview extracted fields
          </Button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-steel-grey-200"></div>
            <span className="flex-shrink mx-3 text-xs text-steel-grey-400">or upload file</span>
            <div className="flex-grow border-t border-steel-grey-200"></div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-steel-grey-200 bg-steel-grey-50 text-xs font-medium cursor-pointer hover:bg-steel-grey-100 transition-colors">
              <Upload className="w-4 h-4 text-steel-grey-500" />
              <span>Import CSV / JSON / EML file</span>
              <input
                type="file"
                accept=".json,.csv,.eml,.txt"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
          </div>

          {importDraft && (
            <div className="p-4 rounded-xl bg-steel-grey-50 border border-steel-grey-200 space-y-2 text-xs animate-in fade-in">
              <div className="font-medium text-charcoal text-xs">
                Review extracted information before saving
              </div>
              <div className="grid grid-cols-2 gap-2 text-steel-grey-700">
                <div>Store: <strong>{importDraft.store}</strong></div>
                <div>Product: <strong>{importDraft.product}</strong></div>
                <div>Order Ref: <strong>{importDraft.orderRef || 'Not found'}</strong></div>
                <div>Amount: <strong>{importDraft.amount ? `₹${importDraft.amount}` : 'Not found'}</strong></div>
                <div>Delivery Date: <strong>{importDraft.deliveryDate || 'Not found'}</strong></div>
                <div>Return Window: <strong>{importDraft.returnWindowDays} days</strong></div>
              </div>
              <p className="text-[11px] text-steel-grey-500 pt-1">
                Rule-based pattern extraction. No external server OCR.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveImport} disabled={!importDraft}>
              Save to purchases
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Manual Add Modal */}
      <BottomSheet
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add purchase record"
        description="Record product and return policy to track warranty and return deadlines"
      >
        <div className="space-y-3">
          <Input
            label="Store or merchant"
            value={store}
            onChange={(e) => setStore(e.target.value)}
            placeholder="e.g. Amazon India, Flipkart, Croma"
          />

          <Input
            label="Product name"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="e.g. Mechanical Keyboard"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Order reference #"
              value={orderRef}
              onChange={(e) => setOrderRef(e.target.value)}
              placeholder="e.g. OD4819201"
            />
            <Input
              label="Amount paid (₹)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 2499"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Purchase date"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
            <Input
              label="Delivery date"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Return window (days)"
              type="number"
              value={returnDays}
              onChange={(e) => setReturnDays(e.target.value)}
              placeholder="7"
            />
            <Input
              label="Warranty (months)"
              type="number"
              value={warrantyMonths}
              onChange={(e) => setWarrantyMonths(e.target.value)}
              placeholder="12"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleManualAdd}>
              Save purchase
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Edit Purchase Modal */}
      {editingPurchase && (
        <BottomSheet
          isOpen={true}
          onClose={() => setEditingPurchase(null)}
          title="Edit purchase record"
          description="Update store, dates, warranty or return period"
        >
          <div className="space-y-3">
            <Input
              label="Store or merchant"
              value={editingPurchase.store}
              onChange={(e) => setEditingPurchase({ ...editingPurchase, store: e.target.value })}
            />
            <Input
              label="Product name"
              value={editingPurchase.product}
              onChange={(e) => setEditingPurchase({ ...editingPurchase, product: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Order reference #"
                value={editingPurchase.orderRef || ''}
                onChange={(e) => setEditingPurchase({ ...editingPurchase, orderRef: e.target.value })}
              />
              <Input
                label="Amount paid (₹)"
                type="number"
                value={editingPurchase.amount ? String(editingPurchase.amount) : ''}
                onChange={(e) => setEditingPurchase({ ...editingPurchase, amount: parseFloat(e.target.value) || null })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Purchase date"
                type="date"
                value={editingPurchase.purchaseDate || ''}
                onChange={(e) => setEditingPurchase({ ...editingPurchase, purchaseDate: e.target.value })}
              />
              <Input
                label="Delivery date"
                type="date"
                value={editingPurchase.deliveryDate || ''}
                onChange={(e) => setEditingPurchase({ ...editingPurchase, deliveryDate: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Return window (days)"
                type="number"
                value={String(editingPurchase.returnWindowDays || 7)}
                onChange={(e) => setEditingPurchase({ ...editingPurchase, returnWindowDays: parseInt(e.target.value, 10) || 7 })}
              />
              <Input
                label="Warranty (months)"
                type="number"
                value={String(editingPurchase.warrantyMonths || 12)}
                onChange={(e) => setEditingPurchase({ ...editingPurchase, warrantyMonths: parseInt(e.target.value, 10) || 12 })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditingPurchase(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleUpdatePurchase}>
                Save changes
              </Button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
};
