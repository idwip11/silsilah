import React, { useState, useEffect } from 'react';
import type { FamilyMember, FamilyRelation, Gender, LifeStatus } from '../types/family';
import { Plus, Trash2, Download, Upload, UserPlus, RefreshCw, X } from 'lucide-react';
import { BlockPalette } from './BlockPalette';

interface SidebarProps {
  selectedMember: FamilyMember | null;
  members: FamilyMember[];
  relations: FamilyRelation[];
  onSave: (member: FamilyMember) => void;
  onDelete: (id: string) => void;
  onAddParent: (childId: string) => void;
  onAddSibling: (memberId: string) => void;
  onAddChild: (parentId: string) => void;
  onClose: () => void;
  onImport: (data: { members: FamilyMember[]; relations: FamilyRelation[] }) => void;
  onExport: () => void;
  onReset: () => void;
  onAddRoot: () => void;
  onAddMemberFromPalette: (gender: 'male' | 'female') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedMember,
  members,
  relations,
  onSave,
  onDelete,
  onAddParent,
  onAddSibling,
  onAddChild,
  onClose,
  onImport,
  onExport,
  onReset,
  onAddRoot,
  onAddMemberFromPalette,
}) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [birthYear, setBirthYear] = useState<string>('');
  const [birthOrder, setBirthOrder] = useState<string>('');
  const [status, setStatus] = useState<LifeStatus>('alive');
  const [notes, setNotes] = useState('');

  // Sync state with selected member
  useEffect(() => {
    if (selectedMember) {
      setName(selectedMember.name);
      setGender(selectedMember.gender);
      setBirthYear(selectedMember.birthYear?.toString() || '');
      setBirthOrder(selectedMember.birthOrder?.toString() || '');
      setStatus(selectedMember.status);
      setNotes(selectedMember.notes || '');
    }
  }, [selectedMember]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    onSave({
      ...selectedMember,
      name: name.trim() || 'Tanpa Nama',
      gender,
      birthYear: birthYear ? parseInt(birthYear) : undefined,
      birthOrder: birthOrder ? parseInt(birthOrder) : undefined,
      status,
      notes: notes.trim() || undefined,
    });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data.members) && Array.isArray(data.relations)) {
          onImport(data);
          alert('Silsilah keluarga berhasil diimpor!');
        } else {
          alert('Format JSON tidak valid. Pastikan terdapat array members dan relations.');
        }
      } catch (err) {
        alert('Gagal membaca file JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // Find if selected member has a parent
  const parentRelation = selectedMember 
    ? relations.find(r => r.childId === selectedMember.id) 
    : null;
  const parentMember = parentRelation 
    ? members.find(m => m.id === parentRelation.parentId) 
    : null;

  return (
    <div className="sidebar-container">
      <div className="sidebar-header">
        <h2>PATRAHNIBATA Editor</h2>
        {selectedMember && (
          <button className="close-sidebar-btn" onClick={onClose} title="Tutup Detail">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="sidebar-content">
        {selectedMember ? (
          <div className="member-editor-section">
            <h3 className="section-title">Detail Anggota</h3>
            
            <form onSubmit={handleSubmit} className="editor-form">
              <div className="form-group">
                <label htmlFor="name-input">Nama Lengkap</label>
                <input
                  id="name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masukkan nama..."
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label htmlFor="gender-input">Jenis Kelamin</label>
                  <select
                    id="gender-input"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                  >
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>

                <div className="form-group half">
                  <label htmlFor="status-input">Status</label>
                  <select
                    id="status-input"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as LifeStatus)}
                  >
                    <option value="alive">Hidup</option>
                    <option value="deceased">Wafat</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label htmlFor="birthyear-input">Tahun Lahir <span style={{fontWeight: 'normal', fontSize: '0.7rem'}}>(Opsional)</span></label>
                  <input
                    id="birthyear-input"
                    type="number"
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    placeholder="Contoh: 1980"
                    min="1800"
                    max="2026"
                  />
                </div>

                <div className="form-group half">
                  <label htmlFor="birthorder-input">Anak Ke-</label>
                  <input
                    id="birthorder-input"
                    type="number"
                    value={birthOrder}
                    onChange={(e) => setBirthOrder(e.target.value)}
                    placeholder="1, 2, dst."
                    min="1"
                    max="20"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="notes-input">Catatan Tambahan <span style={{fontWeight: 'normal', fontSize: '0.7rem'}}>(Opsional)</span></label>
                <textarea
                  id="notes-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tempat lahir, pekerjaan, atau info lainnya..."
                  rows={3}
                />
              </div>

              <button type="submit" className="save-btn">
                Simpan Perubahan
              </button>
            </form>

            <div className="quick-actions-section">
              <h4 className="subsection-title">Aksi Cepat Relasi</h4>
              <div className="quick-actions-grid">
                <button
                  className="quick-action-btn"
                  onClick={() => onAddChild(selectedMember.id)}
                >
                  <Plus size={16} />
                  <span>Tambah Anak</span>
                </button>
                <button
                  className="quick-action-btn"
                  onClick={() => onAddSibling(selectedMember.id)}
                  disabled={!parentRelation}
                  title={!parentRelation ? "Anggota ini tidak memiliki orang tua, tambah orang tua terlebih dahulu untuk menambah saudara." : ""}
                >
                  <UserPlus size={16} />
                  <span>Tambah Saudara</span>
                </button>
                <button
                  className="quick-action-btn"
                  onClick={() => onAddParent(selectedMember.id)}
                  disabled={!!parentRelation}
                  title={parentRelation ? "Anggota ini sudah memiliki orang tua." : ""}
                >
                  <Plus size={16} />
                  <span>Tambah Orang Tua</span>
                </button>
                <button
                  className="quick-action-btn delete-btn"
                  onClick={() => onDelete(selectedMember.id)}
                >
                  <Trash2 size={16} />
                  <span>Hapus Anggota</span>
                </button>
              </div>
              {parentMember && (
                <p className="parent-info-text">
                  Orang Tua saat ini: <strong>{parentMember.name}</strong>
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-sidebar-section">
            {members.length === 0 ? (
              <div className="welcome-box">
                <p>Belum ada silsilah keluarga yang dibuat.</p>
                <button className="start-btn" onClick={onAddRoot}>
                  <Plus size={18} />
                  Mulai Buat Silsilah
                </button>
              </div>
            ) : (
              <div className="welcome-box">
                <p className="instruction-text" style={{ padding: '0', background: 'transparent', border: 'none', margin: '0 0 16px 0' }}>
                  Klik salah satu kartu anggota keluarga di kanvas untuk melihat detail, mengedit, atau menambah relasi.
                </p>
                <button className="start-btn" onClick={onAddRoot} style={{ width: '100%', justifyContent: 'center' }}>
                  <Plus size={18} />
                  Tambah Anggota (Baru)
                </button>
              </div>
            )}

            <div className="tree-management-section">
              <h3 className="section-title">Manajemen Data</h3>
              <div className="management-buttons">
                <button className="mgmt-btn" onClick={onExport} disabled={members.length === 0}>
                  <Download size={16} />
                  Ekspor Data (JSON)
                </button>
                
                <label className="mgmt-btn import-label">
                  <Upload size={16} />
                  Impor Data (JSON)
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportFile}
                    style={{ display: 'none' }}
                  />
                </label>

                <button className="mgmt-btn reset-btn" onClick={onReset} disabled={members.length === 0}>
                  <RefreshCw size={16} />
                  Reset Silsilah
                </button>
              </div>
            </div>

            <div className="mobile-palette-section">
              <h3 className="section-title">Tambah Anggota</h3>
              <BlockPalette compact onAddMember={onAddMemberFromPalette} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
