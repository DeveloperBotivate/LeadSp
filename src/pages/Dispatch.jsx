import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, X, Send, Search, Filter } from 'lucide-react';

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

const getLeads = () => {
  return JSON.parse(localStorage.getItem('pcb_leads')) || [];
};

const saveLead = (updatedLead) => {
  const leads = getLeads();
  const index = leads.findIndex(l => l.id === updatedLead.id);
  if (index !== -1) {
    leads[index] = updatedLead;
    localStorage.setItem('pcb_leads', JSON.stringify(leads));
  }
};

export default function Dispatch() {
  const [leads, setLeads] = useState(getLeads());
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'
  
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    type: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const [formData, setFormData] = useState({
    buyerCommitmentDate: '',
    sampleWONo: '',
    sampleWODate: '',
    sampleWOHandoverDate: '',
    expectedCompletionDate: '',
    dispatchSentDate: getTodayDate()
  });

  // Re-fetch leads when switching tabs just in case
  useEffect(() => {
    setLeads(getLeads());
    setCurrentPage(1);
  }, [activeTab, searchQuery, filters]);

  // Filter out leads based on their dispatch status
  const currentStatusLeads = leads.filter(l => {
    if (activeTab === 'pending') return !l.isDispatched;
    return l.isDispatched;
  });

  // Apply filters & search
  const filteredLeads = currentStatusLeads.filter(l => {
    if (filters.fromDate && l.receiptDate < filters.fromDate) return false;
    if (filters.toDate && l.receiptDate > filters.toDate) return false;
    if (filters.type && l.type !== filters.type) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (l.sn && l.sn.toLowerCase().includes(q)) ||
        (l.buyerCoder && l.buyerCoder.toLowerCase().includes(q)) ||
        (l.type && l.type.toLowerCase().includes(q)) ||
        (l.sampleWONo && l.sampleWONo.toLowerCase().includes(q)) ||
        (l.remarks && l.remarks.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const sortedLeads = [...filteredLeads].reverse();
  const totalPages = Math.ceil(sortedLeads.length / itemsPerPage);
  const paginatedLeads = sortedLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleOpenDispatch = (lead) => {
    setSelectedLead(lead);
    setFormData({
      buyerCommitmentDate: '',
      sampleWONo: '',
      sampleWODate: '',
      sampleWOHandoverDate: '',
      expectedCompletionDate: '',
      dispatchSentDate: getTodayDate()
    });
    setShowDispatchModal(true);
  };

  const handleSaveDispatch = (e) => {
    e.preventDefault();
    if (!selectedLead) return;

    const updatedLead = {
      ...selectedLead,
      ...formData,
      isDispatched: true,
      dispatchTimestamp: new Date().toISOString()
    };

    saveLead(updatedLead);
    setLeads(getLeads());
    setShowDispatchModal(false);
    toast.success(`Lead ${selectedLead.sn} dispatched successfully!`);
  };

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-2 md:space-y-6 flex flex-col h-full min-h-0">
      
      {/* Header Row: Tabs & Filters */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center gap-2 xl:gap-3 w-full pb-1">
        
        {/* Tabs as Buttons */}
        <div className="flex gap-2 w-full xl:w-auto flex-shrink-0">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 xl:flex-none px-6 text-xs md:text-sm font-semibold rounded-lg transition-all h-[32px] md:h-[38px] ${
              activeTab === 'pending'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 xl:flex-none px-6 text-xs md:text-sm font-semibold rounded-lg transition-all h-[32px] md:h-[38px] ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            History
          </button>
        </div>

        {/* Search & Mobile Filter */}
        <div className="flex items-center gap-2 w-full xl:w-auto xl:flex-1">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-2.5 top-[9px] md:top-[11px] text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg md:rounded pl-8 pr-2 py-1.5 focus:outline-none focus:border-indigo-500 text-xs md:text-sm h-[32px] md:h-[38px]"
            />
          </div>
          {/* Mobile Filter Button */}
          <button
             onClick={() => setShowMobileFilters(!showMobileFilters)}
             className={`xl:hidden flex items-center justify-center rounded-lg shadow-sm h-[32px] w-[32px] flex-shrink-0 transition ${showMobileFilters ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            <Filter size={14} />
          </button>
        </div>

        {/* Filters */}
        <div className={`${showMobileFilters ? 'grid' : 'hidden'} xl:flex grid-cols-2 xl:flex-row gap-2 w-full xl:w-auto xl:flex-[2.5] items-center`}>
          <input
            type="text"
            placeholder="From Date"
            onFocus={(e) => (e.target.type = 'date')}
            onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
            value={filters.fromDate}
            onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
            className="w-full bg-white border border-gray-300 rounded-lg md:rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] md:text-sm h-[32px] md:h-[38px]"
          />
          <input
            type="text"
            placeholder="To Date"
            onFocus={(e) => (e.target.type = 'date')}
            onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
            value={filters.toDate}
            onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
            className="w-full bg-white border border-gray-300 rounded-lg md:rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] md:text-sm h-[32px] md:h-[38px]"
          />
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="w-full bg-white border border-gray-300 rounded-lg md:rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] md:text-sm h-[32px] md:h-[38px] col-span-2 xl:col-span-1"
          >
            <option value="">All Types</option>
            <option value="Only Sample">Only Sample</option>
            <option value="Only Costing">Only Costing</option>
            <option value="Leather Development">Leather Development</option>
            <option value="Material Development">Material Development</option>
            <option value="General Info">General Info</option>
          </select>
        </div>
      </div>

      {/* Dispatch Form Modal */}
      {showDispatchModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-3 md:p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 flex-shrink-0">
              <h2 className="text-base md:text-lg font-bold text-gray-900">Dispatch Lead {selectedLead.sn}</h2>
              <button type="button" onClick={() => setShowDispatchModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={20} className="md:w-6 md:h-6" />
              </button>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-slate-50/50">
              <form onSubmit={handleSaveDispatch} className="space-y-6">
                
                {/* Read Only Lead Details */}
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3 border-b pb-2">Lead Information (Read Only)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px] md:text-sm">
                    <div>
                      <span className="block text-gray-500 mb-1">Serial No</span>
                      <span className="font-semibold text-indigo-600">{selectedLead.sn}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500 mb-1">Buyer Coder</span>
                      <span className="font-medium text-gray-900">{selectedLead.buyerCoder}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500 mb-1">Receipt Date</span>
                      <span className="font-medium text-gray-900">{formatDate(selectedLead.receiptDate)}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500 mb-1">Qty</span>
                      <span className="font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded">{selectedLead.qty}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500 mb-1">Type</span>
                      <span className="font-medium text-gray-900">{selectedLead.type}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500 mb-1">ETD</span>
                      <span className="font-medium text-gray-900">{selectedLead.etd}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500 mb-1">Actual Completion Date</span>
                      <span className="font-medium text-emerald-600">{selectedLead.completionDate ? formatDate(selectedLead.completionDate) : '-'}</span>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <span className="block text-gray-500 mb-1">Remarks</span>
                      <span className="font-medium text-gray-900 line-clamp-2">{selectedLead.remarks || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Dispatch Fields */}
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-sm font-semibold text-indigo-800 mb-4 border-b pb-2">Dispatch Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Buyer Commitment Date */}
                    <div>
                      <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">Buyer Commitment Date</label>
                      <input
                        type="date"
                        value={formData.buyerCommitmentDate}
                        onChange={(e) => setFormData({ ...formData, buyerCommitmentDate: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm bg-white min-h-[30px] md:min-h-[38px]"
                      />
                    </div>
                    
                    {/* Sample W/O No */}
                    <div>
                      <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">Sample W/O No</label>
                      <input
                        type="text"
                        value={formData.sampleWONo}
                        onChange={(e) => setFormData({ ...formData, sampleWONo: e.target.value })}
                        placeholder="Alphanumeric"
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm bg-white min-h-[30px] md:min-h-[38px]"
                      />
                    </div>

                    {/* Sample W/O Date */}
                    <div>
                      <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">Sample W/O Date</label>
                      <input
                        type="date"
                        value={formData.sampleWODate}
                        onChange={(e) => setFormData({ ...formData, sampleWODate: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm bg-white min-h-[30px] md:min-h-[38px]"
                      />
                    </div>

                    {/* Sample W/O Handover Date to NPD/Procurement */}
                    <div>
                      <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">Handover Date (NPD/Procurement)</label>
                      <input
                        type="date"
                        value={formData.sampleWOHandoverDate}
                        onChange={(e) => setFormData({ ...formData, sampleWOHandoverDate: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm bg-white min-h-[30px] md:min-h-[38px]"
                      />
                    </div>

                    {/* Expected Date of Completion */}
                    <div>
                      <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">Expected Date of Completion</label>
                      <input
                        type="date"
                        value={formData.expectedCompletionDate}
                        onChange={(e) => setFormData({ ...formData, expectedCompletionDate: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm bg-white min-h-[30px] md:min-h-[38px]"
                      />
                    </div>
                    
                    {/* Dispatch/Sent Date */}
                    <div>
                      <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">Dispatch/Sent Date</label>
                      <input
                        type="date"
                        value={formData.dispatchSentDate}
                        onChange={(e) => setFormData({ ...formData, dispatchSentDate: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm bg-white min-h-[30px] md:min-h-[38px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200 mt-6">
                  <button type="submit" className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold py-2 px-6 rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition shadow-sm text-sm md:text-base flex items-center justify-center gap-2">
                    <Send size={16} /> Confirm Dispatch
                  </button>
                  <button type="button" onClick={() => setShowDispatchModal(false)} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium text-sm md:text-base">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* List Container */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col pt-1 mt-2 flex-1 min-h-0 overflow-hidden">
        
        {/* Mobile View: Cards */}
        <div className="md:hidden flex flex-col gap-2 p-2 overflow-y-auto flex-1 bg-slate-50/50 pb-2">
          {paginatedLeads.map((lead) => (
            <div key={lead.id} className="bg-white rounded-lg border border-indigo-50 shadow-[0_2px_10px_-4px_rgba(79,70,229,0.1)] p-3 relative flex flex-col gap-2 transition-all">
              <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block leading-none mb-1">{lead.sn}</span>
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">
                    {lead.buyerCoder}
                  </h3>
                </div>
                {activeTab === 'pending' ? (
                  <button 
                    onClick={() => handleOpenDispatch(lead)}
                    className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded transition uppercase tracking-wider flex items-center gap-1"
                  >
                    <Send size={12} /> Dispatch
                  </button>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-700">
                    Dispatched
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                   <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Type</span>
                   <span className="font-medium text-gray-800">{lead.type}</span>
                </div>
                <div>
                   <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Qty</span>
                   <span className="font-medium text-gray-800">{lead.qty}</span>
                </div>
                {activeTab === 'history' && (
                  <>
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Sent Date</span>
                      <span className="font-medium text-gray-800">{formatDate(lead.dispatchSentDate)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase tracking-wide">W/O No</span>
                      <span className="font-medium text-gray-800">{lead.sampleWONo || '-'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}

          {filteredLeads.length === 0 && (
            <div className="p-4 text-center text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm font-medium text-xs">
              No records found.
            </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto overflow-y-auto flex-1 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full relative min-w-max">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
              <tr>
                {activeTab === 'pending' && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 sticky left-0 bg-gray-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Action</th>}
                <th className={`px-4 py-3 text-left text-sm font-semibold text-gray-900 ${activeTab === 'history' ? 'sticky left-0 bg-gray-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''}`}>Serial No</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Enquiry Receipt Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Buyer Coder</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Qty</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">ETD</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actual Completion Date</th>
                
                {activeTab === 'history' && (
                  <>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-900 bg-indigo-50/50 border-l border-indigo-100">Buyer Commitment Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-900 bg-indigo-50/50">Sample W/O No</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-900 bg-indigo-50/50">Sample W/O Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-900 bg-indigo-50/50">Handover Date (NPD)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-900 bg-indigo-50/50">Expected Completion Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-900 bg-indigo-50/50">Dispatch/Sent Date</th>
                  </>
                )}
                
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 max-w-[200px]">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.map((lead) => (
                <tr key={lead.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  {activeTab === 'pending' && (
                    <td className="px-4 py-3 text-left sticky left-0 bg-white group-hover:bg-gray-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <button 
                        onClick={() => handleOpenDispatch(lead)}
                        className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded transition uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Send size={14} /> Dispatch
                      </button>
                    </td>
                  )}
                  <td className={`px-4 py-3 text-left text-sm text-indigo-600 font-bold ${activeTab === 'history' ? 'sticky left-0 bg-white group-hover:bg-gray-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''}`}>{lead.sn}</td>
                  <td className="px-4 py-3 text-left text-sm text-gray-700 whitespace-nowrap">{formatDate(lead.receiptDate)}</td>
                  <td className="px-4 py-3 text-left text-sm text-gray-900 font-medium whitespace-nowrap">{lead.buyerCoder}</td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-sky-700 bg-sky-50">{lead.qty}</td>
                  <td className="px-4 py-3 text-left text-sm text-gray-700 whitespace-nowrap">{lead.type}</td>
                  <td className="px-4 py-3 text-left text-sm text-gray-700 whitespace-nowrap">{lead.etd}</td>
                  <td className="px-4 py-3 text-left text-sm font-medium text-emerald-600 whitespace-nowrap">{lead.completionDate ? formatDate(lead.completionDate) : '-'}</td>
                  
                  {activeTab === 'history' && (
                    <>
                      <td className="px-4 py-3 text-left text-sm text-gray-700 bg-indigo-50/30 border-l border-indigo-100 whitespace-nowrap">{formatDate(lead.buyerCommitmentDate)}</td>
                      <td className="px-4 py-3 text-left text-sm text-gray-900 font-medium bg-indigo-50/30 whitespace-nowrap">{lead.sampleWONo || '-'}</td>
                      <td className="px-4 py-3 text-left text-sm text-gray-700 bg-indigo-50/30 whitespace-nowrap">{formatDate(lead.sampleWODate)}</td>
                      <td className="px-4 py-3 text-left text-sm text-gray-700 bg-indigo-50/30 whitespace-nowrap">{formatDate(lead.sampleWOHandoverDate)}</td>
                      <td className="px-4 py-3 text-left text-sm text-gray-700 bg-indigo-50/30 whitespace-nowrap">{formatDate(lead.expectedCompletionDate)}</td>
                      <td className="px-4 py-3 text-left text-sm font-medium text-emerald-600 bg-indigo-50/30 whitespace-nowrap">{formatDate(lead.dispatchSentDate)}</td>
                    </>
                  )}
                  
                  <td className="px-4 py-3 text-left text-sm text-gray-500 max-w-[200px] truncate">{lead.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLeads.length === 0 && (
            <div className="p-8 text-center text-gray-500 font-medium">
              No records found.
            </div>
          )}
        </div>

        {/* Footer & Pagination Controls */}
        <div className="px-2 md:px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-2 md:gap-4 rounded-b-lg pb-2 md:pb-3">
          <div className="text-[10px] md:text-sm text-gray-600 flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-md px-1 md:px-2 py-1 focus:outline-none focus:border-indigo-500 bg-white font-medium text-[10px] md:text-sm shadow-sm"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-[10px] md:text-sm text-gray-500 whitespace-nowrap font-medium">
              {filteredLeads.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}-{Math.min(currentPage * itemsPerPage, filteredLeads.length)} of {filteredLeads.length}
            </span>
          </div>

          <div className="flex gap-1.5 md:gap-2 items-center flex-shrink-0 text-gray-700">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 md:px-2 md:py-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition shadow-sm flex items-center justify-center text-indigo-600"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
            <div className="flex items-center text-[10px] md:text-sm font-medium whitespace-nowrap text-gray-500">
              Pg {currentPage}/{totalPages || 1}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1 md:px-2 md:py-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition shadow-sm flex items-center justify-center text-indigo-600"
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
