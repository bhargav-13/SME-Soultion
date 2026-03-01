import React from "react";

const ClientListDialog = ({
  isOpen,
  clients,
  selectedClient,
  onSelectClient,
  onView,
  viewLabel = "View",
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-xl border border-gray-200 p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-[430px] overflow-y-auto pr-1">
          {clients.map((client) => {
            const isActive = selectedClient === client;
            return (
              <button
                key={client}
                type="button"
                onClick={() => onSelectClient(client)}
                className={`h-10 px-3 rounded-md border text-left text-sm transition flex items-center justify-between ${
                  isActive
                    ? "border-gray-900 bg-gray-100 text-black"
                    : "border-gray-300 text-gray-700 hover:border-gray-500"
                }`}
              >
                <span className="truncate">{client}</span>
                {isActive ? (
                  <span className="w-5 h-5 rounded-full border border-gray-900 flex items-center justify-center ml-2 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-gray-900" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            type="button"
            onClick={onView}
            disabled={!selectedClient}
            className="px-12 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {viewLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-12 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientListDialog;
