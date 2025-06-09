// Система обновлений отключена для локальной версии

export type UpdateStatus =
  | 'Update Error'
  | 'Up to Date'
  | 'Downloading...'
  | 'Performing backup...'
  | 'Updated (Restart Required)'
  | 'Checking'
  | 'Updates Not Supported'
  | 'Check Now';

export const init = async () => {
  // Обновления отключены для локальной версии
  console.log('[updates] Disabled in local version');
};
