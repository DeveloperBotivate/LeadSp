import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search, ChevronLeft, ChevronRight, X, Calendar, Edit2, Trash2, Filter } from 'lucide-react';

// ==========================================
// LOCAL STORAGE & DUMMY DATA LOGIC
// ==========================================
const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

const getLeads = () => {
  const leads = JSON.parse(localStorage.getItem('pcb_planning')) || [];

  if (leads.length > 0 && (!leads[0].woNo || !leads[0].buyer || leads[0].remarks?.includes('Dummy lead record') || leads[0].currentStage === undefined || leads.length !== 36)) {
    localStorage.removeItem('pcb_planning');
  } else if (leads.length > 0) {
    let needsUpdate = false;
    const mapped = leads.map((l, i) => {
      let changed = false;
      let newL = { ...l };
      if (!newL.productName) {
        newL.productName = `Product ${i + 1}`;
        changed = true;
      }
      if (!newL.addedBy) {
        newL.addedBy = i % 2 === 0 ? 'Admin User' : 'Employee 1';
        changed = true;
      }
      if (changed) needsUpdate = true;
      return newL;
    });
    if (needsUpdate) {
      localStorage.setItem('pcb_planning', JSON.stringify(mapped));
      return mapped;
    }
    return leads;
  }

  const dummyLeads = [];
  const baseDate = new Date();

  let leadCounter = 1;
  for (let stg = 0; stg <= 11; stg++) {
    for (let i = 0; i < 3; i++) {
      const dateObj = new Date(baseDate.getTime() - ((40 - leadCounter) * 86400000));
      const compDateObj = new Date(baseDate.getTime() + (leadCounter * 86400000));

      const lead = {
        id: `PLAN-${Date.now()}-${leadCounter}`,
        sn: `SN-${leadCounter.toString().padStart(3, '0')}`,
        buyer: `BUYER-${100 + leadCounter}`,
        productName: `Product ${leadCounter}`,
        woNo: `WO-${1000 + leadCounter}`,
        wResDate: dateObj.toISOString().split('T')[0],
        woDate: dateObj.toISOString().split('T')[0],
        woDespatchDate: compDateObj.toISOString().split('T')[0],
        qty: `${(i + 1) * 50}`,
        remarks: `Dummy production plan ${leadCounter}`,
        timestamp: new Date().toISOString(),
        addedBy: leadCounter % 2 === 0 ? 'Admin User' : 'Employee 1',
        currentStage: stg,
        isHistory: leadCounter % 2 === 0, // Mock half as History
        // Mock history data if it is history
        ...(leadCounter % 2 === 0 ? {
          handoverDate: compDateObj.toISOString().split('T')[0],
          leatherInHouseDate: compDateObj.toISOString().split('T')[0],
          materialsInHouseDate: compDateObj.toISOString().split('T')[0],
          packingMaterialsInHouseDate: compDateObj.toISOString().split('T')[0],
          fabricationCompletionDate: compDateObj.toISOString().split('T')[0],
          qaCompletedBy: 'QA Team',
          daysNeededForPacking: '5',
          plannedShipmentDate: compDateObj.toISOString().split('T')[0],
          planningOk: 'OK',
          prodOtdDelayed: 'OTD',
          shippedReady: 'READY',
          historyRemarks: 'Completed successfully'
        } : {})
      };

      for (let s = 1; s <= stg; s++) {
        lead[`stage${s}`] = {
          actualDate: compDateObj.toISOString().split('T')[0],
          status: leadCounter % 2 === 0 ? 'Completed' : 'Delayed',
          remarks: `Stage ${s} completed successfully`,
          timestamp: new Date().toISOString()
        };

        if (s === 8) {
          lead[`stage${s}`] = {
            actualDate: compDateObj.toISOString().split('T')[0],
            dayNeed: `Need ${i + 1} days`,
            remarks: `Stage ${s} completed successfully`,
            timestamp: new Date().toISOString()
          };
        }
      }

      dummyLeads.push(lead);
      leadCounter++;
    }
  }

  localStorage.setItem('pcb_planning', JSON.stringify(dummyLeads));
  return dummyLeads;
};

const saveLead = (updatedLead) => {
  const leads = getLeads();
  const index = leads.findIndex(l => l.id === updatedLead.id);
  
  if (index !== -1) {
    leads[index] = updatedLead;
    localStorage.setItem('pcb_planning', JSON.stringify(leads));
  } else {
    leads.push(updatedLead);
    localStorage.setItem('pcb_planning', JSON.stringify(leads));
  }
};
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getTimeDelay = (planned, actual) => {
  if (!planned || !actual) return '-';
  const diffTime = new Date(actual) - new Date(planned);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays > 0) return `${diffDays} days delay`;
  if (diffDays < 0) return `${Math.abs(diffDays)} days early`;
  return 'On time';
};

export default function ProductionPlanning() {
  const [activeTab, setActiveTab] = useState('pending');
  const [leads, setLeads] = useState(getLeads());
  const [showFormModal, setShowFormModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const STAGES_LIST = [
    'HANDOVER',
    'LEATHER IN-HOUSE',
    'MATERIALS IN-HOUSE',
    'PACKING MATERIALS IN-HOUSE',
    'CUTTING COMPLETION',
    'FABRICATION COMPLETION',
    'QA COMPLETED',
    'Planned Shipment'
  ];

  const [followUpFormData, setFollowUpFormData] = useState({
    stages: STAGES_LIST.map(name => ({ name, plannedDate: '', actualDate: '', remarks: '' }))
  });
  
  const currentUser = JSON.parse(localStorage.getItem('pcb_authUser')) || { name: 'Unknown User' };
  
  const [isViewMode, setIsViewMode] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: ''
  });
  const [searchQuery, setSearchQuery] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const [formData, setFormData] = useState({
    buyer: '',
    woNo: '',
    wResDate: getTodayDate(),
    woDate: getTodayDate(),
    woDespatchDate: '',
    qty: '',
    remarks: ''
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters]);

  const filteredLeads = leads.filter(l => {
    const isLeadHistory = !!l.isHistory;
    if (activeTab === 'pending' && isLeadHistory) return false;
    if (activeTab === 'history' && !isLeadHistory) return false;

    if (filters.fromDate && l.woDate < filters.fromDate) return false;
    if (filters.toDate && l.woDate > filters.toDate) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (l.sn && l.sn.toLowerCase().includes(q)) ||
        (l.buyer && l.buyer.toLowerCase().includes(q)) ||
        (l.productName && l.productName.toLowerCase().includes(q)) ||
        (l.woNo && l.woNo.toLowerCase().includes(q)) ||
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
      buyer: '',
      productName: '',
      woNo: '',
      wResDate: getTodayDate(),
      woDate: getTodayDate(),
      woDespatchDate: '',
      qty: '',
      remarks: ''
    });
    setShowFormModal(true);
  };

  const handleSaveLead = (e) => {
    e.preventDefault();
    if (!formData.buyer.trim() || !formData.woNo.trim() || !formData.qty.trim()) {
      toast.error('Please fill required fields (Buyer, W/O No, Quantity)');
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
      id: `PLAN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sn: `SN-${nextSnNum.toString().padStart(3, '0')}`,
      ...formData,
      timestamp: new Date().toISOString(),
      addedBy: currentUser.name,
      currentStage: 0
    };

    saveLead(newLead);
    setLeads(getLeads());
    setShowFormModal(false);
    toast.success('Production Plan added successfully!');
  };

  const handleOpenFollowUp = (lead) => {
    setSelectedLead(lead);
    setIsViewMode(false);
    
    // Prefill with existing stages if available, else default
    let stages = lead.stages;
    if (!stages || stages.length === 0) {
      stages = STAGES_LIST.map(name => ({ name, plannedDate: '', actualDate: '', remarks: '' }));
    } else {
      // In case stages list was updated, merge existing data
      stages = STAGES_LIST.map(name => {
        const existing = stages.find(s => s.name === name);
        return existing || { name, plannedDate: '', actualDate: '', remarks: '' };
      });
    }

    setFollowUpFormData({ stages });
    setShowFollowUpModal(true);
  };

  const handleOpenView = (lead) => {
    setSelectedLead(lead);
    setIsViewMode(true);
    setFollowUpFormData({ stages: lead.stages || STAGES_LIST.map(name => ({ name, plannedDate: '', actualDate: '', remarks: '' })) });
    setShowFollowUpModal(true);
  };

  const handleSaveFollowUp = (e) => {
    e.preventDefault();
    if (!selectedLead) return;

    // Check if all stages have both planned and actual dates
    const allStagesComplete = followUpFormData.stages.every(stage => stage.plannedDate && stage.actualDate);

    const updatedLead = {
      ...selectedLead,
      stages: followUpFormData.stages,
      isHistory: allStagesComplete,
      historyTimestamp: allStagesComplete ? new Date().toISOString() : selectedLead.historyTimestamp
    };

    saveLead(updatedLead);
    setLeads(getLeads());
    setShowFollowUpModal(false);
    
    if (allStagesComplete && !selectedLead.isHistory) {
      toast.success(`All stages complete! ${selectedLead.sn} moved to History.`);
    } else {
      toast.success(`Update saved for ${selectedLead.sn}.`);
    }
  };

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-2 md:space-y-6 flex flex-col h-full min-h-0">

      {/* Header Row: Filters + Add Button */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-3 w-full pb-2 border-b border-gray-100">

        {/* Tabs */}
        <div className="flex bg-gray-100/80 p-1 rounded-lg w-full lg:w-auto flex-shrink-0 border border-gray-200/60">
          <button
            onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
            className={`flex-1 lg:flex-none px-6 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${
              activeTab === 'pending'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => { setActiveTab('history'); setCurrentPage(1); }}
            className={`flex-1 lg:flex-none px-6 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${
              activeTab === 'history'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            History
          </button>
        </div>

        {/* Search & Mobile Add & Filter */}
        <div className="flex items-center gap-2 w-full lg:w-auto lg:flex-[1.5]">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-2.5 top-[9px] lg:top-[11px] text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search..."
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
            placeholder="W/O From Date"
            onFocus={(e) => (e.target.type = 'date')}
            onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
            value={filters.fromDate}
            onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
            className="w-full bg-white border border-gray-300 rounded-lg lg:rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] md:text-sm h-[32px] md:h-[38px]"
          />
          <input
            type="text"
            placeholder="W/O To Date"
            onFocus={(e) => (e.target.type = 'date')}
            onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
            value={filters.toDate}
            onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
            className="w-full bg-white border border-gray-300 rounded-lg lg:rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] md:text-sm h-[32px] md:h-[38px]"
          />
        </div>

        {/* Desktop Add Button */}
        <button
          onClick={handleOpenAddModal}
          className="hidden lg:flex bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 h-[38px] rounded-lg font-semibold items-center justify-center gap-2 transition shadow-sm w-full lg:w-auto flex-shrink-0 whitespace-nowrap"
        >
          <Plus size={16} /> Planning
        </button>
      </div>

      {/* Form Section Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-3 md:p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 flex-shrink-0">
              <h2 className="text-base md:text-lg font-bold text-gray-900">Add Planning Entry</h2>
              <button type="button" onClick={() => setShowFormModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={20} className="md:w-6 md:h-6" />
              </button>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto flex-1">
              <form onSubmit={handleSaveLead} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Buyer */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">Buyer *</label>
                    <input
                      type="text"
                      value={formData.buyer}
                      onChange={(e) => setFormData({ ...formData, buyer: e.target.value })}
                      placeholder="e.g. BUYER01 (Alphanumeric)"
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm bg-white min-h-[30px] md:min-h-[38px]"
                      required
                    />
                  </div>

                  {/* Product Name */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">Product Name</label>
                    <input
                      type="text"
                      value={formData.productName}
                      onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                      placeholder="e.g. Product 1"
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm bg-white min-h-[30px] md:min-h-[38px]"
                    />
                  </div>

                  {/* W/O No */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">W/O No *</label>
                    <input
                      type="text"
                      value={formData.woNo}
                      onChange={(e) => setFormData({ ...formData, woNo: e.target.value })}
                      placeholder="Alphanumeric"
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm bg-white min-h-[30px] md:min-h-[38px]"
                      required
                    />
                  </div>

                  {/* W/RES Date */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">W/RES Date *</label>
                    <input
                      type="date"
                      value={formData.wResDate}
                      onChange={(e) => setFormData({ ...formData, wResDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm bg-white min-h-[30px] md:min-h-[38px]"
                      required
                    />
                  </div>

                  {/* W/O Date */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">W/O Date *</label>
                    <input
                      type="date"
                      value={formData.woDate}
                      onChange={(e) => setFormData({ ...formData, woDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm bg-white min-h-[30px] md:min-h-[38px]"
                      required
                    />
                  </div>

                  {/* W/O Despatch Date */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">W/O Despatch Date *</label>
                    <input
                      type="date"
                      value={formData.woDespatchDate}
                      onChange={(e) => setFormData({ ...formData, woDespatchDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm bg-white min-h-[30px] md:min-h-[38px]"
                      required
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">Quantity *</label>
                    <input
                      type="number"
                      value={formData.qty}
                      onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                      placeholder="e.g. 500"
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm bg-white min-h-[30px] md:min-h-[38px]"
                      required
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
                  <button type="button" onClick={() => setShowFormModal(false)} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium text-sm md:text-base">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition shadow-sm text-sm md:text-base">
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Follow-Up Modal */}
      {showFollowUpModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] md:max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-3 md:p-4 border-b border-gray-200 flex justify-between items-center bg-indigo-50 flex-shrink-0">
              <h2 className="text-base md:text-lg font-bold text-indigo-900">Update - {selectedLead.sn}</h2>
              <button type="button" onClick={() => setShowFollowUpModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={20} className="md:w-6 md:h-6" />
              </button>
            </div>
            
            <div className="p-4 md:p-6 overflow-y-auto flex-1">
              {/* Read Only Details */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Planning Details</h3>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 text-sm">
                  <div><span className="text-gray-500 block text-[10px] uppercase">Buyer</span><span className="font-medium">{selectedLead.buyer || '-'}</span></div>
                  <div><span className="text-gray-500 block text-[10px] uppercase">Product Name</span><span className="font-medium">{selectedLead.productName || '-'}</span></div>
                  <div><span className="text-gray-500 block text-[10px] uppercase">W/O No</span><span className="font-medium">{selectedLead.woNo || '-'}</span></div>
                  <div><span className="text-gray-500 block text-[10px] uppercase">Quantity</span><span className="font-medium">{selectedLead.qty || '-'}</span></div>
                  <div><span className="text-gray-500 block text-[10px] uppercase">W/RES Date</span><span className="font-medium">{formatDate(selectedLead.wResDate)}</span></div>
                  <div><span className="text-gray-500 block text-[10px] uppercase">W/O Date</span><span className="font-medium">{formatDate(selectedLead.woDate)}</span></div>
                  <div><span className="text-gray-500 block text-[10px] uppercase">W/O Despatch</span><span className="font-medium">{formatDate(selectedLead.woDespatchDate)}</span></div>
                  <div className="col-span-3 md:col-span-4 lg:col-span-5"><span className="text-gray-500 block text-[9px] uppercase">Remarks</span><span className="font-medium text-gray-700 text-xs">{selectedLead.remarks || '-'}</span></div>
                </div>
              </div>

              {/* Editable Form */}
              <form onSubmit={handleSaveFollowUp} className="space-y-3">
                <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-100 border-b border-gray-200 text-gray-700">
                      <tr>
                        <th className="px-2 py-1.5 font-semibold">Stage Name</th>
                        <th className="px-2 py-1.5 font-semibold">Planned Date</th>
                        <th className="px-2 py-1.5 font-semibold">Actual Date</th>
                        <th className="px-2 py-1.5 font-semibold">Time Delay</th>
                        <th className="px-2 py-1.5 font-semibold w-full min-w-[150px]">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {followUpFormData.stages.map((stage, index) => (
                        <tr key={index} className="hover:bg-gray-50/50">
                          <td className="px-2 py-1 font-medium text-gray-800 text-[11px] leading-tight">{stage.name}</td>
                          <td className="px-2 py-1">
                            <input
                              type="date"
                              value={stage.plannedDate}
                              disabled={isViewMode}
                              onChange={(e) => {
                                const newStages = [...followUpFormData.stages];
                                newStages[index].plannedDate = e.target.value;
                                setFollowUpFormData({ ...followUpFormData, stages: newStages });
                              }}
                              className="border border-gray-300 rounded px-1.5 py-0.5 text-[11px] focus:ring-1 focus:ring-indigo-400 focus:outline-none w-[110px] disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-200"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="date"
                              value={stage.actualDate}
                              disabled={isViewMode}
                              onChange={(e) => {
                                const newStages = [...followUpFormData.stages];
                                newStages[index].actualDate = e.target.value;
                                setFollowUpFormData({ ...followUpFormData, stages: newStages });
                              }}
                              className="border border-gray-300 rounded px-1.5 py-0.5 text-[11px] focus:ring-1 focus:ring-indigo-400 focus:outline-none w-[110px] disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-200"
                            />
                          </td>
                          <td className="px-2 py-1 text-[11px] font-medium text-gray-600">
                            {getTimeDelay(stage.plannedDate, stage.actualDate)}
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="text"
                              value={stage.remarks}
                              disabled={isViewMode}
                              placeholder={isViewMode ? "-" : "Input"}
                              onChange={(e) => {
                                const newStages = [...followUpFormData.stages];
                                newStages[index].remarks = e.target.value;
                                setFollowUpFormData({ ...followUpFormData, stages: newStages });
                              }}
                              className="border border-gray-300 rounded px-1.5 py-0.5 text-[11px] focus:ring-1 focus:ring-indigo-400 focus:outline-none w-full disabled:bg-transparent disabled:border-transparent disabled:text-gray-700 disabled:px-0 disabled:py-0"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-100 mt-4">
                  {isViewMode ? (
                    <button type="button" onClick={() => setShowFollowUpModal(false)} className="flex-1 bg-gray-100 text-gray-700 font-semibold py-2 px-6 rounded-lg hover:bg-gray-200 transition shadow-sm text-sm md:text-base">Close View</button>
                  ) : (
                    <>
                      <button type="button" onClick={() => setShowFollowUpModal(false)} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium text-sm md:text-base">Cancel</button>
                      <button type="submit" className="flex-1 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition shadow-sm text-sm md:text-base">Save Update</button>
                    </>
                  )}
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
                    {lead.buyer}
                  </h3>
                </div>
                <div className="text-right flex flex-col gap-1 items-end">
                  {activeTab === 'pending' && (
                    <div className="flex gap-1">
                      <button onClick={() => handleOpenFollowUp(lead)} className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold uppercase hover:bg-indigo-100 transition shadow-sm border border-indigo-200">
                        Update
                      </button>
                      <button onClick={() => handleOpenView(lead)} className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold uppercase hover:bg-indigo-100 transition shadow-sm border border-indigo-200">
                        View
                      </button>
                    </div>
                  )}
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
                  <span className="text-gray-500 block text-[10px] uppercase tracking-wide">W/O No</span>
                  <span className="font-medium text-gray-800">{lead.woNo}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase tracking-wide">W/RES Date</span>
                  <span className="font-medium text-gray-800">{formatDate(lead.wResDate)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Added By</span>
                  <span className="font-medium text-indigo-600">{lead.addedBy || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase tracking-wide">W/O Date</span>
                  <span className="font-medium text-gray-800">{formatDate(lead.woDate)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase tracking-wide">W/O Despatch</span>
                  <span className="font-medium text-emerald-600">{formatDate(lead.woDespatchDate)}</span>
                </div>
              </div>
              {lead.remarks && (
                <div className="mt-1 pt-2 border-t border-gray-50 text-xs">
                  <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Remarks</span>
                  <span className="text-gray-700">{lead.remarks}</span>
                </div>
              )}
              {activeTab === 'history' && (
                <div className="mt-2 pt-2 border-t border-indigo-100 bg-indigo-50/50 -mx-2.5 px-2.5 pb-1 flex justify-end">
                   <button onClick={() => handleOpenView(lead)} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold uppercase hover:bg-indigo-200 transition shadow-sm border border-indigo-300">
                      View Data
                   </button>
                </div>
              )}
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
          <table className="w-full min-w-[900px] relative">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Action</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Serial No</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Added By</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Buyer</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Product Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">W/O No</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">W/RES Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">W/O Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">W/O Despatch Date</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 whitespace-nowrap">Quantity</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap max-w-[200px]">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.map((lead) => (
                <tr key={lead.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-left text-sm whitespace-nowrap">
                    {activeTab === 'pending' ? (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleOpenFollowUp(lead)} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-md text-[11px] font-bold uppercase hover:bg-indigo-100 transition shadow-sm border border-indigo-200">
                          Update
                        </button>
                        <button onClick={() => handleOpenView(lead)} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-md text-[11px] font-bold uppercase hover:bg-indigo-100 transition shadow-sm border border-indigo-200">
                          View
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => handleOpenView(lead)} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-md text-[11px] font-bold uppercase hover:bg-indigo-100 transition shadow-sm border border-indigo-200">
                        View Data
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-left text-sm text-indigo-600 font-bold whitespace-nowrap">{lead.sn}</td>
                  <td className="px-4 py-3 text-left text-sm text-gray-700 font-semibold whitespace-nowrap">{lead.addedBy || '-'}</td>
                  <td className="px-4 py-3 text-left text-sm text-gray-900 font-medium whitespace-nowrap">{lead.buyer}</td>
                  <td className="px-4 py-3 text-left text-sm text-gray-900 whitespace-nowrap">{lead.productName || '-'}</td>
                  <td className="px-4 py-3 text-left text-sm text-gray-700 whitespace-nowrap">{lead.woNo}</td>
                  <td className="px-4 py-3 text-left text-sm text-gray-700 whitespace-nowrap">{formatDate(lead.wResDate)}</td>
                  <td className="px-4 py-3 text-left text-sm text-gray-700 whitespace-nowrap">{formatDate(lead.woDate)}</td>
                  <td className="px-4 py-3 text-left text-sm font-medium text-emerald-600 whitespace-nowrap">{formatDate(lead.woDespatchDate)}</td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-sky-700 bg-sky-50 whitespace-nowrap">{lead.qty}</td>
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

