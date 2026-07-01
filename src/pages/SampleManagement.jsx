import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search, ChevronLeft, ChevronRight, X, Calendar, Edit2, Trash2, Filter } from 'lucide-react';
import DraggableScroll from '../components/DraggableScroll';
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

const getLeads = () => {
  let leads = JSON.parse(localStorage.getItem('pcb_leads')) || [];

  if (leads.length > 0 && (!leads[0].buyerCoder || leads[0].remarks?.includes('Dummy production plan') || (leads[0].remarks?.includes('Dummy lead record') && !leads[0].remarks?.includes('v3')))) {
    leads = [];
    localStorage.removeItem('pcb_leads');
  }
  
  let needsUpdate = false;
  if (leads.length > 0) {
    leads = leads.map((l, i) => {
      let changed = false;
      if (!l.productName) {
        l.productName = `Product ${i + 1}`;
        changed = true;
      }
      if (l.etd !== undefined && !l.requirementDate) {
        // Fallback invalid etd string to receiptDate so date formatter doesn't break
        l.requirementDate = l.receiptDate;
        delete l.etd;
        changed = true;
      }
      if (!l.addedBy) {
        l.addedBy = i % 2 === 0 ? 'Admin User' : 'Employee 1';
        changed = true;
      }
      if (changed) needsUpdate = true;
      return l;
    });
    if (needsUpdate) {
      localStorage.setItem('pcb_leads', JSON.stringify(leads));
    }
  }

  if (leads.length === 0) {
    const dummyLeads = [];
    const baseDate = new Date();
    const types = ['Only Sample', 'Only Costing', 'Leather Development', 'Material Development', 'General Info'];
    const buyers = ['BUYER-01', 'BUYER-02', 'BUYER-03', 'BUYER-04'];
    
    for (let i = 0; i < 20; i++) {
      const dateObj = new Date(baseDate.getTime() - ((20 - i) * 86400000));
      const compDateObj = new Date(baseDate.getTime() + (i * 86400000));
      
      const isHistory = i % 3 === 0; // Every 3rd lead goes to history
      
      const lead = {
        id: `LEAD-${Date.now()}-${i}`,
        sn: `SN-${(i + 1).toString().padStart(3, '0')}`,
        receiptDate: dateObj.toISOString().split('T')[0],
        buyerCoder: buyers[i % buyers.length],
        productName: `Product ${i + 1}`,
        qty: `${(i + 1) * 50}`,
        type: types[i % types.length],
        requirementDate: dateObj.toISOString().split('T')[0],
        completionDate: isHistory ? compDateObj.toISOString().split('T')[0] : '',
        remarks: `Dummy lead record v3 ${i + 1}`,
        timestamp: new Date().toISOString(),
        addedBy: i % 2 === 0 ? 'Admin User' : 'Employee 1'
      };

      if (isHistory) {
        lead.isFollowedUp = true;
        lead.followUpTimestamp = new Date().toISOString();
        lead.buyerCommitmentDate = dateObj.toISOString().split('T')[0];
        lead.sampleWONo = `WO-${1000 + i}`;
        lead.sampleWODate = dateObj.toISOString().split('T')[0];
        lead.sampleWOHandoverDate = compDateObj.toISOString().split('T')[0];
        lead.expectedCompletionDate = compDateObj.toISOString().split('T')[0];
        lead.dispatchSentDate = compDateObj.toISOString().split('T')[0];
      }

      dummyLeads.push(lead);
    }
    localStorage.setItem('pcb_leads', JSON.stringify(dummyLeads));
    return dummyLeads;
  }
  return leads;
};

const saveLead = (lead) => {
  const leads = getLeads();
  const index = leads.findIndex(l => l.id === lead.id);
  if (index !== -1) {
    leads[index] = lead;
  } else {
    leads.push(lead);
  }
  localStorage.setItem('pcb_leads', JSON.stringify(leads));
};

export default function SampleManagement() {
  const [leads, setLeads] = useState(getLeads());
  const [showFormModal, setShowFormModal] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    type: ''
  });
  const [activeTab, setActiveTab] = useState('pending');
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [followUpFormData, setFollowUpFormData] = useState({
    buyerCommitmentDate: '',
    sampleWONo: '',
    sampleWODate: '',
    sampleWOHandoverDate: '',
    expectedCompletionDate: '',
    dispatchSentDate: getTodayDate()
  });

  const currentUser = JSON.parse(localStorage.getItem('pcb_authUser')) || { name: 'Unknown User' };

  const [searchQuery, setSearchQuery] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const [formData, setFormData] = useState({
    receiptDate: getTodayDate(),
    buyerCoder: '',
    productName: '',
    qty: '',
    type: 'Only Sample',
    requirementDate: '',
    sampleWONo: '',
    sampleWODate: '',
    completionDate: '',
    remarks: ''
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters, activeTab]);

  const currentStatusLeads = leads.filter(l => {
    if (activeTab === 'pending') return !l.isFollowedUp;
    return l.isFollowedUp;
  });

  const filteredLeads = currentStatusLeads.filter(l => {
    if (filters.fromDate && l.receiptDate < filters.fromDate) return false;
    if (filters.toDate && l.receiptDate > filters.toDate) return false;
    if (filters.type && l.type !== filters.type) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (l.sn && l.sn.toLowerCase().includes(q)) ||
        (l.buyerCoder && l.buyerCoder.toLowerCase().includes(q)) ||
        (l.productName && l.productName.toLowerCase().includes(q)) ||
        (l.type && l.type.toLowerCase().includes(q)) ||
        (l.requirementDate && l.requirementDate.toLowerCase().includes(q)) ||
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

  const handleOpenAddModal = () => {
    setFormData({
      receiptDate: getTodayDate(),
      buyerCoder: '',
      productName: '',
      qty: '',
      type: 'Only Sample',
      requirementDate: '',
      sampleWONo: '',
      sampleWODate: '',
      completionDate: '',
      remarks: ''
    });
    setShowFormModal(true);
  };

  const handleOpenFollowUp = (lead) => {
    setSelectedLead(lead);
    setFollowUpFormData({
      buyerCommitmentDate: '',
      sampleWONo: '',
      sampleWODate: '',
      sampleWOHandoverDate: '',
      expectedCompletionDate: '',
      dispatchSentDate: getTodayDate()
    });
    setShowFollowUpModal(true);
  };

  const handleSaveFollowUp = (e) => {
    e.preventDefault();
    if (!selectedLead) return;

    const updatedLead = {
      ...selectedLead,
      ...followUpFormData,
      isFollowedUp: true,
      followUpTimestamp: new Date().toISOString()
    };

    saveLead(updatedLead);
    setLeads(getLeads());
    setShowFollowUpModal(false);
    toast.success(`Follow up for ${selectedLead.sn} saved successfully!`);
  };

  const handleSaveLead = (e) => {
    e.preventDefault();
    if (!formData.buyerCoder.trim() || !formData.qty.trim() || !formData.requirementDate.trim()) {
      toast.error('Please fill required fields (Buyer Coder, Qty, Requirement Date)');
      return;
    }

    let nextSnNum = 1;
    if (leads.length > 0) {
      const lastSn = leads[leads.length - 1].sn;
      if (lastSn && lastSn.startsWith('SN-')) {
        nextSnNum = parseInt(lastSn.split('-')[1], 10) + 1;
      } else {
        nextSnNum = leads.length + 1;
      }
    }

    const newLead = {
      id: `LEAD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sn: `SN-${nextSnNum.toString().padStart(3, '0')}`,
      ...formData,
      timestamp: new Date().toISOString(),
      addedBy: currentUser.name
    };

    saveLead(newLead);
    setLeads(getLeads());
    setShowFormModal(false);
    toast.success('Lead added successfully!');
  };

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-2 md:space-y-6 flex flex-col h-full min-h-0">
      
      {/* Header Row: Tabs & Filters */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center gap-2 xl:gap-3 w-full pb-2">
        
        {/* Tabs as Buttons */}
        <button
          onClick={() => setActiveTab('pending')}
          className={`w-full lg:w-auto px-6 text-xs md:text-sm font-semibold rounded-lg transition-all h-[32px] md:h-[38px] ${
            activeTab === 'pending'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`w-full lg:w-auto px-6 text-xs md:text-sm font-semibold rounded-lg transition-all h-[32px] md:h-[38px] ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          History
        </button>
        
        {/* Search & Mobile Add & Filter */}
        <div className="flex items-center gap-2 w-full lg:w-auto lg:flex-[1.5]">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-2.5 top-[9px] lg:top-[11px] text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg lg:rounded pl-8 pr-2 py-1.5 focus:outline-none focus:border-indigo-500 text-xs md:text-sm h-[32px] md:h-[38px]"
            />
          </div>
          {/* Mobile Filter Button */}
          <button
             onClick={() => setShowMobileFilters(!showMobileFilters)}
             className={`lg:hidden flex items-center justify-center rounded-lg shadow-sm h-[32px] w-[32px] flex-shrink-0 transition ${showMobileFilters ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            <Filter size={14} />
          </button>
          
          <button
             onClick={handleOpenAddModal}
             className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center lg:hidden h-[32px] w-[32px] flex-shrink-0 shadow-sm transition"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Filters */}
        <div className={`${showMobileFilters ? 'grid' : 'hidden'} lg:flex grid-cols-2 lg:flex-row gap-2 w-full lg:w-auto lg:flex-[4] items-center`}>
          <input
            type="text"
            placeholder="From Date"
            onFocus={(e) => (e.target.type = 'date')}
            onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
            value={filters.fromDate}
            onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
            className="w-full bg-white border border-gray-300 rounded-lg lg:rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] md:text-sm h-[32px] md:h-[38px]"
          />
          <input
            type="text"
            placeholder="To Date"
            onFocus={(e) => (e.target.type = 'date')}
            onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
            value={filters.toDate}
            onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
            className="w-full bg-white border border-gray-300 rounded-lg lg:rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] md:text-sm h-[32px] md:h-[38px]"
          />
        </div>

        {/* Desktop Add Button */}
        {activeTab === 'pending' && (
          <button
             onClick={handleOpenAddModal}
             className="hidden lg:flex bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 h-[38px] rounded-lg font-semibold items-center justify-center gap-2 transition shadow-sm w-full lg:w-auto flex-shrink-0 whitespace-nowrap"
          >
            <Plus size={16} /> Add Sample
          </button>
        )}
      </div>

      {/* Form Section Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-3 md:p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 flex-shrink-0">
              <h2 className="text-base md:text-lg font-bold text-gray-900">New Sample</h2>
              <button type="button" onClick={() => setShowFormModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={20} className="md:w-6 md:h-6" />
              </button>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto flex-1">
              <form onSubmit={handleSaveLead} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Enquiry Receipt Date */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">Enquiry Receipt Date *</label>
                    <input
                      type="date"
                      value={formData.receiptDate}
                      onChange={(e) => setFormData({ ...formData, receiptDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm bg-white min-h-[30px] md:min-h-[38px]"
                      required
                    />
                  </div>
                  
                  {/* Buyer Coder */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">Buyer Coder *</label>
                    <input
                      type="text"
                      value={formData.buyerCoder}
                      onChange={(e) => setFormData({ ...formData, buyerCoder: e.target.value })}
                      placeholder="e.g. BUYER01"
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm bg-white min-h-[30px] md:min-h-[38px]"
                      required
                    />
                  </div>

                  {/* Product Name */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">Product Name *</label>
                    <input
                      type="text"
                      value={formData.productName}
                      onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                      placeholder="e.g. PCB Board"
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm bg-white min-h-[30px] md:min-h-[38px]"
                      required
                    />
                  </div>

                  {/* Qty */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">Qty *</label>
                    <input
                      type="text"
                      value={formData.qty}
                      onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                      placeholder="e.g. 500"
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm bg-white min-h-[30px] md:min-h-[38px]"
                      required
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm bg-white min-h-[30px] md:min-h-[38px]"
                    >
                      <option value="Only Sample">Only Sample</option>
                      <option value="Only Costing">Only Costing</option>
                      <option value="Leather Development">Leather Development</option>
                      <option value="Material Development">Material Development</option>
                      <option value="General Info">General Info</option>
                    </select>
                  </div>

                  {/* Requirement Date */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">Requirement Date *</label>
                    <input
                      type="date"
                      value={formData.requirementDate}
                      onChange={(e) => setFormData({ ...formData, requirementDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm bg-white min-h-[30px] md:min-h-[38px]"
                      required
                    />
                  </div>


                  {/* Actual Completion Date */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">Actual Completion Date</label>
                    <input
                      type="date"
                      value={formData.completionDate}
                      onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm bg-white min-h-[30px] md:min-h-[38px]"
                    />
                  </div>
                  
                  {/* Remarks */}
                  <div className="md:col-span-2">
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">Remarks</label>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      placeholder="Any additional information..."
                      rows="3"
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6">
                  <button type="submit" className="flex-1 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition shadow-sm text-sm md:text-base">
                    Save
                  </button>
                  <button type="button" onClick={() => setShowFormModal(false)} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium text-sm md:text-base">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Follow Up Modal */}
      {showFollowUpModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] md:max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-3 md:p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 flex-shrink-0">
              <h2 className="text-base md:text-lg font-bold text-gray-900">Follow Up Lead {selectedLead.sn}</h2>
              <button type="button" onClick={() => setShowFollowUpModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={20} className="md:w-6 md:h-6" />
              </button>
            </div>
            <div className="p-4 md:p-5 overflow-y-auto flex-1 bg-slate-50/50">
              <form onSubmit={handleSaveFollowUp} className="space-y-4">
                
                {/* Read Only Lead Details */}
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-xs font-semibold text-gray-800 mb-2 border-b pb-1">Lead Information (Read Only)</h3>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3 text-[11px]">
                    <div>
                      <span className="block text-gray-400 mb-0.5 text-[9px] uppercase">Serial No</span>
                      <span className="font-semibold text-indigo-600">{selectedLead.sn}</span>
                    </div>
                    <div>
                      <span className="block text-gray-400 mb-0.5 text-[9px] uppercase">Receipt Date</span>
                      <span className="font-medium text-gray-900">{formatDate(selectedLead.receiptDate)}</span>
                    </div>
                    <div>
                      <span className="block text-gray-400 mb-0.5 text-[9px] uppercase">Buyer Coder</span>
                      <span className="font-medium text-gray-900">{selectedLead.buyerCoder}</span>
                    </div>
                    <div>
                      <span className="block text-gray-400 mb-0.5 text-[9px] uppercase">Product Name</span>
                      <span className="font-medium text-gray-900">{selectedLead.productName || '-'}</span>
                    </div>
                    <div>
                      <span className="block text-gray-400 mb-0.5 text-[9px] uppercase">Qty</span>
                      <span className="font-medium text-sky-700 bg-sky-50 px-1 py-0.5 rounded">{selectedLead.qty}</span>
                    </div>
                    <div>
                      <span className="block text-gray-400 mb-0.5 text-[9px] uppercase">Type</span>
                      <span className="font-medium text-gray-900">{selectedLead.type}</span>
                    </div>
                    <div>
                      <span className="block text-gray-400 mb-0.5 text-[9px] uppercase">Req Date</span>
                      <span className="font-medium text-gray-900">{formatDate(selectedLead.requirementDate)}</span>
                    </div>
                    <div>
                      <span className="block text-gray-400 mb-0.5 text-[9px] uppercase">Completion Date</span>
                      <span className="font-medium text-emerald-600">{selectedLead.completionDate ? formatDate(selectedLead.completionDate) : '-'}</span>
                    </div>
                    <div className="col-span-3 md:col-span-4 border-t border-gray-100 pt-2 mt-1">
                      <span className="block text-gray-400 mb-0.5 text-[9px] uppercase">Remarks</span>
                      <span className="font-medium text-gray-700">{selectedLead.remarks || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Follow Up Input Fields */}
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-xs font-semibold text-indigo-800 mb-3 border-b pb-1">Follow Up Details</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    
                    <div>
                      <label className="block text-[10px] md:text-xs font-medium text-gray-700 mb-0.5">Buyer Commitment Date</label>
                      <input
                        type="date"
                        value={followUpFormData.buyerCommitmentDate}
                        onChange={(e) => setFollowUpFormData({ ...followUpFormData, buyerCommitmentDate: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-xs bg-white h-[30px] md:h-[34px]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] md:text-xs font-medium text-gray-700 mb-0.5">Sample W/O No</label>
                      <input
                        type="text"
                        value={followUpFormData.sampleWONo}
                        onChange={(e) => setFollowUpFormData({ ...followUpFormData, sampleWONo: e.target.value })}
                        placeholder="Enter W/O Number"
                        className="w-full border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-xs bg-white h-[30px] md:h-[34px]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] md:text-xs font-medium text-gray-700 mb-0.5">Sample W/O Date</label>
                      <input
                        type="date"
                        value={followUpFormData.sampleWODate}
                        onChange={(e) => setFollowUpFormData({ ...followUpFormData, sampleWODate: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-xs bg-white h-[30px] md:h-[34px]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] md:text-xs font-medium text-gray-700 mb-0.5">Handover Date (NPD)</label>
                      <input
                        type="date"
                        value={followUpFormData.sampleWOHandoverDate}
                        onChange={(e) => setFollowUpFormData({ ...followUpFormData, sampleWOHandoverDate: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-xs bg-white h-[30px] md:h-[34px]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] md:text-xs font-medium text-gray-700 mb-0.5">Expected Completion Date</label>
                      <input
                        type="date"
                        value={followUpFormData.expectedCompletionDate}
                        onChange={(e) => setFollowUpFormData({ ...followUpFormData, expectedCompletionDate: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-xs bg-white h-[30px] md:h-[34px]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] md:text-xs font-medium text-gray-700 mb-0.5">Dispatch/Sent Date</label>
                      <input
                        type="date"
                        value={followUpFormData.dispatchSentDate}
                        onChange={(e) => setFollowUpFormData({ ...followUpFormData, dispatchSentDate: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-xs bg-white h-[30px] md:h-[34px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition shadow-sm text-sm flex items-center justify-center gap-2">
                    Save Follow Up
                  </button>
                  <button type="button" onClick={() => setShowFollowUpModal(false)} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium text-sm bg-white">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Leads List Container */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col pt-1 mt-2 flex-1 min-h-0">
        
        {/* Mobile View: Cards */}
        <div className="md:hidden flex flex-col gap-2 p-2 overflow-y-auto flex-1 bg-slate-50/50 pb-2">
          {paginatedLeads.map((lead) => (
            <div key={lead.id} className="bg-white rounded-lg border border-indigo-50 shadow-[0_2px_10px_-4px_rgba(79,70,229,0.1)] p-2.5 relative flex flex-col gap-2 transition-all">
              <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block leading-none mb-1">{lead.sn}</span>
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">
                    {lead.buyerCoder}
                  </h3>
                </div>
                <div className="text-right">
                   <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700">
                     Qty: {lead.qty}
                   </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                   <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Product</span>
                   <span className="font-medium text-gray-800">{lead.productName || '-'}</span>
                </div>
                <div>
                   <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Type</span>
                   <span className="font-medium text-gray-800">{lead.type}</span>
                </div>
                <div>
                   <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Req Date</span>
                   <span className="font-medium text-gray-800">{formatDate(lead.requirementDate)}</span>
                </div>
                <div>
                   <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Receipt Date</span>
                   <span className="font-medium text-gray-800">{formatDate(lead.receiptDate)}</span>
                </div>
                <div>
                   <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Added By</span>
                   <span className="font-medium text-indigo-600">{lead.addedBy || '-'}</span>
                </div>
                <div>
                   <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Completion</span>
                   <span className="font-medium text-emerald-600">{lead.completionDate ? formatDate(lead.completionDate) : '-'}</span>
                </div>
                {activeTab === 'history' && (
                  <>
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Buyer Comm.</span>
                      <span className="font-medium text-gray-800">{formatDate(lead.buyerCommitmentDate)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Sample W/O Date</span>
                      <span className="font-medium text-gray-800">{formatDate(lead.sampleWODate)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Handover Date</span>
                      <span className="font-medium text-gray-800">{formatDate(lead.sampleWOHandoverDate)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Expected Comp.</span>
                      <span className="font-medium text-gray-800">{formatDate(lead.expectedCompletionDate)}</span>
                    </div>
                  </>
                )}
              </div>
              
              {lead.sampleWONo && (
                <div className="mt-1 pt-2 border-t border-gray-50 text-xs">
                  <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Sample W/O No & Date</span>
                  <span className="text-gray-700 font-medium">{lead.sampleWONo} ({formatDate(lead.sampleWODate)})</span>
                </div>
              )}

              {lead.remarks && (
                <div className="mt-1 pt-2 border-t border-gray-50 text-xs">
                  <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Remarks</span>
                  <span className="text-gray-700">{lead.remarks}</span>
                </div>
              )}

              {activeTab === 'pending' && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleOpenFollowUp(lead)}
                    className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-1.5 rounded text-xs transition"
                  >
                    Update
                  </button>
                </div>
              )}
            </div>
          ))}

          {filteredLeads.length === 0 && (
            <div className="p-4 text-center text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm font-medium text-xs">
              No leads found.
            </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <DraggableScroll className="hidden md:block flex-1 min-h-0">
          <table className="w-full min-w-[900px] relative">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
              <tr>
                {activeTab === 'pending' && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-24 whitespace-nowrap">Action</th>}
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Serial No</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Enquiry Receipt Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Added By</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Buyer Coder</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Product Name</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 whitespace-nowrap">Qty</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Requirement Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Actual Completion Date</th>
                {activeTab === 'history' && (
                  <>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Sample W/O No</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Sample W/O Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Buyer Commitment Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Handover Date (NPD)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Expected Completion Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Dispatch/Sent Date</th>
                  </>
                )}
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 max-w-[200px]">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.map((lead) => (
                <tr key={lead.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  {activeTab === 'pending' && (
                    <td className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleOpenFollowUp(lead)}
                        className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-semibold py-1.5 px-3 rounded-md transition-colors whitespace-nowrap"
                      >
                        Update
                      </button>
                    </td>
                  )}
                  <td className="px-4 py-3 text-left text-sm text-indigo-600 font-bold">{lead.sn}</td>
                  <td className="px-4 py-3 text-left text-sm text-gray-700 whitespace-nowrap">{formatDate(lead.receiptDate)}</td>
                  <td className="px-4 py-3 text-left text-sm text-gray-700 font-semibold">{lead.addedBy || '-'}</td>
                  <td className="px-4 py-3 text-left text-sm text-gray-900 font-medium">{lead.buyerCoder}</td>
                  <td className="px-4 py-3 text-left text-sm text-gray-900">{lead.productName || '-'}</td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-sky-700 bg-sky-50">{lead.qty}</td>
                  <td className="px-4 py-3 text-left text-sm text-gray-700">{lead.type}</td>
                  <td className="px-4 py-3 text-left text-sm text-gray-700">{formatDate(lead.requirementDate)}</td>
                  <td className="px-4 py-3 text-left text-sm font-medium text-emerald-600 whitespace-nowrap">{lead.completionDate ? formatDate(lead.completionDate) : '-'}</td>
                  {activeTab === 'history' && (
                    <>
                      <td className="px-4 py-3 text-left text-sm text-gray-700">{lead.sampleWONo || '-'}</td>
                      <td className="px-4 py-3 text-left text-sm text-gray-700 whitespace-nowrap">{lead.sampleWODate ? formatDate(lead.sampleWODate) : '-'}</td>
                      <td className="px-4 py-3 text-left text-sm text-gray-700 whitespace-nowrap">{formatDate(lead.buyerCommitmentDate)}</td>
                      <td className="px-4 py-3 text-left text-sm text-gray-700 whitespace-nowrap">{formatDate(lead.sampleWOHandoverDate)}</td>
                      <td className="px-4 py-3 text-left text-sm text-gray-700 whitespace-nowrap">{formatDate(lead.expectedCompletionDate)}</td>
                      <td className="px-4 py-3 text-left text-sm text-gray-700 whitespace-nowrap">{formatDate(lead.dispatchSentDate)}</td>
                    </>
                  )}
                  <td className="px-4 py-3 text-left text-sm text-gray-500 max-w-[200px] truncate">{lead.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLeads.length === 0 && (
            <div className="p-8 text-center text-gray-500 font-medium">
              No leads found.
            </div>
          )}
        </DraggableScroll>

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
