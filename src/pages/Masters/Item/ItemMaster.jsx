import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, Plus, Search, Trash2, TriangleAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/SidebarLayout';
import { PageBody, PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { PageLoader } from '@/components/states';
import { ConfirmDialog, ConfirmName } from '@/components/confirm-dialog';
import EditItemDialog from '@/components/Item/EditItemDialog';
import ViewItemDialog from '@/components/Item/ViewItemDialog';
import ItemsTable from '@/components/Item/ItemsTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { itemApi, categoryApi } from '@/services/apiService';

const ItemMaster = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalItems: 0, lowStockItems: 0 });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, itemId: null, itemName: '' });
  const [deleting, setDeleting] = useState(false);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [editDialog, setEditDialog] = useState({ isOpen: false, data: null });
  const [viewDialog, setViewDialog] = useState({ isOpen: false, data: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoryApi.getAllCategories();
      const categoriesData = response.data;
      setCategories(categoriesData.map((cat) => ({ id: cat.id, name: cat.name })));
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await itemApi.getAllItems();
      const itemsData = response.data;

      // API returns PaginatedResultItem with data array
      const rawItems = itemsData.data || itemsData;

      const transformedItems = (Array.isArray(rawItems) ? rawItems : []).map((item) => ({
        id: item.id,
        sizeInch: item.sizeInch || '',
        sizeMM: item.sizeMm || '',
        category: item.itemCategory?.name || '',
        categoryId: item.itemCategory?.id,
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

      const totalItems = itemsData.totalElements || transformedItems.length;
      const lowStockItems = transformedItems.filter((i) => i.lowStock === 'Low Stock').length;
      setStats({ totalItems, lowStockItems });
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.sizeInch.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || item.lowStock === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleSaveEdit = async (formData) => {
    try {
      const updateData = {
        sizeInch: formData.sizeInch,
        sizeMm: formData.sizeMM,
        categoryId: formData.categoryId || editDialog.data.categoryId,
        itemKg: parseFloat(formData.itemKg) || 0,
        weightPerPc: parseFloat(formData.weightPerPL) || 0,
        totalPc: parseFloat(formData.totalPL) || 0,
        dozenWeight: parseFloat(formData.dozenWeight) || 0,
        lowStockWarning: parseFloat(formData.lowStockWarning) || 0,
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

  const handleConfirmClearAll = async () => {
    setClearingAll(true);
    try {
      await Promise.all(items.map((item) => itemApi.deleteItem(item.id)));
      await fetchItems();
      toast.success('All items cleared!');
    } catch (error) {
      console.error('Error clearing items:', error);
      toast.error(error.response?.data?.message || 'Failed to clear all items');
    } finally {
      setClearingAll(false);
      setClearAllOpen(false);
    }
  };

  return (
    <SidebarLayout>
      <PageHeader
        title="Item master"
        subtitle="Centralised management of all items with sizes, weights, categories, and stock details."
        actions={
          <>
            {items.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setClearAllOpen(true)} className="text-danger hover:text-danger">
                <Trash2 className="size-4" />
                <span className="hidden sm:inline">Clear all</span>
              </Button>
            )}
            <Button size="sm" onClick={() => navigate('/masters/item/add')}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add item</span>
            </Button>
          </>
        }
      />

      <PageBody className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatCard label="Total items" value={stats.totalItems} icon={Boxes} tone="primary" />
          <StatCard label="Total low stock items" value={stats.lowStockItems} icon={TriangleAlert} tone="warning" />
        </div>

        {/* Search + filter */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-sm sm:flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
            <Input
              type="search"
              placeholder="Search by size or category…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-surface pl-9"
            />
          </div>
          <Select value={categoryFilter || 'ALL'} onValueChange={(v) => setCategoryFilter(v === 'ALL' ? '' : v)}>
            <SelectTrigger className="w-full bg-surface sm:w-48">
              <SelectValue placeholder="Stock status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All stock status</SelectItem>
              <SelectItem value="In Stock">In stock</SelectItem>
              <SelectItem value="Low Stock">Low stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Items table */}
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
      </PageBody>

      <EditItemDialog
        isOpen={editDialog.isOpen}
        onClose={() => setEditDialog({ isOpen: false, data: null })}
        onSave={handleSaveEdit}
        initialData={editDialog.data}
        categories={categories}
      />

      <ViewItemDialog
        isOpen={viewDialog.isOpen}
        onClose={() => setViewDialog({ isOpen: false, data: null })}
        onEdit={handleViewEdit}
        onDelete={handleViewDelete}
        itemData={viewDialog.data}
      />

      <ConfirmDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, itemId: null, itemName: '' })}
        title="Delete item"
        description={
          <>
            Are you sure you want to delete <ConfirmName>{deleteDialog.itemName}</ConfirmName>?
          </>
        }
        confirmLabel="Delete"
        busyLabel="Deleting…"
        isPending={deleting}
        onConfirm={handleConfirmDelete}
      />

      <ConfirmDialog
        open={clearAllOpen}
        onOpenChange={(open) => !open && setClearAllOpen(false)}
        title="Clear all items"
        description={`Are you sure you want to delete all ${items.length} item(s)? This action cannot be undone.`}
        confirmLabel="Clear all"
        busyLabel="Clearing…"
        isPending={clearingAll}
        onConfirm={handleConfirmClearAll}
      />
    </SidebarLayout>
  );
};

export default ItemMaster;
