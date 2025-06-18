// Сессии и аккаунты отключены для локальной версии

export const isLoggedIn = async () => false;

export const getPublicKey = () => '';

export const getAccountId = () => Promise.resolve('local-account-id');

export const getSessionId = () => Promise.resolve('local-session-id');

export const getEmail = () => '';

export const getFirstName = () => '';

export const getLastName = () => '';

export const absorbKey = async () => {
  console.log('[session] Auth disabled in local version');
};

export const migrateFromLocalStorage = () => {
  console.log('[session] Migration disabled in local version');
};

export const setSessionData = () => {
  console.log('[session] Session data disabled in local version');
};

export const setVaultSessionData = () => {
  console.log('[session] Vault session disabled in local version');
};

// Дополнительные экспорты для совместимости
export const getCurrentSessionId = async () => 'local-session-id';

export const getPrivateKey = async () => {
  throw new Error('Private key access disabled in local version');
};

export const logout = async () => {
  console.log('[session] Logout disabled in local version');
};

export const getUserSession = async (): Promise<SessionData> => {
  return {
    id: 'local-session-id',
    accountId: 'local-account-id',
    email: 'local@example.com',
    firstName: 'Local',
    lastName: 'User',
  };
};

export interface SessionData {
  id: string;
  accountId: string;
  email: string;
  firstName: string;
  lastName: string;
}
