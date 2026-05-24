export type Gender = 'male' | 'female' | 'other';
export type LifeStatus = 'alive' | 'deceased';

export interface FamilyMember {
  id: string;
  name: string;
  gender: Gender;
  birthYear?: number;
  birthOrder?: number; // 1 = anak pertama, 2 = anak kedua, dst.
  status: LifeStatus;
  notes?: string;
  positionX?: number;
  positionY?: number;
}

export interface FamilyRelation {
  id: string;
  parentId: string;
  childId: string;
}

export interface FamilyTreeData {
  members: FamilyMember[];
  relations: FamilyRelation[];
}
