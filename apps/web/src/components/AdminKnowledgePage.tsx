import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database, Plus, Search, BookOpen, Sparkles, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
  has_embedding?: boolean;
}

export const AdminKnowledgePage: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    checkRoleAndFetchData();
  }, []);

  const checkRoleAndFetchData = async () => {
    try {
      setFetching(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      // Checar se perfil é Master
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'Master') {
        console.warn('⚠️ Acesso negado: Rota exclusiva para role Master. Redirecionando...');
        window.location.href = '/juridico';
        return;
      }

      // Buscar itens da base de conhecimento
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('id, title, content, created_at, embedding')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setItems(data.map(d => ({
          id: d.id,
          title: d.title,
          content: d.content,
          created_at: d.created_at,
          has_embedding: d.embedding !== null
        })));
      }
    } catch (e) {
      console.error('Erro ao verificar permissão:', e);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setStatusMsg({ type: 'error', text: 'Por favor, preencha o título e o conteúdo do manual.' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      const { data, error } = await supabase.functions.invoke('rag-ingestion', {
        body: { title, content }
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Falha ao vetorializar documento');
      }

      setStatusMsg({
        type: 'success',
        text: `Documento "${data.title}" vetorizado com sucesso! (768 dimensões geradas)`
      });

      setTitle('');
      setContent('');
      await checkRoleAndFetchData();
    } catch (err: any) {
      console.error('Erro na Ingestão RAG:', err);
      setStatusMsg({
        type: 'error',
        text: err.message || 'Ocorreu um erro ao processar a ingestão vetorial.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span>Verificando permissões de acesso...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Corporativo */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <a
                href="/juridico"
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
                title="Voltar para o Portal"
              >
                <ArrowLeft className="w-5 h-5" />
              </a>
              <div className="p-2.5 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-400">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Base de Conhecimento Vetorial (RAG)
                  <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full font-medium">
                    Help Desk Admin
                  </span>
                </h1>
                <p className="text-sm text-slate-400">
                  Gerenciamento e Ingestão de Manuais, FAQ e Documentos Institucionais no PostgreSQL com Vetores Gemini (768d).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Alert Toast */}
        {statusMsg && (
          <div className={`p-4 rounded-xl border flex items-center gap-3 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
          }`}>
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            <span className="text-sm font-medium">{statusMsg.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Formulário de Ingestão (Esquerda) */}
          <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-6">
              <Plus className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Adicionar Novo Documento RAG</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Título do Documento / Pergunta
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Como solicitar reembolso de custas processuais"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Conteúdo Completo / Manual de Instrução
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Descreva detalhadamente a resposta, procedimento ou instrução a ser vetorizada para o Help Desk..."
                  rows={7}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-3.5 px-4 rounded-xl shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Gerando Embeddings Gemini (768d)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Salvar na Base Vetorial</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Lista de Documentos Ingeridos (Direita) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-400" />
                Documentos na Base ({items.length})
              </h2>
            </div>

            {items.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-8 text-center text-slate-500">
                Nenhum documento vetorizado na base ainda.
              </div>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-2 hover:border-slate-700 transition">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white leading-snug">{item.title}</h3>
                      {item.has_embedding && (
                        <span className="shrink-0 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-mono">
                          Vector 768d
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{item.content}</p>
                    <div className="text-[11px] text-slate-500 pt-1 font-mono">
                      {new Date(item.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
