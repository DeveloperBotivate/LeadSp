import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search, ChevronLeft, ChevronRight, X, Calendar, Edit2, Trash2, Filter } from 'lucide-react';
import DraggableScroll from '../components/DraggableScroll';
const formatDate = (dateString) => {
  if (!dateString) return '-';
  let date;
  if (typeof dateString === 'string' && dateString.length === 10 && dateString.includes('-')) {
    const [y, m, d] = dateString.split('-');
    date = new Date(y, m - 1, d);
  } else {
    date = new Date(dateString);
  }
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLeads = () => {
  let leads = JSON.parse(localStorage.getItem('pcb_leads')) || [];

  if (leads.length > 0 && !leads[0]._v10) {
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
      if (!l.sampleWONo && l.remarks?.includes('Dummy')) {
        l.sampleWONo = `WO-${1000 + i}`;
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
    const types = ['Select','Only Sample', 'Only Costing', 'Leather Development', 'Material Development', 'General Info'];
    const buyers = ['BUYER-01', 'BUYER-02', 'BUYER-03', 'BUYER-04'];
    
    for (let i = 0; i < 10; i++) {
      const dateObj = new Date(baseDate.getTime() - ((10 - i) * 86400000));
      const compDateObj = new Date(baseDate.getTime() + (i * 86400000));
      
      const isHistory = i % 3 === 0; // Every 3rd lead goes to history
      
      let reqDateStr = dateObj.toISOString().split('T')[0];
      if (!isHistory) {
        if (i % 4 === 1) {
          reqDateStr = baseDate.toISOString().split('T')[0]; // Today (Green)
        } else if (i % 4 === 2) {
          reqDateStr = new Date(baseDate.getTime() + (3 * 86400000)).toISOString().split('T')[0]; // +3 Days (Orange)
        } else if (i % 4 === 3) {
          reqDateStr = new Date(baseDate.getTime() + (10 * 86400000)).toISOString().split('T')[0]; // +10 Days (White)
        } // i % 4 === 0 is past (Red)
      }

      const lead = {
        id: `LEAD-${Date.now()}-${i}`,
        receiptDate: dateObj.toISOString().split('T')[0],
        buyerCoder: buyers[i % buyers.length],
        productName: `Product ${i + 1}`,
        qty: `${(i + 1) * 50}`,
        type: types[i % types.length],
        requirementDate: reqDateStr,
        sampleWONo: `WO-${1000 + i}`,
        sampleWODate: dateObj.toISOString().split('T')[0],
        completionDate: isHistory ? compDateObj.toISOString().split('T')[0] : '',
        _v10: true,
        remarks: `Dummy lead record v10 ${i + 1}`,
        timestamp: new Date().toISOString(),
        addedBy: i % 2 === 0 ? 'Admin User' : 'Employee 1'
      };

      if (isHistory) {
        lead.isFollowedUp = true;
        lead.followUpTimestamp = new Date().toISOString();
        lead.sampleWOHandoverDate = compDateObj.toISOString().split('T')[0];
        lead.expectedCompletionDate = compDateObj.toISOString().split('T')[0];
        lead.actualCompletionDate = compDateObj.toISOString().split('T')[0];
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

const ALL_COLUMNS = [
  { id: 'buyerCoder', label: 'Buyer Code' },
  { id: 'receiptDate', label: 'Enquiry Receipt Date' },
  { id: 'productName', label: 'Description of Enquiry' },
  { id: 'type', label: 'Type' },
  { id: 'requirementDate', label: 'Requirement Date' },
  { id: 'sampleWONo', label: 'Sample W/O No' },
  { id: 'sampleWODate', label: 'Sample W/O Date' },
  { id: 'qty', label: 'Qty' },
  { id: 'sampleWOHandoverDate', label: 'Handover Date (NPD)' },
  { id: 'expectedCompletionDate', label: 'Expected Completion Date' },
  { id: 'actualCompletionDate', label: 'Actual Completion Date' },
  { id: 'dispatchSentDate', label: 'Dispatch/Sent/Close Date' },
  { id: 'remarks', label: 'Remarks' },
  { id: 'addedBy', label: 'Added By' }
];

export default function SampleManagement() {
  const [leads, setLeads] = useState(getLeads());
  const [showFormModal, setShowFormModal] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(
    ALL_COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: true }), {})
  );
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    type: ''
  });
  const [activeTab, setActiveTab] = useState('pending');
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [followUpFormData, setFollowUpFormData] = useState({
    sampleWOHandoverDate: '',
    expectedCompletionDate: '',
    actualCompletionDate: '',
    dispatchSentDate: ''
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
    type: '',
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
    if (activeTab === 'pending') return !l.dispatchSentDate;
    return !!l.dispatchSentDate;
  });

  const filteredLeads = currentStatusLeads.filter(l => {
    if (filters.fromDate && l.receiptDate < filters.fromDate) return false;
    if (filters.toDate && l.receiptDate > filters.toDate) return false;
    if (filters.type && l.type !== filters.type) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (l.sampleWONo && l.sampleWONo.toLowerCase().includes(q)) ||
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
      type: '',
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
      sampleWOHandoverDate: lead.sampleWOHandoverDate || '',
      expectedCompletionDate: lead.expectedCompletionDate || '',
      actualCompletionDate: lead.actualCompletionDate || '',
      dispatchSentDate: lead.dispatchSentDate || ''
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
    toast.success(`Follow up for ${selectedLead.sampleWONo} saved successfully!`);
  };

  const handleSaveLead = (e) => {
    e.preventDefault();
    if (!formData.sampleWONo.trim() || !formData.buyerCoder.trim() || !formData.qty.trim() || !formData.requirementDate.trim() || !formData.type) {
      toast.error('Please fill required fields (Sample W/O No, Buyer Code, Qty, Type, Requirement Date)');
      return;
    }

    const newLead = {
      id: `LEAD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...formData,
      timestamp: new Date().toISOString(),
      addedBy: currentUser.name
    };

    saveLead(newLead);
    setLeads(getLeads());
    setShowFormModal(false);
    toast.success('Lead added successfully!');
  };

  const getRowColorClass = (reqDateStr) => {
    if (!reqDateStr) return 'bg-white hover:bg-gray-50 border-gray-200';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reqDate = new Date(reqDateStr);
    reqDate.setHours(0, 0, 0, 0);
    
    const diffTime = reqDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'bg-red-200 hover:bg-red-300 border-red-300';
    if (diffDays === 0) return 'bg-green-200 hover:bg-green-300 border-green-300';
    if (diffDays > 0 && diffDays <= 5) return 'bg-orange-200 hover:bg-orange-300 border-orange-300';
    
    return 'bg-white hover:bg-gray-50 border-gray-200';
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
          Pending ({leads.filter(l => !l.dispatchSentDate).length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`w-full lg:w-auto px-6 text-xs md:text-sm font-semibold rounded-lg transition-all h-[32px] md:h-[38px] ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          History ({leads.filter(l => !!l.dispatchSentDate).length})
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
        <div className={`${showMobileFilters ? 'grid' : 'hidden'} lg:flex grid-cols-2 lg:flex-row gap-2 w-full lg:w-auto lg:flex-[4] items-center relative`}>
          {/* Column Visibility Dropdown */}
          <div className="relative w-full lg:w-auto col-span-2 lg:col-span-1">
            <button
              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              className="bg-white border border-gray-300 rounded-lg lg:rounded px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] md:text-sm h-[32px] md:h-[38px] flex items-center justify-between w-full lg:w-48 text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <span className="truncate">Visible Columns</span>
              <span className="ml-2 text-[10px]">▼</span>
            </button>
            {showColumnDropdown && (
              <div className="absolute top-[calc(100%+4px)] left-0 mt-1 w-full lg:w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                <div className="p-2 space-y-1">
                  <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer border-b border-gray-100 mb-1 pb-2">
                    <input
                      type="checkbox"
                      checked={Object.values(visibleColumns).every(Boolean)}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setVisibleColumns(
                          ALL_COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: isChecked }), {})
                        );
                      }}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-semibold text-gray-700 select-none">Select All</span>
                  </label>
                  {ALL_COLUMNS.map(col => (
                    <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleColumns[col.id]}
                        onChange={(e) => setVisibleColumns({ ...visibleColumns, [col.id]: e.target.checked })}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-gray-700 select-none">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

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
                  {/* Sample W/O No */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">Sample W/O No *</label>
                    <input
                      type="text"
                      value={formData.sampleWONo}
                      onChange={(e) => setFormData({ ...formData, sampleWONo: e.target.value })}
                      placeholder="e.g. WO-1234"
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm bg-white min-h-[30px] md:min-h-[38px]"
                      required
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
                  
                  {/* Buyer Code */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">Buyer Code *</label>
                    <input
                      type="text"
                      value={formData.buyerCoder}
                      onChange={(e) => setFormData({ ...formData, buyerCoder: e.target.value })}
                      placeholder="e.g. BUYER01"
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm bg-white min-h-[30px] md:min-h-[38px]"
                      required
                    />
                  </div>

                  {/* Description of Enquiry */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">Description of Enquiry *</label>
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
                      required
                    >
                      <option value="" disabled>Select Type</option>
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
              <h2 className="text-base md:text-lg font-bold text-gray-900">Update Lead {selectedLead.sampleWONo}</h2>
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
                      <span className="block text-gray-400 mb-0.5 text-[9px] uppercase">Sample W/O No</span>
                      <span className="font-semibold text-indigo-600">{selectedLead.sampleWONo}</span>
                    </div>
                    <div>
                      <span className="block text-gray-400 mb-0.5 text-[9px] uppercase">Receipt Date</span>
                      <span className="font-medium text-gray-900">{formatDate(selectedLead.receiptDate)}</span>
                    </div>
                    <div>
                      <span className="block text-gray-400 mb-0.5 text-[9px] uppercase">Buyer Code</span>
                      <span className="font-medium text-gray-900">{selectedLead.buyerCoder}</span>
                    </div>
                    <div>
                      <span className="block text-gray-400 mb-0.5 text-[9px] uppercase">Description of Enquiry</span>
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
                      <span className="block text-gray-400 mb-0.5 text-[9px] uppercase">Sample W/O Date</span>
                      <span className="font-medium text-gray-900">{formatDate(selectedLead.sampleWODate)}</span>
                    </div>

                    <div className="col-span-3 md:col-span-4 border-t border-gray-100 pt-2 mt-1">
                      <span className="block text-gray-400 mb-0.5 text-[9px] uppercase">Remarks</span>
                      <span className="font-medium text-gray-700">{selectedLead.remarks || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Follow Up Input Fields */}
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-xs font-semibold text-indigo-800 mb-3 border-b pb-1">Update Details</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    
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
                      <label className="block text-[10px] md:text-xs font-medium text-gray-700 mb-0.5">Actual Completion Date</label>
                      <input
                        type="date"
                        value={followUpFormData.actualCompletionDate}
                        onChange={(e) => setFollowUpFormData({ ...followUpFormData, actualCompletionDate: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-xs bg-white h-[30px] md:h-[34px]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] md:text-xs font-medium text-gray-700 mb-0.5">Dispatch/Sent/Close Date</label>
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
                    Save Updates
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
            <div key={lead.id} className={`rounded-lg border shadow-[0_2px_10px_-4px_rgba(79,70,229,0.1)] p-2.5 relative flex flex-col gap-2 transition-all ${getRowColorClass(lead.requirementDate)}`}>
              <div className="flex justify-between items-start border-b border-black/10 pb-2">
                <div>
                  {visibleColumns.sampleWONo && <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block leading-none mb-1">{lead.sampleWONo}</span>}
                  {visibleColumns.buyerCoder && <h3 className="font-bold text-gray-900 text-sm leading-tight">{lead.buyerCoder}</h3>}
                </div>
                <div className="text-right">
                   {visibleColumns.qty && (
                     <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700">
                       Qty: {lead.qty}
                     </span>
                   )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                {visibleColumns.productName && (
                  <div>
                     <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Description of Enquiry</span>
                     <span className="font-medium text-gray-800">{lead.productName || '-'}</span>
                  </div>
                )}
                {visibleColumns.type && (
                  <div>
                     <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Type</span>
                     <span className="font-medium text-gray-800">{lead.type}</span>
                  </div>
                )}
                {visibleColumns.requirementDate && (
                  <div>
                     <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Req Date</span>
                     <span className="font-medium text-gray-800">{formatDate(lead.requirementDate)}</span>
                  </div>
                )}
                {visibleColumns.receiptDate && (
                  <div>
                     <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Receipt Date</span>
                     <span className="font-medium text-gray-800">{formatDate(lead.receiptDate)}</span>
                  </div>
                )}
                {visibleColumns.addedBy && (
                  <div>
                     <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Added By</span>
                     <span className="font-medium text-indigo-600">{lead.addedBy || '-'}</span>
                  </div>
                )}

                {visibleColumns.sampleWODate && (
                  <div>
                     <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Sample W/O Date</span>
                     <span className="font-medium text-gray-800">{formatDate(lead.sampleWODate)}</span>
                  </div>
                )}
                {visibleColumns.sampleWOHandoverDate && (
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Handover Date</span>
                    <span className="font-medium text-gray-800">{formatDate(lead.sampleWOHandoverDate)}</span>
                  </div>
                )}
                {visibleColumns.expectedCompletionDate && (
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Expected Comp.</span>
                    <span className="font-medium text-gray-800">{formatDate(lead.expectedCompletionDate)}</span>
                  </div>
                )}
                {visibleColumns.actualCompletionDate && (
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Actual Comp.</span>
                    <span className="font-medium text-gray-800">{formatDate(lead.actualCompletionDate)}</span>
                  </div>
                )}
                {visibleColumns.dispatchSentDate && (
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Dispatch Date</span>
                    <span className="font-medium text-gray-800">{formatDate(lead.dispatchSentDate)}</span>
                  </div>
                )}
              </div>

              {visibleColumns.remarks && lead.remarks && (
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
                {visibleColumns.buyerCoder && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Buyer Code</th>}
                {visibleColumns.receiptDate && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Enquiry Receipt Date</th>}
                {visibleColumns.productName && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Description of Enquiry</th>}
                {visibleColumns.type && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Type</th>}
                {visibleColumns.requirementDate && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Requirement Date</th>}
                {visibleColumns.sampleWONo && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Sample W/O No</th>}
                {visibleColumns.sampleWODate && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Sample W/O Date</th>}
                {visibleColumns.qty && <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 whitespace-nowrap">Qty</th>}

                {visibleColumns.sampleWOHandoverDate && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Handover Date (NPD)</th>}
                {visibleColumns.expectedCompletionDate && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Expected Completion Date</th>}
                {visibleColumns.actualCompletionDate && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Actual Completion Date</th>}
                {visibleColumns.dispatchSentDate && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Dispatch/Sent/Close Date</th>}
                
                {visibleColumns.remarks && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 max-w-[200px]">Remarks</th>}
                {visibleColumns.addedBy && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">Added By</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.map((lead) => (
                <tr key={lead.id} className={`border-b transition-colors ${getRowColorClass(lead.requirementDate)}`}>
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
                  {visibleColumns.buyerCoder && <td className="px-4 py-3 text-left text-sm text-gray-900 font-medium">{lead.buyerCoder}</td>}
                  {visibleColumns.receiptDate && <td className="px-4 py-3 text-left text-sm text-gray-700 whitespace-nowrap">{formatDate(lead.receiptDate)}</td>}
                  {visibleColumns.productName && <td className="px-4 py-3 text-left text-sm text-gray-900">{lead.productName || '-'}</td>}
                  {visibleColumns.type && <td className="px-4 py-3 text-left text-sm text-gray-700">{lead.type}</td>}
                  {visibleColumns.requirementDate && <td className="px-4 py-3 text-left text-sm text-gray-700">{formatDate(lead.requirementDate)}</td>}
                  {visibleColumns.sampleWONo && <td className="px-4 py-3 text-left text-sm text-indigo-600 font-bold">{lead.sampleWONo}</td>}
                  {visibleColumns.sampleWODate && <td className="px-4 py-3 text-left text-sm text-gray-700 whitespace-nowrap">{lead.sampleWODate ? formatDate(lead.sampleWODate) : '-'}</td>}
                  {visibleColumns.qty && <td className="px-4 py-3 text-center text-sm font-semibold text-sky-700 bg-sky-50">{lead.qty}</td>}

                  {visibleColumns.sampleWOHandoverDate && <td className="px-4 py-3 text-left text-sm text-gray-700 whitespace-nowrap">{formatDate(lead.sampleWOHandoverDate)}</td>}
                  {visibleColumns.expectedCompletionDate && <td className="px-4 py-3 text-left text-sm text-gray-700 whitespace-nowrap">{formatDate(lead.expectedCompletionDate)}</td>}
                  {visibleColumns.actualCompletionDate && <td className="px-4 py-3 text-left text-sm text-gray-700 whitespace-nowrap">{formatDate(lead.actualCompletionDate)}</td>}
                  {visibleColumns.dispatchSentDate && <td className="px-4 py-3 text-left text-sm text-gray-700 whitespace-nowrap">{formatDate(lead.dispatchSentDate)}</td>}

                  {visibleColumns.remarks && <td className="px-4 py-3 text-left text-sm text-gray-500 max-w-[200px] truncate">{lead.remarks || '-'}</td>}
                  {visibleColumns.addedBy && <td className="px-4 py-3 text-left text-sm text-gray-700 font-semibold">{lead.addedBy || '-'}</td>}
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
