import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Trash2, Edit2, Plus, Search, ChevronLeft, ChevronRight, X, User as UserIcon } from 'lucide-react';
const DEFAULT_USERS = [
  { id: 'admin', name: 'Admin User', password: 'admin123', role: 'ADMIN', accessPages: ['/', '/sample-management', '/bulk-order', '/settings'] },
  { id: 'user', name: 'Employee 1', password: 'user123', role: 'USER', accessPages: ['/', '/sample-management', '/bulk-order'] }
];

const AVAILABLE_PAGES = [
  { path: '/', label: 'Dashboard' },
  { path: '/sample-management', label: 'Sample Management' },
  { path: '/bulk-order', label: 'Bulk Production Order' },
  { path: '/settings', label: 'Settings' }
];
const getUsers = () => {
  const users = JSON.parse(localStorage.getItem('pcb_users'));
  if (!users || !users.some(u => u.id === 'admin')) {
    localStorage.setItem('pcb_users', JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
  return users;
};
const saveUsers = (users) => localStorage.setItem('pcb_users', JSON.stringify(users));

export default function Settings() {
  const [users, setUsers] = useState(getUsers());
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [showFormModal, setShowFormModal] = useState(false);

  // Form State
  const [editingUserId, setEditingUserId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    id: '',
    password: '',
    role: 'USER',
    accessPages: ['/', '/sample-management', '/bulk-order']
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Filter users
  const filteredUsers = users.filter(u => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.id && u.id.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleOpenAddModal = () => {
    setEditingUserId(null);
    setFormData({ name: '', id: '', password: '', role: 'USER', accessPages: ['/', '/sample-management', '/bulk-order'] });
    setShowFormModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUserId(user.id);
    setFormData({ ...user, accessPages: user.accessPages || ['/', '/sample-management', '/bulk-order'] });
    setShowFormModal(true);
  };

  const handleSaveUser = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.password.trim() || !formData.id.trim()) {
      toast.error('Please fill all required fields');
      return;
    }

    let updatedUsers;
    if (editingUserId) {
      // Edit existing user
      updatedUsers = users.map(u => u.id === editingUserId ? formData : u);
      toast.success('User updated successfully!');
    } else {
      // Check if user ID already exists
      if (users.some(u => u.id === formData.id)) {
         toast.error('User ID already exists!');
         return;
      }
      // Add new user
      updatedUsers = [...users, formData];
      toast.success('User added successfully!');
    }
    
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    setShowFormModal(false);
  };

  const handleDeleteUser = (userId) => {
    if (confirm('Are you sure you want to delete this user?')) {
      const updatedUsers = users.filter(u => u.id !== userId);
      setUsers(updatedUsers);
      saveUsers(updatedUsers);
      toast.success('User deleted!');
    }
  };

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-2 md:space-y-6 flex flex-col h-full min-h-0">
      
      {/* Header Row: Filters + Add Button */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-3 w-full pb-2 border-b border-gray-100">
        
        {/* Search & Mobile Add */}
        <div className="flex items-center gap-2 w-full lg:w-auto flex-1">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-2.5 top-[9px] lg:top-[11px] text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg lg:rounded pl-8 pr-2 py-1.5 focus:outline-none focus:border-indigo-500 text-xs md:text-sm h-[32px] md:h-[38px]"
            />
          </div>
          
          <button
             onClick={handleOpenAddModal}
             className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center lg:hidden h-[32px] w-[32px] flex-shrink-0 shadow-sm transition"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Desktop Add Button */}
        <button
           onClick={handleOpenAddModal}
           className="hidden lg:flex bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 h-[38px] rounded-lg font-semibold items-center justify-center gap-2 transition shadow-sm w-full lg:w-auto flex-shrink-0 whitespace-nowrap"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Form Section Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[95vh] md:max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-2 md:p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50 flex-shrink-0">
              <h2 className="text-base md:text-lg font-bold text-gray-900">{editingUserId ? 'Edit User' : 'Add New User'}</h2>
              <button type="button" onClick={() => setShowFormModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={20} className="md:w-6 md:h-6" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <form onSubmit={handleSaveUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm appearance-none bg-white min-h-[30px] md:min-h-[38px]"
                      required
                    />
                  </div>
                  {/* ID */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">User ID *</label>
                    <input
                      type="text"
                      value={formData.id}
                      disabled={!!editingUserId}
                      onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                      className={`w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm appearance-none min-h-[30px] md:min-h-[38px] ${editingUserId ? 'bg-gray-100' : 'bg-white'}`}
                      required
                    />
                  </div>
                  {/* Password */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">Password *</label>
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm appearance-none bg-white min-h-[30px] md:min-h-[38px]"
                      required
                    />
                  </div>
                  {/* Role */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">Role *</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-[11px] md:text-sm appearance-none bg-white min-h-[30px] md:min-h-[38px]"
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  {/* Page Access */}
                  <div className="md:col-span-2">
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Page Access</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      {AVAILABLE_PAGES.map(page => (
                        <label key={page.path} className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={(formData.accessPages || []).includes(page.path)}
                            onChange={(e) => {
                              const newAccess = e.target.checked 
                                ? [...(formData.accessPages || []), page.path]
                                : (formData.accessPages || []).filter(p => p !== page.path);
                              setFormData({ ...formData, accessPages: newAccess });
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                          <span className="text-sm text-gray-800 font-medium">{page.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 md:gap-3 pt-2">
                  <button type="submit" className="flex-1 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold py-1.5 px-4 md:py-2 md:px-6 rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition text-[11px] md:text-base">
                    Save User
                  </button>
                  <button type="button" onClick={() => setShowFormModal(false)} className="px-4 py-1.5 md:px-6 md:py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium text-[11px] md:text-base">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Users List Container */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col pt-1 mt-2 flex-1 min-h-0">
        
        {/* Mobile View: Cards */}
        <div className="md:hidden flex flex-col gap-2 p-2 overflow-y-auto flex-1 bg-slate-50/50 pb-2">
          {paginatedUsers.map((user, idx) => (
            <div key={user.id} className="bg-white rounded-lg border border-indigo-50 shadow-[0_2px_10px_-4px_rgba(79,70,229,0.1)] p-2 relative flex flex-col gap-1.5 transition-all">
              <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-100 p-1.5 rounded-md">
                     <UserIcon size={14} className="text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-[13px] leading-none mb-1">
                      {user.name}
                    </h3>
                    <span className="text-[10px] text-gray-500 font-medium leading-none block">ID: {user.id}</span>
                  </div>
                </div>
                <div>
                   <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                     {user.role}
                   </span>
                </div>
              </div>
              <div className="px-1 py-1">
                <p className="text-[10px] text-gray-500 font-medium">Page Access: <span className="text-gray-800 font-bold">{(user.accessPages || []).length} pages</span></p>
              </div>
              <div className="flex gap-1.5 mt-1">
                <button
                  onClick={() => handleEditUser(user)}
                  className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-1.5 rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Edit2 size={12} /> Edit
                </button>
                <button
                  onClick={() => handleDeleteUser(user.id)}
                  className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 py-1.5 rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <div className="p-4 text-center text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm font-medium text-xs">
              No users found.
            </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto overflow-y-auto flex-1 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full min-w-[600px] relative">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">SN</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Page Access</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user, idx) => (
                <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-center text-sm text-gray-900 font-medium">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{user.name}</td>
                  <td className="px-4 py-3 text-left text-sm text-gray-500">{user.id}</td>
                  <td className="px-4 py-3 text-left text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-left text-[11px] text-gray-600 max-w-[200px] truncate" title={(user.accessPages || []).map(p => AVAILABLE_PAGES.find(ap => ap.path === p)?.label).filter(Boolean).join(', ')}>
                    {(user.accessPages || []).map(p => AVAILABLE_PAGES.find(ap => ap.path === p)?.label).filter(Boolean).join(', ') || 'None'}
                  </td>
                  <td className="px-4 py-3 flex gap-2 justify-center">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-sm font-medium bg-indigo-50 px-2 py-1 rounded"
                    >
                      <Edit2 size={16} /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-rose-600 hover:text-rose-800 flex items-center gap-1 text-sm font-medium bg-rose-50 px-2 py-1 rounded"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-gray-500 font-medium">
              No users found.
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
              {filteredUsers.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}-{Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length}
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
