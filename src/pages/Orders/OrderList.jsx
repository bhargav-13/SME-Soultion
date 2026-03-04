import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import SidebarLayout from "../../components/SidebarLayout";
import PageHeader from "../../components/PageHeader";
import { partyApi } from "../../services/apiService";
import toast from "react-hot-toast";

const OrderList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState(null);

  useEffect(() => {
    const fetchParties = async () => {
      try {
        setLoading(true);
        const response = await partyApi.getAllParties();
        const data = Array.isArray(response.data) ? response.data : [];
        setParties(data);
      } catch (error) {
        console.error("Error fetching parties:", error);
        toast.error(error.response?.data?.message || "Failed to fetch party list");
        setParties([]);
      } finally {
        setLoading(false);
      }
    };

    fetchParties();
  }, []);

  const filteredParties = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return parties;

    return parties.filter((party) => {
      const name = (party?.name || "").toLowerCase();
      return name.includes(normalized);
    });
  }, [parties, searchTerm]);

  const handleContinue = () => {
    if (!selectedPartyId) {
      toast.error("Please select a party");
      return;
    }
    const selectedParty = parties.find((party) => party.id === selectedPartyId) || null;
    navigate("/order/add", { state: { selectedParty } });
  };

  return (
    <SidebarLayout>
      <div className="mx-auto">

         <div className="relative mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search"
              className="w-full p-4 py-3 border bg-white border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>

        <div className="">
         
          <div className="bg-white rounded-lg border border-gray-200 p-4 ">
            {loading ? (
              <p className="text-sm text-gray-500">Loading parties...</p>
            ) : filteredParties.length === 0 ? (
              <p className="text-sm text-gray-500">No parties found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredParties.map((party) => {
                  const isActive = selectedPartyId === party.id;
                  return (
                    <button
                      type="button"
                      key={party.id}
                      onClick={() => setSelectedPartyId(party.id)}
                      className={`h-10 px-4 rounded-md border text-left text-sm transition flex items-center justify-between ${
                        isActive
                          ? "border-gray-900 bg-gray-100 text-black"
                          : "border-gray-300 text-gray-700 hover:border-gray-500"
                      }`}
                    >
                      <span>{party.name}</span>
                      {isActive ? (
                        <span className="w-4 h-4 rounded-full border border-gray-900 flex items-center justify-center">
                          <span className="w-2 h-2 rounded-full bg-gray-900" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              type="button"
              onClick={handleContinue}
              className="px-8 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={() => navigate("/order")}
              className="px-8 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
};

export default OrderList;
