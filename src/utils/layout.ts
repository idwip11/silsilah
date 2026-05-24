import type { FamilyMember, FamilyRelation } from '../types/family';

interface LayoutResult {
  [id: string]: { x: number; y: number };
}

export function autoLayoutTree(
  members: FamilyMember[],
  relations: FamilyRelation[]
): LayoutResult {
  const result: LayoutResult = {};
  if (members.length === 0) return result;

  // Build parent-to-children mapping
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string[]>();
  
  members.forEach(m => {
    childrenMap.set(m.id, []);
    parentMap.set(m.id, []);
  });

  relations.forEach(rel => {
    const children = childrenMap.get(rel.parentId) || [];
    children.push(rel.childId);
    childrenMap.set(rel.parentId, children);

    const parents = parentMap.get(rel.childId) || [];
    parents.push(rel.parentId);
    parentMap.set(rel.childId, parents);
  });

  // Sort children by birthYear/birthOrder if available
  members.forEach(m => {
    const children = childrenMap.get(m.id) || [];
    children.sort((a, b) => {
      const memberA = members.find(x => x.id === a);
      const memberB = members.find(x => x.id === b);
      if (!memberA || !memberB) return 0;
      if (memberA.birthYear !== undefined && memberB.birthYear !== undefined) {
        return memberA.birthYear - memberB.birthYear;
      }
      if (memberA.birthOrder !== undefined && memberB.birthOrder !== undefined) {
        return memberA.birthOrder - memberB.birthOrder;
      }
      return 0;
    });
    childrenMap.set(m.id, children);
  });

  // Find root nodes (nodes with no parents)
  const roots = members.filter(m => {
    const parents = parentMap.get(m.id) || [];
    return parents.length === 0;
  });

  // If there are no roots but there are members (e.g. cycle, which shouldn't happen),
  // pick the first member as root
  if (roots.length === 0 && members.length > 0) {
    roots.push(members[0]);
  }

  const nodeWidth = 220;
  const hGap = 40; // horizontal gap
  const vGap = 200; // vertical gap (distance between levels)

  let currentLeftBound = 0;

  // Recursive layout helper
  // Returns width of the subtree and updates result with positions
  function layoutSubtree(nodeId: string, level: number, leftBound: number): { width: number; x: number } {
    const children = childrenMap.get(nodeId) || [];
    const y = level * vGap + 50;

    if (children.length === 0) {
      const width = nodeWidth + hGap;
      const x = leftBound + (nodeWidth / 2);
      result[nodeId] = { x, y };
      return { width, x };
    }

    let childLeft = leftBound;
    const childXs: number[] = [];

    children.forEach(childId => {
      const { width: childSubtreeWidth, x: childX } = layoutSubtree(childId, level + 1, childLeft);
      childLeft += childSubtreeWidth;
      childXs.push(childX);
    });

    const subtreeWidth = childLeft - leftBound;
    // Position parent at the average of children positions
    const averageChildX = childXs.reduce((sum, x) => sum + x, 0) / childXs.length;
    
    result[nodeId] = { x: averageChildX, y };
    return { width: subtreeWidth, x: averageChildX };
  }

  // Layout each tree component
  roots.forEach(root => {
    const { width } = layoutSubtree(root.id, 0, currentLeftBound);
    currentLeftBound += width + 100; // 100px gap between separate family lines
  });

  return result;
}
