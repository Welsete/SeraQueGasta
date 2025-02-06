import React, { useState, useEffect } from 'react';
import { Moon, Sun, PlusCircle, Download, BarChart3, Filter, LogIn, LogOut, Trash2, Pencil, X, Check } from 'lucide-react';
import { Transaction, Period, MonthYear } from './types';
import { supabase } from './lib/supabase';

function App() {
  const [darkMode, setDarkMode] = useState(() => 
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('all');
  const [showChart, setShowChart] = useState(false);
  const [selectedMonthYear, setSelectedMonthYear] = useState<MonthYear>(() => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchTransactions();
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchTransactions();
      } else {
        setTransactions([]);
      }
    });
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      setTransactions(data || []);
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password
        });
        if (error) throw error;
        alert('Verifique seu email para confirmar o cadastro!');
      }
    } catch (error) {
      console.error('Erro de autenticação:', error);
      alert(error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleEdit = async (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setDescription(transaction.description);
    setCategory(transaction.category);
    setAmount(Math.abs(transaction.amount).toString());
    setType(transaction.type);
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setDescription('');
    setCategory('');
    setAmount('');
    setType('expense');
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || !description || !category) return;

    const finalAmount = type === 'expense' ? -parsedAmount : parsedAmount;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({
          description: description.trim(),
          amount: finalAmount,
          category: category.trim(),
          type
        })
        .eq('id', editingTransaction.id)
        .select()
        .single();

      if (error) throw error;

      setTransactions(prev => prev.map(t => 
        t.id === editingTransaction.id ? { ...t, ...data } : t
      ));
      handleCancelEdit();
    } catch (error) {
      console.error('Erro ao atualizar transação:', error);
      alert('Erro ao atualizar transação. Tente novamente.');
    }
  };

  const handleDelete = async (transactionId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (error) throw error;

      setTransactions(prev => prev.filter(t => t.id !== transactionId));
    } catch (error) {
      console.error('Erro ao excluir transação:', error);
      alert('Erro ao excluir transação. Tente novamente.');
    }
  };

  const balance = transactions.reduce((acc, curr) => acc + curr.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingTransaction) {
      await handleSaveEdit();
      return;
    }
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || !description || !category) return;

    const finalAmount = type === 'expense' ? -parsedAmount : parsedAmount;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          description: description.trim(),
          amount: finalAmount,
          category: category.trim(),
          type,
          date: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      setTransactions(prev => [data, ...prev]);
      setDescription('');
      setCategory('');
      setAmount('');
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      alert('Erro ao salvar transação. Tente novamente.');
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const today = new Date();
    const txDate = new Date(transaction.date);
    
    switch (selectedPeriod) {
      case 'day':
        return txDate.toDateString() === today.toDateString();
      case 'week':
        const weekAgo = new Date(today.setDate(today.getDate() - 7));
        return txDate >= weekAgo;
      case 'month':
        return txDate.getMonth() === today.getMonth() && 
               txDate.getFullYear() === today.getFullYear();
      case 'year':
        return txDate.getFullYear() === today.getFullYear();
      case 'specific':
        return txDate.getMonth() === selectedMonthYear.month && 
               txDate.getFullYear() === selectedMonthYear.year;
      default:
        return true;
    }
  });

  const exportToCSV = () => {
    const headers = ['Data,Descrição,Categoria,Valor,Tipo'];
    const csvContent = transactions.map(tx => 
      `${new Date(tx.date).toLocaleDateString('pt-BR')},${tx.description},${tx.category},${tx.amount},${tx.type === 'income' ? 'Receita' : 'Despesa'}`
    );
    
    const blob = new Blob([headers.concat(csvContent).join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transacoes.csv';
    a.click();
  };

  const transactionsByMonth = filteredTransactions.reduce((groups, transaction) => {
    const date = new Date(transaction.date);
    const monthYear = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    
    if (!groups[monthYear]) {
      groups[monthYear] = {
        transactions: [],
        totalIncome: 0,
        totalExpenses: 0
      };
    }
    
    groups[monthYear].transactions.push(transaction);
    if (transaction.type === 'income') {
      groups[monthYear].totalIncome += transaction.amount;
    } else {
      groups[monthYear].totalExpenses += Math.abs(transaction.amount);
    }
    
    return groups;
  }, {} as Record<string, { 
    transactions: Transaction[], 
    totalIncome: number, 
    totalExpenses: number 
  }>);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-200 ${
        darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
      }`}>
        <div className={`w-full max-w-md p-8 rounded-lg shadow-lg ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <h2 className="text-2xl font-bold mb-6 text-center">
            {isLogin ? 'Login' : 'Cadastro'}
          </h2>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full p-3 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600' 
                    : 'bg-gray-50 border-gray-200'
                }`}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full p-3 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600' 
                    : 'bg-gray-50 border-gray-200'
                }`}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
            >
              <LogIn size={20} />
              {isLogin ? 'Entrar' : 'Cadastrar'}
            </button>
          </form>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-center mt-4 text-blue-500 hover:text-blue-600"
          >
            {isLogin ? 'Criar uma conta' : 'Já tenho uma conta'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Controle Financeiro</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              title={darkMode ? 'Modo claro' : 'Modo escuro'}
            >
              {darkMode ? <Sun size={24} /> : <Moon size={24} />}
            </button>
            <button
              onClick={() => setShowChart(!showChart)}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Gráficos"
            >
              <BarChart3 size={24} />
            </button>
            <button
              onClick={exportToCSV}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Exportar CSV"
            >
              <Download size={24} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Sair"
            >
              <LogOut size={24} />
            </button>
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow-lg mb-8 ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="text-center mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">Saldo Atual</p>
            <h2 className={`text-4xl font-bold ${
              balance >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              R$ {balance.toFixed(2)}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Compras no mercado"
                  className={`w-full p-3 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Categoria
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Alimentação"
                  className={`w-full p-3 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className={`w-full p-3 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Tipo
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as 'income' | 'expense')}
                  className={`w-full p-3 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              {editingTransaction && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 flex items-center gap-2"
                >
                  <X size={20} />
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                {editingTransaction ? (
                  <>
                    <Check size={20} />
                    Salvar
                  </>
                ) : (
                  <>
                    <PlusCircle size={20} />
                    Adicionar
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="flex items-center gap-4 mb-6 flex-wrap">
            <Filter size={20} />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as Period)}
              className={`p-2 rounded-lg ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <option value="all">Todo período</option>
              <option value="day">Hoje</option>
              <option value="week">Esta semana</option>
              <option value="month">Este mês</option>
              <option value="year">Este ano</option>
              <option value="specific">Mês específico</option>
            </select>

            {selectedPeriod === 'specific' && (
              <div className="flex gap-2">
                <select
                  value={selectedMonthYear.month}
                  onChange={(e) => setSelectedMonthYear(prev => ({
                    ...prev,
                    month: parseInt(e.target.value)
                  }))}
                  className={`p-2 rounded-lg ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  {months.map((month, index) => (
                    <option key={month} value={index}>{month}</option>
                  ))}
                </select>
                <select
                  value={selectedMonthYear.year}
                  onChange={(e) => setSelectedMonthYear(prev => ({
                    ...prev,
                    year: parseInt(e.target.value)
                  }))}
                  className={`p-2 rounded-lg ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p>Carregando transações...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(transactionsByMonth).map(([monthYear, data]) => (
                <div key={monthYear} className={`p-4 rounded-lg ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold mb-2">{monthYear}</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-green-500">
                        <span className="block text-gray-500 dark:text-gray-400">Receitas</span>
                        R$ {data.totalIncome.toFixed(2)}
                      </div>
                      <div className="text-red-500">
                        <span className="block text-gray-500 dark:text-gray-400">Despesas</span>
                        R$ {data.totalExpenses.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {data.transactions.map(transaction => (
                      <div
                        key={transaction.id}
                        className={`p-3 rounded-lg ${
                          darkMode ? 'bg-gray-800' : 'bg-white'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold">{transaction.description}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {transaction.category} • {new Date(transaction.date).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`font-bold ${
                              transaction.type === 'income' ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {transaction.type === 'income' ? '+' : '-'}R$ {Math.abs(transaction.amount).toFixed(2)}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(transaction)}
                                className="text-gray-500 hover:text-blue-500 transition-colors p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900"
                                title="Editar transação"
                              >
                                <Pencil size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(transaction.id)}
                                className="text-gray-500 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900"
                                title="Excluir transação"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;