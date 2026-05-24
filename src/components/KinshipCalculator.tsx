import React, { useEffect, useMemo } from 'react';
import type { FamilyMember, FamilyRelation } from '../types/family';
import { calculateKinship } from '../utils/kinship';
import type { KinshipResult } from '../utils/kinship';
import { HelpCircle, Compass } from 'lucide-react';

interface KinshipCalculatorProps {
  members: FamilyMember[];
  relations: FamilyRelation[];
  selfId: string | null;
  targetId: string | null;
  onSelectSelf: (id: string | null) => void;
  onSelectTarget: (id: string | null) => void;
  onHighlightPath: (pathIds: string[]) => void;
}

export const KinshipCalculator: React.FC<KinshipCalculatorProps> = ({
  members,
  relations,
  selfId,
  targetId,
  onSelectSelf,
  onSelectTarget,
  onHighlightPath,
}) => {
  const result: KinshipResult | null = useMemo(() => {
    if (!selfId || !targetId) {
      return null;
    }

    return calculateKinship(members, relations, selfId, targetId);
  }, [selfId, targetId, members, relations]);

  // Calculate kinship whenever inputs change
  useEffect(() => {
    if (result) {
      const pathIds = result.path.map((step) => step.id);
      onHighlightPath(pathIds);
    } else {
      onHighlightPath([]);
    }
  }, [result, onHighlightPath]);

  return (
    <div className="kinship-calculator-container glass-panel">
      <div className="calculator-header">
        <div className="title-area">
          <Compass className="icon-pulse" size={20} />
          <h3>Kalkulator Hubungan Silsilah</h3>
        </div>
      </div>

      <div className="calculator-selectors">
        <div className="selector-group">
          <label htmlFor="self-select">Saya adalah:</label>
          <select
            id="self-select"
            value={selfId || ''}
            onChange={(e) => onSelectSelf(e.target.value || null)}
          >
            <option value="">-- Pilih Anggota --</option>
            {members.map((m) => (
              <option key={m.id} value={m.id} disabled={m.id === targetId}>
                {m.name} {m.birthYear ? `(${m.birthYear})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="selector-group">
          <label htmlFor="target-select">Menyebut:</label>
          <select
            id="target-select"
            value={targetId || ''}
            onChange={(e) => onSelectTarget(e.target.value || null)}
          >
            <option value="">-- Pilih Anggota --</option>
            {members.map((m) => (
              <option key={m.id} value={m.id} disabled={m.id === selfId}>
                {m.name} {m.birthYear ? `(${m.birthYear})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {result ? (
        <div className="calculator-result-box">
          <div className="result-badge-container">
            <span className="result-intro">Panggilan Anda ke dia:</span>
            <div className="relationship-badge">{result.relationshipName}</div>
          </div>

          <div className="result-details">
            <p className="path-desc">
              <strong>Penjelasan:</strong> {result.pathDescription}
            </p>
            
            <div className="visual-path-stepper">
              {result.path.map((step, idx) => {
                const member = members.find(m => m.id === step.id);
                return (
                  <span key={step.id} className="stepper-node">
                    {member?.name}
                    {idx < result.path.length - 1 && <span className="stepper-arrow">➔</span>}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="calculator-placeholder">
          <HelpCircle size={32} className="placeholder-icon" />
          <p>Pilih dua nama anggota keluarga di atas untuk menghitung hubungan kekerabatan dan panggilan adat Jawanya.</p>
        </div>
      )}

      <p className="calculator-credit">created by imamdpurwanto</p>
    </div>
  );
};
