import React, { useEffect, useMemo, useState } from "react";
import { Plus, Download } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import SidebarLayout from "../../components/SidebarLayout";
import PageHeader from "../../components/PageHeader";
import SearchFilter from "../../components/SearchFilter";
import PrimaryActionButton from "../../components/PrimaryActionButton";
import { exportApi } from "../../services/apiService";
import DownloadStatementModal from "../../components/DownloadStatementModal";

const SALES_ORDERS_KEY = "bills:salesOrders";

const SalesManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [salesRows, setSalesRows] = useState([]);
  const [statementOpen, setStatementOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SALES_ORDERS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) {
        setSalesRows([]);
        return;
      }

      const mappedRows = list.flatMap((order) =>
        (order.items || []).map((item, idx) => ({
          id: `${order.id}-${idx}`,
          partyName: order.customerName || "-",
          size: item.size || "-",
          aavakElement: `${item.element || "-"} ${item.elementType || ""}`.trim(),
          salesKgPc: `${item.unit || "-"} ${item.unitType || ""}`.trim(),
          price: item.scrap != null ? String(item.scrap) : "-",
          totalPrice:
            item.scrap != null && item.unit != null
              ? String((Number(item.scrap) || 0) * (Number(item.unit) || 0))
              : "-",
          javakElement: item.element || "-",
          javakKgPc: `${item.unit || "-"} ${item.unitType || ""}`.trim(),
          rs: item.labour != null ? String(item.labour) : "-",
          totalRs: item.total != null ? String(item.total) : "-",
          type: "Sales",
        })),
      );

      setSalesRows(mappedRows);
    } catch {
      setSalesRows([]);
    }
  }, [location.key]);

  const filtered = useMemo(() => {
    return salesRows.filter((row) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q || row.partyName.toLowerCase().includes(q) || row.size.toLowerCase().includes(q);
      const matchesType = !typeFilter || row.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [salesRows, searchQuery, typeFilter]);

  return (
    <SidebarLayout>
      <div className="mx-auto">
        <PageHeader
          title="Sales Management"
          description="Simplifying Sales Order Processing from Start to Delivery"
          action={
            <PrimaryActionButton
              onClick={() => navigate("/bills/sales/add")}
              icon={Plus}
              className="border-gray-800 text-black px-4"
            >
              Add sales Order
            </PrimaryActionButton>
          }
        />

        <div className="mt-6">
          <SearchFilter
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            filterOptions={["Type", "Sales"]}
            filterPlaceholder="Type"
            extraButton={
              <button
                type="button"
                onClick={() => setStatementOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 hover:bg-gray-50 transition whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                Download Statement
              </button>
            }
          />
        </div>

        <DownloadStatementModal
          isOpen={statementOpen}
          onClose={() => setStatementOpen(false)}
          title="Download Sales Statement"
          fileName="sales_statement"
          onDownload={(partyId, startDate, endDate) =>
            exportApi.getSalesReportPdf(partyId, startDate, endDate, { responseType: "blob" })
          }
        />

        <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
          <div className="max-h-[500px] overflow-auto scrollbar-thin">
            <table className="w-max min-w-full table-auto">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th
                    colSpan={6}
                    className="px-6 py-4 text-center text-sm font-[550] text-black border-r border-gray-200"
                  >
                    Aavak
                  </th>
                  <th
                    colSpan={5}
                    className="px-6 py-4 text-center text-sm font-[550] text-black"
                  >
                    Javak
                  </th>
                </tr>
                <tr className="bg-gray-100 border-b border-gray-200">
                  {[
                    "Party Name",
                    "Size",
                    "Element",
                    "Sales Kg / Pcs.",
                    "Price",
                    "Total Price",
                    "Element",
                    "Javak Kg / Pc.",
                    "Rs.",
                    "Total Rs.",
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-3 py-4 text-center text-sm font-[550] text-black border-r border-gray-200 last:border-r-0"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-3 py-2 text-center text-sm border-r border-gray-200">{row.partyName}</td>
                    <td className="px-3 py-2 text-center text-sm border-r border-gray-200">{row.size}</td>
                    <td className="px-3 py-2 text-center text-sm border-r border-gray-200">{row.aavakElement}</td>
                    <td className="px-3 py-2 text-center text-sm border-r border-gray-200">{row.salesKgPc}</td>
                    <td className="px-3 py-2 text-center text-sm border-r border-gray-200">{row.price}</td>
                    <td className="px-3 py-2 text-center text-sm border-r border-gray-200">{row.totalPrice}</td>
                    <td className="px-3 py-2 text-center text-sm border-r border-gray-200">{row.javakElement}</td>
                    <td className="px-3 py-2 text-center text-sm border-r border-gray-200">{row.javakKgPc}</td>
                    <td className="px-3 py-2 text-center text-sm border-r border-gray-200">{row.rs}</td>
                    <td className="px-3 py-2 text-center text-sm border-r border-gray-200">{row.totalRs}</td>
                   
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-3 py-6 text-center text-sm text-gray-400">
                      No sales records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
};

export default SalesManagement;
