import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Position,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Connection, NodeChange } from '@xyflow/react';

import type { FamilyMember, FamilyRelation, FamilyTreeData } from './types/family';
import { FamilyNode } from './components/FamilyNode';
import { Sidebar } from './components/Sidebar';
import { KinshipCalculator } from './components/KinshipCalculator';
import { BlockPalette } from './components/BlockPalette';
import { autoLayoutTree } from './utils/layout';
import {
  clearFamilyTree,
  isSupabaseStorageEnabled,
  loadFamilyTree,
  saveFamilyTree,
} from './lib/familyTreeStorage';
import { Network, Sparkles } from 'lucide-react';

// Register the custom node type
const nodeTypes = {
  familyNode: FamilyNode,
};

// Initial mock Javanese family tree data
const initialMembers: FamilyMember[] = [
  { id: '1', name: 'Mbah Joyo (Kakek)', gender: 'male', birthYear: 1940, birthOrder: 1, status: 'deceased', notes: 'Kakek buyut / Sesepuh keluarga Joyo' },
  { id: '2', name: 'Pakde Bowo', gender: 'male', birthYear: 1963, birthOrder: 1, status: 'alive', notes: 'Kakak tertua Ibu' },
  { id: '3', name: 'Ibu Siti', gender: 'female', birthYear: 1967, birthOrder: 2, status: 'alive' },
  { id: '4', name: 'Paklek Dwi', gender: 'male', birthYear: 1972, birthOrder: 3, status: 'alive', notes: 'Paman Bungsu' },
  { id: '5', name: 'Mas Andi', gender: 'male', birthYear: 1990, birthOrder: 1, status: 'alive', notes: 'Sepupu tertua' },
  { id: '6', name: 'Rini (Saya)', gender: 'female', birthYear: 1995, birthOrder: 1, status: 'alive' },
  { id: '7', name: 'Budi', gender: 'male', birthYear: 1999, birthOrder: 2, status: 'alive' },
  { id: '8', name: 'Dek Riko', gender: 'male', birthYear: 2005, birthOrder: 1, status: 'alive' },
];

const initialRelations: FamilyRelation[] = [
  { id: 'r1', parentId: '1', childId: '2' },
  { id: 'r2', parentId: '1', childId: '3' },
  { id: 'r3', parentId: '1', childId: '4' },
  { id: 'r4', parentId: '2', childId: '5' },
  { id: 'r5', parentId: '3', childId: '6' },
  { id: 'r6', parentId: '3', childId: '7' },
  { id: 'r7', parentId: '4', childId: '8' },
];

const NODE_CARD_WIDTH = 236;
const NODE_CARD_HEIGHT = 140;
const AUTO_ATTACH_DISTANCE = 260;
const DROP_VERTICAL_BUFFER = 24;

function createEntityId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function isDimensionChange(
  change: NodeChange
): change is NodeChange & { dimensions: { width: number; height: number }; id: string } {
  const candidate = change as NodeChange & {
    dimensions?: { width?: unknown; height?: unknown };
    id?: unknown;
  };

  return (
    change.type === 'dimensions' &&
    typeof candidate.id === 'string' &&
    typeof candidate.dimensions?.width === 'number' &&
    typeof candidate.dimensions?.height === 'number'
  );
}

function isPositionChange(
  change: NodeChange
): change is NodeChange & { id: string; position: { x: number; y: number } } {
  const candidate = change as NodeChange & {
    id?: unknown;
    position?: { x?: unknown; y?: unknown };
  };

  return (
    change.type === 'position' &&
    typeof candidate.id === 'string' &&
    typeof candidate.position?.x === 'number' &&
    typeof candidate.position?.y === 'number'
  );
}

function AppContent() {
  const { screenToFlowPosition } = useReactFlow();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [relations, setRelations] = useState<FamilyRelation[]>([]);
  const [nodeDimensions, setNodeDimensions] = useState<Record<string, { width: number; height: number }>>({});
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [storageStatus, setStorageStatus] = useState<'loading' | 'supabase' | 'local' | 'offline'>('loading');

  // Kinship calculator selections
  const [selfId, setSelfId] = useState<string | null>('6'); // Default self to Rini
  const [targetId, setTargetId] = useState<string | null>('2'); // Default target to Pakde Bowo
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);

  const applyAutoLayout = useCallback((
    incomingMembers: FamilyMember[],
    incomingRelations: FamilyRelation[],
    forceRelayout = false
  ) => {
    const layoutPositions = autoLayoutTree(incomingMembers, incomingRelations);

    return incomingMembers.map((member) => ({
      ...member,
      positionX:
        forceRelayout || typeof member.positionX !== 'number'
          ? layoutPositions[member.id]?.x ?? member.positionX ?? 250
          : member.positionX,
      positionY:
        forceRelayout || typeof member.positionY !== 'number'
          ? layoutPositions[member.id]?.y ?? member.positionY ?? 50
          : member.positionY,
    }));
  }, []);

  const persistTreeData = useCallback((newMembers: FamilyMember[], newRelations: FamilyRelation[]) => {
    saveFamilyTree({ members: newMembers, relations: newRelations })
      .then(() => {
        setStorageStatus(isSupabaseStorageEnabled() ? 'supabase' : 'local');
      })
      .catch((error) => {
        console.error('Failed to save family tree', error);
        setStorageStatus('offline');
      });
  }, []);

  // Load data from Supabase, then fall back to local browser data or starter data.
  useEffect(() => {
    let isMounted = true;

    async function loadTree() {
      const { data, source } = await loadFamilyTree();

      if (!isMounted) {
        return;
      }

      if (data) {
        setMembers(applyAutoLayout(data.members, data.relations));
        setRelations(data.relations);
        setStorageStatus(source === 'supabase' ? 'supabase' : 'local');
      } else {
        const starterMembers = applyAutoLayout(initialMembers, initialRelations, true);
        setMembers(starterMembers);
        setRelations(initialRelations);
        setStorageStatus(isSupabaseStorageEnabled() ? 'supabase' : 'local');

        if (isSupabaseStorageEnabled()) {
          try {
            await saveFamilyTree({ members: starterMembers, relations: initialRelations });
          } catch (error) {
            console.error('Failed to seed starter family tree', error);
            if (isMounted) {
              setStorageStatus('offline');
            }
          }
        }
      }
    }

    loadTree();

    return () => {
      isMounted = false;
    };
  }, [applyAutoLayout]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      // check if the dropped element is valid
      if (type !== 'male' && type !== 'female') {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const anchoredPosition = {
        x: position.x - NODE_CARD_WIDTH / 2,
        y: position.y - NODE_CARD_HEIGHT / 2,
      };

      const nearestMember = members.reduce<FamilyMember | null>((closest, member) => {
        const memberX = member.positionX ?? 0;
        const memberY = member.positionY ?? 0;
        const memberCenterX = memberX + NODE_CARD_WIDTH / 2;
        const memberCenterY = memberY + NODE_CARD_HEIGHT / 2;
        const distance = Math.hypot(position.x - memberCenterX, position.y - memberCenterY);

        if (distance > AUTO_ATTACH_DISTANCE) {
          return closest;
        }

        if (!closest) {
          return member;
        }

        const closestX = (closest.positionX ?? 0) + NODE_CARD_WIDTH / 2;
        const closestY = (closest.positionY ?? 0) + NODE_CARD_HEIGHT / 2;
        const closestDistance = Math.hypot(position.x - closestX, position.y - closestY);

        return distance < closestDistance ? member : closest;
      }, null);

      const newMember: FamilyMember = {
        id: createEntityId('m'),
        name: type === 'male' ? 'Anggota Laki-laki' : 'Anggota Perempuan',
        gender: type,
        status: 'alive',
        positionX: anchoredPosition.x,
        positionY: anchoredPosition.y,
      };

      let nextMembers = [...members, newMember];
      let nextRelations = relations;

      if (nearestMember) {
        const nearestY = nearestMember.positionY ?? 0;
        const isDroppedAbove = anchoredPosition.y < nearestY - DROP_VERTICAL_BUFFER;
        const isDroppedBelow = anchoredPosition.y > nearestY + DROP_VERTICAL_BUFFER;
        const parentRelation = relations.find((relation) => relation.childId === nearestMember.id);

        if (isDroppedBelow) {
          const childCount = relations.filter((relation) => relation.parentId === nearestMember.id).length;
          newMember.birthYear = nearestMember.birthYear ? nearestMember.birthYear + 25 : undefined;
          newMember.birthOrder = childCount + 1;
          nextRelations = [
            ...relations,
            {
              id: createEntityId('r'),
              parentId: nearestMember.id,
              childId: newMember.id,
            },
          ];
          nextMembers = applyAutoLayout(nextMembers, nextRelations, true);
        } else if (isDroppedAbove && !parentRelation) {
          newMember.birthYear = nearestMember.birthYear ? nearestMember.birthYear - 25 : undefined;
          nextRelations = [
            ...relations,
            {
              id: createEntityId('r'),
              parentId: newMember.id,
              childId: nearestMember.id,
            },
          ];
          nextMembers = applyAutoLayout(nextMembers, nextRelations, true);
        } else if (parentRelation) {
          const siblingCount = relations.filter((relation) => relation.parentId === parentRelation.parentId).length;
          newMember.birthOrder = siblingCount + 1;
          nextRelations = [
            ...relations,
            {
              id: createEntityId('r'),
              parentId: parentRelation.parentId,
              childId: newMember.id,
            },
          ];
          nextMembers = applyAutoLayout(nextMembers, nextRelations, true);
        }
      }

      setMembers(nextMembers);
      setRelations(nextRelations);
      setSelectedMemberId(newMember.id);
      persistTreeData(nextMembers, nextRelations);
    },
    [applyAutoLayout, persistTreeData, screenToFlowPosition, members, relations]
  );

  const handleAddMemberFromPalette = useCallback((gender: 'male' | 'female') => {
    const selectedMember = members.find((member) => member.id === selectedMemberId) || null;
    const fallbackIndex = members.length;

    const newMember: FamilyMember = {
      id: createEntityId('m'),
      name: gender === 'male' ? 'Anggota Laki-laki' : 'Anggota Perempuan',
      gender,
      status: 'alive',
      positionX: selectedMember
        ? (selectedMember.positionX ?? 240) + NODE_CARD_WIDTH + 40
        : 220 + (fallbackIndex % 2) * 180,
      positionY: selectedMember
        ? selectedMember.positionY ?? 120
        : 80 + Math.floor(fallbackIndex / 2) * 170,
    };

    const nextMembers = [...members, newMember];
    setMembers(nextMembers);
    setSelectedMemberId(newMember.id);
    persistTreeData(nextMembers, relations);
  }, [members, persistTreeData, relations, selectedMemberId]);

  // Node position changes from dragging
  const handleNodesChange = (changes: NodeChange[]) => {
    const dimensionChanges = changes.filter(
      isDimensionChange
    );

    if (dimensionChanges.length > 0) {
      setNodeDimensions((currentDimensions) => {
        const nextDimensions = { ...currentDimensions };
        let hasUpdates = false;

        dimensionChanges.forEach((change) => {
          const width = change.dimensions.width;
          const height = change.dimensions.height;
          const existing = currentDimensions[change.id];

          if (!existing || existing.width !== width || existing.height !== height) {
            nextDimensions[change.id] = { width, height };
            hasUpdates = true;
          }
        });

        return hasUpdates ? nextDimensions : currentDimensions;
      });
    }

    const positionChanges = changes.filter(isPositionChange);

    if (positionChanges.length === 0) {
      return;
    }

    setMembers((currentMembers) => {
      const updated = currentMembers.map((m) => {
        const change = positionChanges.find((c) => c.id === m.id);
        if (change && change.position) {
          return {
            ...m,
            positionX: change.position.x,
            positionY: change.position.y,
          };
        }
        return m;
      });
      // Save updated positions
      persistTreeData(updated, relations);
      return updated;
    });
  };

  // Connect two nodes manually via canvas handles
  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    
    // Prevent self connections
    if (connection.source === connection.target) return;

    // Check if relationship already exists
    const exists = relations.some(
      (r) => r.parentId === connection.source && r.childId === connection.target
    );
    if (exists) return;

    // Check if target child already has a parent (single-parent direct lineage focus, but let's allow multiple parents if user drags manually, or limit to 1 parent if strictly enforcing simplified tree)
    const hasParent = relations.some((r) => r.childId === connection.target);
    if (hasParent) {
      alert('Dalam aplikasi silsilah sederhana ini, setiap anak hanya dihubungkan ke satu garis keturunan langsung (satu orang tua) agar bagan tetap rapi.');
      return;
    }

    const newRelation: FamilyRelation = {
      id: createEntityId('r'),
      parentId: connection.source,
      childId: connection.target,
    };

    const newRelations = [...relations, newRelation];
    setRelations(newRelations);
    persistTreeData(members, newRelations);
  }, [persistTreeData, relations, members]);

  // Add a new root node (when tree is empty)
  const handleAddRoot = () => {
    const newRoot: FamilyMember = {
      id: createEntityId('m'),
      name: 'Kepala Keluarga (Mbah/Bapak)',
      gender: 'male',
      birthYear: 1950,
      birthOrder: 1,
      status: 'alive',
      positionX: 350,
      positionY: 50,
      notes: 'Mulai edit data di samping',
    };
    const newMembers = [newRoot];
    setMembers(newMembers);
    setSelectedMemberId(newRoot.id);
    persistTreeData(newMembers, relations);
  };

  // Add child to a member
  const handleAddChild = (parentId: string) => {
    const parent = members.find((m) => m.id === parentId);
    if (!parent) return;

    const parentChildren = relations.filter(r => r.parentId === parentId);
    const nextBirthOrder = parentChildren.length + 1;

    const newChild: FamilyMember = {
      id: createEntityId('m'),
      name: `Anak dari ${parent.name}`,
      gender: 'male',
      birthYear: parent.birthYear ? parent.birthYear + 25 : undefined,
      birthOrder: nextBirthOrder,
      status: 'alive',
      // Place slightly offset down-left or down-right initially
      positionX: (parent.positionX ?? 300) + (parentChildren.length * 150) - 100,
      positionY: (parent.positionY ?? 50) + 200,
    };

    const newRelation: FamilyRelation = {
      id: createEntityId('r'),
      parentId: parentId,
      childId: newChild.id,
    };

    const newMembers = [...members, newChild];
    const newRelations = [...relations, newRelation];

    // Trigger auto-layout to arrange them nicely
    const layoutPositions = autoLayoutTree(newMembers, newRelations);
    const layoutedMembers = newMembers.map(m => ({
      ...m,
      positionX: layoutPositions[m.id]?.x ?? m.positionX,
      positionY: layoutPositions[m.id]?.y ?? m.positionY,
    }));

    setMembers(layoutedMembers);
    setRelations(newRelations);
    setSelectedMemberId(newChild.id);
    persistTreeData(layoutedMembers, newRelations);
  };

  // Add sibling to a member
  const handleAddSibling = (memberId: string) => {
    const parentRel = relations.find((r) => r.childId === memberId);
    if (!parentRel) return; // Cannot add sibling if they have no parent

    const parentId = parentRel.parentId;
    const parent = members.find((m) => m.id === parentId);
    if (!parent) return;

    const parentChildren = relations.filter(r => r.parentId === parentId);
    const nextBirthOrder = parentChildren.length + 1;

    const newSibling: FamilyMember = {
      id: createEntityId('m'),
      name: `Saudara dari ${members.find(m => m.id === memberId)?.name}`,
      gender: 'male',
      birthYear: parent.birthYear ? parent.birthYear + 25 : undefined,
      birthOrder: nextBirthOrder,
      status: 'alive',
      positionX: (parent.positionX ?? 300) + (parentChildren.length * 150) - 100,
      positionY: (parent.positionY ?? 50) + 200,
    };

    const newRelation: FamilyRelation = {
      id: createEntityId('r'),
      parentId: parentId,
      childId: newSibling.id,
    };

    const newMembers = [...members, newSibling];
    const newRelations = [...relations, newRelation];

    const layoutPositions = autoLayoutTree(newMembers, newRelations);
    const layoutedMembers = newMembers.map(m => ({
      ...m,
      positionX: layoutPositions[m.id]?.x ?? m.positionX,
      positionY: layoutPositions[m.id]?.y ?? m.positionY,
    }));

    setMembers(layoutedMembers);
    setRelations(newRelations);
    setSelectedMemberId(newSibling.id);
    persistTreeData(layoutedMembers, newRelations);
  };

  // Add parent to a member
  const handleAddParent = (childId: string) => {
    const child = members.find((m) => m.id === childId);
    if (!child) return;

    // Verify they don't already have a parent
    const hasParent = relations.some((r) => r.childId === childId);
    if (hasParent) return;

    const newParent: FamilyMember = {
      id: createEntityId('m'),
      name: `Orang Tua dari ${child.name}`,
      gender: 'male',
      birthYear: child.birthYear ? child.birthYear - 25 : undefined,
      birthOrder: 1,
      status: 'alive',
      positionX: child.positionX ?? 300,
      positionY: Math.max(50, (child.positionY ?? 200) - 200),
    };

    const newRelation: FamilyRelation = {
      id: createEntityId('r'),
      parentId: newParent.id,
      childId: childId,
    };

    const newMembers = [...members, newParent];
    const newRelations = [...relations, newRelation];

    const layoutPositions = autoLayoutTree(newMembers, newRelations);
    const layoutedMembers = newMembers.map(m => ({
      ...m,
      positionX: layoutPositions[m.id]?.x ?? m.positionX,
      positionY: layoutPositions[m.id]?.y ?? m.positionY,
    }));

    setMembers(layoutedMembers);
    setRelations(newRelations);
    setSelectedMemberId(newParent.id);
    persistTreeData(layoutedMembers, newRelations);
  };

  // Save changes to a member's details
  const handleSaveMemberDetails = (updatedMember: FamilyMember) => {
    const updatedMembers = members.map((m) =>
      m.id === updatedMember.id ? updatedMember : m
    );
    setMembers(updatedMembers);
    persistTreeData(updatedMembers, relations);
  };

  // Delete a member
  const handleDeleteMember = (memberId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus anggota keluarga ini beserta seluruh hubungannya?')) return;

    const updatedMembers = members.filter((m) => m.id !== memberId);
    const updatedRelations = relations.filter(
      (r) => r.parentId !== memberId && r.childId !== memberId
    );

    // Reset kinship selections if the deleted member was selected
    if (selfId === memberId) setSelfId(null);
    if (targetId === memberId) setTargetId(null);
    if (selectedMemberId === memberId) setSelectedMemberId(null);

    const layoutPositions = autoLayoutTree(updatedMembers, updatedRelations);
    const layoutedMembers = updatedMembers.map(m => ({
      ...m,
      positionX: layoutPositions[m.id]?.x ?? m.positionX,
      positionY: layoutPositions[m.id]?.y ?? m.positionY,
    }));

    setMembers(layoutedMembers);
    setRelations(updatedRelations);
    persistTreeData(layoutedMembers, updatedRelations);
  };

  // Manual Trigger: Auto Layout Tree
  const handleAutoLayout = () => {
    if (members.length === 0) return;
    const layoutPositions = autoLayoutTree(members, relations);
    const layoutedMembers = members.map((m) => ({
      ...m,
      positionX: layoutPositions[m.id]?.x ?? m.positionX,
      positionY: layoutPositions[m.id]?.y ?? m.positionY,
    }));
    setMembers(layoutedMembers);
    persistTreeData(layoutedMembers, relations);
  };

  // Reset entire family tree
  const handleResetTree = () => {
    if (!window.confirm('Apakah Anda yakin ingin mengosongkan seluruh silsilah keluarga?')) return;
    setMembers([]);
    setRelations([]);
    setSelectedMemberId(null);
    setSelfId(null);
    setTargetId(null);
    setHighlightedPath([]);
    clearFamilyTree()
      .then(() => {
        setStorageStatus(isSupabaseStorageEnabled() ? 'supabase' : 'local');
      })
      .catch((error) => {
        console.error('Failed to clear family tree', error);
        setStorageStatus('offline');
      });
  };

  // Import JSON tree data
  const handleImportTree = (data: FamilyTreeData) => {
    const layoutPositions = autoLayoutTree(data.members, data.relations);
    const layoutedMembers = data.members.map((m) => ({
      ...m,
      positionX: m.positionX ?? layoutPositions[m.id]?.x ?? 250,
      positionY: m.positionY ?? layoutPositions[m.id]?.y ?? 50,
    }));
    setMembers(layoutedMembers);
    setRelations(data.relations);
    setSelectedMemberId(null);
    setSelfId(null);
    setTargetId(null);
    setHighlightedPath([]);
    persistTreeData(layoutedMembers, data.relations);
  };

  // Export JSON file download
  const handleExportTree = () => {
    const dataStr = JSON.stringify({ members, relations }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `silsilah_keluarga_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Map state to React Flow Nodes format
  const flowNodes = useMemo(() => {
    return members.map((m) => {
      const posX = typeof m.positionX === 'number' && !Number.isNaN(m.positionX) ? m.positionX : 0;
      const posY = typeof m.positionY === 'number' && !Number.isNaN(m.positionY) ? m.positionY : 0;
      const measuredDimensions = nodeDimensions[m.id];
      return {
        id: m.id,
        type: 'familyNode',
        width: measuredDimensions?.width ?? NODE_CARD_WIDTH,
        height: measuredDimensions?.height ?? NODE_CARD_HEIGHT,
        initialWidth: NODE_CARD_WIDTH,
        initialHeight: NODE_CARD_HEIGHT,
        measured: measuredDimensions,
        position: { x: posX, y: posY },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        style: {
          width: NODE_CARD_WIDTH,
          minHeight: NODE_CARD_HEIGHT,
        },
        data: {
          member: m,
          isSelf: selfId === m.id,
          isTarget: targetId === m.id,
          isHighlighted: highlightedPath.includes(m.id),
          hasParent: relations.some((r) => r.childId === m.id),
          onSelectSelf: (id: string) => setSelfId(id === selfId ? null : id),
          onSelectTarget: (id: string) => setTargetId(id === targetId ? null : id),
          onEdit: (member: FamilyMember) => setSelectedMemberId(member.id),
          onAddChild: handleAddChild,
          onAddParent: handleAddParent,
          onAddSibling: handleAddSibling,
        },
      };
    });
  }, [members, nodeDimensions, selfId, targetId, highlightedPath, relations]);

  // Map state to React Flow Edges format
  const flowEdges = useMemo(() => {
    return relations.map((r) => {
      // An edge is highlighted if both endpoints are in the highlightedPath AND they are adjacent in the path
      const idxA = highlightedPath.indexOf(r.parentId);
      const idxB = highlightedPath.indexOf(r.childId);
      const isHighlighted =
        idxA !== -1 && idxB !== -1 && Math.abs(idxA - idxB) === 1;

      return {
        id: r.id,
        source: r.parentId,
        target: r.childId,
        type: 'smoothstep',
        animated: isHighlighted,
        className: isHighlighted ? 'highlighted' : '',
      };
    });
  }, [relations, highlightedPath]);

  const selectedMember = members.find((m) => m.id === selectedMemberId) || null;
  const storageLabel = {
    loading: 'Menyambungkan',
    supabase: 'Supabase',
    local: 'Lokal',
    offline: 'Offline',
  }[storageStatus];

  return (
    <div className="app-container">
      {/* Canvas Area */}
      <div className="canvas-wrapper" onDragOver={onDragOver} onDrop={onDrop}>
        <div className="canvas-title-banner glass-panel">
          <Network size={20} color="#3b82f6" />
          <h1>PATRAHNIBATA</h1>
          <span className="logo-badge">JAWA EDITION</span>
          <span className={`storage-badge storage-${storageStatus}`}>{storageLabel}</span>
        </div>

        {/* Drag & Drop Block Palette */}
        <BlockPalette />

        {members.length > 0 && (
          <button className="layout-floating-btn" onClick={handleAutoLayout}>
            <Sparkles size={16} />
            <span>Rapikan Silsilah (Auto Layout)</span>
          </button>
        )}

        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={handleNodesChange}
          onConnect={handleConnect}
          onNodeClick={(_, node) => {
            if (node.data && node.data.onEdit) {
              node.data.onEdit(node.data.member);
            }
          }}
          onPaneClick={() => setSelectedMemberId(null)}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.2}
          maxZoom={1.5}
        >
          <Background color="#cbd5e1" gap={20} size={1} />
          <Controls />
        </ReactFlow>

        <div className="desktop-kinship-shell">
          <KinshipCalculator
            members={members}
            relations={relations}
            selfId={selfId}
            targetId={targetId}
            onSelectSelf={setSelfId}
            onSelectTarget={setTargetId}
            onHighlightPath={setHighlightedPath}
          />
        </div>
      </div>

      <div className="mobile-kinship-shell">
        <KinshipCalculator
          members={members}
          relations={relations}
          selfId={selfId}
          targetId={targetId}
          onSelectSelf={setSelfId}
          onSelectTarget={setTargetId}
          onHighlightPath={setHighlightedPath}
        />
      </div>

      {/* Editor Sidebar Panel */}
      <Sidebar
        selectedMember={selectedMember}
        members={members}
        relations={relations}
        onSave={handleSaveMemberDetails}
        onDelete={handleDeleteMember}
        onAddParent={handleAddParent}
        onAddSibling={handleAddSibling}
        onAddChild={handleAddChild}
        onClose={() => setSelectedMemberId(null)}
        onImport={handleImportTree}
        onExport={handleExportTree}
        onReset={handleResetTree}
        onAddRoot={handleAddRoot}
        onAddMemberFromPalette={handleAddMemberFromPalette}
      />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  );
}
