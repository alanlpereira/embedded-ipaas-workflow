import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Search, Phone, FileText, Trash2, Edit3, Send, CheckCircle, ShieldAlert, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';

export interface ClientRecord {
  id: string;
  user_id?: string;
  organization_id?: string;
  name: string;
  cpf: string;
  document?: string;
  phone: string;
  email?: string;
  created_at: string;
}

export const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 📡 Carregar Clientes em tempo real diretamente do Banco de Dados PostgreSQL (Supabase)
  useEffect(() => {
    fetchClientsFromSupabase();
  }, []);

  const fetchClientsFromSupabase = async () => {
    setIsLoading(true);
    try {
      console.log('📡 [CLIENTS SUPABASE] Buscando clientes autenticados no banco de dados...');
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('⚠️ Aviso ao buscar clientes no Supabase:', error.message);
      } else if (data) {
        const mapped: ClientRecord[] = data.map((item: any) => ({
          id: item.id,
          user_id: item.user_id,
          organization_id: item.organization_id,
          name: item.name,
          cpf: item.document || item.cpf || 'Não informado',
          document: item.document || item.cpf || '',
          phone: item.phone || '',
          email: item.email || '',
          created_at: item.created_at || new Date().toISOString(),
        }));
        setClients(mapped);
        console.log(`✅ [CLIENTS SUPABASE] ${mapped.length} cliente(s) carregado(s) com sucesso.`);
      }
    } catch (err: any) {
      console.error('❌ Erro na consulta de clientes no Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingClient(null);
    setName('');
    setCpf('');
    setPhone('');
    setEmail('');
    setIsModalOpen(true);
  };

  const openEditModal = (client: ClientRecord) => {
    setEditingClient(client);
    setName(client.name);
    setCpf(client.cpf);
    setPhone(client.phone);
    setEmail(client.email || '');
    setIsModalOpen(true);
  };

  // 🗑️ Excluir Cliente diretamente no Supabase Database
  const handleDeleteClient = async (id: string) => {
    if (!confirm('Deseja realmente remover este cliente cadastrado do banco de dados?')) return;

    try {
      console.log(`🗑️ [CLIENTS SUPABASE] Deletando cliente ${id}...`);
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Erro ao deletar cliente no Supabase:', error);
        showToast(`❌ Erro ao remover cliente: ${error.message}`);
      } else {
        setClients(prev => prev.filter(c => c.id !== id));
        showToast('✅ Cliente removido com sucesso do banco de dados!');
      }
    } catch (err: any) {
      console.error('❌ Exceção ao deletar cliente no Supabase:', err);
      showToast(`⚠️ Erro de conexão com o banco: ${err.message}`);
    }
  };

  // 💾 Salvar (Insert / Update) no Banco de Dados Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !cpf || !phone) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id || null;

      if (editingClient) {
        console.log(`💾 [CLIENTS SUPABASE] Atualizando cliente ${editingClient.id}...`);
        const { error } = await supabase
          .from('clients')
          .update({
            name,
            document: cpf,
            phone,
            email,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingClient.id);

        if (error) {
          console.error('❌ Erro ao atualizar cliente no Supabase:', error);
          showToast(`❌ Erro ao atualizar cliente: ${error.message}`);
        } else {
          showToast('✅ Cadastro do cliente atualizado com sucesso no banco!');
          fetchClientsFromSupabase();
        }
      } else {
        console.log('💾 [CLIENTS SUPABASE] Inserindo novo cliente...');
        const { error } = await supabase
          .from('clients')
          .insert([{
            name,
            document: cpf,
            phone,
            email,
            user_id: currentUserId
          }]);

        if (error) {
          console.error('❌ Erro ao cadastrar cliente no Supabase:', error);
          showToast(`❌ Erro ao salvar cliente: ${error.message}`);
        } else {
          showToast('✅ Novo cliente cadastrado no banco de dados!');
          fetchClientsFromSupabase();
        }
      }
    } catch (err: any) {
      console.error('❌ Exceção ao salvar cliente no Supabase:', err);
      showToast(`⚠️ Erro de comunicação com o banco de dados: ${err.message}`);
    }

    setIsModalOpen(false);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cpf.includes(searchTerm) ||
    c.phone.includes(searchTerm)
  );

  const handlePullRefresh = async () => {
    setIsLoading(true);
    await fetchClientsFromSupabase();
    showToast('✨ Cadastro de clientes recarregado com sucesso do banco de dados!');
  };

  const { containerRef, pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: handlePullRefresh,
  });

  return (
    <div ref={containerRef} className="w-full max-w-full overflow-x-hidden min-w-0 box-border" style={{ flex: 1, padding: '28px 24px 120px 24px', width: '100%', maxWidth: '100%', overflowX: 'hidden', overflowY: 'auto', background: 'var(--bg-primary)', boxSizing: 'border-box' }}>
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      {/* Toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid var(--accent-blue)',
          color: 'var(--text-primary)',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backdropFilter: 'blur(8px)',
        }}>
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))', color: '#fff' }}>
            <Users size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Gestão de Clientes & Casos
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              Base de dados integrada ao PostgreSQL Supabase com RLS para notificações de intimações PJe
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            background: 'var(--accent-blue)',
            color: '#fff',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)',
          }}
        >
          <UserPlus size={16} /> Cadastrar Novo Cliente
        </button>
      </div>

      {/* Barra de Pesquisa */}
      <div style={{ marginBottom: '24px', position: 'relative', maxWidth: '480px' }}>
        <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Pesquisar cliente por nome, CPF/CNPJ ou telefone..."
          style={{
            width: '100%',
            padding: '12px 14px 12px 42px',
            borderRadius: '10px',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* ⏳ Estado de Carregamento (Spinner) */}
      {isLoading ? (
        <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={36} className="spin-animation" style={{ color: 'var(--accent-blue)', marginBottom: '12px', display: 'block', margin: '0 auto 12px auto' }} />
          <p style={{ fontSize: '14px', fontWeight: 600 }}>Carregando dados dos clientes do banco PostgreSQL Supabase...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        /* 🍃 Estado Vazio Elegante (Empty State) */
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          background: 'rgba(15, 23, 42, 0.4)',
          border: '1px dashed var(--border-color)',
          borderRadius: '16px',
          margin: '20px 0'
        }}>
          <Users size={42} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Nenhum cliente cadastrado ainda no banco de dados
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Clique no botão acima para cadastrar os clientes e contatos que receberão notificações de intimações do PJe.
          </p>
          <button
            onClick={openAddModal}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'var(--accent-blue)',
              color: '#fff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            + Cadastrar Primeiro Cliente
          </button>
        </div>
      ) : (
        /* 📋 Lista de Clientes Real do Banco de Dados */
        <div className="w-full overflow-x-auto" style={{ width: '100%', overflowX: 'auto', boxSizing: 'border-box' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '16px',
            width: '100%',
            boxSizing: 'border-box',
          }}>
          {filteredClients.map((client) => (
            <div key={client.id} style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{client.name}</h3>
                  <span style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    Banco Supabase
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                    <span><strong>CPF/CNPJ:</strong> {client.cpf}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                    <span><strong>Telefone / WhatsApp:</strong> {client.phone}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
                <a
                  href={`https://wa.me/${client.phone.replace(/[^\d]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: '#22c55e',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  <Send size={14} /> WhatsApp Direct
                </a>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => openEditModal(client)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                    title="Editar Cliente"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteClient(client.id)}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                    title="Excluir Cliente"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Modal de Cadastro / Edição */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '28px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
              {editingClient ? 'Editar Cliente no Banco' : 'Cadastrar Novo Cliente no Banco'}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Insira as informações do cliente para armazenamento protegido por RLS no Supabase PostgreSQL.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Nome Completo / Razão Social *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Carlos Alberto Souza"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  CPF / CNPJ *
                </label>
                <input
                  type="text"
                  required
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="Ex: 123.456.789-00"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Telefone / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: +55 31 99999-8888"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  E-mail (Opcional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex: cliente@email.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    background: 'var(--accent-blue)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {editingClient ? 'Salvar Alterações' : 'Salvar no Banco'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
