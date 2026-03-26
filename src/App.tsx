import React, { useState, useEffect, useRef } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  Link, 
  useLocation,
  useNavigate
} from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Scan, 
  FileText, 
  Users, 
  LogOut, 
  Menu, 
  X, 
  Plus, 
  Trash2, 
  Eye,
  Download, 
  Upload,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Store,
  ShoppingCart,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Wallet,
  TrendingUp,
  Banknote
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
import { User, Order, ScanSession } from './types';

// --- API Service ---
const API_URL = ''; // Relative to same host

const api = {
  get: async (endpoint: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return res.json();
  },
  post: async (endpoint: string, data: any) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) {
      const errorMsg = json.error || json.message || 'Terjadi kesalahan pada server';
      return { error: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg) };
    }
    return json;
  },
  delete: async (endpoint: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  }
};

// --- Components ---

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmText = "Ya, Lanjutkan",
  cancelText = "Batal",
  type = "warning"
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: () => void, 
  title: string, 
  message: string,
  confirmText?: string,
  cancelText?: string,
  type?: "warning" | "danger" | "info"
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 text-center space-y-4">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mx-auto",
                type === "warning" ? "bg-yellow-100 text-yellow-600" : 
                type === "danger" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
              )}>
                {type === "warning" && <AlertCircle className="w-8 h-8" />}
                {type === "danger" && <Trash2 className="w-8 h-8" />}
                {type === "info" && <CheckCircle2 className="w-8 h-8" />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{title}</h3>
                <p className="text-slate-500 mt-2">{message}</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={onClose} 
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  {cancelText}
                </button>
                <button 
                  onClick={() => { onConfirm(); onClose(); }} 
                  className={cn(
                    "flex-1 py-3 text-white font-bold rounded-2xl transition-all shadow-lg",
                    type === "danger" ? "bg-red-600 hover:bg-red-700 shadow-red-200" : "bg-yellow-500 text-slate-900 hover:bg-yellow-400 shadow-yellow-200"
                  )}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className={cn(
        "fixed bottom-6 right-6 z-[200] px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-white font-bold",
        type === 'success' ? "bg-green-600 shadow-green-200" : "bg-red-600 shadow-red-200"
      )}
    >
      {type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      {message}
    </motion.div>
  );
};

const Sidebar = ({ user, isOpen, setIsOpen }: { user: User, isOpen: boolean, setIsOpen: (v: boolean) => void }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Pesanan', icon: Package, path: '/orders' },
    { name: 'Scan', icon: Scan, path: '/scan' },
    { name: 'Laporan', icon: FileText, path: '/reports' },
    { name: 'Laporan Penjualan', icon: Wallet, path: '/finance' },
    ...(user.role === 'admin' ? [{ name: 'User Management', icon: Users, path: '/users' }] : []),
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <>
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
              <Store className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-tight">ERFOLGS</h1>
              <p className="text-xs text-slate-500 font-medium tracking-wider uppercase">Online Store</p>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  location.pathname === item.path 
                    ? "bg-yellow-50 text-yellow-700 font-semibold shadow-sm" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-colors",
                  location.pathname === item.path ? "text-yellow-600" : "text-slate-400 group-hover:text-slate-600"
                )} />
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-sm">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user.role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

const Dashboard = () => {
  const [summary, setSummary] = useState<{ 
    total: number, 
    scanned: number, 
    totalPcs: number, 
    scannedPcs: number,
    storeSummary?: { [key: string]: { total: number, scanned: number, totalPcs: number, scannedPcs: number } }
  }>({ total: 0, scanned: 0, totalPcs: 0, scannedPcs: 0 });
  const [financeSummary, setFinanceSummary] = useState<any[]>([]);
  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ScanSession | null>(null);
  const [sessionDetails, setSessionDetails] = useState<Order[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);

  const fetchSummary = () => {
    api.get('/api/reports/summary').then(setSummary);
    api.get('/api/reports/sessions').then(setSessions);
    api.get('/api/reports/finance').then(setFinanceSummary);
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const totalHeld = financeSummary.reduce((acc, curr) => acc + curr.pending_amount, 0);
  const totalReleased = financeSummary.reduce((acc, curr) => acc + curr.released_amount, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  const viewSession = async (session: ScanSession) => {
    setSelectedSession(session);
    const details = await api.get(`/api/scan/session/${session.id}/details`);
    setSessionDetails(details);
    setShowDetailModal(true);
  };

  const handleDeleteClick = (id: number) => {
    setSessionToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAction = async () => {
    if (sessionToDelete) {
      await api.delete(`/api/scan/session/${sessionToDelete}`);
      setShowDeleteConfirm(false);
      setSessionToDelete(null);
      fetchSummary();
    }
  };

  const exportToExcel = (session: ScanSession, details: Order[]) => {
    const data = details.map(o => ({
      'ID Pesanan': o.order_id || '-',
      'No Resi': o.tracking_number || '-',
      'Toko': o.store_name || '-',
      'Marketplace': o.marketplace || '-',
      'Total Pcs': o.total_quantity || 0,
      'Waktu Scan': o.scanned_at ? format(new Date(o.scanned_at), 'HH:mm:ss') : '-'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Detail Scan");
    XLSX.writeFile(wb, `Scan_${session.session_name}_${format(new Date(session.created_at), 'yyyyMMdd')}.xlsx`);
  };

  const exportToPDF = (session: ScanSession, details: Order[]) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Laporan Sesi Scan: ${session.session_name}`, 14, 15);
    doc.setFontSize(11);
    doc.text(`Tanggal: ${format(new Date(session.created_at), 'dd MMM yyyy, HH:mm')}`, 14, 22);
    
    const tableData = details.map(o => [
      o.order_id || '-',
      o.tracking_number || '-',
      o.store_name || '-',
      o.marketplace || '-',
      o.total_quantity || 0,
      o.scanned_at ? format(new Date(o.scanned_at), 'HH:mm:ss') : '-'
    ]);

    autoTable(doc, {
      head: [['ID Pesanan', 'No Resi', 'Toko', 'Marketplace', 'Qty', 'Waktu']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85] },
      styles: { fontSize: 8 }
    });

    doc.save(`Scan_${session.session_name}_${format(new Date(session.created_at), 'yyyyMMdd')}.pdf`);
  };

  const data = [
    { name: 'Pending', value: summary.total - summary.scanned, color: '#94a3b8' },
    { name: 'Scanned', value: summary.scanned, color: '#facc15' },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-slate-500">Ringkasan operasional toko Anda hari ini.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Paket</p>
            <p className="text-2xl font-bold text-slate-900">{summary.total}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Pcs</p>
            <p className="text-2xl font-bold text-slate-900">{summary.totalPcs}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl">
            <Scan className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Sudah Scan</p>
            <p className="text-2xl font-bold text-slate-900">{summary.scanned}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Pcs Scan</p>
            <p className="text-2xl font-bold text-slate-900">{summary.scannedPcs}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card flex items-center gap-4 border-l-4 border-orange-500">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Uang Tertahan</p>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalHeld)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 border-l-4 border-emerald-500">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Uang Cair</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalReleased)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="font-bold text-slate-900 mb-6">Status Paket</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {data.map(item => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-slate-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold text-slate-900 mb-6">Summary Per Toko</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-4 font-semibold text-slate-600 text-xs uppercase">Nama Toko</th>
                    <th className="pb-4 font-semibold text-slate-600 text-xs uppercase text-center">Total Pkt</th>
                    <th className="pb-4 font-semibold text-slate-600 text-xs uppercase text-center">Scan Pkt</th>
                    <th className="pb-4 font-semibold text-slate-600 text-xs uppercase text-center">Total Pcs</th>
                    <th className="pb-4 font-semibold text-slate-600 text-xs uppercase text-center">Scan Pcs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {summary.storeSummary && Object.entries(summary.storeSummary).map(([store, stats]: [string, any]) => (
                    <tr key={store}>
                      <td className="py-3 text-sm font-medium text-slate-900">{store}</td>
                      <td className="py-3 text-sm text-center text-slate-600">{stats.total}</td>
                      <td className="py-3 text-sm text-center font-bold text-yellow-600">{stats.scanned}</td>
                      <td className="py-3 text-sm text-center text-slate-600">{stats.totalPcs}</td>
                      <td className="py-3 text-sm text-center font-bold text-green-600">{stats.scannedPcs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="card h-full">
            <h3 className="font-bold text-slate-900 mb-6">Sesi Scan Terakhir</h3>
            <div className="space-y-4">
              {sessions.slice(0, 10).map(session => (
                <div key={session.id} className="group flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-yellow-200 transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{session.session_name}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-medium">{format(new Date(session.created_at), 'dd MMM, HH:mm')}</p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-1.5 rounded">{session.total_packages} PKT</span>
                      <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 rounded">{session.total_pcs} PCS</span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => viewSession(session)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(session.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Session Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedSession && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedSession.session_name}</h3>
                  <p className="text-xs text-slate-500">{format(new Date(selectedSession.created_at), 'dd MMMM yyyy, HH:mm')}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => exportToExcel(selectedSession, sessionDetails)}
                    className="btn-primary py-2 px-4 bg-green-600 hover:bg-green-700 text-xs flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Excel
                  </button>
                  <button 
                    onClick={() => exportToPDF(selectedSession, sessionDetails)}
                    className="btn-primary py-2 px-4 bg-red-600 hover:bg-red-700 text-xs flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" /> PDF
                  </button>
                  <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-3 text-xs font-bold text-slate-400 uppercase">ID Pesanan</th>
                      <th className="pb-3 text-xs font-bold text-slate-400 uppercase">No Resi</th>
                      <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Toko</th>
                      <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Marketplace</th>
                      <th className="pb-3 text-xs font-bold text-slate-400 uppercase text-center">Qty</th>
                      <th className="pb-3 text-xs font-bold text-slate-400 uppercase text-right">Waktu Scan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sessionDetails.map((order, idx) => (
                      <tr key={idx}>
                        <td className="py-3 text-sm font-medium text-slate-900">{order.order_id}</td>
                        <td className="py-3 text-sm font-mono text-slate-600">{order.tracking_number}</td>
                        <td className="py-3 text-sm text-slate-600">{order.store_name}</td>
                        <td className="py-3 text-sm text-slate-600">{order.marketplace}</td>
                        <td className="py-3 text-sm text-center font-bold text-slate-900">{order.total_quantity}</td>
                        <td className="py-3 text-sm text-right text-slate-400">
                          {order.scanned_at ? format(new Date(order.scanned_at), 'HH:mm:ss') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteAction}
        title="Hapus Sesi"
        message="Apakah Anda yakin ingin menghapus sesi scan ini? Data detail scan pada sesi ini akan ikut terhapus."
        confirmText="Ya, Hapus"
      />
    </div>
  );
};

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStore, setFilterStore] = useState('');
  const [filterMarketplace, setFilterMarketplace] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newOrder, setNewOrder] = useState<Partial<Order>>({});
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Import states
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number, failed: number, skipped: number, errors: string[] } | null>(null);
  
  // Confirm states
  const [confirmDelete, setConfirmDelete] = useState<{ id: number } | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const data = await api.get('/api/orders');
    setOrders(data);
  };

  const resetFilters = () => {
    setSearch('');
    setFilterDate('');
    setFilterStore('');
    setFilterMarketplace('');
    setFilterStatus('');
    setCurrentPage(1);
  };

  const togglePaymentStatus = async (order: Order) => {
    const newStatus = order.payment_status === 'released' ? 'pending' : 'released';
    const res = await fetch(`/api/orders/${order.id}/payment`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      fetchOrders();
      setToast({ message: `Status pembayaran diperbarui ke ${newStatus === 'released' ? 'Cair' : 'Tertahan'}`, type: 'success' });
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        // Map data to our schema and group by order_id
        const orderMap = new Map<string, any>();
        
        data.forEach((row: any) => {
          // Normalize keys to handle variations in column names
          const getVal = (keys: string[]) => {
            for (const key of keys) {
              const foundKey = Object.keys(row).find(k => k.toLowerCase().trim() === key.toLowerCase());
              if (foundKey) return row[foundKey];
            }
            return '';
          };

          const orderId = String(getVal(['ID Pesanan', 'id pesanan', 'Order ID', 'No Pesanan']));
          if (!orderId || orderId === 'undefined') return;

          const sku = String(getVal(['SKU', 'sku produk', 'SKU Produk', 'Product SKU']));
          const trackingNumber = String(getVal(['No Resi', 'no resi', 'Tracking Number', 'Resi', 'Nomor Resi']));
          const quantity = parseInt(getVal(['Jumlah', 'quantity', 'Qty', 'Jumlah Pesanan']) || 1);
          const price = parseFloat(getVal(['Harga', 'harga', 'Price', 'Harga Satuan', 'Harga Produk']) || 0);
          const costPrice = parseFloat(getVal(['HPP', 'hpp', 'Modal', 'Harga Modal', 'Cost Price']) || 0);

          if (!orderMap.has(orderId)) {
            orderMap.set(orderId, {
              order_id: orderId,
              order_date: getVal(['Tanggal Pesanan', 'tanggal pesanan', 'Order Date', 'Tanggal']) || format(new Date(), 'yyyy-MM-dd'),
              tracking_number: trackingNumber,
              expedition: getVal(['Ekspedisi', 'ekspedisi', 'Expedition', 'Kurir']) || '',
              store_name: getVal(['Nama Toko', 'nama toko', 'Store Name', 'Toko']) || '',
              marketplace: getVal(['Marketplace', 'marketplace', 'Platform']) || '',
              items: [],
              total_quantity: 0,
              total_amount: 0,
              total_cost: 0,
              payment_status: 'pending'
            });
          }

          const order = orderMap.get(orderId);
          order.items.push({
            sku: sku || '-',
            product_name: getVal(['Nama Produk', 'nama produk', 'Product Name', 'Nama Barang']) || '',
            size: String(getVal(['Ukuran', 'ukuran', 'Size', 'Varian']) || '-'),
            quantity: quantity,
            price: price,
            cost_price: costPrice
          });
          order.total_quantity += quantity;
          order.total_amount += (quantity * price);
          order.total_cost += (quantity * costPrice);
        });

        const mapped = Array.from(orderMap.values()).filter(o => o.order_id && o.tracking_number && o.items.length > 0);

        if (mapped.length === 0) {
          setIsImporting(false);
          setImportResult({ 
            success: 0, 
            failed: 0, 
            errors: ['Tidak ada data valid untuk diimport. Pastikan kolom ID Pesanan, SKU, dan No Resi terisi dengan benar sesuai template.'] 
          });
          return;
        }

        // To provide success/fail count, we'll try to import in small batches or handle it on server
        // For simplicity and better UX, let's try the whole batch first
        const res = await api.post('/api/orders/import', mapped);
        
        if (res.error) {
          setImportResult({ success: 0, failed: mapped.length, skipped: 0, errors: [String(res.error)] });
        } else {
          setImportResult({ 
            success: res.success ?? mapped.length, 
            failed: res.failed ?? 0, 
            skipped: res.skipped ?? 0,
            errors: [] 
          });
          fetchOrders();
        }
      } catch (err: any) {
        setImportResult({ success: 0, failed: 0, skipped: 0, errors: [err.message || 'Terjadi kesalahan saat membaca file'] });
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsBinaryString(file);
    // Reset input
    e.target.value = '';
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'ID Pesanan': 'ORD-001',
        'Tanggal Pesanan': format(new Date(), 'yyyy-MM-dd'),
        'SKU': 'SKU-001',
        'Nama Produk': 'Contoh Produk A',
        'Ukuran': 'L',
        'Jumlah': 1,
        'Harga Satuan': 150000,
        'HPP': 100000,
        'No Resi': 'JX123456789',
        'Ekspedisi': 'J&T',
        'Nama Toko': 'Toko Sukses',
        'Marketplace': 'Shopee'
      },
      {
        'ID Pesanan': 'ORD-001',
        'Tanggal Pesanan': format(new Date(), 'yyyy-MM-dd'),
        'SKU': 'SKU-002',
        'Nama Produk': 'Contoh Produk B',
        'Ukuran': 'M',
        'Jumlah': 2,
        'Harga Satuan': 75000,
        'HPP': 50000,
        'No Resi': 'JX123456789',
        'Ekspedisi': 'J&T',
        'Nama Toko': 'Toko Sukses',
        'Marketplace': 'Shopee'
      },
      {
        'ID Pesanan': 'ORD-002',
        'Tanggal Pesanan': format(new Date(), 'yyyy-MM-dd'),
        'SKU': 'SKU-003',
        'Nama Produk': 'Contoh Produk C',
        'Ukuran': 'XL',
        'Jumlah': 1,
        'Harga Satuan': 200000,
        'HPP': 140000,
        'No Resi': 'JX987654321',
        'Ekspedisi': 'JNE',
        'Nama Toko': 'Toko Sukses',
        'Marketplace': 'Tokopedia'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Import");
    
    // Add instructions for dropdowns in a separate sheet
    const infoData = [
      { 'KATEGORI': 'EKSPEDISI', 'PILIHAN': 'J&T' },
      { 'KATEGORI': 'EKSPEDISI', 'PILIHAN': 'JNE' },
      { 'KATEGORI': 'EKSPEDISI', 'PILIHAN': 'Sicepat' },
      { 'KATEGORI': 'EKSPEDISI', 'PILIHAN': 'Shopee Express' },
      { 'KATEGORI': 'EKSPEDISI', 'PILIHAN': 'Ninja' },
      { 'KATEGORI': 'EKSPEDISI', 'PILIHAN': 'ID Express' },
      { 'KATEGORI': '', 'PILIHAN': '' },
      { 'KATEGORI': 'MARKETPLACE', 'PILIHAN': 'Shopee' },
      { 'KATEGORI': 'MARKETPLACE', 'PILIHAN': 'Tokopedia' },
      { 'KATEGORI': 'MARKETPLACE', 'PILIHAN': 'Lazada' },
      { 'KATEGORI': 'MARKETPLACE', 'PILIHAN': 'TikTok Shop' },
      { 'KATEGORI': 'MARKETPLACE', 'PILIHAN': 'Blibli' },
      { 'KATEGORI': '', 'PILIHAN': '' },
      { 'KATEGORI': 'CATATAN', 'PILIHAN': '1. ID Pesanan yang sama akan dianggap satu paket' },
      { 'KATEGORI': 'CATATAN', 'PILIHAN': '2. Satu ID Pesanan bisa berisi banyak SKU (Multi-produk)' },
      { 'KATEGORI': 'CATATAN', 'PILIHAN': '3. No Resi harus unik untuk setiap paket' },
      { 'KATEGORI': 'CATATAN', 'PILIHAN': '4. Gunakan nama Ekspedisi & Marketplace sesuai pilihan di atas' }
    ];
    const wsInfo = XLSX.utils.json_to_sheet(infoData);
    XLSX.utils.book_append_sheet(wb, wsInfo, "Panduan & Pilihan");

    XLSX.writeFile(wb, "Template_Import_Pesanan_Erfolgs.xlsx");
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = newOrder.quantity || 1;
    const price = newOrder.price || 0;
    const costPrice = newOrder.cost_price || 0;
    const orderToSave = {
      order_id: newOrder.order_id,
      order_date: newOrder.order_date || format(new Date(), 'yyyy-MM-dd'),
      tracking_number: newOrder.tracking_number,
      expedition: newOrder.expedition,
      store_name: newOrder.store_name,
      marketplace: newOrder.marketplace,
      status: 'pending',
      total_quantity: qty,
      total_amount: qty * price,
      total_cost: qty * costPrice,
      payment_status: 'pending',
      items: [{
        sku: newOrder.sku || '',
        product_name: newOrder.product_name || '',
        size: newOrder.size || '-',
        quantity: qty,
        price: price,
        cost_price: costPrice
      }]
    };
    const res = await api.post('/api/orders', orderToSave);
    if (res.error) {
      const detail = res.hint ? `\nHint: ${res.hint}` : '';
      setToast({ message: 'Gagal simpan: ' + res.error + detail, type: 'error' });
    } else {
      setShowModal(false);
      setNewOrder({});
      fetchOrders();
      setToast({ message: 'Pesanan berhasil ditambahkan', type: 'success' });
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmDelete({ id });
  };

  const confirmDeleteAction = async () => {
    if (confirmDelete) {
      await api.delete(`/api/orders/${confirmDelete.id}`);
      fetchOrders();
      setConfirmDelete(null);
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.order_id?.toLowerCase().includes(search.toLowerCase()) ||
      o.tracking_number?.toLowerCase().includes(search.toLowerCase()) ||
      o.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      (o.items && o.items.some(item => 
        item.product_name?.toLowerCase().includes(search.toLowerCase()) ||
        item.sku?.toLowerCase().includes(search.toLowerCase())
      ));
    
    const matchesDate = !filterDate || o.order_date === filterDate;
    const matchesStore = !filterStore || o.store_name === filterStore;
    const matchesMarketplace = !filterMarketplace || o.marketplace === filterMarketplace;
    const matchesStatus = !filterStatus || o.status === filterStatus;

    return matchesSearch && matchesDate && matchesStore && matchesMarketplace && matchesStatus;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const uniqueStores = Array.from(new Set(orders.map(o => o.store_name).filter(Boolean)));
  const uniqueMarketplaces = Array.from(new Set(orders.map(o => o.marketplace).filter(Boolean)));

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Manajemen Pesanan</h2>
          <p className="text-slate-500">Kelola semua pesanan dari berbagai marketplace.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadTemplate} className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4" />
            Template
          </button>
          <label className={cn(
            "btn-primary flex items-center gap-2 cursor-pointer transition-all",
            isImporting && "opacity-50 cursor-not-allowed"
          )}>
            {isImporting ? (
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Clock className="w-4 h-4" />
              </motion.div>
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {isImporting ? 'Mengimport...' : 'Import Excel'}
            {!isImporting && <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleImport} />}
          </label>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4" />
            Tambah Manual
          </button>
        </div>
      </header>

      {/* Import Result Notification */}
      <AnimatePresence>
        {importResult && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={cn(
              "p-4 rounded-2xl flex items-start gap-4 shadow-sm border",
              importResult.failed === 0 ? "bg-green-50 border-green-100 text-green-800" : "bg-red-50 border-red-100 text-red-800"
            )}
          >
            {importResult.failed === 0 ? (
              <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
            )}
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <p className="font-bold">Hasil Import Pesanan</p>
                <button onClick={() => setImportResult(null)} className="p-1 hover:bg-black/5 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-1 text-sm space-y-1">
                <p>✅ Berhasil: <span className="font-bold">{importResult.success}</span></p>
                {importResult.skipped > 0 && <p>⏭️ Lewati (Sudah Ada): <span className="font-bold">{importResult.skipped}</span></p>}
                {importResult.failed > 0 && <p>❌ Gagal: <span className="font-bold">{importResult.failed}</span></p>}
                {importResult.errors.length > 0 && (
                  <div className="mt-2 p-2 bg-white/50 rounded-lg text-xs font-mono">
                    {importResult.errors.map((err, i) => <p key={i}>{err}</p>)}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">Tambah Pesanan Manual</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleSaveManual} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">ID Pesanan</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      required
                      value={newOrder.order_id || ''}
                      onChange={e => setNewOrder({...newOrder, order_id: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Tanggal</label>
                    <input 
                      type="date" 
                      className="input-field" 
                      required
                      value={newOrder.order_date || format(new Date(), 'yyyy-MM-dd')}
                      onChange={e => setNewOrder({...newOrder, order_date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nama Produk</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    required
                    value={newOrder.product_name || ''}
                    onChange={e => setNewOrder({...newOrder, product_name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">SKU</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      required
                      value={newOrder.sku || ''}
                      onChange={e => setNewOrder({...newOrder, sku: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Ukuran</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={newOrder.size || ''}
                      onChange={e => setNewOrder({...newOrder, size: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Jumlah</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      required
                      min="1"
                      value={newOrder.quantity || 1}
                      onChange={e => setNewOrder({...newOrder, quantity: parseInt(e.target.value) || 1})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Harga Satuan</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      required
                      min="0"
                      value={newOrder.price || 0}
                      onChange={e => setNewOrder({...newOrder, price: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">HPP (Modal)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      required
                      min="0"
                      value={newOrder.cost_price || 0}
                      onChange={e => setNewOrder({...newOrder, cost_price: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">No Resi</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      required
                      value={newOrder.tracking_number || ''}
                      onChange={e => setNewOrder({...newOrder, tracking_number: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Ekspedisi</label>
                    <select 
                      className="input-field"
                      required
                      value={newOrder.expedition || ''}
                      onChange={e => setNewOrder({...newOrder, expedition: e.target.value})}
                    >
                      <option value="">Pilih Ekspedisi</option>
                      <option value="J&T">J&T</option>
                      <option value="JNE">JNE</option>
                      <option value="Sicepat">Sicepat</option>
                      <option value="Shopee Express">Shopee Express</option>
                      <option value="Ninja">Ninja</option>
                      <option value="ID Express">ID Express</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Marketplace</label>
                    <select 
                      className="input-field"
                      required
                      value={newOrder.marketplace || ''}
                      onChange={e => setNewOrder({...newOrder, marketplace: e.target.value})}
                    >
                      <option value="">Pilih Marketplace</option>
                      <option value="Shopee">Shopee</option>
                      <option value="Tokopedia">Tokopedia</option>
                      <option value="Lazada">Lazada</option>
                      <option value="TikTok Shop">TikTok Shop</option>
                      <option value="Blibli">Blibli</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Nama Toko</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      required
                      value={newOrder.store_name || ''}
                      onChange={e => setNewOrder({...newOrder, store_name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors">
                    Batal
                  </button>
                  <button type="submit" className="flex-1 py-3 bg-yellow-500 text-slate-900 font-bold rounded-2xl hover:bg-yellow-400 shadow-lg shadow-yellow-200 transition-all">
                    Simpan Pesanan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal 
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteAction}
        title="Hapus Pesanan"
        message="Apakah Anda yakin ingin menghapus pesanan ini? Data yang dihapus tidak dapat dikembalikan."
        type="danger"
        confirmText="Hapus Sekarang"
      />

      <div className="card overflow-hidden">
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Cari ID, Resi, Produk..." 
              className="input-field pl-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <input 
            type="date" 
            className="input-field text-sm w-full md:w-auto"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
          <select 
            className="input-field text-sm w-full md:w-auto"
            value={filterStore}
            onChange={(e) => setFilterStore(e.target.value)}
          >
            <option value="">Semua Toko</option>
            {uniqueStores.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select 
            className="input-field text-sm w-full md:w-auto"
            value={filterMarketplace}
            onChange={(e) => setFilterMarketplace(e.target.value)}
          >
            <option value="">Semua Marketplace</option>
            {uniqueMarketplaces.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select 
            className="input-field text-sm w-full md:w-auto"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="scanned">Sudah Scan</option>
          </select>
          <button 
            onClick={resetFilters}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all flex items-center justify-center"
            title="Reset Filter"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-left min-w-[1100px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-4 pb-4 font-semibold text-slate-600 text-sm w-32">Tanggal</th>
                <th className="px-4 pb-4 font-semibold text-slate-600 text-sm w-36">ID Pesanan</th>
                <th className="px-4 pb-4 font-semibold text-slate-600 text-sm">Produk</th>
                <th className="px-4 pb-4 font-semibold text-slate-600 text-sm w-44">No Resi</th>
                <th className="px-4 pb-4 font-semibold text-slate-600 text-sm text-right w-56">Total Harga</th>
                <th className="px-4 pb-4 font-semibold text-slate-600 text-sm w-36">Toko</th>
                <th className="px-4 pb-4 font-semibold text-slate-600 text-sm w-32">Status</th>
                <th className="px-4 pb-4 font-semibold text-slate-600 text-sm w-32">Pembayaran</th>
                <th className="px-4 pb-4 font-semibold text-slate-600 text-sm w-20 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedOrders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 align-top">
                    <p className="text-sm font-medium text-slate-900">{order.order_date}</p>
                  </td>
                  <td className="p-4 align-top">
                    <p className="font-medium text-slate-900 text-sm">{order.order_id}</p>
                  </td>
                  <td className="p-4 align-top min-w-[300px]">
                    {order.items && order.items.length > 0 ? (
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="border-b border-slate-50 last:border-0 pb-2 last:pb-0 pt-1 first:pt-0">
                            <p className="text-xs font-bold text-slate-800 leading-tight mb-1 truncate max-w-[350px]" title={item.product_name}>
                              {item.product_name}
                            </p>
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">{item.sku}</span>
                              <span className="text-slate-300">|</span>
                              <span className="text-slate-500">{item.size}</span>
                              <span className="ml-auto font-bold text-slate-400">{item.quantity} Pcs</span>
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Total Barang</p>
                          <p className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">{order.total_quantity} Pcs</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-900 truncate max-w-[350px]">{order.product_name}</p>
                        <p className="text-[10px] text-slate-500">{order.sku} | {order.size} | {order.quantity} Pcs</p>
                      </div>
                    )}
                  </td>
                  <td className="p-4 align-top">
                    <p className="text-sm font-mono text-slate-700 font-bold">{order.tracking_number}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">{order.expedition}</p>
                  </td>
                  <td className="p-4 text-right align-top whitespace-nowrap">
                    <div className="flex flex-col items-end space-y-2">
                      <p className="text-sm font-black text-slate-900">{formatCurrency(order.total_amount || 0)}</p>
                      
                      {order.items && order.items.length > 0 && (
                        <div className="flex flex-col items-end gap-1">
                          {order.items.map((item, idx) => (
                            <p key={idx} className="text-[10px] text-slate-500 font-medium">
                              {item.quantity} x {formatCurrency(item.price || 0)}
                            </p>
                          ))}
                        </div>
                      )}

                      <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100">
                        <span className="opacity-50">Fee:</span>
                        <span>{formatCurrency(order.admin_fee || 0)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 align-top">
                    <p className="text-sm font-medium text-slate-900">{order.store_name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{order.marketplace}</p>
                  </td>
                  <td className="p-4 align-top">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block",
                      order.status === 'scanned' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                    )}>
                      {order.status === 'scanned' ? 'Sudah Scan' : 'Pending'}
                    </span>
                  </td>
                  <td className="p-4 align-top">
                    <button 
                      onClick={() => togglePaymentStatus(order)}
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all inline-block",
                        order.payment_status === 'released' 
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" 
                          : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                      )}
                    >
                      {order.payment_status === 'released' ? 'Cair' : 'Tertahan'}
                    </button>
                  </td>
                  <td className="p-4 align-top text-center">
                    <button onClick={() => handleDelete(order.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">Tampilkan</span>
            <select 
              className="input-field py-1 px-2 text-sm w-20"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
            <span className="text-sm text-slate-500">
              Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredOrders.length)} dari {filteredOrders.length} pesanan
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum = currentPage;
                if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;

                if (pageNum <= 0 || pageNum > totalPages) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-sm font-bold transition-all",
                      currentPage === pageNum 
                        ? "bg-yellow-500 text-slate-900 shadow-md shadow-yellow-100" 
                        : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteAction}
        title="Hapus Pesanan"
        message="Apakah Anda yakin ingin menghapus pesanan ini? Data yang dihapus tidak dapat dikembalikan."
        type="danger"
        confirmText="Hapus Sekarang"
      />

      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const ScanPage = () => {
  const [session, setSession] = useState<number | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [scannedItems, setScannedItems] = useState<Order[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const successAudio = useRef<HTMLAudioElement>(null);
  const errorAudio = useRef<HTMLAudioElement>(null);

  const startSession = async () => {
    if (!sessionName) return setToast({ message: 'Nama sesi harus diisi', type: 'error' });
    const res = await api.post('/api/scan/session/start', { session_name: sessionName });
    setSession(res.id);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input) return;
    setError(null);
    setSuccess(null);

    // Check if already in current list
    if (scannedItems.find(i => i.tracking_number === input)) {
      setError(`Resi ${input} sudah ada di daftar sesi ini.`);
      errorAudio.current?.play();
      setInput('');
      return;
    }

    const res = await api.post('/api/scan/check', { tracking_number: input });
    
    if (res.error) {
      setError(`Resi ${input}: ${res.error}`);
      errorAudio.current?.play();
    } else {
      setScannedItems([res, ...scannedItems]);
      setSuccess(`Berhasil scan: ${res.order_id}`);
      successAudio.current?.play();
    }
    setInput('');
  };

  const removeItem = (tracking_number: string) => {
    setScannedItems(scannedItems.filter(i => i.tracking_number !== tracking_number));
  };

  const finishSession = async () => {
    if (scannedItems.length === 0) return setToast({ message: 'Belum ada data yang discan', type: 'error' });
    setShowFinishConfirm(true);
  };

  const cancelSession = async () => {
    if (session) {
      await api.delete(`/api/scan/session/${session}`);
    }
    setSession(null);
    setSessionName('');
    setScannedItems([]);
    setToast({ message: 'Sesi dibatalkan', type: 'error' });
  };

  const confirmFinishAction = async () => {
    await api.post('/api/scan/confirm', {
      session_id: session,
      tracking_numbers: scannedItems.map(i => i.tracking_number)
    });
    setSession(null);
    setSessionName('');
    setScannedItems([]);
    setToast({ message: 'Sesi berhasil disimpan', type: 'success' });
    setShowFinishConfirm(false);
  };

  if (!session) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="card text-center space-y-6">
          <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto">
            <Scan className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Mulai Sesi Scan</h2>
            <p className="text-slate-500">Buat sesi baru untuk mulai memproses paket.</p>
          </div>
          <input 
            type="text" 
            placeholder="Contoh: Sesi Pagi J&T" 
            className="input-field text-center"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
          />
          <button onClick={startSession} className="btn-primary w-full py-3">
            Mulai Sesi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <audio 
        ref={successAudio} 
        src="https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3" 
        onError={(e) => console.warn('Success audio failed to load:', e)}
        preload="auto"
      />
      <audio 
        ref={errorAudio} 
        src="https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3" 
        onError={(e) => console.warn('Error audio failed to load:', e)}
        preload="auto"
      />
      <div className="lg:col-span-1 space-y-6">
        <div className="card bg-slate-900 text-white border-none">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-400 text-xs uppercase font-bold tracking-widest">Sesi Aktif</p>
              <h3 className="text-xl font-bold">{sessionName}</h3>
            </div>
            <div className="flex gap-2">
              <button onClick={cancelSession} className="px-3 py-1 bg-slate-700 text-white rounded-lg text-xs font-bold hover:bg-slate-600 transition-colors">
                BATAL
              </button>
              <button onClick={finishSession} className="px-3 py-1 bg-yellow-500 text-slate-900 rounded-lg text-xs font-bold hover:bg-yellow-400 transition-colors">
                SIMPAN
              </button>
            </div>
          </div>
          <div className="flex gap-4 mt-6">
            <div className="flex-1">
              <p className="text-2xl font-bold">{scannedItems.length}</p>
              <p className="text-xs text-slate-400">Paket</p>
            </div>
            <div className="flex-1">
              <p className="text-2xl font-bold">{scannedItems.reduce((acc, i) => acc + (i.total_quantity || i.quantity || 0), 0)}</p>
              <p className="text-xs text-slate-400">Pcs</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold text-slate-900 mb-4">Input Scan</h3>
          <form onSubmit={handleScan} className="space-y-4">
            <input 
              ref={inputRef}
              type="text" 
              placeholder="Scan No Resi di sini..." 
              className="input-field text-lg font-mono"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
            />
            <p className="text-[10px] text-slate-400 text-center uppercase font-medium">Tekan Enter untuk memproses</p>
          </form>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex gap-3 text-red-700 text-sm"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}
            {success && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 p-4 bg-green-50 border border-green-100 rounded-xl flex gap-3 text-green-700 text-sm"
              >
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <p>{success}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="card h-[calc(100vh-200px)] flex flex-col">
          <h3 className="font-bold text-slate-900 mb-4">Daftar Scan Sesi Ini</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {scannedItems.map((item, idx) => (
              <div key={item.tracking_number} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-slate-400 text-sm border border-slate-200">
                    {scannedItems.length - idx}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{item.tracking_number}</p>
                    <p className="text-xs text-slate-500">
                      {item.order_id} • {item.store_name} ({item.marketplace})
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {item.items && item.items.length > 0 
                        ? `${item.items.length} Produk (${item.total_quantity} pcs)` 
                        : `${item.product_name} (${item.quantity} pcs)`}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => removeItem(item.tracking_number)}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {scannedItems.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                <ShoppingCart className="w-12 h-12 opacity-20" />
                <p className="font-medium">Belum ada paket yang discan</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={showFinishConfirm}
        onClose={() => setShowFinishConfirm(false)}
        onConfirm={confirmFinishAction}
        title="Selesaikan Sesi"
        message={`Apakah Anda yakin ingin mengakhiri sesi ini dengan ${scannedItems.length} paket?`}
        confirmText="Ya, Selesaikan"
      />

      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const FinanceReports = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const res = await api.get('/api/reports/finance');
    setData(res);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  const totalHeld = data.reduce((acc, curr) => acc + curr.pending_amount, 0);
  const totalReleased = data.reduce((acc, curr) => acc + curr.released_amount, 0);
  const totalRevenue = data.reduce((acc, curr) => acc + curr.total_revenue, 0);
  const totalCost = data.reduce((acc, curr) => acc + curr.total_cost, 0);
  const totalAdminFee = data.reduce((acc, curr) => acc + curr.total_admin_fee, 0);
  const totalNetProfit = data.reduce((acc, curr) => acc + curr.net_profit, 0);

  return (
    <div className="space-y-6 pb-12">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Laporan Penjualan</h2>
        <p className="text-slate-500">Kelola dan pantau arus kas per marketplace (Hanya pesanan selesai).</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-white border-slate-200"
        >
          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Pendapatan Kotor</p>
          <h3 className="text-xl font-bold text-slate-900">{formatCurrency(totalRevenue)}</h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card bg-white border-slate-200"
        >
          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Potongan Biaya</p>
          <h3 className="text-xl font-bold text-red-600">-{formatCurrency(totalAdminFee)}</h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card bg-white border-slate-200"
        >
          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Total HPP</p>
          <h3 className="text-xl font-bold text-slate-700">-{formatCurrency(totalCost)}</h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card bg-emerald-50 border-emerald-100"
        >
          <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Laba Bersih</p>
          <h3 className="text-xl font-bold text-emerald-700">{formatCurrency(totalNetProfit)}</h3>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none shadow-xl shadow-orange-100"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">Uang Tertahan</span>
          </div>
          <h3 className="text-2xl font-bold mb-1">{formatCurrency(totalHeld)}</h3>
          <p className="text-sm opacity-80">Dana belum cair dari marketplace</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card bg-gradient-to-br from-green-600 to-green-700 text-white border-none shadow-xl shadow-green-100"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">Total Cair</span>
          </div>
          <h3 className="text-2xl font-bold mb-1">{formatCurrency(totalReleased)}</h3>
          <p className="text-sm opacity-80">Dana sudah masuk ke rekening</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-yellow-600" />
            Performa Marketplace
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="marketplace" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(v) => `Rp ${v/1000}k`} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Bar dataKey="total_revenue" fill="#eab308" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold text-slate-900 mb-6">Rincian Laba/Rugi per Marketplace</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-4 font-semibold text-slate-600 text-sm">Marketplace</th>
                  <th className="pb-4 font-semibold text-slate-600 text-sm">Omzet</th>
                  <th className="pb-4 font-semibold text-slate-600 text-sm">HPP</th>
                  <th className="pb-4 font-semibold text-slate-600 text-sm">Biaya</th>
                  <th className="pb-4 font-semibold text-slate-600 text-sm">Laba</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.map((item) => (
                  <tr key={item.marketplace}>
                    <td className="py-4 font-medium text-slate-900">{item.marketplace}</td>
                    <td className="py-4 text-sm text-slate-600">{formatCurrency(item.total_revenue)}</td>
                    <td className="py-4 text-sm text-slate-600">{formatCurrency(item.total_cost)}</td>
                    <td className="py-4 text-sm text-red-500">-{formatCurrency(item.total_admin_fee)}</td>
                    <td className="py-4 text-sm font-bold text-emerald-600">{formatCurrency(item.net_profit)}</td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">Belum ada data keuangan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const Reports = () => {
  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [summary, setSummary] = useState<{ 
    total: number, 
    scanned: number, 
    totalPcs: number, 
    scannedPcs: number,
    storeSummary?: { [key: string]: { total: number, scanned: number, totalPcs: number, scannedPcs: number } }
  }>({ total: 0, scanned: 0, totalPcs: 0, scannedPcs: 0 });
  const [selectedSession, setSelectedSession] = useState<ScanSession | null>(null);
  const [sessionDetails, setSessionDetails] = useState<Order[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);

  const fetchData = () => {
    api.get('/api/reports/sessions').then(setSessions);
    api.get('/api/reports/summary').then(setSummary);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const viewSession = async (session: ScanSession) => {
    setSelectedSession(session);
    const details = await api.get(`/api/scan/session/${session.id}/details`);
    setSessionDetails(details);
    setShowDetailModal(true);
  };

  const handleDeleteClick = (id: number) => {
    setSessionToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAction = async () => {
    if (sessionToDelete) {
      await api.delete(`/api/scan/session/${sessionToDelete}`);
      setShowDeleteConfirm(false);
      setSessionToDelete(null);
      fetchData();
    }
  };

  const exportSessionExcel = (session: ScanSession, details: Order[]) => {
    const data = details.map(o => ({
      'ID Pesanan': o.order_id,
      'No Resi': o.tracking_number,
      'Toko': o.store_name,
      'Marketplace': o.marketplace,
      'Total Pcs': o.total_quantity,
      'Waktu Scan': o.scanned_at ? format(new Date(o.scanned_at), 'HH:mm:ss') : '-'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Detail Scan");
    XLSX.writeFile(wb, `Scan_${session.session_name}_${format(new Date(session.created_at), 'yyyyMMdd')}.xlsx`);
  };

  const exportSessionPDF = (session: ScanSession, details: Order[]) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Laporan Sesi Scan: ${session.session_name}`, 14, 15);
    doc.setFontSize(11);
    doc.text(`Tanggal: ${format(new Date(session.created_at), 'dd MMM yyyy, HH:mm')}`, 14, 22);
    
    const tableData = details.map(o => [
      o.order_id || '-',
      o.tracking_number || '-',
      o.store_name || '-',
      o.marketplace || '-',
      o.total_quantity || 0,
      o.scanned_at ? format(new Date(o.scanned_at), 'HH:mm:ss') : '-'
    ]);

    autoTable(doc, {
      head: [['ID Pesanan', 'No Resi', 'Toko', 'Marketplace', 'Qty', 'Waktu']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85] },
      styles: { fontSize: 8 }
    });

    doc.save(`Scan_${session.session_name}_${format(new Date(session.created_at), 'yyyyMMdd')}.pdf`);
  };

  const exportAllExcel = () => {
    const ws = XLSX.utils.json_to_sheet(sessions);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Sesi");
    XLSX.writeFile(wb, `Laporan_Sesi_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const exportAllPDF = () => {
    const doc = new jsPDF();
    doc.text("Laporan Sesi Scan ERFOLGS", 14, 15);
    autoTable(doc, {
      head: [['Sesi', 'Tanggal', 'Total Paket', 'Total Pcs', 'User']],
      body: sessions.map(s => [
        s.session_name,
        format(new Date(s.created_at), 'dd/MM/yyyy'),
        s.total_packages,
        s.total_pcs,
        (s as any).user_name
      ]),
      startY: 20
    });
    doc.save(`Laporan_Sesi_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Laporan & Statistik</h2>
          <p className="text-slate-500">Analisis data pesanan dan performa packing.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportAllExcel} className="btn-primary bg-green-600 from-green-500 to-green-700 flex items-center gap-2">
            <Download className="w-4 h-4" /> Excel
          </button>
          <button onClick={exportAllPDF} className="btn-primary bg-red-600 from-red-500 to-red-700 flex items-center gap-2">
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold text-slate-900 mb-4">Akumulasi Harian</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
              <span className="text-slate-600 font-medium">Total Paket Terproses</span>
              <span className="text-xl font-bold text-slate-900">{summary.scanned}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
              <span className="text-slate-600 font-medium">Total Pcs Terkirim</span>
              <span className="text-xl font-bold text-slate-900">
                {summary.scannedPcs}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold text-slate-900 mb-4">Summary Per Toko</h3>
          <div className="overflow-x-auto max-h-48 overflow-y-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-2 font-semibold text-slate-600 text-xs uppercase">Toko</th>
                  <th className="pb-2 font-semibold text-slate-600 text-xs uppercase text-center">Pkt</th>
                  <th className="pb-2 font-semibold text-slate-600 text-xs uppercase text-center">Pcs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {summary.storeSummary && Object.entries(summary.storeSummary).map(([store, stats]: [string, any]) => (
                  <tr key={store}>
                    <td className="py-2 text-sm font-medium text-slate-900">{store}</td>
                    <td className="py-2 text-sm text-center font-bold text-yellow-600">{stats.scanned}</td>
                    <td className="py-2 text-sm text-center font-bold text-green-600">{stats.scannedPcs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <h3 className="font-bold text-slate-900 mb-6">Riwayat Sesi Scan</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-4 font-semibold text-slate-600 text-sm">Nama Sesi</th>
                <th className="pb-4 font-semibold text-slate-600 text-sm">Waktu Mulai</th>
                <th className="pb-4 font-semibold text-slate-600 text-sm">Total Paket</th>
                <th className="pb-4 font-semibold text-slate-600 text-sm">Total Pcs</th>
                <th className="pb-4 font-semibold text-slate-600 text-sm">Operator</th>
                <th className="pb-4 font-semibold text-slate-600 text-sm text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sessions.map(session => (
                <tr key={session.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 font-medium text-slate-900">{session.session_name}</td>
                  <td className="py-4 text-sm text-slate-500">{format(new Date(session.created_at), 'dd MMM, HH:mm')}</td>
                  <td className="py-4 font-bold text-slate-900">{session.total_packages}</td>
                  <td className="py-4 font-bold text-slate-900">{session.total_pcs}</td>
                  <td className="py-4 text-sm text-slate-600">{(session as any).user_name}</td>
                  <td className="py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => viewSession(session)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(session.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Session Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedSession && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedSession.session_name}</h3>
                  <p className="text-xs text-slate-500">{format(new Date(selectedSession.created_at), 'dd MMMM yyyy, HH:mm')}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => exportSessionExcel(selectedSession, sessionDetails)}
                    className="btn-primary py-2 px-4 bg-green-600 hover:bg-green-700 text-xs flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Excel
                  </button>
                  <button 
                    onClick={() => exportSessionPDF(selectedSession, sessionDetails)}
                    className="btn-primary py-2 px-4 bg-red-600 hover:bg-red-700 text-xs flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" /> PDF
                  </button>
                  <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-3 text-xs font-bold text-slate-400 uppercase">ID Pesanan</th>
                      <th className="pb-3 text-xs font-bold text-slate-400 uppercase">No Resi</th>
                      <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Toko</th>
                      <th className="pb-3 text-xs font-bold text-slate-400 uppercase">Marketplace</th>
                      <th className="pb-3 text-xs font-bold text-slate-400 uppercase text-center">Qty</th>
                      <th className="pb-3 text-xs font-bold text-slate-400 uppercase text-right">Waktu Scan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sessionDetails.map((order, idx) => (
                      <tr key={idx}>
                        <td className="py-3 text-sm font-medium text-slate-900">{order.order_id}</td>
                        <td className="py-3 text-sm font-mono text-slate-600">{order.tracking_number}</td>
                        <td className="py-3 text-sm text-slate-600">{order.store_name}</td>
                        <td className="py-3 text-sm text-slate-600">{order.marketplace}</td>
                        <td className="py-3 text-sm text-center font-bold text-slate-900">{order.total_quantity}</td>
                        <td className="py-3 text-sm text-right text-slate-400">
                          {order.scanned_at ? format(new Date(order.scanned_at), 'HH:mm:ss') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteAction}
        title="Hapus Sesi"
        message="Apakah Anda yakin ingin menghapus sesi scan ini? Data detail scan pada sesi ini akan ikut terhapus."
        confirmText="Ya, Hapus"
      />
    </div>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user', name: '' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const data = await api.get('/api/users');
    setUsers(data);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/api/users', newUser);
    setShowModal(false);
    setNewUser({ username: '', password: '', role: 'user', name: '' });
    fetchUsers();
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Manajemen User</h2>
          <p className="text-slate-500">Kelola hak akses dan operator sistem.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Tambah User
        </button>
      </header>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-4 font-semibold text-slate-600 text-sm">Nama Lengkap</th>
                <th className="pb-4 font-semibold text-slate-600 text-sm">Username</th>
                <th className="pb-4 font-semibold text-slate-600 text-sm">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="py-4 font-medium text-slate-900">{u.name}</td>
                  <td className="py-4 text-slate-600">{u.username}</td>
                  <td className="py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      u.role === 'admin' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {u.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Tambah User Baru</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nama Lengkap</label>
                <input 
                  type="text" 
                  className="input-field" 
                  required
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Username</label>
                <input 
                  type="text" 
                  className="input-field" 
                  required
                  value={newUser.username}
                  onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Password</label>
                <input 
                  type="password" 
                  className="input-field" 
                  required
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Role</label>
                <select 
                  className="input-field"
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" className="btn-primary w-full py-3 mt-4">
                Simpan User
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
    } else {
      setError(data.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 flex items-center justify-center p-4">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 md:p-12"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-3xl flex items-center justify-center shadow-xl mx-auto mb-6 transform -rotate-6">
            <Store className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">ERFOLGS</h1>
          <p className="text-slate-500 font-medium uppercase tracking-widest text-sm">Online Store Management</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100 flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Username</label>
            <input 
              type="text" 
              className="input-field bg-slate-50 border-none h-14" 
              placeholder="Masukkan username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
            <input 
              type="password" 
              className="input-field bg-slate-50 border-none h-14" 
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full h-14 text-lg shadow-yellow-200 shadow-lg mt-4">
            Masuk Sekarang
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button 
            onClick={async () => {
              const res = await fetch('/api/setup');
              const data = await res.json();
              setToast({ message: data.message || data.error, type: res.ok ? 'success' : 'error' });
            }}
            className="text-xs text-slate-400 hover:text-yellow-600 font-bold uppercase tracking-widest transition-colors"
          >
            Setup Admin User (First Time Only)
          </button>
        </div>
        
        <p className="text-center mt-10 text-slate-400 text-xs font-medium">
          &copy; 2026 ERFOLGS ONLINE STORE. All rights reserved.
        </p>
      </motion.div>

      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar user={user} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-500 lg:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-4 ml-auto">
            <div className="hidden md:block text-right">
              <p className="text-sm font-bold text-slate-900">{user.name}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{user.role}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 text-yellow-700 rounded-xl flex items-center justify-center font-bold">
              {user.name?.charAt(0)}
            </div>
          </div>
        </header>

        <main className="p-6 flex-1">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path="/scan" element={<ProtectedRoute><ScanPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/finance" element={<ProtectedRoute><FinanceReports /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}
