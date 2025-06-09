// API вызовы к облачным сервисам отключены для локальной версии

async function insomniaFetchFunction<T = any>(): Promise<T> {
  throw new Error('API calls to cloud services disabled in local version');
  }

// Именованный экспорт для совместимости
export const insomniaFetch = insomniaFetchFunction;

// Экспорт по умолчанию
export default insomniaFetchFunction; 
