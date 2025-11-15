export interface CellData {
  value: string | number | null;
  confidence: 'high' | 'medium' | 'low' | 'user'; 
}

export type TableRow = {
  [key: string]: CellData;
};

export type BarrelData = TableRow[];
