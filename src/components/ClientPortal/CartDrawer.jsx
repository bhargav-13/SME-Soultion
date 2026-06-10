import React from "react";
import { X, Trash2, ShoppingCart } from "lucide-react";

const CartDrawer = ({ isOpen, onClose, cart, onRemove, onSubmit, submitting }) => {
  if (!isOpen) return null;

  const totalPc = cart.reduce((sum, item) => sum + (Number(item.qtyPc) || 0), 0);

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Order Cart
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {cart.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              Your cart is empty.
              <p className="text-sm mt-1">Browse products and add items to request an order.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.cartId}
                  className="border border-gray-200 rounded-lg p-3 flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.itemName}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Size: {item.sizeInInch}
                      {item.sizeInMm && item.sizeInMm !== "—" ? ` (${item.sizeInMm})` : ""}
                    </p>
                    <p className="text-xs text-gray-500">Plating: {item.plating}</p>
                    <p className="text-xs text-gray-700 mt-1 font-medium">
                      Qty: {item.qtyPc} pc{item.qtyKg ? ` / ${item.qtyKg} kg` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemove(item.cartId)}
                    className="text-gray-400 hover:text-red-600 transition"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {cart.length} item{cart.length === 1 ? "" : "s"}
            </span>
            <span className="font-medium text-gray-900">{totalPc} pc total</span>
          </div>
          <button
            onClick={onSubmit}
            disabled={cart.length === 0 || submitting}
            className="w-full bg-gray-900 text-white rounded-lg py-2.5 font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Place Order Request"}
          </button>
          <p className="text-xs text-gray-400 text-center">
            Your request will be sent to the admin for approval.
          </p>
        </div>
      </div>
    </>
  );
};

export default CartDrawer;
