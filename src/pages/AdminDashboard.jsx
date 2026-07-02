import React, { useState, useMemo } from 'react';
import { TrendingUp, FileText, CheckCircle, Clock, ChevronLeft, ChevronRight, Search, Filter, X } from 'lucide-react';
import DraggableScroll from '../components/DraggableScroll';
import DonutChart from '../components/DonutChart';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const STAGES_LIST = [
  "HANDOVER",
  "LEATHER IN-HOUSE",
  "MATERIALS IN-HOUSE",
  "PACKING MATERIALS IN-HOUSE",
  "CUTTING COMPLETION",
  "FABRICATION COMPLETION",
  "QA COMPLETED",
  "Planned Shipment"
];

const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

const isDateInRange = (date, fromDate, toDate) => {
  const checkDate = new Date(date);
  const startDate = fromDate ? new Date(fromDate) : new Date('1900-01-01');
  const endDate = toDate ? new Date(toDate) : new Date('2099-12-31');
  return checkDate >= startDate && checkDate <= endDate;
};

export default function AdminDashboard() {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    buyerCoder: '',
    type: '',
    searchQuery: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const [dashboardType, setDashboardType] = useState('enquiry'); // 'enquiry' | 'planning'
  const [summaryGroup, setSummaryGroup] = useState('buyer'); // 'buyer' | 'user'
  const [selectedLeadDetails, setSelectedLeadDetails] = useState(null);

  const leads = useMemo(() => {
    if (dashboardType === 'enquiry') {
      return JSON.parse(localStorage.getItem('pcb_leads')) || [];
    } else {
      return JSON.parse(localStorage.getItem('pcb_planning')) || [];
    }
  }, [dashboardType]);

  const filteredLeads = useMemo(() => {
    let filtered = leads.filter(l => {
      // Date Range filter
      if (filters.dateFrom || filters.dateTo) {
        if (!isDateInRange(l.receiptDate, filters.dateFrom, filters.dateTo)) {
          return false;
        }
      }
      
      // Type filter
      if (filters.type && l.type !== filters.type) {
        return false;
      }
      
      // Buyer Coder filter
      if (filters.buyerCoder && !l.buyerCoder?.toLowerCase().includes(filters.buyerCoder.toLowerCase())) {
        return false;
      }

      // General Search filter
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        return (
          (l.sn && l.sn.toLowerCase().includes(q)) ||
          (l.sampleWONo && l.sampleWONo.toLowerCase().includes(q)) ||
          (l.buyerCoder && l.buyerCoder.toLowerCase().includes(q)) ||
          (l.type && l.type.toLowerCase().includes(q)) ||
          (l.remarks && l.remarks.toLowerCase().includes(q))
        );
      }
      return true;
    });

    // Sort by Date descending (newest first)
    return filtered.reverse();
  }, [filters, leads]);

  // Calculate statistics based on filtered data
  const totalLeads = filteredLeads.length;
  const pendingDispatch = filteredLeads.filter(l => dashboardType === 'enquiry' ? !l.dispatchSentDate : !l.isHistory).length;
  const dispatchedLeads = filteredLeads.filter(l => dashboardType === 'enquiry' ? !!l.dispatchSentDate : l.isHistory).length;
  
  const todayDate = getTodayDate();
  const leadsToday = filteredLeads.filter(l => {
    const dateField = dashboardType === 'enquiry' ? l.receiptDate : l.wResDate;
    return dateField === todayDate;
  }).length;

  // Paginated Leads
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(start, start + itemsPerPage);
  }, [filteredLeads, currentPage, itemsPerPage]);

  const handleDownloadCSV = () => {
    const isEnquiry = dashboardType === 'enquiry';
    const headers = isEnquiry 
      ? ['Sample W/O No', 'Receipt Date', 'Buyer Code', 'Description of Enquiry', 'Qty', 'Type', 'Requirement Date', 'Status', 'Remarks']
      : ['W/O No', 'W/RES Date', 'Buyer', 'Qty', 'Description of Enquiry', 'Status', 'Remarks'];
      
    const rows = filteredLeads.map(l => isEnquiry ? [
      l.sampleWONo || '',
      formatDate(l.receiptDate),
      l.buyerCoder || '',
      l.productName || '',
      l.qty || '',
      l.type || '',
      l.requirementDate || '',
      l.dispatchSentDate ? 'Dispatched' : 'Pending',
      l.remarks || ''
    ] : [
      l.woNo || '',
      formatDate(l.wResDate),
      l.buyer || '',
      l.qty || '',
      l.productName || '',
      l.isHistory ? 'History' : 'Pending',
      l.remarks || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Chart data - Leads by Type
  const leadsByType = useMemo(() => {
    // Force HMR reload
    console.log("AdminDashboard rendering, dashboardType:", dashboardType);
    
    const typeData = {};
    filteredLeads.forEach(l => {
      const type = dashboardType === 'enquiry' ? (l.type || 'Unknown') : (l.productName || 'Unknown');
      if (!typeData[type]) {
        typeData[type] = 0;
      }
      typeData[type] += 1;
    });
    return typeData;
  }, [filteredLeads, dashboardType]);

  const summaryStats = useMemo(() => {
    const stats = {};
    filteredLeads.forEach(l => {
      let groupKey = 'Unknown';
      
      if (summaryGroup === 'user') {
        groupKey = l.addedBy || 'Unknown User';
      } else {
        groupKey = dashboardType === 'enquiry' ? (l.buyerCoder || 'Unknown Buyer') : (l.buyer || 'Unknown Buyer');
      }
      
      if (!stats[groupKey]) {
        stats[groupKey] = { name: groupKey, total: 0, completed: 0, delays: 0 };
      }
      
      stats[groupKey].total += 1;
      
      if (dashboardType === 'enquiry') {
        if (l.dispatchSentDate) {
          stats[groupKey].completed += 1;
        }
      } else {
        if (l.isHistory) {
          stats[groupKey].completed += 1;
        }
        
        // Calculate delays
        let delayCount = 0;
        if (l.stages && Array.isArray(l.stages)) {
          l.stages.forEach(stage => {
            if (stage.plannedDate && stage.actualDate) {
              const diffTime = new Date(stage.actualDate) - new Date(stage.plannedDate);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays > 0) delayCount += 1;
            }
          });
        } else {
          // Fallback for dummy data format
          for (let s = 1; s <= 8; s++) {
            const stg = l[`stage${s}`];
            if (stg && stg.status === 'Delayed') {
              delayCount += 1;
            }
          }
        }
        stats[groupKey].delays += delayCount;
      }
    });
    
    return Object.values(stats).sort((a, b) => b.total - a.total);
  }, [filteredLeads, dashboardType, summaryGroup]);
  const paginationControls = (
    <div className="p-2 md:p-3 border-t border-gray-100 bg-gray-50 flex flex-col items-center justify-between gap-2 lg:flex-row rounded-b-lg pb-2 md:pb-3 mt-auto">
      <div className="flex w-full lg:w-auto justify-between items-center text-[10px] md:text-sm gap-2">
        <div className="text-gray-600 flex items-center flex-shrink-0">
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white border border-gray-300 rounded-md px-1 py-1 text-[10px] md:text-xs focus:outline-none focus:border-indigo-500 shadow-sm font-medium"
          >
            {[10, 15, 20, 50, 100].map(val => (
              <option key={val} value={val}>{val}</option>
            ))}
          </select>
          <span className="text-[10px] md:text-[11px] font-medium text-gray-500 ml-1.5 whitespace-nowrap">
            entries
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-gray-700">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 hover:bg-gray-50 transition shadow-sm text-indigo-600"
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
          <div className="text-[10px] md:text-[10px] font-medium min-w-[50px] text-center text-gray-500">
            Pg {currentPage}/{totalPages || 1}
          </div>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 hover:bg-gray-50 transition shadow-sm text-indigo-600"
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-2 md:space-y-6 flex flex-col h-full md:h-auto overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* Dashboard Toggle as Buttons */}
      <div className="flex gap-2 w-full mb-4">
        <button 
          onClick={() => { setDashboardType('enquiry'); setCurrentPage(1); }} 
          className={`flex-1 px-6 py-2 text-sm font-semibold rounded-lg transition-all h-[36px] flex items-center justify-center ${
            dashboardType === 'enquiry' 
              ? 'bg-indigo-600 text-white shadow-sm' 
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          Enquiry Dashboard
        </button>
        <button 
          onClick={() => { setDashboardType('planning'); setCurrentPage(1); }} 
          className={`flex-1 px-6 py-2 text-sm font-semibold rounded-lg transition-all h-[36px] flex items-center justify-center ${
            dashboardType === 'planning' 
              ? 'bg-indigo-600 text-white shadow-sm' 
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          Bulk Order Dashboard
        </button>
      </div>

      {/* Header with Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 lg:gap-4 w-full pb-2">
        <div className="flex flex-col lg:flex-row w-full gap-2 items-center">
          
          {/* Search + Export Row (Mobile grouping) */}
          <div className="flex items-center gap-2 w-full lg:w-auto lg:flex-[1.5]">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-2.5 top-[9px] lg:top-[11px] text-gray-400" size={14} />
              <input
                type="text"
                placeholder={dashboardType === 'enquiry' ? "Search leads..." : "Search bulk orders..."}
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
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
            {/* Mobile Export Button */}
            <button
               onClick={handleDownloadCSV}
               className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center lg:hidden h-[32px] w-[32px] flex-shrink-0 shadow-sm transition"
            >
              <TrendingUp size={16} className="rotate-90" />
            </button>
          </div>

          {/* Filters */}
          <div className={`${showMobileFilters ? 'grid' : 'hidden'} lg:flex grid-cols-2 lg:flex-row gap-2 w-full lg:w-auto lg:flex-[4] items-center`}>
             <input
               type="text"
               placeholder="From Date"
               onFocus={(e) => (e.target.type = 'date')}
               onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
               value={filters.dateFrom}
               onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
               className="w-full bg-white border border-gray-300 rounded-lg lg:rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] md:text-sm h-[32px] md:h-[38px]"
             />
             <input
               type="text"
               placeholder="To Date"
               onFocus={(e) => (e.target.type = 'date')}
               onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
               value={filters.dateTo}
               onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
               className="w-full bg-white border border-gray-300 rounded-lg lg:rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] md:text-sm h-[32px] md:h-[38px]"
             />
             <input
               type="text"
               value={filters.buyerCoder}
               onChange={(e) => setFilters({ ...filters, buyerCoder: e.target.value })}
               placeholder="Buyer Code..."
               className="w-full bg-white border border-gray-300 rounded-lg lg:rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] md:text-sm h-[32px] md:h-[38px]"
             />
             {dashboardType === 'enquiry' && (
               <select
                 value={filters.type}
                 onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                 className="w-full bg-white border border-gray-300 rounded-lg lg:rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] md:text-sm h-[32px] md:h-[38px]"
               >
                 <option value="">All Types</option>
                 <option value="Only Sample">Only Sample</option>
                 <option value="Only Costing">Only Costing</option>
                 <option value="Leather Development">Leather Development</option>
                 <option value="Material Development">Material Development</option>
                 <option value="General Info">General Info</option>
               </select>
             )}
          </div>
        </div>

        {/* Desktop Export Button */}
        <button
           onClick={handleDownloadCSV}
           className="hidden lg:flex bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 h-[38px] rounded-lg font-semibold items-center justify-center gap-2 transition shadow-sm w-full lg:w-auto flex-shrink-0"
        >
          <TrendingUp size={16} className="rotate-90" /> Export CSV
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-6 border border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total {dashboardType === 'enquiry' ? 'Leads' : 'Bulk Orders'}</p>
              <p className="text-2xl font-bold text-indigo-700 mt-2">
                {totalLeads}
              </p>
            </div>
            <FileText className="text-indigo-600" size={32} />
          </div>
        </div>

        {/* Leads Today */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">{dashboardType === 'enquiry' ? 'Leads' : 'Bulk Orders'} Added Today</p>
              <p className="text-2xl font-bold text-blue-700 mt-2">
                {leadsToday}
              </p>
            </div>
            <TrendingUp className="text-blue-600" size={32} />
          </div>
        </div>

        {/* Pending Dispatch */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">{dashboardType === 'enquiry' ? 'Pending Dispatch' : 'Pending Planning'}</p>
              <p className="text-2xl font-bold text-orange-700 mt-2">
                {pendingDispatch}
              </p>
            </div>
            <Clock className="text-orange-600" size={32} />
          </div>
        </div>

        {/* Dispatched Leads */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-6 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">{dashboardType === 'enquiry' ? 'Dispatched Leads' : 'History (Completed)'}</p>
              <p className="text-2xl font-bold text-emerald-700 mt-2">
                {dispatchedLeads}
              </p>
            </div>
            <CheckCircle className="text-emerald-600" size={32} />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Type */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{dashboardType === 'enquiry' ? 'Leads' : 'Bulk Orders'} by Type</h3>
          <div>
            {Object.entries(leadsByType).length > 0 ? (
              <DonutChart 
                data={Object.entries(leadsByType).map(([label, value]) => ({ label, value }))}
                totalLabel={dashboardType === 'enquiry' ? 'Total Leads' : 'Total Orders'}
              />
            ) : (
              <p className="text-gray-500 text-center py-4">No {dashboardType === 'enquiry' ? 'lead' : 'bulk order'} data available</p>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-gray-700">Total System {dashboardType === 'enquiry' ? 'Leads' : 'Bulk Orders'}</span>
              <span className="font-bold text-indigo-600">{totalLeads}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-gray-700">{dashboardType === 'enquiry' ? 'Awaiting Dispatch' : 'Awaiting Planning'}</span>
              <span className="font-bold text-orange-600">{pendingDispatch}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-gray-700">{dashboardType === 'enquiry' ? 'Successfully Dispatched' : 'Completed (History)'}</span>
              <span className="font-bold text-emerald-600">{dispatchedLeads}</span>
            </div>
            <div className="flex justify-between items-center pt-3">
              <span className="text-gray-700">New {dashboardType === 'enquiry' ? 'Leads' : 'Bulk Orders'} Today</span>
              <span className="font-bold text-blue-600">{leadsToday}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tables Grid Wrapper */}
      <div className={`mt-4 grid gap-4 ${dashboardType === 'planning' && filteredLeads.length > 0 ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        
        {/* Card 1: Main Summary Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-gray-50/50 rounded-t-lg">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {dashboardType === 'enquiry' ? 'Enquiry Summary' : 'Bulk Order Summary'}
              </h3>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setSummaryGroup('buyer')} 
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${summaryGroup === 'buyer' ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'bg-white text-gray-600 hover:text-indigo-600 border border-gray-200'}`}
              >
                Group by Buyer
              </button>
              <button 
                onClick={() => setSummaryGroup('user')} 
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${summaryGroup === 'user' ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'bg-white text-gray-600 hover:text-indigo-600 border border-gray-200'}`}
              >
                Group by User
              </button>
            </div>
          </div>

          <DraggableScroll className="hidden md:block max-h-[450px]">
            <table className="w-full text-left border-collapse relative min-w-max">
              <thead className="bg-gray-50 text-gray-700 text-[11px] font-bold uppercase tracking-wider border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <tr>
                  {dashboardType === 'enquiry' ? (
                    <>
                      <th className="px-4 py-3">{summaryGroup === 'user' ? 'User Name' : 'Buyer Name'}</th>
                      <th className="px-4 py-3 text-center">Total Enquiry</th>
                      <th className="px-4 py-3 text-center">Dispatched</th>
                      <th className="px-4 py-3 text-center">Pending</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3">{summaryGroup === 'user' ? 'User Name' : 'Buyer Name'}</th>
                      <th className="px-4 py-3 text-center">Total Bulk Orders</th>
                      <th className="px-4 py-3 text-center">Complete</th>
                      <th className="px-4 py-3 text-center">Delays (Stages)</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {summaryStats.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">{item.name}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-indigo-700 text-center bg-indigo-50/50">{item.total}</td>
                    {dashboardType === 'enquiry' ? (
                      <>
                        <td className="px-4 py-3 text-sm font-semibold text-emerald-700 text-center bg-emerald-50/50">{item.completed}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-orange-700 text-center bg-orange-50/50">{item.total - item.completed}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm font-semibold text-emerald-700 text-center bg-emerald-50/50">{item.completed}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-red-700 text-center bg-red-50/50">{item.delays}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </DraggableScroll>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col gap-2 p-2 bg-slate-50/50 pb-2">
            {summaryStats.map((item, idx) => (
              <div key={idx} className="bg-white rounded-lg border border-indigo-50 shadow-[0_2px_10px_-4px_rgba(79,70,229,0.1)] p-3 relative flex flex-col gap-2 transition-all">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">
                    {item.name}
                  </h3>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs text-center">
                  <div className="bg-indigo-50/50 p-1.5 rounded">
                     <span className="text-gray-500 block text-[9px] uppercase tracking-wide mb-1">Total</span>
                     <span className="font-bold text-indigo-700">{item.total}</span>
                  </div>
                  <div className="bg-emerald-50/50 p-1.5 rounded">
                     <span className="text-gray-500 block text-[9px] uppercase tracking-wide mb-1">Complete</span>
                     <span className="font-bold text-emerald-700">{item.completed}</span>
                  </div>
                  <div className="bg-red-50/50 p-1.5 rounded">
                     <span className="text-gray-500 block text-[9px] uppercase tracking-wide mb-1">Delays</span>
                     <span className="font-bold text-red-700">{item.delays}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredLeads.length === 0 && (
            <div className="p-12 text-center text-gray-500 italic font-medium">
              No {dashboardType === 'enquiry' ? 'leads' : 'bulk orders'} found matching your criteria.
            </div>
          )}
          {paginationControls}
        </div>

        {/* Card 2: Stage Progress (Only in Planning View) */}
        {dashboardType === 'planning' && filteredLeads.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center bg-gray-50/50 rounded-t-lg">
              <h3 className="text-lg font-bold text-gray-900">
                Stage Progress (By W/O No)
              </h3>
            </div>
            
            <DraggableScroll className="max-h-[450px]">
              <table className="w-full text-left border-collapse relative min-w-max">
                <thead className="bg-gray-50 text-gray-700 text-[11px] font-bold uppercase tracking-wider border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3">W/O No</th>
                    <th className="px-4 py-3">Buyer Name</th>
                    <th className="px-4 py-3 text-center">Total Stages</th>
                    <th className="px-4 py-3 text-center">Completed</th>
                    <th className="px-4 py-3 text-center">Pending</th>
                    <th className="px-4 py-3 text-center">Delayed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedLeads.map((l, idx) => {
                    let completedCount = 0;
                    let delayedCount = 0;
                    
                    if (l.isHistory) {
                      completedCount = 8;
                    } else {
                      for (let s = 1; s <= 8; s++) {
                        const stg = l[`stage${s}`];
                        if (stg) {
                          if (stg.status === 'Completed') completedCount++;
                          else if (stg.status === 'Delayed') delayedCount++;
                        }
                      }
                    }
                    const totalStages = 8;
                    const pendingCount = totalStages - completedCount - delayedCount;

                    return (
                      <tr 
                        key={l.id || idx} 
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onDoubleClick={() => setSelectedLeadDetails(l)}
                      >
                        <td className="px-4 py-3 text-sm font-bold text-indigo-600">{l.woNo}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{l.buyer || '-'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-700 text-center bg-gray-50/50">{totalStages}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-emerald-700 text-center bg-emerald-50/50">{completedCount}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-orange-700 text-center bg-orange-50/50">{Math.max(0, pendingCount)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-red-700 text-center bg-red-50/50">{delayedCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </DraggableScroll>
            {paginationControls}
          </div>
        )}
      </div>

      {/* Lead Details Modal */}
      {selectedLeadDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">
                Order Details: <span className="text-indigo-600">{selectedLeadDetails.woNo}</span>
              </h3>
              <button 
                onClick={() => setSelectedLeadDetails(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-3 md:p-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">Buyer Name</p>
                  <p className="font-bold text-gray-900 text-xs">{selectedLeadDetails.buyer || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">Description of Enquiry</p>
                  <p className="font-bold text-gray-900 text-xs">{selectedLeadDetails.productName || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">Quantity</p>
                  <p className="font-bold text-gray-900 text-xs">{selectedLeadDetails.qty || '-'}</p>
                </div>
              </div>

              <h4 className="text-[10px] font-bold text-gray-900 uppercase tracking-wider mb-2 pb-1.5 border-b border-gray-100">Stage Progress</h4>
              <div className="space-y-1.5">
                {STAGES_LIST.map((stageName, index) => {
                  const stageNum = index + 1;
                  const stg = selectedLeadDetails[`stage${stageNum}`];
                  
                  // Status Colors
                  let statusColor = "bg-gray-100 text-gray-500";
                  let statusText = "Pending";
                  
                  if (selectedLeadDetails.isHistory) {
                    statusColor = "bg-emerald-100 text-emerald-700";
                    statusText = "Completed";
                  } else if (stg) {
                    if (stg.status === 'Completed') {
                      statusColor = "bg-emerald-100 text-emerald-700";
                      statusText = "Completed";
                    } else if (stg.status === 'Delayed') {
                      statusColor = "bg-red-100 text-red-700";
                      statusText = "Delayed";
                    }
                  }

                  return (
                    <div key={index} className="flex items-center justify-between py-1.5 px-3 rounded-lg border border-gray-100 bg-gray-50/50">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-[11px] leading-tight">{stageNum}. {stageName}</p>
                        {stg?.remarks && (
                          <p className="text-[9px] text-gray-500 leading-tight mt-0.5">{stg.remarks}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-0.5 ml-3">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${statusColor}`}>
                          {statusText}
                        </span>
                        {stg?.actualDate && (
                          <span className="text-[9px] text-gray-400">{formatDate(stg.actualDate)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
