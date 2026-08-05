import React from 'react';

interface CodeEditorInputProps {
  value: string;
  onChange: (newValue: string) => void;
  rows?: number;
}

export const CodeEditorInput: React.FC<CodeEditorInputProps> = ({ value, onChange, rows = 12 }) => {
  const lines = value.split('\n');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);

      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        borderRadius: '10px',
        background: '#0d1117',
        border: '1px solid #30363d',
        overflow: 'hidden',
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)',
        fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, Monaco, monospace",
      }}
    >
      {/* Coluna de Números de Linha estilo VS Code */}
      <div
        style={{
          padding: '12px 10px',
          background: '#161b22',
          borderRight: '1px solid #30363d',
          color: '#484f58',
          fontSize: '12px',
          lineHeight: '1.6',
          textAlign: 'right',
          userSelect: 'none',
          minWidth: '36px',
        }}
      >
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>

      {/* Editor de Texto do Código */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={rows}
        spellCheck={false}
        style={{
          flex: 1,
          padding: '12px 14px',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: '#58a6ff',
          fontSize: '12px',
          lineHeight: '1.6',
          fontFamily: 'inherit',
          resize: 'vertical',
          whiteSpace: 'pre',
          overflowX: 'auto',
          tabSize: 2,
        }}
      />
    </div>
  );
};
