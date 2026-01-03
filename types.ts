
export type RenderMode = 'technical' | 'model';

export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'OS';

export type OutputProfile = 'Plotter' | 'A4_Tiled';
export type FileExtension = 'PLT' | 'HPGL' | 'DXF' | 'PDF';

export interface ModelSettings {
  gender: 'Female' | 'Male' | 'Unisex';
  ageGroup: 'Kids' | 'Teen' | 'Adult' | 'Senior';
  pose: 'Standing' | 'Sitting' | 'Walking' | 'Dynamic';
}

export interface PatternPiece {
  name: string;
  quantity: number;
  material: 'Main' | 'Contrast' | 'Lining' | 'Interfacing';
  notes: string;
  cutType?: 'Auto' | 'Die' | 'Manual';
  stretchFactor?: string;
}

export interface PatternData {
  measurements: Array<{
    point: string;
    description: string;
    m: string; 
    tolerance: string;
    grading: string; 
    originalValue?: number;
    isManualGrading?: boolean;
  }>;
  correctionNotes: string[];
  fabricConsumption: string;
  gradingRules: string;
  pieceInventory?: PatternPiece[];
  units?: 'cm' | 'in';
  gradingProfile?: 'Standard' | 'Athletic' | 'Relaxed' | 'Custom';
  customMultiplier?: number;
  construction?: 'Woven' | 'Knit';
  spirality?: number;
}

export interface SizeMix {
  [size: string]: number;
}

export type NestingStrategy = 'efficiency' | 'grainline' | 'speed';

export interface CuttingData {
  fabricWidth: number;
  efficiency: number;
  totalLengthUsed: string;
  wastagePercentage: number;
  markerImageUrl: string;
  cuttingInstructions: string[];
  pieceCount: number;
  sizeBreakdown?: SizeMix;
  strategy?: NestingStrategy;
  nettArea?: number;
  grossArea?: number;
  costPerMeter?: number;
  outputProfile?: OutputProfile;
  fileExtension?: FileExtension;
  totalPages?: number;
}

export interface BOMItem {
  item: string;
  specification: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface LaborOp {
  operation: string;
  department: string;
  smv: number;
  ratePerMinute: number;
  total: number;
}

export interface CostingData {
  region: string;
  currency: string;
  bom: BOMItem[];
  laborOps: LaborOp[];
  fabricGsm: number;
  markerWidth: number;
  estimatedCostPerUnit: number;
  totalLaborHours: number;
  breakdown: {
    material: number;
    labor: number;
    overhead: number;
  };
  markupPercentage: number;
}

export interface SocialMediaData {
  platform: string;
  vibe: string;
  adImageUrl: string;
  videoUrl?: string;
  copy: {
    headline: string;
    caption: string;
    hashtags: string[];
    cta: string;
  };
}

export interface HistoryItem {
  id: string;
  type: 'visualizer' | 'pattern' | 'cutting' | 'social' | 'costing';
  timestamp: number;
  title: string;
  previewUrl?: string;
  data: any;
}

export type TabType = 'visualizer' | 'pattern' | 'cutting' | 'costing' | 'social' | 'history';
