export type Weekday = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes';

export interface DayMenu {
  weekday: Weekday;
  platoDelDia: string;
  precioPlatoDelDia: number | null;
  precioMenu: number | null;
  primeros: string[];
  segundos: string[];
  postres: string[];
  telefono: string;
  notas?: string;
}

export interface MenuSettings {
  footerLines: string[];
}

export interface MenuState {
  version: 1;
  days: Record<Weekday, DayMenu>;
  settings: MenuSettings;
}
