import type { FamilyMember, FamilyRelation } from '../types/family';

export interface KinshipPathStep {
  id: string;
  type: 'self' | 'parent' | 'child';
}

export interface KinshipResult {
  path: KinshipPathStep[];
  relationshipName: string;
  pathDescription: string;
  stepsUp: number;
  stepsDown: number;
}

// Helper to check if member1 is older than member2
export function isOlder(m1: FamilyMember, m2: FamilyMember): boolean {
  if (m1.birthYear !== undefined && m2.birthYear !== undefined) {
    return m1.birthYear < m2.birthYear;
  }
  if (m1.birthOrder !== undefined && m2.birthOrder !== undefined) {
    // If birthOrder is specified, lower means older (e.g. 1st child is older than 2nd)
    return m1.birthOrder < m2.birthOrder;
  }
  // Default fallback if no data
  return false;
}

export function calculateKinship(
  members: FamilyMember[],
  relations: FamilyRelation[],
  sourceId: string,
  targetId: string
): KinshipResult | null {
  if (sourceId === targetId) {
    const member = members.find(m => m.id === sourceId);
    return {
      path: [{ id: sourceId, type: 'self' }],
      relationshipName: 'Diri Sendiri',
      pathDescription: member ? member.name : 'Saya',
      stepsUp: 0,
      stepsDown: 0,
    };
  }

  // Build adjacency list for undirected graph traversal
  // Each node points to neighbors with relation type: 'parent' (moving up) or 'child' (moving down)
  const adj: { [id: string]: { id: string; type: 'parent' | 'child' }[] } = {};
  
  // Initialize nodes
  members.forEach(m => {
    adj[m.id] = [];
  });

  // Populate edges
  relations.forEach(rel => {
    // Parent to Child
    if (adj[rel.parentId] && adj[rel.childId]) {
      adj[rel.parentId].push({ id: rel.childId, type: 'child' });
      adj[rel.childId].push({ id: rel.parentId, type: 'parent' });
    }
  });

  // BFS to find the shortest path
  const queue: { id: string; path: KinshipPathStep[] }[] = [];
  const visited = new Set<string>();

  queue.push({ id: sourceId, path: [{ id: sourceId, type: 'self' }] });
  visited.add(sourceId);

  let foundPath: KinshipPathStep[] | null = null;

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.id === targetId) {
      foundPath = current.path;
      break;
    }

    const neighbors = adj[current.id] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.id)) {
        visited.add(neighbor.id);
        queue.push({
          id: neighbor.id,
          path: [...current.path, { id: neighbor.id, type: neighbor.type }],
        });
      }
    }
  }

  if (!foundPath) return null;

  // Analyze path to count steps up and steps down
  // In a tree, the path will go UP u times, then DOWN d times.
  let stepsUp = 0;
  let stepsDown = 0;
  
  // The first element is 'self', so we look at elements from index 1
  for (let i = 1; i < foundPath.length; i++) {
    if (foundPath[i].type === 'parent') {
      stepsUp++;
    } else {
      stepsDown++;
    }
  }

  const memberMap = new Map<string, FamilyMember>();
  members.forEach(m => memberMap.set(m.id, m));

  const S = memberMap.get(sourceId)!;
  const T = memberMap.get(targetId)!;
  
  const lcaIndex = stepsUp; // LCA is at the transition point
  const LCA = memberMap.get(foundPath[lcaIndex].id)!;

  // Let's get parent of S and parent of T along the path if they exist
  const parentOfS = stepsUp >= 1 ? memberMap.get(foundPath[1].id) : undefined;
  const parentOfT = stepsDown >= 1 ? memberMap.get(foundPath[foundPath.length - 2].id) : undefined;

  let relationshipName = 'Kerabat';
  let pathDescription = '';

  // Determine relationship terms in Javanese/Casual Indonesian Family naming
  if (stepsUp > 0 && stepsDown === 0) {
    // 1. Direct Ancestors (UP only)
    if (stepsUp === 1) {
      relationshipName = T.gender === 'male' ? 'Bapak' : T.gender === 'female' ? 'Ibu' : 'Orang Tua';
      pathDescription = relationshipName;
    } else if (stepsUp === 2) {
      relationshipName = T.gender === 'male' ? 'Mbah Kakung (Kakek)' : T.gender === 'female' ? 'Mbah Putri (Nenek)' : 'Simbah';
      pathDescription = `Orang tua dari ${parentOfS?.name}`;
    } else if (stepsUp === 3) {
      relationshipName = 'Mbah Buyut';
      pathDescription = `Kakek/Nenek dari ${parentOfS?.name}`;
    } else if (stepsUp === 4) {
      relationshipName = 'Mbah Canggah';
      pathDescription = `Mbah Buyut dari ${parentOfS?.name}`;
    } else {
      relationshipName = 'Moyang / Leluhur';
      pathDescription = `${stepsUp} generasi ke atas`;
    }
  } else if (stepsUp === 0 && stepsDown > 0) {
    // 2. Direct Descendants (DOWN only)
    if (stepsDown === 1) {
      relationshipName = T.gender === 'male' ? 'Anak Lanang (Laki-laki)' : T.gender === 'female' ? 'Anak Wadon (Perempuan)' : 'Anak';
      pathDescription = 'Anak kandung';
    } else if (stepsDown === 2) {
      relationshipName = 'Putu (Cucu)';
      pathDescription = `Anak dari ${parentOfT?.name}`;
    } else if (stepsDown === 3) {
      relationshipName = 'Buyut (Cicit)';
      pathDescription = `Cucu dari ${parentOfT?.name}`;
    } else if (stepsDown === 4) {
      relationshipName = 'Canggah';
      pathDescription = `Cicit dari ${parentOfT?.name}`;
    } else {
      relationshipName = 'Keturunan';
      pathDescription = `${stepsDown} generasi ke bawah`;
    }
  } else if (stepsUp === 1 && stepsDown === 1) {
    // 3. Siblings (1 UP, 1 DOWN)
    const isT_Older = isOlder(T, S);
    if (isT_Older) {
      relationshipName = T.gender === 'male' ? 'Mas (Kakak Laki-laki)' : T.gender === 'female' ? 'Mbak (Kakak Perempuan)' : 'Kakak';
    } else {
      relationshipName = 'Adik (Dek)';
    }
    pathDescription = `Saudara kandung (satu orang tua: ${LCA.name})`;
  } else if (stepsUp === 2 && stepsDown === 1) {
    // 4. Parent's Sibling (Uncle/Aunt)
    // LCA is Grandparent. parentOfS is S's parent. T is sibling of parentOfS.
    if (parentOfS) {
      const isT_OlderThanParent = isOlder(T, parentOfS);
      if (isT_OlderThanParent) {
        relationshipName = T.gender === 'male' ? 'Pakde (Kakak Laki-laki Orang Tua)' : T.gender === 'female' ? 'Bude (Kakak Perempuan Orang Tua)' : 'Kakak Orang Tua';
      } else {
        relationshipName = T.gender === 'male' ? 'Paklek / Om (Adik Laki-laki Orang Tua)' : T.gender === 'female' ? 'Bulek / Tante (Adik Perempuan Orang Tua)' : 'Adik Orang Tua';
      }
      pathDescription = `Saudara dari ${parentOfS.name} (Anak dari ${LCA.name})`;
    }
  } else if (stepsUp === 1 && stepsDown === 2) {
    // 5. Sibling's Child (Nephew/Niece)
    // parentOfT is S's sibling. T is child of parentOfT.
    if (parentOfT) {
      relationshipName = 'Keponakan';
      const isParentOlder = isOlder(parentOfT, S);
      const parentRelation = parentOfT.gender === 'male' 
        ? (isParentOlder ? 'Mas' : 'Adik') 
        : (isParentOlder ? 'Mbak' : 'Adik');
      pathDescription = `Anak dari ${parentOfT.name} (${parentRelation} Anda)`;
    }
  } else if (stepsUp === 2 && stepsDown === 2) {
    // 6. Cousins (2 UP, 2 DOWN)
    // parentOfS and parentOfT are siblings. LCA is Grandparent.
    if (parentOfS && parentOfT) {
      const isT_OlderThanS = isOlder(T, S);
      const cousinCall = isT_OlderThanS 
        ? (T.gender === 'male' ? 'Mas' : T.gender === 'female' ? 'Mbak' : 'Kakak')
        : 'Adik';
      relationshipName = `${cousinCall} Sepupu`;
      pathDescription = `Anak dari ${parentOfT.name} (${parentOfT.gender === 'male' ? 'Pakde/Paklek' : 'Bude/Bulek'} Anda)`;
    }
  } else if (stepsUp === 3 && stepsDown === 1) {
    // 7. Grandparent's Sibling
    if (parentOfS) {
      // foundPath[2] is S's grandparent. T is sibling of grandparent.
      const grandparent = memberMap.get(foundPath[2].id)!;
      const isT_OlderThanGP = isOlder(T, grandparent);
      if (isT_OlderThanGP) {
        relationshipName = T.gender === 'male' ? 'Mbah Pakde (Kakak Mbah)' : T.gender === 'female' ? 'Mbah Bude (Kakak Mbah)' : 'Kakak Mbah';
      } else {
        relationshipName = T.gender === 'male' ? 'Mbah Paklek (Adik Mbah)' : T.gender === 'female' ? 'Mbah Bulek (Adik Mbah)' : 'Adik Mbah';
      }
      pathDescription = `Saudara dari Mbah ${grandparent.name} (Anak dari ${LCA.name})`;
    }
  } else if (stepsUp === 1 && stepsDown === 3) {
    // 8. Sibling's Grandchild
    if (parentOfT) {
      relationshipName = 'Putu Keponakan (Cucu dari Saudara)';
      pathDescription = `Cucu dari saudara kandung Anda (${foundPath[1].type === 'child' ? 'anak dari saudara' : ''})`;
    }
  } else if (stepsUp === 3 && stepsDown === 2) {
    // 9. Parent's Cousin
    relationshipName = T.gender === 'male' ? 'Paman (Om/Pakde)' : T.gender === 'female' ? 'Bibi (Tante/Bude)' : 'Kerabat Orang Tua';
    pathDescription = `Sepupu dari Orang Tua Anda (Anak dari Mbah ${foundPath[2].id ? memberMap.get(foundPath[2].id)?.name : ''})`;
  } else if (stepsUp === 2 && stepsDown === 3) {
    // 10. Cousin's Child
    relationshipName = 'Keponakan Misan';
    pathDescription = `Anak dari sepupu Anda (${parentOfT?.name})`;
  } else {
    // Fallback description for very distant relationships
    relationshipName = 'Sedulur (Kerabat Jauh)';
    pathDescription = `Jalur: ${stepsUp} tingkat ke atas ke ${LCA.name}, lalu ${stepsDown} tingkat ke bawah ke ${T.name}`;
  }

  return {
    path: foundPath,
    relationshipName,
    pathDescription,
    stepsUp,
    stepsDown,
  };
}
