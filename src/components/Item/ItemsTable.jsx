import { Eye, SquarePen, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const HEAD = 'px-4 py-3 text-center text-[11.5px] font-semibold tracking-[0.03em] text-ink-3 uppercase whitespace-nowrap';
const CELL = 'px-4 py-3 text-center text-[13px] text-ink-2';

const ItemsTable = ({ items = [], onEdit, onView, onDelete, showActions = true }) => {
  const colCount = showActions ? 7 : 6;

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={HEAD}>In inch</TableHead>
              <TableHead className={HEAD}>In mm</TableHead>
              <TableHead className={HEAD}>Category</TableHead>
              <TableHead className={HEAD}>Total Kg</TableHead>
              <TableHead className={HEAD}>Dozen weight</TableHead>
              <TableHead className={HEAD}>Low stock</TableHead>
              {showActions && <TableHead className={HEAD}>Action</TableHead>}
            </TableRow>
          </TableHeader>

          <TableBody>
            {items && items.length > 0 ? (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer border-line-2"
                  onDoubleClick={() => (onView ? onView(item) : onEdit && onEdit(item))}
                >
                  <TableCell className="px-4 py-3 text-center text-[13px] font-medium text-ink">
                    {item.sizeInch}
                  </TableCell>
                  <TableCell className={CELL}>{item.sizeMM}</TableCell>
                  <TableCell className={CELL}>{item.category}</TableCell>
                  <TableCell className={`${CELL} font-mono`}>{item.totalKg}</TableCell>
                  <TableCell className={`${CELL} font-mono`}>{item.dozenWeight}</TableCell>
                  <TableCell className="px-4 py-3 text-center">
                    <Badge variant={item.lowStock === 'Low Stock' ? 'danger' : 'success'}>
                      {item.lowStock}
                    </Badge>
                  </TableCell>

                  {showActions && (
                    <TableCell className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {onEdit && (
                          <Button variant="ghost" size="icon-sm" onClick={() => onEdit(item)} title="Edit" aria-label="Edit">
                            <SquarePen className="size-4 text-ink-3" />
                          </Button>
                        )}
                        {onView && (
                          <Button variant="ghost" size="icon-sm" onClick={() => onView(item)} title="View" aria-label="View">
                            <Eye className="size-4 text-ink-3" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onDelete(item)}
                            title="Delete"
                            aria-label="Delete"
                            className="text-danger hover:text-danger"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={colCount} className="px-4 py-8 text-center text-[13px] text-ink-3">
                  No items found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

export default ItemsTable;
