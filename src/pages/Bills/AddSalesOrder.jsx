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

const SALES_ORDERS_KEY = 'bills:salesOrders';

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

const AddSalesOrder = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    customerId: '',
    customerName: '',
    customerChitthiNo: '',
    customerChitthiDate: '',
    salesNo: '',
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
    if (!form.customerName) {
      toast.error('Customer name is required');
      return;
    }
    if (!form.salesNo) {
      toast.error('Sales number is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: Date.now(),
        salesNo: form.salesNo,
        customerId: form.customerId || undefined,
        customerName: form.customerName,
        customerChitthiNo: form.customerChitthiNo || undefined,
        customerChitthiDate: form.customerChitthiDate || undefined,
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
        const raw = localStorage.getItem(SALES_ORDERS_KEY);
        existing = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(existing)) existing = [];
      } catch {
        existing = [];
      }
      existing.unshift(payload);
      localStorage.setItem(SALES_ORDERS_KEY, JSON.stringify(existing));

      toast.success('Sales order saved successfully!');
      navigate('/bills/sales');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidebarLayout>
      <PageHeader
        title="Add sales order"
        subtitle="Create sales order details"
        backTo="/bills/sales"
        backLabel="Sales orders"
      />

      <PageBody className="space-y-5">
        <Card className="gap-0 p-4 sm:p-5">
          <FieldGrid columns={2}>
            <PartyDropdown
              label="Customer name"
              value={form.customerName}
              options={partyOptions}
              placeholder="Select party"
              required
              onSelect={(party) =>
                setForm((prev) => ({
                  ...prev,
                  customerName: party.name,
                  customerId: party.id ? String(party.id) : '',
                }))
              }
            />
            <Field label="Customer chitthi no." htmlFor="cust-chitthi-no">
              <Input
                id="cust-chitthi-no"
                value={form.customerChitthiNo}
                onChange={(e) => setForm((prev) => ({ ...prev, customerChitthiNo: e.target.value }))}
                placeholder="Enter customer chitthi no."
              />
            </Field>
            <Field label="Customer chitthi date" htmlFor="cust-chitthi-date">
              <Input
                id="cust-chitthi-date"
                type="date"
                value={form.customerChitthiDate}
                onChange={(e) => setForm((prev) => ({ ...prev, customerChitthiDate: e.target.value }))}
              />
            </Field>
            <Field label="Sales no." htmlFor="sales-no" required>
              <Input
                id="sales-no"
                value={form.salesNo}
                onChange={(e) => setForm((prev) => ({ ...prev, salesNo: e.target.value }))}
                placeholder="Enter sales no."
              />
            </Field>
            <Field label="Date" htmlFor="so-date">
              <Input
                id="so-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              />
            </Field>
            <Field label="Time" htmlFor="so-time">
              <Input
                id="so-time"
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
              <div key={index} className={index > 0 ? 'border-t border-line pt-4' : ''}>
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
                        placeholder={item.elementType === 'Peti' ? '900' : 'Enter element'}
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
                  <Field label="Scrap" className="md:col-span-2">
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
          <Button variant="outline" onClick={() => navigate('/bills/sales')} className="px-10">
            Cancel
          </Button>
        </div>
      </PageBody>
    </SidebarLayout>
  );
};

export default AddSalesOrder;
