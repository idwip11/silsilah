import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { FamilyMember } from '../types/family';
import { User, Plus, ArrowUp, Users } from 'lucide-react';

interface FamilyNodeProps {
  data: {
    member: FamilyMember;
    isSelf: boolean;
    isTarget: boolean;
    isHighlighted: boolean;
    hasParent: boolean;
    onSelectSelf: (id: string) => void;
    onSelectTarget: (id: string) => void;
    onEdit: (member: FamilyMember) => void;
    onAddChild: (parentId: string) => void;
    onAddParent: (childId: string) => void;
    onAddSibling: (memberId: string) => void;
  };
}

export const FamilyNode: React.FC<FamilyNodeProps> = ({ data }) => {
  const { member, isSelf, isTarget, isHighlighted, hasParent, onSelectSelf, onSelectTarget, onAddChild, onAddParent, onAddSibling } = data;

  const isMale = member.gender === 'male';
  const isFemale = member.gender === 'female';
  const isDeceased = member.status === 'deceased';

  // Base node styling class names
  let cardClass = 'family-node-card';
  if (isSelf) cardClass += ' self-node';
  else if (isTarget) cardClass += ' target-node';
  else if (isHighlighted) cardClass += ' highlighted-node';

  if (isDeceased) cardClass += ' deceased-node';

  // Gender colors
  let genderTheme = 'neutral-theme';
  if (isMale) genderTheme = 'male-theme';
  if (isFemale) genderTheme = 'female-theme';

  return (
    <div className={`family-node-container ${genderTheme}`}>
      {/* Top Handle - Input from Parent */}
      <Handle
        type="target"
        position={Position.Top}
        className="flow-handle input-handle"
      />

      {/* Floating Quick-Add: Add Parent (top) */}
      <div className="node-floating-actions">
        <button
          className={`node-fab fab-top ${hasParent ? 'fab-disabled' : ''}`}
          title={hasParent ? 'Sudah memiliki orang tua' : 'Tambah Orang Tua'}
          onClick={(e) => { e.stopPropagation(); if (!hasParent) onAddParent(member.id); }}
        >
          <ArrowUp size={14} />
          <span className="fab-tooltip">Orang Tua</span>
        </button>

        {/* Add Sibling Left */}
        <button
          className={`node-fab fab-left ${!hasParent ? 'fab-disabled' : ''}`}
          title={!hasParent ? 'Tambah orang tua dulu untuk menambah saudara' : 'Tambah Saudara'}
          onClick={(e) => { e.stopPropagation(); if (hasParent) onAddSibling(member.id); }}
        >
          <Users size={14} />
          <span className="fab-tooltip">Saudara</span>
        </button>

        {/* Add Sibling Right */}
        <button
          className={`node-fab fab-right ${!hasParent ? 'fab-disabled' : ''}`}
          title={!hasParent ? 'Tambah orang tua dulu untuk menambah saudara' : 'Tambah Saudara'}
          onClick={(e) => { e.stopPropagation(); if (hasParent) onAddSibling(member.id); }}
        >
          <Users size={14} />
          <span className="fab-tooltip">Saudara</span>
        </button>

        {/* Add Child (bottom) */}
        <button
          className="node-fab fab-bottom"
          title="Tambah Anak"
          onClick={(e) => { e.stopPropagation(); onAddChild(member.id); }}
        >
          <Plus size={14} />
          <span className="fab-tooltip">Anak</span>
        </button>
      </div>

      <div className={`${cardClass}`}>
        <div className="card-header">
          <span className={`gender-badge ${member.gender}`}>
            <User size={12} />
            {member.birthOrder ? `Anak #${member.birthOrder}` : ''}
          </span>
          {isDeceased && <span className="deceased-badge">Wafat</span>}
        </div>

        <div className="card-body">
          <h3 className="member-name">{member.name}</h3>
          {member.birthYear && (
            <p className="member-meta">Lahir: {member.birthYear}</p>
          )}
          {member.notes && (
            <p className="member-notes" title={member.notes}>
              {member.notes}
            </p>
          )}
        </div>

        <div className="card-actions" onClick={(e) => e.stopPropagation()}>
          <button
            title="Set sebagai Saya"
            className={`action-btn btn-self ${isSelf ? 'active' : ''}`}
            onClick={() => onSelectSelf(member.id)}
          >
            Saya
          </button>
          <button
            title="Set sebagai Target Hubungan"
            className={`action-btn btn-target ${isTarget ? 'active' : ''}`}
            onClick={() => onSelectTarget(member.id)}
          >
            Hubungan
          </button>
        </div>
      </div>

      {/* Bottom Handle - Output to Children */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="flow-handle output-handle"
      />
    </div>
  );
};
