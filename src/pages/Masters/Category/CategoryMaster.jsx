import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, SquarePen, Tags, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/SidebarLayout';
import AddCategoryDialog from '@/components/Category/AddCategoryDialog';
import { ConfirmDialog, ConfirmName } from '@/components/confirm-dialog';
import { DataTable, SortableHeader } from '@/components/data-table';
import { ListToolbar } from '@/components/list-toolbar';
import { PageBody, PageHeader } from '@/components/page-header';
import { RowActions } from '@/components/row-actions';
import { EmptyState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { matchesSearch, useListFilters } from '@/hooks/use-list-filters';
import { pluralize } from '@/lib/format';
import { categoryApi } from '@/services/apiService';

const CategoryMaster = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    categoryId: null,
    categoryName: '',
  });
  const [addCategoryDialog, setAddCategoryDialog] = useState({
    isOpen: false,
    isEdit: false,
    data: null,
  });

  const { search, onSearchChange, debouncedSearch, clearFilters, hasActiveFilters } = useListFilters();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setIsError(false);
      const response = await categoryApi.getAllCategories();
      const categoriesData = response.data;

      const transformedCategories = categoriesData.map((cat) => ({
        id: cat.id,
        categoryName: cat.name,
      }));

      setCategories(transformedCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setIsError(true);
      toast.error(error.response?.data?.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = () => {
    setAddCategoryDialog({ isOpen: true, isEdit: false, data: null });
  };

  const handleEditCategory = (category) => {
    setAddCategoryDialog({ isOpen: true, isEdit: true, data: category });
  };

  const handleSaveCategory = async (formData) => {
    try {
      if (addCategoryDialog.isEdit) {
        await categoryApi.updateCategory(addCategoryDialog.data.id, {
          name: formData.categoryName,
        });
        toast.success('Category updated successfully!');
      } else {
        await categoryApi.createCategory({ name: formData.categoryName });
        toast.success('Category added successfully!');
      }

      setAddCategoryDialog({ isOpen: false, isEdit: false, data: null });
      await fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(error.response?.data?.message || 'Failed to save category');
    }
  };

  const handleDeleteClick = (category) => {
    setDeleteDialog({
      isOpen: true,
      categoryId: category.id,
      categoryName: category.categoryName,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      await categoryApi.deleteCategory(deleteDialog.categoryId);
      await fetchCategories();
      setDeleteDialog({ isOpen: false, categoryId: null, categoryName: '' });
      toast.success('Category deleted successfully!');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error.response?.data?.message || 'Failed to delete category');
    } finally {
      setDeleting(false);
    }
  };

  const openInventory = (category) =>
    navigate('/inventory', {
      state: { categoryId: category.id, categoryName: category.categoryName },
    });

  const filteredCategories = useMemo(
    () => categories.filter((c) => matchesSearch(c, debouncedSearch, ['categoryName'])),
    [categories, debouncedSearch],
  );

  const columns = useMemo(
    () => [
      {
        id: 'categoryName',
        accessorKey: 'categoryName',
        header: ({ column }) => <SortableHeader column={column}>Category</SortableHeader>,
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-md border border-line bg-surface-2">
              <Tags className="size-3.5 text-ink-3" aria-hidden="true" />
            </span>
            <span className="truncate font-medium text-ink">{row.original.categoryName}</span>
          </div>
        ),
      },
      {
        id: 'id',
        accessorKey: 'id',
        header: ({ column }) => <SortableHeader column={column}>ID</SortableHeader>,
        cell: ({ row }) => <span className="font-mono text-[12.5px] text-ink-3">#{row.original.id}</span>,
        size: 100,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <RowActions
            actions={[
              { label: 'View stock', icon: Tags, onSelect: () => openInventory(row.original) },
              { label: 'Edit', icon: SquarePen, onSelect: () => handleEditCategory(row.original) },
              {
                label: 'Delete',
                icon: Trash2,
                destructive: true,
                separatorBefore: true,
                onSelect: () => handleDeleteClick(row.original),
              },
            ]}
          />
        ),
        size: 60,
      },
    ],
    [],
  );

  return (
    <SidebarLayout>
      <PageHeader
        title="Category master"
        subtitle={
          loading ? 'Organise items into categories' : `${pluralize(categories.length, 'category', 'categories')}`
        }
        actions={
          <Button size="sm" onClick={handleAddCategory}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add category</span>
          </Button>
        }
      />

      <PageBody>
        <ListToolbar
          search={{ value: search, onChange: onSearchChange, placeholder: 'Search categories…' }}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        <DataTable
          columns={columns}
          data={filteredCategories}
          getRowId={(c) => String(c.id)}
          isPending={loading}
          isError={isError}
          onRetry={fetchCategories}
          errorText="Could not load the categories."
          initialPageSize={50}
          onRowClick={openInventory}
          renderMobileCard={(c) => (
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface-2">
                  <Tags className="size-4 text-ink-3" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-ink">{c.categoryName}</p>
                  <p className="font-mono text-[11px] text-ink-3">#{c.id}</p>
                </div>
              </div>
              <RowActions
                actions={[
                  { label: 'Edit', icon: SquarePen, onSelect: () => handleEditCategory(c) },
                  {
                    label: 'Delete',
                    icon: Trash2,
                    destructive: true,
                    separatorBefore: true,
                    onSelect: () => handleDeleteClick(c),
                  },
                ]}
              />
            </div>
          )}
          empty={
            hasActiveFilters ? (
              <EmptyState
                icon={Tags}
                title="No categories match"
                description="Nothing here matches that search."
                action={
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear search
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Tags}
                title="No categories yet"
                description="Items need a category before they can be created, so this is the first thing to set up."
                action={
                  <Button size="sm" onClick={handleAddCategory}>
                    <Plus className="size-4" />
                    Create the first category
                  </Button>
                }
              />
            )
          }
        />
      </PageBody>

      <AddCategoryDialog
        isOpen={addCategoryDialog.isOpen}
        onClose={() => setAddCategoryDialog({ isOpen: false, isEdit: false, data: null })}
        onSave={handleSaveCategory}
        initialData={addCategoryDialog.data}
        isEdit={addCategoryDialog.isEdit}
      />

      <ConfirmDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ isOpen: false, categoryId: null, categoryName: '' });
        }}
        title="Delete this category?"
        description={
          <>
            <ConfirmName>{deleteDialog.categoryName}</ConfirmName> will be removed from the master. Items already
            filed under it will be left without a category. This cannot be undone.
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

export default CategoryMaster;
