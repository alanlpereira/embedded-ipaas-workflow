import React, { useState, useEffect } from 'react';
import { LayoutTemplate, Sparkles, ArrowRight, DollarSign, CreditCard, PieChart, AlertCircle, ShoppingCart, Package, Truck, UserPlus, Calendar, Award, UserX, Key, ShieldAlert, Database, Lock, Wrench, Activity, Home, FileText, CheckSquare, Layers } from 'lucide-react';
import { Profile } from '@ipaas/shared-types';
import { useLanguage } from '../i18n/LanguageContext';

export type TemplateCategory = 'Todos' | 'Financeiro' | 'Suprimentos' | 'RH' | 'TI' | 'Manutenção' | 'Jurídico';

export interface WorkflowTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  nodes: any[];
  edges: any[];
}

interface TemplateGalleryPageProps {
  currentProfile: Profile | null;
  onUseTemplate: (template: WorkflowTemplate) => void;
}

const categoryIcons: Record<TemplateCategory, React.ElementType> = {
  Todos: Layers,
  Financeiro: DollarSign,
  Suprimentos: ShoppingCart,
  RH: UserPlus,
  TI: Key,
  Manutenção: Wrench,
  Jurídico: FileText,
};

const iconMap: Record<string, React.ElementType> = {
  DollarSign,
  CreditCard,
  PieChart,
  AlertCircle,
  ShoppingCart,
  Package,
  Truck,
  UserPlus,
  Calendar,
  Award,
  UserX,
  Key,
  ShieldAlert,
  Database,
  Lock,
  Wrench,
  Activity,
  Home,
  FileText,
  CheckSquare,
};

export const TemplateGalleryPage: React.FC<TemplateGalleryPageProps> = ({
  currentProfile,
  onUseTemplate,
}) => {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('Todos');
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/templates')
      .then((res) => res.json())
      .then((data) => {
        if (data.templates && Array.isArray(data.templates)) {
          setTemplates(data.templates);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const filteredTemplates = selectedCategory === 'Todos'
    ? templates
    : templates.filter((tpl) => tpl.category === selectedCategory);

  const categories: TemplateCategory[] = ['Todos', 'Financeiro', 'Suprimentos', 'RH', 'TI', 'Manutenção', 'Jurídico'];

  return (
    <div style={{ flex: 1, height: '100%', overflowY: 'auto', padding: '32px', background: 'var(--bg-primary)' }}>
      {/* Header da Galeria */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ padding: '8px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))' }}>
            <LayoutTemplate size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Galeria de Templates Corporativos
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              20 Fluxogramas Pré-Configurados em 6 Departamentos Estratégicos
            </p>
          </div>
        </div>
      </div>

      {/* Filtros de Categoria por Departamento */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', overflowX: 'auto', paddingBottom: '4px' }}>
        {categories.map((cat) => {
          const Icon = categoryIcons[cat] || Layers;
          const isSelected = selectedCategory === cat;
          const count = cat === 'Todos' ? templates.length : templates.filter((t) => t.category === cat).length;

          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '12px',
                background: isSelected ? 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))' : 'var(--bg-glass)',
                border: isSelected ? 'none' : '1px solid var(--border-color)',
                color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: isSelected ? 800 : 600,
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: isSelected ? '0 4px 15px rgba(168, 85, 247, 0.3)' : 'none',
              }}
            >
              <Icon size={16} />
              <span>{cat}</span>
              <span style={{
                fontSize: '10px',
                background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--bg-tertiary)',
                padding: '2px 6px',
                borderRadius: '8px',
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid de Templates Corporativos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '24px',
      }}>
        {filteredTemplates.map((template) => {
          const IconComponent = iconMap[template.icon] || LayoutTemplate;

          return (
            <div
              key={template.id}
              style={{
                background: 'var(--bg-glass)',
                backdropFilter: 'blur(16px)',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'rgba(168, 85, 247, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <IconComponent size={22} color="var(--accent-purple)" />
                  </div>

                  <span style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: 'var(--accent-blue)',
                    background: 'rgba(0, 242, 254, 0.1)',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    textTransform: 'uppercase',
                  }}>
                    {template.category}
                  </span>
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  {template.name}
                </h3>

                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '20px' }}>
                  {template.description}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {template.nodes?.length || 4} Nós Encadeados
                </span>

                <button
                  onClick={() => onUseTemplate(template)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
                    color: '#0a0c10',
                    fontWeight: 800,
                    fontSize: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0, 242, 254, 0.3)',
                  }}
                >
                  <Sparkles size={14} />
                  Usar Template
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
