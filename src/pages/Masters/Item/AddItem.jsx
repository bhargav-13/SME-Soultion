import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/SidebarLayout';
import { PageBody, PageHeader, Section } from '@/components/page-header';
import { PageLoader } from '@/components/states';
import { ConfirmDialog, ConfirmName } from '@/components/confirm-dialog';
import { Field, FieldGrid } from '@/components/form-field';
import ItemsTable from '@/components/Item/ItemsTable';
import ViewItemDialog from '@/components/Item/ViewItemDialog';
import EditItemDialog from '@/components/Item/EditItemDialog';
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
import { itemApi, categoryApi } from '@/services/apiService';

const WEIGHT_UNITS = ['Kg', 'Gram'];

const EMPTY_FORM = {
  sizeInch: '',
  sizeMM: '',
  categoryId: '',
  categoryName: '',
  itemKg: '',
  weightPerPL: '',
  weightUnit: '',
  totalPL: '',
  dozenWeight: '',
  lowStockWarning: '',
};

const AddItem = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, itemId: null, itemName: '' });
  const [deleting, setDeleting] = useState(false);
  const [viewDialog, setViewDialog] = useState({ isOpen: false, data: null });
  const [editDialog, setEditDialog] = useState({ isOpen: false, data: null });

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await itemApi.getAllItems();
      const itemsData = response.data;
      const rawItems = itemsData.data || itemsData;

      const transformedItems = (Array.isArray(rawItems) ? rawItems : []).map((item) => ({
        id: item.id,
        sizeInch: item.sizeInch || '',
        sizeMM: item.sizeMm || '',
        category: item.itemCategory?.name || '',
        categoryId: item.itemCategory?.id,
        subCategory: item.itemSubCategory?.name || '',
        subCategoryId: item.itemSubCategory?.id,
        totalKg: item.itemKg,
        itemKg: item.itemKg,
        weightPerPL: item.weightPerPc,
        totalPL: item.totalPc,
        dozenWeight: item.dozenWeight,
        lowStockWarning: item.lowStockWarning,
        lowStock: item.stockStatus === 'LOW_STOCK' ? 'Low Stock' : 'In Stock',
        stockStatus: item.stockStatus,
      }));

      setItems(transformedItems);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoryApi.getAllCategories();
      setCategories(response.data.map((cat) => ({ id: cat.id, name: cat.name })));
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newFormData = { ...prev, [name]: value };

      // Auto-calculate Total Pc when Item Kg, Weight/Pc, or Weight Unit changes
      if (name === 'itemKg' || name === 'weightPerPL' || name === 'weightUnit') {
        const itemKg = name === 'itemKg' ? parseFloat(value) || 0 : parseFloat(prev.itemKg) || 0;
        const weightPerPc = name === 'weightPerPL' ? parseFloat(value) || 0 : parseFloat(prev.weightPerPL) || 0;
        const weightUnit = name === 'weightUnit' ? value : newFormData.weightUnit || prev.weightUnit;
        const weightPerPcInKg = weightUnit === 'Gram' ? weightPerPc / 1000 : weightPerPc;
        if (itemKg > 0 && weightPerPcInKg > 0) {
          newFormData.totalPL = (itemKg / weightPerPcInKg).toFixed(2);
        } else {
          newFormData.totalPL = '';
        }
      }

      // Auto-calculate Dozen Weight when Weight/Pc or Weight Unit changes
      if (name === 'weightPerPL' || name === 'weightUnit') {
        const weightPerPc = name === 'weightPerPL' ? parseFloat(value) || 0 : parseFloat(prev.weightPerPL) || 0;
        const weightUnit = name === 'weightUnit' ? value : newFormData.weightUnit || prev.weightUnit;
        const weightPerPcInKg = weightUnit === 'Gram' ? weightPerPc / 1000 : weightPerPc;
        if (weightPerPcInKg > 0) {
          newFormData.dozenWeight = (weightPerPcInKg * 12).toFixed(2);
        } else {
          newFormData.dozenWeight = '';
        }
      }

      return newFormData;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.sizeInch.trim() || !formData.categoryId || !String(formData.itemKg).trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const createData = {
        sizeInch: formData.sizeInch,
        sizeMm: formData.sizeMM,
        categoryId: formData.categoryId,
        itemKg: parseFloat(formData.itemKg) || 0,
        weightPerPc: parseFloat(formData.weightPerPL) || 0,
        totalPc: parseFloat(formData.totalPL) || 0,
        dozenWeight: parseFloat(formData.dozenWeight) || 0,
        lowStockWarning: parseFloat(formData.lowStockWarning) || 0,
        stockStatus: 'IN_STOCK',
      };

      await itemApi.createItem(createData);
      toast.success('Item added successfully!');
      setFormData(EMPTY_FORM);
      await fetchItems();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error(error.response?.data?.message || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (item) => {
    setDeleteDialog({ isOpen: true, itemId: item.id, itemName: item.sizeInch });
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      await itemApi.deleteItem(deleteDialog.itemId);
      await fetchItems();
      toast.success('Item deleted successfully!');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error(error.response?.data?.message || 'Failed to delete item');
    } finally {
      setDeleting(false);
      setDeleteDialog({ isOpen: false, itemId: null, itemName: '' });
    }
  };

  const handleViewEdit = (item) => {
    setViewDialog({ isOpen: false, data: null });
    setEditDialog({ isOpen: true, data: item });
  };

  const handleViewDelete = (item) => {
    setViewDialog({ isOpen: false, data: null });
    handleDeleteClick(item);
  };

  const handleSaveEdit = async (edited) => {
    try {
      const updateData = {
        sizeInch: edited.sizeInch,
        sizeMm: edited.sizeMM,
        categoryId: edited.categoryId || editDialog.data.categoryId,
        itemKg: parseFloat(edited.itemKg) || 0,
        weightPerPc: parseFloat(edited.weightPerPL) || 0,
        totalPc: parseFloat(edited.totalPL) || 0,
        dozenWeight: parseFloat(edited.dozenWeight) || 0,
        lowStockWarning: parseFloat(edited.lowStockWarning) || 0,
        stockStatus: editDialog.data.stockStatus || 'IN_STOCK',
      };

      await itemApi.updateItem(editDialog.data.id, updateData);
      await fetchItems();
      setEditDialog({ isOpen: false, data: null });
      toast.success('Item updated successfully!');
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error(error.response?.data?.message || 'Failed to update item');
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.sizeInch.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <SidebarLayout>
      <PageHeader
        title="Add item"
        subtitle="Create and define item specifications including size, weight, category, and stock thresholds."
        backTo="/masters/item"
        backLabel="Item master"
      />

      <PageBody className="space-y-6">
        {/* Form */}
        <Card className="gap-0 p-4 sm:p-5">
          <form onSubmit={handleSave} className="space-y-4">
            <FieldGrid columns={2}>
              <Field label="Size in inch" htmlFor="size-inch" required>
                <Input id="size-inch" name="sizeInch" value={formData.sizeInch} onChange={handleChange} placeholder="Enter size" />
              </Field>
              <Field label="Size in mm" htmlFor="size-mm" required>
                <Input id="size-mm" name="sizeMM" value={formData.sizeMM} onChange={handleChange} placeholder="Enter size" />
              </Field>
            </FieldGrid>

            <Field label="Category" required>
              <Select
                value={formData.categoryId ? String(formData.categoryId) : undefined}
                onValueChange={(v) => {
                  const category = categories.find((c) => String(c.id) === v);
                  if (category) setFormData((prev) => ({ ...prev, categoryId: category.id, categoryName: category.name }));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.length === 0 ? (
                    <div className="px-3 py-2 text-[13px] text-ink-3">No categories available</div>
                  ) : (
                    categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </Field>

            <FieldGrid columns={2}>
              <Field label="Item in Kg" htmlFor="item-kg" required>
                <Input id="item-kg" name="itemKg" value={formData.itemKg} onChange={handleChange} placeholder="Enter Kg" className="font-mono" />
              </Field>
              <Field label="Weight/Pc." required>
                <div className="flex gap-2">
                  <Input
                    name="weightPerPL"
                    value={formData.weightPerPL}
                    onChange={handleChange}
                    placeholder="Enter Weight/Pc."
                    className="flex-1 font-mono"
                  />
                  <Select
                    value={formData.weightUnit || undefined}
                    onValueChange={(v) => handleChange({ target: { name: 'weightUnit', value: v } })}
                  >
                    <SelectTrigger className="w-28 shrink-0">
                      <SelectValue placeholder="Gram/Kg" />
                    </SelectTrigger>
                    <SelectContent>
                      {WEIGHT_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Field>
            </FieldGrid>

            <FieldGrid columns={2}>
              <Field label="Total Pc." hint="Auto-calculated">
                <Input name="totalPL" value={formData.totalPL} readOnly placeholder="Auto-calculated" className="bg-surface-2 font-mono" />
              </Field>
              <Field label="Dozen weight" hint="Auto-calculated">
                <Input
                  name="dozenWeight"
                  value={formData.dozenWeight}
                  readOnly
                  placeholder="Auto-calculated"
                  className="bg-surface-2 font-mono"
                />
              </Field>
            </FieldGrid>

            <Field label="Low stock warning [Pc.]" htmlFor="low-stock">
              <Input
                id="low-stock"
                name="lowStockWarning"
                value={formData.lowStockWarning}
                onChange={handleChange}
                placeholder="Set low stock warning"
                className="font-mono"
              />
            </Field>

            <div className="flex justify-center gap-3 pt-1">
              <Button type="submit" disabled={loading} className="px-12">
                {loading ? 'Saving…' : 'Save'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setFormData(EMPTY_FORM)} className="px-12">
                Cancel
              </Button>
            </div>
          </form>
        </Card>

        {/* Existing items */}
        <Section title="Existing items">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-sm sm:flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
              <Input
                type="search"
                placeholder="Search by size or category…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-surface pl-9"
              />
            </div>
            <Select value={categoryFilter || 'ALL'} onValueChange={(v) => setCategoryFilter(v === 'ALL' ? '' : v)}>
              <SelectTrigger className="w-full bg-surface sm:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <PageLoader text="Loading items…" />
          ) : (
            <ItemsTable
              items={filteredItems}
              onEdit={(item) => setEditDialog({ isOpen: true, data: item })}
              onView={(item) => setViewDialog({ isOpen: true, data: item })}
              onDelete={handleDeleteClick}
            />
          )}
        </Section>
      </PageBody>

      <ViewItemDialog
        isOpen={viewDialog.isOpen}
        onClose={() => setViewDialog({ isOpen: false, data: null })}
        onEdit={handleViewEdit}
        onDelete={handleViewDelete}
        itemData={viewDialog.data}
      />

      <EditItemDialog
        isOpen={editDialog.isOpen}
        onClose={() => setEditDialog({ isOpen: false, data: null })}
        onSave={handleSaveEdit}
        initialData={editDialog.data}
        categories={categories}
      />

      <ConfirmDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, itemId: null, itemName: '' })}
        title="Delete item"
        description={
          <>
            Are you sure you want to delete <ConfirmName>{deleteDialog.itemName}</ConfirmName>? This action cannot be
            undone.
          </>
        }
        confirmLabel="Delete"
        busyLabel="Deleting…"
        isPending={deleting}
        onConfirm={handleConfirmDelete}
      />
    </SidebarLayout>
  );
};

export default AddItem;
