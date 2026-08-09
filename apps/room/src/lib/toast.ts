export interface ToastNotice {
  id: number;
  kind: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  enableHtml: boolean;
}
