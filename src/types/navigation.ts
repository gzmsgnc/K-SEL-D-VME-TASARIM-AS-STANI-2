export type AppRoute =
  | 'DASHBOARD'
  | 'CLIENTS'
  | 'ANALYSIS_HUB'
  | 'SYMBOL_LIBRARY'
  | 'DESIGN_STUDIO'
  | 'DESIGN_REPORTS'
  | 'SYSTEM_ADMIN'
  | 'CLIENT_FORM';

export type WorkspaceDetailTab =
  | 'PERSONAL_BIRTH'
  | 'ANALYSES'
  | 'TESTS'
  | 'SYMBOLS'
  | 'RECIPE'
  | 'DESIGN'
  | 'RESULTS';

export interface NavigationItem {
  id: AppRoute;
  labelTr: string;
  shortLabelTr?: string;
  descriptionTr: string;
  iconName: string;
}
