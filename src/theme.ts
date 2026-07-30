export type ThemeMode = 'dark' | 'light' | 'system';

export interface AppColors {
  background: string;
  backgroundElevated: string;
  cardBg: string;
  cardBorder: string;
  inputBg: string;
  primaryBlue: string;
  primarySoft: string;
  headerBlue: string;
  infoBlue: string;
  dangerRed: string;
  dangerSoft: string;
  warningYellow: string;
  warningSoft: string;
  safeGreen: string;
  safeSoft: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  white: string;
  buttonDark: string;
  overlay: string;
  shadow: string;
}

export const DARK_COLORS: AppColors = {
  background: '#07111F',
  backgroundElevated: '#0B1728',
  cardBg: '#101E31',
  cardBorder: '#21354D',
  inputBg: '#0A1626',
  primaryBlue: '#42A5FF',
  primarySoft: '#102E4C',
  headerBlue: '#42A5FF',
  infoBlue: '#42A5FF',
  dangerRed: '#FF5D68',
  dangerSoft: '#3A1822',
  warningYellow: '#F7B84B',
  warningSoft: '#382B16',
  safeGreen: '#35D39A',
  safeSoft: '#12352F',
  textPrimary: '#F5F9FF',
  textSecondary: '#A8B8CC',
  textMuted: '#71839A',
  white: '#FFFFFF',
  buttonDark: '#20344C',
  overlay: 'rgba(2, 8, 18, 0.72)',
  shadow: '#000000',
};

export const LIGHT_COLORS: AppColors = {
  background: '#F3F7FC',
  backgroundElevated: '#EAF1F9',
  cardBg: '#FFFFFF',
  cardBorder: '#D8E3EF',
  inputBg: '#F6F9FD',
  primaryBlue: '#0877D1',
  primarySoft: '#DDEEFF',
  headerBlue: '#0877D1',
  infoBlue: '#0877D1',
  dangerRed: '#D93648',
  dangerSoft: '#FDE8EB',
  warningYellow: '#B66B00',
  warningSoft: '#FFF0D5',
  safeGreen: '#087F5B',
  safeSoft: '#DDF5EC',
  textPrimary: '#102033',
  textSecondary: '#4D6075',
  textMuted: '#76889B',
  white: '#FFFFFF',
  buttonDark: '#DCE6F1',
  overlay: 'rgba(7, 17, 31, 0.46)',
  shadow: '#18324D',
};

// Compatibilidade temporária com telas ainda não migradas para tema dinâmico.
export const COLORS = DARK_COLORS;

export function colorWithAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const value = Number.parseInt(normalized, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
