import { ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

/**
 * The order cart the client builds before submitting a request. A right-side sheet so the catalogue
 * stays visible behind it on a desktop, and a near-full-width panel on a phone.
 */
const CartDrawer = ({ isOpen, onClose, cart, onRemove, onSubmit, submitting }) => {
  const totalPc = cart.reduce((sum, item) => sum + (Number(item.qtyPc) || 0), 0);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-line px-4 py-4 sm:px-6">
          <SheetTitle className="flex items-center gap-2 font-heading text-[16px] text-ink">
            <ShoppingCart className="size-5 text-ink-2" />
            Order cart
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-ink-3">
              <ShoppingCart className="size-10 text-line" />
              <p className="text-[13.5px] font-medium text-ink-2">Your cart is empty.</p>
              <p className="text-[12.5px]">Browse products and add items to request an order.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.cartId}
                  className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface p-3"
                >
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-ink">{item.itemName}</p>
                    <p className="mt-1 text-[12px] text-ink-3">
                      Size: {item.sizeInInch}
                      {item.sizeInMm && item.sizeInMm !== '—' ? ` (${item.sizeInMm})` : ''}
                    </p>
                    <p className="text-[12px] text-ink-3">Plating: {item.plating}</p>
                    <p className="mt-1 font-mono text-[12px] font-medium text-ink-2">
                      Qty:{' '}
                      {item.orderUnit && item.orderUnit !== 'Pcs'
                        ? `${item.orderQty} ${item.orderUnit} (${item.qtyPc} pc)`
                        : `${item.qtyPc} pc`}
                      {item.qtyKg ? ` / ${item.qtyKg} kg` : ''}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRemove(item.cartId)}
                    aria-label="Remove item"
                    className="shrink-0 text-ink-3 hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-line px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-ink-3">
              {cart.length} item{cart.length === 1 ? '' : 's'}
            </span>
            <span className="font-mono font-medium text-ink">{totalPc} pc total</span>
          </div>
          <Button className="w-full" onClick={onSubmit} disabled={cart.length === 0 || submitting}>
            {submitting ? 'Submitting…' : 'Place order request'}
          </Button>
          <p className="text-center text-[11.5px] text-ink-3">
            Your request will be sent to the admin for approval.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
