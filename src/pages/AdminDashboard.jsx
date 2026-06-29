import React, { useState, useMemo } from 'react';
import { TrendingUp, FileText, CheckCircle, Clock, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

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

  const leads = JSON.parse(localStorage.getItem('pcb_leads')) || [];



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
  const pendingDispatch = filteredLeads.filter(l => !l.isDispatched).length;
  const dispatchedLeads = filteredLeads.filter(l => l.isDispatched).length;
  
  const todayDate = getTodayDate();
  const leadsToday = filteredLeads.filter(l => l.receiptDate === todayDate).length;

  // Paginated Leads
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(start, start + itemsPerPage);
  }, [filteredLeads, currentPage, itemsPerPage]);

  const handleDownloadCSV = () => {
    const headers = ['SN', 'Receipt Date', 'Buyer Coder', 'Qty', 'Type', 'ETD', 'Status', 'Remarks'];
    const rows = filteredLeads.map(l => [
      l.sn,
      formatDate(l.receiptDate),
      l.buyerCoder || '',
      l.qty || '',
      l.type || '',
      l.etd || '',
      l.isDispatched ? 'Dispatched' : 'Pending',
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
    const typeData = {};
    filteredLeads.forEach(l => {
      const type = l.type || 'Unknown';
      if (!typeData[type]) {
        typeData[type] = 0;
      }
      typeData[type] += 1;
    });
    return typeData;
  }, [filteredLeads]);

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-2 md:space-y-6 flex flex-col h-full md:h-auto overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* Header with Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 lg:gap-4 w-full pb-2 border-b border-gray-100">
        <div className="flex flex-col lg:flex-row w-full gap-2 items-center">
          
          {/* Search + Export Row (Mobile grouping) */}
          <div className="flex items-center gap-2 w-full lg:w-auto lg:flex-[1.5]">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-2.5 top-[9px] lg:top-[11px] text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search leads..."
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
               placeholder="Buyer Coder..."
               className="w-full bg-white border border-gray-300 rounded-lg lg:rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] md:text-sm h-[32px] md:h-[38px]"
             />
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
              <p className="text-gray-600 text-sm font-medium">Total Leads</p>
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
              <p className="text-gray-600 text-sm font-medium">Leads Added Today</p>
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
              <p className="text-gray-600 text-sm font-medium">Pending Dispatch</p>
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
              <p className="text-gray-600 text-sm font-medium">Dispatched Leads</p>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Leads by Type</h3>
          <div className="space-y-3">
            {Object.entries(leadsByType).length > 0 ? (
              Object.entries(leadsByType).map(([type, count]) => {
                const maxCount = Math.max(...Object.values(leadsByType));
                const percentage = (count / maxCount) * 100;
                return (
                  <div key={type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{type}</span>
                      <span className="text-gray-900 font-semibold">{count} Leads</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2.5 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-center py-4">No lead data available</p>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-gray-700">Total System Leads</span>
              <span className="font-bold text-indigo-600">{totalLeads}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-gray-700">Awaiting Dispatch</span>
              <span className="font-bold text-orange-600">{pendingDispatch}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-gray-700">Successfully Dispatched</span>
              <span className="font-bold text-emerald-600">{dispatchedLeads}</span>
            </div>
            <div className="flex justify-between items-center pt-3">
              <span className="text-gray-700">New Leads Today</span>
              <span className="font-bold text-blue-600">{leadsToday}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col mt-4">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900">Recent Leads Report</h3>
          <span className="text-sm text-gray-500 font-medium whitespace-nowrap">
            Showing {paginatedLeads.length} of {filteredLeads.length}
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[450px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-left border-collapse relative min-w-max">
            <thead className="bg-gray-50 text-gray-700 text-[11px] font-bold uppercase tracking-wider border-b border-gray-200 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3">SN</th>
                <th className="px-4 py-3">Receipt Date</th>
                <th className="px-4 py-3">Buyer Coder</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedLeads.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-bold text-indigo-600">{l.sn}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatDate(l.receiptDate)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{l.buyerCoder}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-sky-700 text-center bg-sky-50">{l.qty}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{l.type}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      l.isDispatched ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {l.isDispatched ? 'Dispatched' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col gap-2 p-2 bg-slate-50/50 pb-2">
          {paginatedLeads.map((l) => (
            <div key={l.id} className="bg-white rounded-lg border border-indigo-50 shadow-[0_2px_10px_-4px_rgba(79,70,229,0.1)] p-3 relative flex flex-col gap-2 transition-all">
              <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block leading-none mb-1">{l.sn}</span>
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">
                    {l.buyerCoder}
                  </h3>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
                  l.isDispatched ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {l.isDispatched ? 'Dispatched' : 'Pending'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                   <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Type</span>
                   <span className="font-medium text-gray-800">{l.type}</span>
                </div>
                <div>
                   <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Receipt Date</span>
                   <span className="font-medium text-gray-800">{formatDate(l.receiptDate)}</span>
                </div>
                <div>
                   <span className="text-gray-500 block text-[10px] uppercase tracking-wide">Qty</span>
                   <span className="font-medium text-gray-800">{l.qty}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredLeads.length === 0 && (
          <div className="p-12 text-center text-gray-500 italic font-medium">
            No leads found matching your criteria.
          </div>
        )}

        {/* Pagination Controls */}
        <div className="p-2 md:p-3 border-t border-gray-100 bg-gray-50 flex flex-col items-center justify-between gap-2 lg:flex-row rounded-b-lg pb-2 md:pb-3">
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
      </div>
    </div>
  );
}
