import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/SidebarLayout';
import { PageBody, PageHeader, Section } from '@/components/page-header';
import { Field, FieldGrid } from '@/components/form-field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  itemBlueprintApi,
  sizeApi,
  clientInventoryApi,
  inventoryApi,
  itemApi,
  axiosInstance,
} from '@/services/apiService';
import { FINISH_LABELS } from '@/constants/finishes';

// ─── Finish / Plating options ─────────────────────────────────────────────
// Canonical list shared with the Stock Master finish columns and Job Work.
const FINISH_OPTIONS = FINISH_LABELS;

// ─── Empty item row ────────────────────────────────────────────────────────
const createEmptyItem = () => ({
  selectedItem: null,
  selectedSize: null,
  sizes: [],
  sizesLoading: false,
  qtyPc: '',
  stickerQty: '',
  finish: '',
  rawPcPerBox: '',
  rawBoxPerCartoon: '',
  pcPerBox: '',
  boxPerCartoon: '',
  pcPerCartoon: '',
  qtyKg: '',
  clientInventoryLoading: false,
  stockStatus: null,
  stockTotalPc: null,
  stockLowWarn: 0,
});

const computeStockStatus = (totalPc, lowWarn, orderedQty) => {
  if (totalPc === null) return null;
  const ordered = parseFloat(orderedQty) || 0;
  if (totalPc <= 0) return 'OUT_OF_STOCK';
  if (ordered > totalPc) return 'EXCEEDS';
  if (lowWarn > 0 && totalPc <= lowWarn) return 'LOW';
  return 'IN_STOCK';
};

// ─── Derive box / carton / kg from user's qtyPc input ────────────────────────
// boxes   = ceil(qtyPc / pcPerBox_rate)
// cartons = ceil(boxes / boxPerCartoon_rate)
// qtyKg   = (dozenWeight / 12) × qtyPc
// Qty Kg only needs qty + dozenWeight — it must not be wiped out just because
// the pieces-per-box rate happens to be missing (that used to zero out qtyKg too).
const computeDerived = (qtyPc, rawPcPerBox, rawBoxPerCartoon, dozenWeight) => {
  const qty = parseFloat(qtyPc) || 0;
  const pcRate = parseFloat(rawPcPerBox) || 0;
  const boxRate = parseFloat(rawBoxPerCartoon) || 0;
  const dozWt = parseFloat(dozenWeight) || 0;

  const kg = qty && dozWt ? ((dozWt / 12) * qty).toFixed(3) : '';

  if (!qty || !pcRate) return { pcPerBox: '', boxPerCartoon: '', qtyKg: kg };

  const boxes = Math.ceil(qty / pcRate);
  const cartons = boxRate ? Math.ceil(boxes / boxRate) : '';

  return {
    pcPerBox: String(boxes),
    boxPerCartoon: cartons !== '' ? String(cartons) : '',
    qtyKg: kg,
  };
};

const STOCK_BADGE = {
  IN_STOCK: { variant: 'success', text: (pc) => `In stock (${pc} pc)` },
  LOW: { variant: 'warning', text: (pc) => `Low stock (${pc} pc)` },
  EXCEEDS: { variant: 'brass', text: (pc) => `Exceeds stock (only ${pc} pc available)` },
  OUT_OF_STOCK: { variant: 'danger', text: () => 'Out of stock' },
};

// A read-only, auto-computed field.
const AutoInput = ({ value, loading }) => (
  <Input readOnly value={value ?? ''} placeholder={loading ? 'Loading…' : 'Auto'} className="bg-surface-2 font-mono" />
);

// ─── Main Component ────────────────────────────────────────────────────────
const AddOrder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedParty = location.state?.selectedParty || null;

  const [poDate, setPoDate] = useState('');
  const [scrap, setScrap] = useState('');
  const [items, setItems] = useState([createEmptyItem()]);
  const [saving, setSaving] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [allStockEntries, setAllStockEntries] = useState([]);

  useEffect(() => {
    itemBlueprintApi
      .getAllItems()
      .then((res) => setAllItems(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error('Failed to load items'))
      .finally(() => setItemsLoading(false));
    setItemsLoading(true);
  }, []);

  useEffect(() => {
    itemApi
      .getAllItems(undefined, undefined, 0, 1000)
      .then((res) => {
        const data = res.data?.data || res.data || [];
        setAllStockEntries(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
  }, []);

  const updateItem = useCallback((index, patch) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }, []);

  // Step 1: item selected → load sizes
  const handleSelectItem = useCallback(
    async (index, blueprint) => {
      updateItem(index, {
        selectedItem: blueprint,
        selectedSize: null,
        sizes: [],
        sizesLoading: true,
        pcPerBox: '',
        boxPerCartoon: '',
        pcPerCartoon: '',
        qtyKg: '',
      });
      try {
        const res = await sizeApi.getSizesByItemId(blueprint.id);
        updateItem(index, { sizes: Array.isArray(res.data) ? res.data : [], sizesLoading: false });
      } catch {
        toast.error('Failed to load sizes');
        updateItem(index, { sizesLoading: false });
      }
    },
    [updateItem],
  );

  // Step 2: size selected → auto-fill from client inventory, falling back to the
  // main Item Master inventory (same data Masters > Item manages) when the
  // client has no size-specific override — otherwise most orders end up with
  // blank Qty Kg / Pc-Box / Box-Cartoon / Sticker Qty since client_inventory
  // overrides are rarely set up.
  const handleSelectSize = useCallback(
    async (index, size, currentQtyPc = '', blueprintId) => {
      updateItem(index, {
        selectedSize: size,
        clientInventoryLoading: true,
        pcPerBox: '',
        boxPerCartoon: '',
        pcPerCartoon: '',
        qtyKg: '',
      });

      try {
        const [clientRes, masterRes] = await Promise.allSettled([
          selectedParty?.id
            ? clientInventoryApi.getInventoryByClient(selectedParty.id, size.id)
            : Promise.resolve(null),
          blueprintId
            ? inventoryApi.getAllInventory(blueprintId, undefined, size.sizeInInch, size.sizeInMm)
            : Promise.resolve(null),
        ]);

        const extractList = (res) => {
          if (res.status !== 'fulfilled' || !res.value) return [];
          const data = res.value.data;
          return Array.isArray(data) ? data : (data?.data ?? []);
        };
        const clientEntry = extractList(clientRes)[0] ?? null;
        const masterEntry = extractList(masterRes)[0] ?? null;

        const pick = (field) =>
          clientEntry?.[field] != null
            ? String(clientEntry[field])
            : masterEntry?.[field] != null
              ? String(masterEntry[field])
              : '';

        const rawPcPerBox = pick('pcsPerBox');
        const rawBoxPerCartoon = pick('boxPerCarton');
        const derived = computeDerived(currentQtyPc, rawPcPerBox, rawBoxPerCartoon, size.dozenWeight);
        const stockEntry = allStockEntries.find((st) => Number(st.sizeId) === Number(size.id));
        let stockTotalPc = null;
        let stockLowWarn = 0;
        if (stockEntry) {
          stockTotalPc = parseFloat(stockEntry.totalPc) || 0;
          stockLowWarn = parseFloat(stockEntry.lowStockWarning) || 0;
        }
        const stockStatus = computeStockStatus(stockTotalPc, stockLowWarn, currentQtyPc);

        updateItem(index, {
          clientInventoryLoading: false,
          rawPcPerBox,
          rawBoxPerCartoon,
          pcPerCartoon: pick('pcsPerCarton'),
          ...derived,
          stickerQty: derived.pcPerBox,
          stockStatus,
          stockTotalPc,
          stockLowWarn,
        });
      } catch {
        updateItem(index, { clientInventoryLoading: false });
      }
    },
    [selectedParty, updateItem, allStockEntries],
  );

  const addItem = () => setItems((prev) => [...prev, createEmptyItem()]);
  const removeItem = (idx) =>
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));

  const handleSave = async () => {
    if (!selectedParty?.id) {
      toast.error('No party selected');
      return;
    }
    if (!poDate) {
      toast.error('P/O Date is required');
      return;
    }
    if (scrap.trim() !== '' && !Number.isFinite(Number(scrap))) {
      toast.error('Scrap must be a number');
      return;
    }
    const validItems = items.filter((it) => it.selectedSize);
    if (validItems.length === 0) {
      toast.error('Select at least one size');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        orderDate: poDate,
        // Blank is not zero: an order can be placed before the scrap has been agreed, and the
        // sheet shows "+ Add" for that rather than a rate of nothing.
        scrap: scrap.trim() === '' ? null : Number(scrap),
        items: validItems.map((it) => ({
          itemSizeId: it.selectedSize.id,
          plating: it.finish || null,
          qtyPc: parseInt(it.qtyPc, 10) || 0,
          qtyKg: it.qtyKg !== '' ? parseFloat(it.qtyKg) : null,
          pcPerBox: it.pcPerBox !== '' ? parseInt(it.pcPerBox, 10) : null,
          boxPerCartoon: it.boxPerCartoon !== '' ? parseInt(it.boxPerCartoon, 10) : null,
          pcPerCartoon: it.pcPerCartoon !== '' ? parseInt(it.pcPerCartoon, 10) : null,
          stickerQty: it.stickerQty !== '' ? parseInt(it.stickerQty, 10) : null,
          pendingPc: null,
          jobActionDone: null,
          platingType: null,
          jobWorkNo: null,
        })),
      };

      await axiosInstance.post(`/api/v1/parties/${selectedParty.id}/orders`, payload);
      toast.success('Order placed successfully!');
      navigate('/order');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to place order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidebarLayout>
      <PageHeader title="Add order" subtitle="Place a new order for the selected party" backTo="/order" backLabel="Orders" />

      <PageBody className="space-y-6">
        {/* Order header */}
        <Card className="gap-0 p-4 sm:p-5">
          <FieldGrid columns={2}>
            <Field label="Party name">
              <Input readOnly value={selectedParty?.name || ''} className="bg-surface-2" />
            </Field>
            <Field label="P/O date" htmlFor="po-date" required>
              <Input id="po-date" type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
            </Field>
            {/* One figure for the whole order — it is settled once with the party when the order is
                taken, not per line and not per chitthi. */}
            <Field label="Scrap" htmlFor="scrap" hint="Leave blank if not agreed yet">
              <Input
                id="scrap"
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                value={scrap}
                onChange={(e) => setScrap(e.target.value)}
                placeholder="Enter scrap"
                className="font-mono"
              />
            </Field>
          </FieldGrid>
        </Card>

        <Section
          title="Item details"
          actions={
            <Button size="sm" onClick={addItem}>
              <Plus className="size-4" />
              Add item
            </Button>
          }
        >
          <Card className="gap-0 p-4 sm:p-5">
            <div className="space-y-6">
              {items.map((item, index) => {
                const itemOptions = allItems.map((bp) => ({ value: String(bp.id), label: bp.itemName }));
                const sizeOptions = item.sizes.map((sz) => ({
                  value: String(sz.id),
                  label: `${sz.sizeInInch}${sz.sizeInMm ? ` (${sz.sizeInMm})` : ''}`,
                }));
                const badge = item.stockStatus ? STOCK_BADGE[item.stockStatus] : null;

                return (
                  <div key={index} className={index > 0 ? 'border-t border-line pt-6' : ''}>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-[13.5px] font-semibold text-ink">Item {index + 1}</h3>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        aria-label={`Remove item ${index + 1}`}
                        className="text-danger hover:text-danger"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>

                    <FieldGrid columns={2}>
                      <Field label="Item name">
                        <SearchableSelect
                          ariaLabel="Item name"
                          placeholder={itemsLoading ? 'Loading…' : 'Search & select item…'}
                          searchPlaceholder="Search item…"
                          options={itemOptions}
                          value={item.selectedItem ? String(item.selectedItem.id) : undefined}
                          onChange={(v) => {
                            const bp = allItems.find((b) => String(b.id) === v);
                            if (bp) handleSelectItem(index, bp);
                          }}
                        />
                      </Field>

                      <Field
                        label="Size"
                        hint={item.sizesLoading ? 'Loading sizes…' : undefined}
                      >
                        <SearchableSelect
                          ariaLabel="Size"
                          placeholder={
                            !item.selectedItem
                              ? 'Select item first'
                              : item.sizesLoading
                                ? 'Loading…'
                                : 'Select size…'
                          }
                          searchPlaceholder="Search size…"
                          options={sizeOptions}
                          value={item.selectedSize ? String(item.selectedSize.id) : undefined}
                          disabled={!item.selectedItem || item.sizesLoading}
                          onChange={(v) => {
                            const sz = item.sizes.find((s) => String(s.id) === v);
                            if (sz) handleSelectSize(index, sz, item.qtyPc, item.selectedItem?.id);
                          }}
                        />
                        {item.selectedSize && (
                          <div className="mt-1.5">
                            {badge ? (
                              <Badge variant={badge.variant}>{badge.text(item.stockTotalPc)}</Badge>
                            ) : (
                              <Badge variant="muted">Stock not added</Badge>
                            )}
                          </div>
                        )}
                      </Field>

                      <Field label="Pcs.">
                        <Input
                          type="number"
                          min="0"
                          value={item.qtyPc}
                          onChange={(e) => {
                            const qtyPc = e.target.value;
                            const derived = computeDerived(
                              qtyPc,
                              item.rawPcPerBox,
                              item.rawBoxPerCartoon,
                              item.selectedSize?.dozenWeight,
                            );
                            updateItem(index, {
                              qtyPc,
                              ...derived,
                              stickerQty: derived.pcPerBox,
                              stockStatus: computeStockStatus(item.stockTotalPc, item.stockLowWarn, qtyPc),
                            });
                          }}
                          placeholder="Enter Pc."
                        />
                      </Field>

                      <Field label="Sticker qty">
                        <Input
                          type="number"
                          min="0"
                          value={item.stickerQty}
                          onChange={(e) => updateItem(index, { stickerQty: e.target.value })}
                          placeholder="Enter sticker quantity"
                        />
                      </Field>

                      <Field label="Finish">
                        <Select
                          value={item.finish || undefined}
                          onValueChange={(v) => updateItem(index, { finish: v })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select finish…" />
                          </SelectTrigger>
                          <SelectContent>
                            {FINISH_OPTIONS.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field label="Box qty.">
                        <AutoInput value={item.pcPerBox} loading={item.clientInventoryLoading} />
                      </Field>

                      <Field label="Cartoon">
                        <AutoInput value={item.boxPerCartoon} loading={item.clientInventoryLoading} />
                      </Field>

                      <Field label="Qty Kg">
                        <AutoInput value={item.qtyKg} loading={item.clientInventoryLoading} />
                      </Field>
                    </FieldGrid>
                  </div>
                );
              })}
            </div>
          </Card>
        </Section>

        <div className="flex items-center justify-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="px-10">
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="outline" onClick={() => navigate('/order/select')} disabled={saving} className="px-10">
            Cancel
          </Button>
        </div>
      </PageBody>
    </SidebarLayout>
  );
};

export default AddOrder;
