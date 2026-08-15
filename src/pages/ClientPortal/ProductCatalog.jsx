import { useEffect, useMemo, useState } from 'react';
import { Package, Plus, Search, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/SidebarLayout';
import { PageBody, PageHeader } from '@/components/page-header';
import { EmptyState, ListSkeleton } from '@/components/states';
import CartDrawer from '@/components/ClientPortal/CartDrawer';
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
import { useAuth } from '@/context/AuthContext';
import { clientPortalClientApi } from '@/services/apiService';
import { addToCart, clearCart, getCart, removeFromCart } from '@/utils/clientShop';

const UNIT_PCS = 'Pcs';
const UNIT_BOX = 'Box';
const UNIT_CARTON = 'Carton';

// Preferred order shown in the unit dropdown: Carton first, then Box, then Pcs.
const UNIT_ORDER = [UNIT_CARTON, UNIT_BOX, UNIT_PCS];

// Units available for a size — Pcs always; Box/Carton only when their packing is defined.
const unitsForSize = (size) => {
  const pcsPerBox = size?.pcsPerBox || 0;
  const pcsPerCarton = size?.pcsPerCarton || 0;
  return UNIT_ORDER.filter(
    (u) =>
      u === UNIT_PCS ||
      (u === UNIT_BOX && pcsPerBox > 0) ||
      (u === UNIT_CARTON && pcsPerCarton > 0),
  );
};

// A labeled control inside the product card's selector grid.
const Field = ({ label, className = '', children }) => (
  <div className={className}>
    <label className="mb-1 block text-[10.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
      {label}
    </label>
    {children}
  </div>
);

const ProductSelector = ({ item, onAdd }) => {
  const [sizeId, setSizeId] = useState(item.sizes[0]?.id ? String(item.sizes[0].id) : '');
  const [plating, setPlating] = useState(item.platings[0] || '');
  const [qty, setQty] = useState('');

  const selectedSize = item.sizes.find((s) => String(s.id) === String(sizeId));
  const pcsPerBox = selectedSize?.pcsPerBox || 0;
  const pcsPerCarton = selectedSize?.pcsPerCarton || 0;

  const unitOptions = unitsForSize(selectedSize);
  // Default to the first available unit (Carton > Box > Pcs).
  const [unit, setUnit] = useState(unitOptions[0] || UNIT_PCS);

  const computeQtyPc = (enteredQty, selectedUnit) => {
    const n = Number(enteredQty) || 0;
    if (selectedUnit === UNIT_BOX) return n * pcsPerBox;
    if (selectedUnit === UNIT_CARTON) return n * pcsPerCarton;
    return n;
  };

  const handleSizeChange = (newSizeId) => {
    setSizeId(newSizeId);
    const newSize = item.sizes.find((s) => String(s.id) === String(newSizeId));
    const avail = unitsForSize(newSize);
    // Keep the chosen unit if still valid, else fall back to the best available.
    if (!avail.includes(unit)) setUnit(avail[0] || UNIT_PCS);
  };

  const handleAdd = () => {
    const enteredQty = Number(qty);
    if (!sizeId) {
      toast.error('Please select a size');
      return;
    }
    if (!plating) {
      toast.error('Please select a plating/finish');
      return;
    }
    if (!enteredQty || enteredQty <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    const qtyPc = computeQtyPc(enteredQty, unit);
    onAdd({
      itemId: item.id,
      sizeId: selectedSize?.id,
      itemName: item.itemName,
      category: item.category,
      sizeInInch: selectedSize?.sizeInInch || '',
      sizeInMm: selectedSize?.sizeInMm || '',
      plating,
      qtyPc,
      orderUnit: unit,
      orderQty: enteredQty,
    });
    setQty('');
  };

  const previewPc = computeQtyPc(qty, unit);
  const hasUnitChoice = unitOptions.length > 1;

  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        <Field label="Size">
          <Select value={sizeId} onValueChange={handleSizeChange}>
            <SelectTrigger className="w-full" size="sm">
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {item.sizes.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {`${s.sizeInInch}${s.sizeInMm && s.sizeInMm !== '—' ? ` (${s.sizeInMm})` : ''}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Finish">
          <Select value={plating} onValueChange={setPlating}>
            <SelectTrigger className="w-full" size="sm">
              <SelectValue placeholder="Select finish" />
            </SelectTrigger>
            <SelectContent>
              {item.platings.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {hasUnitChoice && (
          <Field label="Unit">
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger className="w-full" size="sm">
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                {unitOptions.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <Field label="Quantity" className={hasUnitChoice ? '' : 'col-span-2'}>
          <Input
            type="number"
            min="1"
            placeholder="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="h-8 font-mono"
          />
        </Field>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[12px] text-ink-3">
          {unit !== UNIT_PCS && previewPc > 0 ? `= ${previewPc.toLocaleString()} pcs` : ' '}
        </span>
        <Button size="sm" onClick={handleAdd} className="shrink-0">
          <Plus className="size-4" />
          Add
        </Button>
      </div>
    </div>
  );
};

const ProductCatalog = () => {
  const { user } = useAuth();
  const username = user?.email;

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState(() => getCart(username));
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [catalogItems, setCatalogItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoading(true);
        const response = await clientPortalClientApi.getMyCatalog();
        setCatalogItems(response.data || []);
      } catch (error) {
        console.error('Error fetching catalog:', error);
        toast.error(error.response?.data?.message || 'Failed to fetch product catalog');
        setCatalogItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  const categories = useMemo(
    () => [...new Set(catalogItems.map((i) => i.category).filter(Boolean))],
    [catalogItems],
  );

  const filteredItems = useMemo(() => {
    return catalogItems.filter((item) => {
      const matchesCategory = category === 'All' || item.category === category;
      const matchesSearch = (item.itemName || '').toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [catalogItems, search, category]);

  const handleAddToCart = (entry) => {
    const updated = addToCart(username, entry);
    setCart(updated);
    toast.success(`${entry.itemName} added to your order`);
  };

  const handleRemove = (cartId) => {
    const updated = removeFromCart(username, cartId);
    setCart(updated);
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    try {
      setSubmitting(true);
      const newOrderRequest = {
        orderDate: new Date().toISOString().slice(0, 10),
        items: cart.map((item) => ({
          itemId: item.itemId,
          sizeId: item.sizeId,
          itemName: item.itemName,
          category: item.category,
          sizeInInch: item.sizeInInch,
          sizeInMm: item.sizeInMm,
          plating: item.plating,
          qtyPc: item.qtyPc,
          qtyKg: item.qtyKg,
        })),
      };
      await clientPortalClientApi.submitOrderRequest(newOrderRequest);
      clearCart(username);
      setCart([]);
      setCartOpen(false);
      toast.success('Order request submitted! Track it from My Orders.');
    } catch (error) {
      console.error('Error submitting order request:', error);
      toast.error(error.response?.data?.message || 'Failed to submit order request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SidebarLayout>
      <PageHeader
        title="Product catalog"
        subtitle="Browse available products and place an order request."
        actions={
          <Button variant="outline" onClick={() => setCartOpen(true)} className="relative">
            <ShoppingCart className="size-4" />
            <span className="hidden sm:inline">Cart</span>
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 grid size-5 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                {cart.length}
              </span>
            )}
          </Button>
        }
      />

      <PageBody>
        {/* Filters */}
        <div className="mb-5 flex flex-col gap-2 sm:flex-row">
          <div className="relative w-full sm:max-w-sm sm:flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
            <Input
              type="search"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-surface pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full bg-surface sm:w-56">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Product grid */}
        {loading ? (
          <ListSkeleton rows={6} className="h-40" />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products found"
            description="Try a different search term or category."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                className="gap-0 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                {item.category && (
                  <Badge variant="muted" className="mb-2 self-start">
                    {item.category}
                  </Badge>
                )}
                <h3 className="font-heading text-[15px] leading-snug font-semibold text-ink">
                  {item.itemName}
                </h3>
                <p className="mt-1 text-[12px] text-ink-3">
                  {item.sizes.length} size{item.sizes.length === 1 ? '' : 's'} ·{' '}
                  {item.platings.length} finish{item.platings.length === 1 ? '' : 'es'}
                </p>
                <ProductSelector item={item} onAdd={handleAddToCart} />
              </Card>
            ))}
          </div>
        )}
      </PageBody>

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onRemove={handleRemove}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </SidebarLayout>
  );
};

export default ProductCatalog;
