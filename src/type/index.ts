export interface VisualSettings {
  density: "compact" | "comfortable";
  theme: "system" | "light" | "dark";
  motion: "standard" | "reduced";
  volume: number;
}

export interface ImportedSave {
  id: string;
  fileName: string;
  json: string;
  savedAt: string;
  day: number;
  money: number;
}
