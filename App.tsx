
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardCheck, 
  FileText, 
  BrainCircuit, 
  Plus, 
  Search,
  MapPin,
  Milk,
  IndianRupee,
  Bell,
  Calendar,
  Trash2,
  Settings as SettingsIcon,
  X,
  CheckCircle2,
  ChevronRight,
  UserPlus,
  History,
  TrendingUp,
  CreditCard,
  Wallet,
  Edit2,
  CalendarSearch,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  FileDown,
  ReceiptIndianRupee,
  Coins,
  ArrowUpRight,
  Scale,
  Save,
  Upload,
  RefreshCcw,
  AlertTriangle,
  Store,
  Smartphone,
  ShieldCheck
} from 'lucide-react';

import { Customer, DailyLog, Area, View, PaymentRecord } from './types';
import { AREAS as DEFAULT_AREAS, INITIAL_CUSTOMERS, INITIAL_LOGS } from './constants';
import { getDairyInsights } from './services/geminiService';

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Persistence Loading
  const [areas, setAreas] = useState<Area[]>(() => {
    const saved = localStorage.getItem('dairy_areas');
    return saved ? JSON.parse(saved) : DEFAULT_AREAS;
  });
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('dairy_customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });
  const [logs, setLogs] = useState<DailyLog[]>(() => {
    const saved = localStorage.getItem('dairy_logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>(() => {
    const saved = localStorage.getItem('dairy_payments');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Branding State
  const [storeName, setStoreName] = useState(() => localStorage.getItem('dairy_store_name') || 'DairyPro Manager');
  const [storeIcon, setStoreIcon] = useState(() => localStorage.getItem('dairy_store_icon') || '');

  const [view, setView] = useState<View>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [entrySearchTerm, setEntrySearchTerm] = useState('');
  const [paymentSearchTerm, setPaymentSearchTerm] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedArea, setSelectedArea] = useState<Area | 'All'>('All');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  
  // UI States for Modals
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomerHistory, setViewingCustomerHistory] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [historyTab, setHistoryTab] = useState<'deliveries' | 'payments'>('deliveries');
  const [customerForPayment, setCustomerForPayment] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({ pricePerLiter: 60, area: areas[0], status: 'active' });
  const [newAreaName, setNewAreaName] = useState('');

  // App Install Logic
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  // Persistence Sync
  useEffect(() => { localStorage.setItem('dairy_areas', JSON.stringify(areas)); }, [areas]);
  useEffect(() => { localStorage.setItem('dairy_customers', JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem('dairy_logs', JSON.stringify(logs)); }, [logs]);
  useEffect(() => { localStorage.setItem('dairy_payments', JSON.stringify(paymentRecords)); }, [paymentRecords]);
  useEffect(() => { localStorage.setItem('dairy_store_name', storeName); }, [storeName]);
  useEffect(() => { localStorage.setItem('dairy_store_icon', storeIcon); }, [storeIcon]);

  // Helper to get individual customer financials
  const getCustomerBalance = (customer: Customer) => {
    const totalBilled = logs
      .filter(l => l.customerId === customer.id)
      .reduce((sum, l) => sum + (l.liters * customer.pricePerLiter), 0);
    const totalPaid = paymentRecords
      .filter(r => r.customerId === customer.id)
      .reduce((sum, r) => sum + r.amount, 0);
    return {
      totalBilled,
      totalPaid,
      netBalance: totalBilled - totalPaid
    };
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
      const matchesArea = selectedArea === 'All' || c.area === selectedArea;
      return matchesSearch && matchesArea;
    });
  }, [customers, searchTerm, selectedArea]);

  const entryFilteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(entrySearchTerm.toLowerCase()) || 
      c.phone.includes(entrySearchTerm)
    );
  }, [customers, entrySearchTerm]);

  const filteredPaymentRecords = useMemo(() => {
    return paymentRecords.filter(record => {
      if (!paymentSearchTerm) return true;
      const customer = customers.find(c => c.id === record.customerId);
      return customer?.name.toLowerCase().includes(paymentSearchTerm.toLowerCase());
    });
  }, [paymentRecords, paymentSearchTerm, customers]);

  // Global Financial Summary
  const billingTotals = useMemo(() => {
    let totalBilled = 0;
    let totalCollected = 0;

    customers.forEach(customer => {
      const stats = getCustomerBalance(customer);
      totalBilled += stats.totalBilled;
      totalCollected += stats.totalPaid;
    });

    const totalPending = totalBilled - totalCollected;
    return { totalBilled, totalPending, totalCollected };
  }, [customers, logs, paymentRecords]);

  // Actions
  const handleSaveCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone || !newCustomer.area) return;
    
    if (editingCustomer) {
      setCustomers(prev => prev.map(c => 
        c.id === editingCustomer.id ? { ...c, ...newCustomer } as Customer : c
      ));
    } else {
      const customer: Customer = {
        id: Math.random().toString(36).substr(2, 9),
        name: newCustomer.name,
        phone: newCustomer.phone,
        area: newCustomer.area,
        pricePerLiter: newCustomer.pricePerLiter || 60,
        joinedDate: new Date().toISOString().split('T')[0],
        status: 'active'
      };
      setCustomers(prev => [...prev, customer]);
    }

    setShowAddCustomer(false);
    setEditingCustomer(null);
    setNewCustomer({ pricePerLiter: 60, area: areas[0], status: 'active' });
  };

  const handleDeleteCustomer = () => {
    if (!customerToDelete) return;
    setCustomers(prev => prev.filter(c => c.id !== customerToDelete.id));
    setCustomerToDelete(null);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setNewCustomer({
      name: customer.name,
      phone: customer.phone,
      area: customer.area,
      pricePerLiter: customer.pricePerLiter,
      status: customer.status
    });
    setShowAddCustomer(true);
  };

  const handleAddArea = () => {
    if (!newAreaName.trim() || areas.includes(newAreaName.trim())) return;
    setAreas(prev => [...prev, newAreaName.trim()]);
    setNewAreaName('');
  };

  const handleDeleteArea = (area: Area) => {
    if (customers.some(c => c.area === area)) {
      alert("Cannot delete area with assigned customers.");
      return;
    }
    setAreas(prev => prev.filter(a => a !== area));
  };

  const handleAddDailyLog = (customerId: string, liters: number) => {
    const existingLogIndex = logs.findIndex(l => l.customerId === customerId && l.date === entryDate);
    
    if (existingLogIndex >= 0) {
      const updatedLogs = [...logs];
      updatedLogs[existingLogIndex] = {
        ...updatedLogs[existingLogIndex],
        liters
      };
      setLogs(updatedLogs);
    } else {
      const newLog: DailyLog = {
        id: Math.random().toString(36).substr(2, 9),
        customerId,
        date: entryDate,
        liters,
        isPaid: false
      };
      setLogs(prev => [...prev, newLog]);
    }
  };

  const handleRecordPayment = () => {
    if (!customerForPayment || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    const customerId = customerForPayment.id;
    const unpaidLogs = logs
      .filter(l => l.customerId === customerId && !l.isPaid)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let remainingForLogMarking = amount;
    const logsToMarkPaid: string[] = [];

    unpaidLogs.forEach(log => {
      const logCost = log.liters * customerForPayment.pricePerLiter;
      if (remainingForLogMarking >= logCost) {
        logsToMarkPaid.push(log.id);
        remainingForLogMarking -= logCost;
      }
    });

    const newRecord: PaymentRecord = {
      id: Math.random().toString(36).substr(2, 9),
      customerId,
      amount: amount,
      date: new Date().toISOString(),
      method: paymentMethod,
      period: logsToMarkPaid.length > 0 ? `Paid for ${logsToMarkPaid.length} deliveries` : 'Partial Payment'
    };

    setPaymentRecords(prev => [newRecord, ...prev]);

    if (logsToMarkPaid.length > 0) {
      setLogs(prev => prev.map(log => 
        logsToMarkPaid.includes(log.id) ? { ...log, isPaid: true } : log
      ));
    }

    setCustomerForPayment(null);
    setPaymentAmount('');
    setPaymentMethod('Cash');
  };

  const handleExportCSV = () => {
    const headers = ["Customer Name", "Area", "Total Billed (₹)", "Total Paid (₹)", "Net Dues (₹)", "Status"];
    const rows = customers.map(customer => {
      const stats = getCustomerBalance(customer);
      return [
        `"${customer.name}"`,
        `"${customer.area}"`,
        stats.totalBilled.toFixed(2),
        stats.totalPaid.toFixed(2),
        stats.netBalance.toFixed(2),
        stats.netBalance <= 0 ? "Settled" : "Pending"
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    downloadFile(csvContent, `${storeName}_Accounts_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  };

  const handleExportDatabase = () => {
    const db = {
      areas,
      customers,
      logs,
      payments: paymentRecords,
      config: { storeName, storeIcon }
    };
    const jsonString = JSON.stringify(db, null, 2);
    downloadFile(jsonString, `${storeName}_Backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  };

  const handleImportDatabase = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const db = JSON.parse(e.target?.result as string);
        if (db.areas && db.customers && db.logs && db.payments) {
          if (confirm("Restore from file? This will replace all current app data.")) {
            setAreas(db.areas);
            setCustomers(db.customers);
            setLogs(db.logs);
            setPaymentRecords(db.payments);
            if(db.config) {
               setStoreName(db.config.storeName || 'DairyPro Manager');
               setStoreIcon(db.config.storeIcon || '');
            }
            alert("Database updated!");
          }
        }
      } catch (error) {
        alert("Corrupted backup file.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadFile = (content: string, fileName: string, type: string) => {
    const blob = new Blob([content], { type: `${type};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateAiInsights = async () => {
    setIsAiLoading(true);
    const insights = await getDairyInsights(customers, logs);
    setAiResponse(insights || "No insights available.");
    setIsAiLoading(false);
  };

  const NavItem = ({ id, icon: Icon, label }: { id: View, icon: any, label: string }) => (
    <button 
      onClick={() => setView(id)}
      className={`flex flex-col items-center justify-center space-y-1 w-full p-2 transition-all ${view === id ? 'text-blue-600' : 'text-gray-400 active:text-blue-400'}`}
    >
      <Icon size={24} strokeWidth={view === id ? 2.5 : 2} />
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-24 text-slate-900 select-none">
      <input type="file" ref={fileInputRef} onChange={handleImportDatabase} accept=".json" className="hidden" />

      {/* Header */}
      <header className="bg-white/95 backdrop-blur-xl border-b sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-sm safe-top">
        <div className="flex items-center space-x-4">
          <div className="relative">
            {storeIcon ? (
              <img src={storeIcon} alt="Icon" className="w-12 h-12 rounded-[1.25rem] object-cover shadow-lg border-2 border-blue-50" />
            ) : (
              <div className="bg-blue-600 text-white p-3 rounded-[1.25rem] shadow-xl">
                <Milk size={22} />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 tracking-tight line-clamp-1">{storeName}</h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">
              {view === 'dashboard' ? 'Daily Pulse' : view.replace('-', ' ')}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => setView('ai-insights')} className={`p-3 rounded-2xl transition-all ${view === 'ai-insights' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-white'}`}>
            <BrainCircuit size={20} />
          </button>
          <button onClick={() => setView('settings')} className={`p-3 rounded-2xl transition-all ${view === 'settings' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-white'}`}>
            <SettingsIcon size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-5 max-w-4xl mx-auto w-full">
        {view === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-blue-100 mb-2">Total Outstanding</h2>
                <div className="flex items-baseline space-x-2 mb-10">
                  <span className="text-5xl font-black">₹{billingTotals.totalPending.toLocaleString()}</span>
                </div>
                <div className="flex flex-wrap gap-4">
                  <button onClick={() => setView('daily-entry')} className="bg-white text-blue-700 px-8 py-4 rounded-3xl font-black text-xs shadow-2xl active:scale-95 transition-all flex items-center space-x-3">
                    <ClipboardCheck size={18} />
                    <span>LOG DELIVERY</span>
                  </button>
                  <button onClick={() => setView('reports')} className="bg-white/10 backdrop-blur-xl text-white border border-white/20 px-8 py-4 rounded-3xl font-black text-xs active:scale-95 transition-all flex items-center space-x-3">
                    <FileText size={18} />
                    <span>LEDGER</span>
                  </button>
                </div>
              </div>
              <Milk className="absolute -bottom-16 -right-16 w-64 h-64 text-white opacity-10 rotate-12" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shadow-inner"><History size={20} /></div>
                    <h3 className="font-black text-slate-800 text-sm">Recent Logs</h3>
                  </div>
                  <button onClick={() => setView('payments')} className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-full">History</button>
                </div>
                <div className="space-y-4">
                  {logs.slice(-5).reverse().map((log, i) => {
                    const customer = customers.find(c => c.id === log.customerId);
                    return (
                      <div key={i} className="flex items-center justify-between p-4 rounded-3xl bg-slate-50/50 border border-slate-100 transition-all active:bg-white">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[10px] font-black text-blue-600">{customer?.name.charAt(0)}</div>
                          <div>
                            <p className="text-sm font-black text-slate-800">{customer?.name}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{log.date}</p>
                          </div>
                        </div>
                        <span className="font-black text-blue-700 text-sm">{log.liters}L</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center space-x-4 mb-10">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-inner"><TrendingUp size={20} /></div>
                  <h3 className="font-black text-slate-800 text-sm">Recovery Score</h3>
                </div>
                <div className="space-y-8">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[11px] font-black text-slate-500 uppercase tracking-widest">
                      <span>Collection Progress</span>
                      <span className="text-emerald-600">{billingTotals.totalBilled > 0 ? ((billingTotals.totalCollected / billingTotals.totalBilled) * 100).toFixed(0) : 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                      <div className="bg-emerald-500 h-full transition-all duration-1000 shadow-lg" style={{ width: `${billingTotals.totalBilled > 0 ? (billingTotals.totalCollected / billingTotals.totalBilled) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                     <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Collected</p>
                        <p className="text-lg font-black text-emerald-600">₹{billingTotals.totalCollected.toLocaleString()}</p>
                     </div>
                     <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Total Billed</p>
                        <p className="text-lg font-black text-slate-800">₹{billingTotals.totalBilled.toLocaleString()}</p>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'reports' && (
          <div className="space-y-8 animate-in slide-in-from-right-10 duration-500 pb-12">
            <div className="bg-slate-950 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-10"><IndianRupee size={160} /></div>
              <div className="relative z-10 space-y-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Global Ledger</h2>
                  <button onClick={handleExportCSV} className="p-4 bg-white/5 rounded-3xl border border-white/5 active:scale-95 transition-all"><FileDown size={24} /></button>
                </div>
                <div className="grid grid-cols-2 gap-10 border-b border-white/5 pb-10">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Sales</p>
                    <p className="text-4xl font-black">₹{billingTotals.totalBilled.toLocaleString()}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-amber-500/80 uppercase tracking-widest">Dues</p>
                    <p className="text-4xl font-black text-amber-400">₹{billingTotals.totalPending.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-white/5 p-6 rounded-[2.5rem] border border-white/5">
                  <div className="flex items-center space-x-6">
                    <div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-3xl"><Coins size={24} /></div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cash In Hand</p>
                      <p className="text-xl font-black text-emerald-400">₹{billingTotals.totalCollected.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency</p>
                    <p className="text-xl font-black text-white">{billingTotals.totalBilled > 0 ? ((billingTotals.totalCollected / billingTotals.totalBilled) * 100).toFixed(1) : 0}%</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
              <div className="p-8 border-b border-slate-50 bg-slate-50/20">
                <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center uppercase tracking-widest"><Users size={20} className="mr-3 text-blue-600" />Customer Balances</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {customers.map(customer => {
                  const { totalBilled, totalPaid, netBalance } = getCustomerBalance(customer);
                  const isSettled = netBalance <= 0;
                  return (
                    <div key={customer.id} className="p-8 flex flex-col space-y-6 active:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-5">
                           <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-[1.25rem] flex items-center justify-center font-black">{customer.name.charAt(0)}</div>
                           <div>
                              <p className="font-black text-slate-900 text-base">{customer.name}</p>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{customer.area}</p>
                           </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xl font-black ${isSettled ? 'text-emerald-500' : 'text-amber-600'}`}>₹{netBalance.toLocaleString()}</p>
                          <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${isSettled ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-600'}`}>{isSettled ? 'CLEAR' : 'DUES'}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                         <div className="flex space-x-6">
                            <div><p className="text-[8px] font-black text-slate-400 uppercase">Sales</p><p className="text-xs font-black text-slate-700">₹{totalBilled.toLocaleString()}</p></div>
                            <div><p className="text-[8px] font-black text-slate-400 uppercase">Paid</p><p className="text-xs font-black text-emerald-600">₹{totalPaid.toLocaleString()}</p></div>
                         </div>
                         <div className="flex space-x-3">
                           <button onClick={() => setViewingCustomerHistory(customer)} className="p-3 rounded-2xl bg-white text-slate-500 shadow-sm"><Eye size={18} /></button>
                           {!isSettled && (
                             <button onClick={() => { setCustomerForPayment(customer); setPaymentAmount(netBalance.toString()); }} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] active:scale-95">Collect</button>
                           )}
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="max-w-md mx-auto space-y-8 animate-in fade-in duration-500 pb-16">
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100">
              <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center space-x-4">
                 <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><Store size={22} /></div>
                 <span>Identity</span>
              </h2>
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dairy Name</label>
                  <input type="text" placeholder="Dairy Business Name" className="w-full px-6 py-4 bg-slate-50 border-none rounded-3xl font-black text-sm focus:ring-4 focus:ring-indigo-100 transition-all" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Icon URL</label>
                  <input type="text" placeholder="https://..." className="w-full px-6 py-4 bg-slate-50 border-none rounded-3xl font-black text-sm focus:ring-4 focus:ring-indigo-100 transition-all" value={storeIcon} onChange={(e) => setStoreIcon(e.target.value)} />
                </div>
              </div>
            </div>

            {deferredPrompt && (
              <div className="bg-blue-600 p-8 rounded-[3rem] text-white shadow-2xl animate-bounce">
                <div className="flex items-center space-x-6">
                  <div className="p-4 bg-white/20 rounded-3xl"><Smartphone size={32} /></div>
                  <div className="flex-1">
                    <h3 className="font-black text-lg">Install APK</h3>
                    <p className="text-xs text-blue-100 font-bold">Use as a real Android app</p>
                  </div>
                  <button onClick={handleInstallClick} className="bg-white text-blue-700 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">INSTALL</button>
                </div>
              </div>
            )}

            <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100">
              <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center space-x-4">
                 <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg"><Save size={22} /></div>
                 <span>System & Security</span>
              </h2>
              <div className="space-y-4">
                <button onClick={handleExportDatabase} className="w-full bg-slate-50 text-slate-800 p-5 rounded-3xl font-black text-xs flex items-center justify-between border border-slate-100 active:bg-slate-100 transition-all">
                  <div className="flex items-center space-x-4">
                    <Save size={20} className="text-emerald-500" />
                    <span className="uppercase tracking-widest">Backup Database</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="w-full bg-slate-50 text-slate-800 p-5 rounded-3xl font-black text-xs flex items-center justify-between border border-slate-100 active:bg-slate-100 transition-all">
                  <div className="flex items-center space-x-4">
                    <Upload size={20} className="text-blue-500" />
                    <span className="uppercase tracking-widest">Restore Database</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
                <div className="pt-6 mt-6 border-t border-slate-50">
                  <div className="flex items-center space-x-3 mb-6 p-4 rounded-3xl bg-slate-50 border border-slate-100">
                    <ShieldCheck size={20} className="text-emerald-500" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Local Files Safe Storage Enabled</p>
                  </div>
                  <button onClick={() => { if(confirm("RESET: Erase all data?")) { localStorage.clear(); window.location.reload(); } }} className="w-full bg-red-50 text-red-600 p-5 rounded-3xl font-black text-xs flex items-center justify-center space-x-3 active:bg-red-100 transition-all">
                    <RefreshCcw size={18} />
                    <span className="uppercase tracking-widest">Factory Reset App</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'customers' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-16">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100">
               <div className="relative mb-6">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input type="text" placeholder="Find clients..." className="w-full pl-14 pr-6 py-5 bg-slate-50 border-none rounded-[1.75rem] focus:ring-4 focus:ring-blue-100 font-black text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                <button onClick={() => setSelectedArea('All')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedArea === 'All' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>All</button>
                {areas.map(area => (
                  <button key={area} onClick={() => setSelectedArea(area)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedArea === area ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>{area}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCustomers.map(customer => (
                <div key={customer.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col active:scale-95 transition-transform">
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-blue-600 text-white w-14 h-14 rounded-3xl flex items-center justify-center font-black text-xl shadow-lg">{customer.name.charAt(0)}</div>
                    <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">{customer.status}</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-1">{customer.name}</h3>
                  <p className="text-xs font-bold text-slate-400 mb-4">{customer.phone}</p>
                  <div className="p-2.5 bg-slate-50 rounded-2xl w-fit flex items-center space-x-3 mb-8">
                    <MapPin size={14} className="text-blue-600" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{customer.area}</span>
                  </div>
                  <div className="flex items-center justify-between pt-8 mt-auto border-t border-slate-50">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Rate</span>
                      <span className="text-lg font-black text-slate-900">₹{customer.pricePerLiter}</span>
                    </div>
                    <div className="flex space-x-3">
                      <button onClick={() => setViewingCustomerHistory(customer)} className="p-3.5 rounded-2xl bg-slate-50 text-slate-400 active:text-blue-600 shadow-sm"><Eye size={20} /></button>
                      <button onClick={() => openEditModal(customer)} className="p-3.5 rounded-2xl bg-slate-50 text-slate-400 active:text-slate-900 shadow-sm"><Edit2 size={20} /></button>
                      <button onClick={() => setCustomerToDelete(customer)} className="p-3.5 rounded-2xl bg-red-50 text-red-400 shadow-sm"><Trash2 size={20} /></button>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={() => { setEditingCustomer(null); setShowAddCustomer(true); }} className="flex flex-col items-center justify-center p-12 rounded-[3rem] border-4 border-dashed border-slate-100 text-slate-300 hover:border-blue-200 hover:text-blue-500 transition-all active:bg-blue-50 group min-h-[200px]">
                <div className="w-16 h-16 rounded-full border-4 border-slate-100 flex items-center justify-center mb-4 group-hover:border-blue-200"><Plus size={32} strokeWidth={3} /></div>
                <span className="font-black uppercase tracking-[0.2em] text-[11px]">Enroll Client</span>
              </button>
            </div>
          </div>
        )}

        {view === 'daily-entry' && (
          <div className="animate-in slide-in-from-bottom-10 duration-500 space-y-6">
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-slate-800 flex items-center space-x-3">
                  <div className="p-2 bg-blue-600 text-white rounded-xl"><ClipboardCheck size={20} /></div>
                  <span>Delivery Logs</span>
                </h2>
                <div className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                  <CalendarSearch size={16} className="text-slate-400" />
                  <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="bg-transparent border-none text-[10px] font-black text-blue-600 focus:ring-0 uppercase cursor-pointer" />
                </div>
              </div>
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Quick find client..." className="w-full pl-10 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={entrySearchTerm} onChange={(e) => setEntrySearchTerm(e.target.value)} />
              </div>
              <div className="space-y-4">
                {entryFilteredCustomers.map(customer => {
                  const dayLog = logs.find(l => l.customerId === customer.id && l.date === entryDate);
                  return (
                    <div key={customer.id} className="p-5 rounded-3xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-4 transition-all hover:bg-white hover:shadow-md">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center font-black text-blue-600 text-xs">{customer.name.charAt(0)}</div>
                        <div>
                          <p className="font-black text-slate-800 text-sm">{customer.name}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{customer.area}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex flex-col items-end">
                          <input 
                            key={`liters-${customer.id}-${entryDate}`}
                            type="number" 
                            step="0.5" 
                            placeholder="0.0" 
                            className="w-20 p-3 rounded-2xl border-none bg-white text-sm font-black text-blue-600 shadow-sm text-center focus:ring-2 focus:ring-blue-500" 
                            id={`liters-${customer.id}`} 
                            defaultValue={dayLog?.liters || ''} 
                          />
                        </div>
                        <button 
                          onClick={() => {
                            const l = parseFloat((document.getElementById(`liters-${customer.id}`) as HTMLInputElement).value || '0');
                            handleAddDailyLog(customer.id, l);
                            const btn = document.getElementById(`btn-${customer.id}`);
                            if (btn) {
                              btn.textContent = "✓";
                              btn.classList.replace('bg-blue-600', 'bg-emerald-500');
                              setTimeout(() => { if(btn) { btn.textContent = "Save"; btn.classList.replace('bg-emerald-500', 'bg-blue-600'); } }, 1500);
                            }
                          }} 
                          id={`btn-${customer.id}`} 
                          className="bg-blue-600 text-white px-5 rounded-2xl text-[10px] font-black uppercase shadow-lg h-[44px] transition-all"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {view === 'payments' && (
           <div className="space-y-6 animate-in slide-in-from-right-10 duration-500">
              <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                   <div>
                      <h2 className="text-xl font-black text-slate-800 tracking-tight">Payment Archive</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Transaction history records</p>
                   </div>
                   <div className="p-3 bg-emerald-50 text-emerald-600 rounded-[1.5rem] shadow-sm"><ReceiptIndianRupee size={24} /></div>
                </div>
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" placeholder="Search by name..." className="w-full pl-10 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={paymentSearchTerm} onChange={(e) => setPaymentSearchTerm(e.target.value)} />
                </div>
                <div className="space-y-4">
                  {filteredPaymentRecords.map(record => {
                    const customer = customers.find(c => c.id === record.customerId);
                    return (
                      <div key={record.id} className="p-5 rounded-3xl border border-slate-100 bg-slate-50 flex items-center justify-between hover:bg-white transition-all">
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(record.date).toLocaleDateString()}</p>
                          <p className="font-black text-slate-800 text-sm">{customer?.name || 'Unknown'}</p>
                          <div className="flex items-center space-x-2">
                             <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">{record.period}</span>
                             <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">{record.method}</span>
                          </div>
                        </div>
                        <div className="text-right"><span className="text-xl font-black text-emerald-600">₹{record.amount.toLocaleString()}</span></div>
                      </div>
                    );
                  })}
                  {filteredPaymentRecords.length === 0 && <div className="text-center py-20 text-slate-300 font-black text-xs uppercase tracking-widest">No matching records</div>}
                </div>
              </div>
           </div>
        )}
        
        {view === 'ai-insights' && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="bg-gradient-to-br from-indigo-700 to-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
              <BrainCircuit className="absolute top-0 right-0 w-48 h-48 text-white opacity-5 -mr-8 -mt-8" />
              <div className="relative z-10">
                <h2 className="text-3xl font-black mb-2 tracking-tight">AI Business Advisor</h2>
                <p className="text-indigo-100 text-xs mb-10 opacity-80 leading-relaxed max-w-xs">Intelligent analysis of your farm operations and billing patterns.</p>
                <button onClick={handleGenerateAiInsights} disabled={isAiLoading} className="bg-white text-indigo-700 px-10 py-4 rounded-2xl font-black text-sm shadow-2xl active:scale-95 transition-all disabled:opacity-50 flex items-center space-x-3">
                  {isAiLoading ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-700 border-t-transparent"></div><span>Analyzing Data...</span></>
                  ) : (
                    <><BrainCircuit size={18} /><span>Run Health Check</span></>
                  )}
                </button>
              </div>
            </div>
            {aiResponse && (
              <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-10 duration-700">
                <div className="flex items-center space-x-4 mb-8">
                   <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><TrendingUp size={24} /></div>
                   <h3 className="text-xl font-black text-slate-800">Business Insights</h3>
                </div>
                <div className="text-slate-600 font-medium leading-relaxed text-sm whitespace-pre-wrap selection:bg-indigo-100 prose prose-slate">
                  {aiResponse}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODALS */}
      {/* Delete Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 shadow-2xl animate-in zoom-in duration-300 text-center">
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner"><Trash2 size={48} /></div>
            <h2 className="text-2xl font-black text-slate-900 mb-4">Erase Client?</h2>
            <p className="text-slate-500 text-sm mb-12 font-medium leading-relaxed">Are you sure you want to delete <strong>{customerToDelete.name}</strong>? All their ledger and supply logs will be removed.</p>
            <div className="flex gap-4">
              <button onClick={() => setCustomerToDelete(null)} className="flex-1 py-5 rounded-3xl font-black text-xs uppercase tracking-widest text-slate-400 bg-slate-50 active:bg-slate-100 transition-all">Cancel</button>
              <button onClick={handleDeleteCustomer} className="flex-1 py-5 rounded-3xl font-black text-xs uppercase tracking-widest text-white bg-red-500 shadow-xl shadow-red-100 active:scale-95 transition-all">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
              <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest">{editingCustomer ? 'Update Client' : 'New Client'}</h2>
              <button onClick={() => { setShowAddCustomer(false); setEditingCustomer(null); }} className="p-3 text-slate-300 hover:text-slate-900 transition-colors"><X size={28} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Client Name</label>
                <input type="text" className="w-full px-6 py-5 bg-slate-50 border-none rounded-3xl font-black text-sm focus:ring-4 focus:ring-blue-100" placeholder="Rahul Kumar" value={newCustomer.name || ''} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact No.</label>
                <input type="tel" className="w-full px-6 py-5 bg-slate-50 border-none rounded-3xl font-black text-sm focus:ring-4 focus:ring-blue-100" placeholder="9876543210" value={newCustomer.phone || ''} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Area</label>
                  <select className="w-full px-6 py-5 bg-slate-50 border-none rounded-3xl font-black text-xs uppercase focus:ring-4 focus:ring-blue-100" value={newCustomer.area} onChange={e => setNewCustomer({...newCustomer, area: e.target.value})} >
                    {areas.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rate (₹/L)</label>
                  <input type="number" className="w-full px-6 py-5 bg-slate-50 border-none rounded-3xl font-black text-sm focus:ring-4 focus:ring-blue-100 text-center" value={newCustomer.pricePerLiter} onChange={e => setNewCustomer({...newCustomer, pricePerLiter: parseFloat(e.target.value)})} />
                </div>
              </div>
              <button onClick={handleSaveCustomer} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all mt-4">Commit Client</button>
            </div>
          </div>
        </div>
      )}

      {/* Collection Modal */}
      {customerForPayment && (
        <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-emerald-50/30">
              <div className="flex items-center space-x-3">
                <ReceiptIndianRupee size={24} className="text-emerald-600" />
                <h2 className="text-xl font-black text-slate-900 tracking-widest uppercase">Payment</h2>
              </div>
              <button onClick={() => setCustomerForPayment(null)} className="p-2 text-slate-300 hover:text-slate-900"><X size={28} /></button>
            </div>
            <div className="p-8 space-y-8">
              <div className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 text-center shadow-inner">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Customer</p>
                 <p className="font-black text-slate-900 text-2xl mb-6 tracking-tight">{customerForPayment.name}</p>
                 <div className="pt-6 border-t border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Payable</p>
                    <p className="text-4xl font-black text-emerald-600">₹{getCustomerBalance(customerForPayment).netBalance.toLocaleString()}</p>
                 </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Receive Amount (₹)</label>
                  <input type="number" className="w-full px-6 py-6 bg-slate-50 border-none rounded-[2rem] focus:ring-4 focus:ring-emerald-100 font-black text-4xl text-center shadow-inner" placeholder="0.00" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Method</label>
                  <select className="w-full px-6 py-5 bg-slate-50 border-none rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] focus:ring-4 focus:ring-emerald-100 appearance-none text-center" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} >
                    <option value="Cash">Cash Only</option>
                    <option value="UPI">UPI Digital</option>
                    <option value="Bank">Bank Deposit</option>
                  </select>
                </div>
              </div>

              <button onClick={handleRecordPayment} className="w-full bg-emerald-600 text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all">Submit Settlement</button>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {viewingCustomerHistory && (
        <div className="fixed inset-0 z-[110] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-20 duration-500">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/40">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{viewingCustomerHistory.name}</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">{viewingCustomerHistory.area}</p>
              </div>
              <button onClick={() => setViewingCustomerHistory(null)} className="p-3 text-slate-300 hover:text-slate-900"><X size={32} /></button>
            </div>
            
            <div className="flex bg-slate-100 p-2 mx-10 mt-8 rounded-[1.75rem]">
              <button onClick={() => setHistoryTab('deliveries')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl transition-all ${historyTab === 'deliveries' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-400'}`}>Supply</button>
              <button onClick={() => setHistoryTab('payments')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl transition-all ${historyTab === 'payments' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-400'}`}>Audit</button>
            </div>

            <div className="p-10 max-h-[40vh] overflow-y-auto no-scrollbar space-y-5">
                {historyTab === 'deliveries' ? (
                  logs.filter(l => l.customerId === viewingCustomerHistory.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                    <div key={log.id} className="flex items-center justify-between p-6 rounded-[2rem] bg-slate-50/50 border border-slate-100">
                      <div className="flex items-center space-x-5">
                        <div className="p-4 bg-white text-blue-600 rounded-[1.25rem] shadow-sm"><Calendar size={18} /></div>
                        <div>
                          <p className="font-black text-slate-900 text-sm">{new Date(log.date).toDateString()}</p>
                          <p className="font-bold text-slate-400 text-[10px] uppercase">Amount: {log.liters}L</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900 text-base">₹{(log.liters * viewingCustomerHistory.pricePerLiter).toFixed(0)}</p>
                        <p className={`text-[9px] font-black uppercase tracking-[0.1em] mt-1 ${log.isPaid ? 'text-emerald-500' : 'text-amber-500'}`}>{log.isPaid ? 'PAID' : 'PENDING'}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  paymentRecords.filter(r => r.customerId === viewingCustomerHistory.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(record => (
                    <div key={record.id} className="flex items-center justify-between p-6 rounded-[2rem] bg-slate-50/50 border border-slate-100">
                      <div className="flex items-center space-x-5">
                        <div className="p-4 bg-white text-emerald-600 rounded-[1.25rem] shadow-sm"><Coins size={18} /></div>
                        <div>
                          <p className="font-black text-slate-900 text-sm">{new Date(record.date).toLocaleDateString()}</p>
                          <p className="font-bold text-slate-400 text-[10px] uppercase tracking-tighter">{record.period}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-emerald-600">₹{record.amount.toLocaleString()}</p>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{record.method}</span>
                      </div>
                    </div>
                  ))
                )}
                {/* Empty State checks */}
                {((historyTab === 'deliveries' && logs.filter(l => l.customerId === viewingCustomerHistory.id).length === 0) ||
                  (historyTab === 'payments' && paymentRecords.filter(r => r.customerId === viewingCustomerHistory.id).length === 0)) && (
                  <div className="text-center py-20">
                     <p className="text-xs font-black text-slate-300 uppercase tracking-[0.3em]">No Archives Found</p>
                  </div>
                )}
            </div>
            
            <div className="p-10 bg-slate-950 text-white flex justify-between items-center">
                <div className="space-y-1">
                   <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Outstanding</p>
                   <p className="text-3xl font-black text-amber-400">₹{getCustomerBalance(viewingCustomerHistory).netBalance.toLocaleString()}</p>
                </div>
                <button onClick={() => { const b = getCustomerBalance(viewingCustomerHistory).netBalance; setCustomerForPayment(viewingCustomerHistory); setPaymentAmount(b.toString()); }} className="bg-blue-600 text-white px-10 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-900/50 active:scale-95 transition-all">Settle All</button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-3xl border-t flex items-center justify-around py-5 px-6 z-50 shadow-[0_-15px_60px_rgba(0,0,0,0.12)] rounded-t-[4rem] safe-bottom">
        <NavItem id="dashboard" icon={LayoutDashboard} label="Home" />
        <NavItem id="customers" icon={Users} label="Clients" />
        <div className="relative -mt-20">
          <button 
            onClick={() => { setEditingCustomer(null); setView('daily-entry'); }} 
            className={`p-7 rounded-[2.5rem] shadow-2xl border-[12px] border-[#F8FAFC] transition-all transform active:scale-90 active:rotate-45 ${view === 'daily-entry' ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white shadow-blue-200'}`}
          >
            <Plus size={34} strokeWidth={4} />
          </button>
        </div>
        <NavItem id="reports" icon={FileText} label="Bills" />
        <NavItem id="payments" icon={History} label="Audit" />
      </nav>
    </div>
  );
}
