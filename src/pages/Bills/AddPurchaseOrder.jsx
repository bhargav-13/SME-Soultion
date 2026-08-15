import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/SidebarLayout';
import { PageBody, PageHeader } from '@/components/page-header';
import { Field, FieldGrid } from '@/components/form-field';
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
import PartyDropdown from '@/components/Bills/PartyDropdown';
import { partyApi } from '@/services/apiService';

const PURCHASE_ORDERS_KEY = 'bills:purchaseOrders';

const UNIT_TYPES = ['Kgs', 'Gms'];
const ELEMENT_TYPES = ['Wooden Peti', 'Peti', 'Bag', 'Heavy Peti'];

const createItem = () => ({
  size: '',
  unit: '',
  kgPc: '',
  element: '',
  elementType: '',
  elementWeightGm: '',
  scrap: '',
  labour: '',
});

const AddPurchaseOrder = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    sellerPartyId: '',
    sellerPartyName: '',
    sellerChitthiNo: '',
    sellerChitthiDate: '',
    purchaseNo: '',
    date: '',
    time: '',
  });
  const [items, setItems] = useState([createItem()]);
  const [saving, setSaving] = useState(false);
  const [partyOptions, setPartyOptions] = useState([]);

  useEffect(() => {
    const loadParties = async () => {
      try {
        const res = await partyApi.getAllParties();
        const data = res.data;
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setPartyOptions(list);
      } catch {
        toast.error('Failed to load party names');
      }
    };
    loadParties();
  }, []);

  const updateItem = (index, patch) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };
  const removeItem = (index) =>
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  const getItemTotal = (item) => (Number(item.scrap) || 0) + (Number(item.labour) || 0);

  const handleSave = async () => {
    if (!form.sellerPartyName) {
      toast.error('Seller party name is required');
      return;
    }
    if (!form.purchaseNo) {
      toast.error('Purchase number is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: Date.now(),
        purchaseNo: form.purchaseNo,
        sellerPartyId: form.sellerPartyId || undefined,
        sellerPartyName: form.sellerPartyName,
        sellerChitthiNo: form.sellerChitthiNo || undefined,
        sellerChitthiDate: form.sellerChitthiDate || undefined,
        date: form.date || undefined,
        time: form.time || undefined,
        items: items.map((item) => ({
          size: item.size || undefined,
          unit: item.unit || undefined,
          unitType: item.kgPc || undefined,
          element: item.element || undefined,
          elementType: item.elementType || undefined,
          elementWeightGm: item.elementWeightGm || undefined,
          scrap: item.scrap ? Number(item.scrap) : undefined,
          labour: item.labour ? Number(item.labour) : undefined,
          total: (Number(item.scrap) || 0) + (Number(item.labour) || 0),
        })),
        createdAt: new Date().toISOString(),
      };

      let existing = [];
      try {
        const raw = localStorage.getItem(PURCHASE_ORDERS_KEY);
        existing = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(existing)) existing = [];
      } catch {
        existing = [];
      }
      existing.unshift(payload);
      localStorage.setItem(PURCHASE_ORDERS_KEY, JSON.stringify(existing));

      toast.success('Purchase order saved successfully!');
      navigate('/bills/purchase');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidebarLayout>
      <PageHeader
        title="Add purchase order"
        subtitle="Create purchase order details"
        backTo="/bills/purchase"
        backLabel="Purchase orders"
      />

      <PageBody className="space-y-5">
        <Card className="gap-0 p-4 sm:p-5">
          <FieldGrid columns={2}>
            <PartyDropdown
              label="Seller party name"
              value={form.sellerPartyName}
              options={partyOptions}
              placeholder="Select party"
              required
              onSelect={(party) =>
                setForm((prev) => ({
                  ...prev,
                  sellerPartyName: party.name,
                  sellerPartyId: party.id ? String(party.id) : '',
                }))
              }
            />
            <Field label="Seller chitthi no." htmlFor="seller-chitthi-no">
              <Input
                id="seller-chitthi-no"
                value={form.sellerChitthiNo}
                onChange={(e) => setForm((prev) => ({ ...prev, sellerChitthiNo: e.target.value }))}
                placeholder="Enter seller chitthi no."
              />
            </Field>
            <Field label="Seller chitthi date" htmlFor="seller-chitthi-date">
              <Input
                id="seller-chitthi-date"
                type="date"
                value={form.sellerChitthiDate}
                onChange={(e) => setForm((prev) => ({ ...prev, sellerChitthiDate: e.target.value }))}
              />
            </Field>
            <Field label="Purchase no." htmlFor="purchase-no" required>
              <Input
                id="purchase-no"
                value={form.purchaseNo}
                onChange={(e) => setForm((prev) => ({ ...prev, purchaseNo: e.target.value }))}
                placeholder="Enter purchase no."
              />
            </Field>
            <Field label="Date" htmlFor="po-date">
              <Input
                id="po-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              />
            </Field>
            <Field label="Time" htmlFor="po-time">
              <Input
                id="po-time"
                type="time"
                value={form.time}
                onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
              />
            </Field>
          </FieldGrid>
        </Card>

        <Card className="gap-0 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-heading text-[15px] font-semibold text-ink">Add items</h3>
            <Button size="sm" onClick={() => setItems((prev) => [...prev, createItem()])}>
              <Plus className="size-4" />
              Add item
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={index}
                className={index > 0 ? 'border-t border-line pt-4' : ''}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-[13.5px] font-semibold text-ink">Item {index + 1}</h4>
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

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <Field label="Size">
                    <Input
                      value={item.size}
                      onChange={(e) => updateItem(index, { size: e.target.value })}
                      placeholder="Enter Pc."
                    />
                  </Field>
                  <Field label="Unit">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={item.unit}
                        onChange={(e) => updateItem(index, { unit: e.target.value })}
                        placeholder="Enter unit"
                      />
                      <Select value={item.kgPc || undefined} onValueChange={(v) => updateItem(index, { kgPc: v })}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIT_TYPES.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </Field>
                  <Field label="Element" className="md:col-span-2">
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        value={item.element}
                        onChange={(e) => updateItem(index, { element: e.target.value })}
                        placeholder="Count"
                      />
                      <Select
                        value={item.elementType || undefined}
                        onValueChange={(v) =>
                          updateItem(index, { elementType: v, element: v === 'Peti' ? '900' : '' })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {ELEMENT_TYPES.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="0"
                        value={item.elementWeightGm}
                        onChange={(e) => updateItem(index, { elementWeightGm: e.target.value })}
                        placeholder={item.elementType === 'PETI' ? '900' : 'Enter gm'}
                      />
                    </div>
                  </Field>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Field label="Scrap">
                    <Input
                      value={item.scrap}
                      onChange={(e) => updateItem(index, { scrap: e.target.value })}
                      placeholder="Enter scrap"
                    />
                  </Field>
                  <Field label="Labour">
                    <Input
                      value={item.labour}
                      onChange={(e) => updateItem(index, { labour: e.target.value })}
                      placeholder="Enter labour"
                    />
                  </Field>
                  <Field label="Total">
                    <Input readOnly value={getItemTotal(item)} placeholder="Auto total" className="bg-surface-2 font-mono" />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex items-center justify-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="px-10">
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="outline" onClick={() => navigate('/bills/purchase')} className="px-10">
            Cancel
          </Button>
        </div>
      </PageBody>
    </SidebarLayout>
  );
};

export default AddPurchaseOrder;
