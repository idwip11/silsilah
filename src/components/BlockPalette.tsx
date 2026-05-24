import React from 'react';
import { User, Grab } from 'lucide-react';

interface BlockPaletteProps {
  compact?: boolean;
  onAddMember?: (gender: 'male' | 'female') => void;
}

export const BlockPalette: React.FC<BlockPaletteProps> = ({
  compact = false,
  onAddMember,
}) => {
  const onDragStart = (event: React.DragEvent, gender: 'male' | 'female') => {
    event.dataTransfer.setData('application/reactflow', gender);
    event.dataTransfer.effectAllowed = 'move';
  };

  const isClickMode = typeof onAddMember === 'function';

  return (
    <div className={`block-palette-container glass-panel ${compact ? 'compact' : ''}`}>
      {!compact && (
        <>
          <div className="palette-header">
            <Grab size={16} className="palette-header-icon" />
            <h3>Pustaka Blok</h3>
          </div>
          <p className="palette-desc">Tarik anggota baru ke kanvas:</p>
        </>
      )}
      
      <div className="palette-items">
        <button
          type="button"
          className="palette-item male-palette-item"
          draggable={!isClickMode}
          onDragStart={isClickMode ? undefined : (e) => onDragStart(e, 'male')}
          onClick={isClickMode ? () => onAddMember('male') : undefined}
          title={isClickMode ? 'Tambah anggota laki-laki' : 'Tarik ke kanvas untuk menambah Laki-laki'}
        >
          <div className="item-icon-wrapper male">
            <User size={18} />
          </div>
          <div className="item-text">
            <span className="item-title">Laki-laki</span>
            <span className="item-subtitle">{isClickMode ? 'Tambah ke silsilah' : 'Tarik ke kanvas'}</span>
          </div>
        </button>

        <button
          type="button"
          className="palette-item female-palette-item"
          draggable={!isClickMode}
          onDragStart={isClickMode ? undefined : (e) => onDragStart(e, 'female')}
          onClick={isClickMode ? () => onAddMember('female') : undefined}
          title={isClickMode ? 'Tambah anggota perempuan' : 'Tarik ke kanvas untuk menambah Perempuan'}
        >
          <div className="item-icon-wrapper female">
            <User size={18} />
          </div>
          <div className="item-text">
            <span className="item-title">Perempuan</span>
            <span className="item-subtitle">{isClickMode ? 'Tambah ke silsilah' : 'Tarik ke kanvas'}</span>
          </div>
        </button>
      </div>

      {!compact && (
        <div className="palette-tip">
          <strong>Petunjuk:</strong>
          Hubungkan handle bawah orang tua ke handle atas anak, lalu klik tombol <em>Rapikan Silsilah</em>.
        </div>
      )}
    </div>
  );
};
