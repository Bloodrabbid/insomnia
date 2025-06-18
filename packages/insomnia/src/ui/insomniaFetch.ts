// API вызовы к облачным сервисам отключены для локальной версии

interface FetchConfig {
  method: 'POST' | 'PUT' | 'GET' | 'DELETE' | 'PATCH';
  path: string;
  sessionId: string | null;
  organizationId?: string | null;
  data?: unknown;
  retries?: number;
  origin?: string;
  headers?: Record<string, string>;
  onlyResolveOnSuccess?: boolean;
  timeout?: number;
}

// Заглушка для локальной версии - возвращает пустые данные вместо ошибки
async function insomniaFetchFunction<T = any>(config?: FetchConfig): Promise<T> {
  console.log('[insomniaFetch] Local mode: skipping API call to', config?.path);
  
  // Возвращаем разные заглушки в зависимости от пути
  if (config?.path?.includes('/organizations')) {
    return { organizations: [], data: [] } as T;
  }
  if (config?.path?.includes('/user')) {
    return { id: 'local-user', name: 'Local User' } as T;
  }
  if (config?.path?.includes('/features')) {
    return { 
      features: { gitSync: { enabled: false }, orgBasicRbac: { enabled: false } },
      billing: { isActive: true, accessDenied: false, expirationErrorMessage: '', expirationWarningMessage: '' }
    } as T;
  }
  if (config?.path?.includes('/collaborators')) {
    return { data: [] } as T;
  }
  if (config?.path?.includes('/team-projects')) {
    return { data: [] } as T;
  }
  
  // Для остальных случаев возвращаем пустой объект
  return {} as T;
}

// Именованный экспорт для совместимости
export const insomniaFetch = insomniaFetchFunction;

// Экспорт по умолчанию
export default insomniaFetchFunction; 
