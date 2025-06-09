import crypto from 'node:crypto';

// Полностью отключена аналитика для локальной версии
const analytics = null;

import { net } from 'electron';
import { v4 as uuidv4 } from 'uuid';

import {
  getApiBaseURL,
  getAppPlatform,
  getAppVersion,
  getClientString,
  getProductName,
  getSegmentWriteKey,
} from '../common/constants';
import * as models from '../models/index';

const getDeviceId = async () => {
  // Возвращаем статический ID для локальной версии
  return 'local-device-id';
};

export enum SegmentEvent {
  appStarted = 'App Started',
  collectionCreate = 'Collection Created',
  dataExport = 'Data Exported',
  dataImport = 'Data Imported',
  loginSuccess = 'Login Success',
  documentCreate = 'Document Created',
  kongConnected = 'Kong Connected',
  kongSync = 'Kong Synced',
  requestBodyTypeSelect = 'Request Body Type Selected',
  requestCreate = 'Request Created',
  requestExecute = 'Request Executed',
  collectionRunExecute = 'Collection Run Executed',
  projectLocalCreate = 'Local Project Created',
  projectLocalDelete = 'Local Project Deleted',
  testSuiteCreate = 'Test Suite Created',
  testSuiteDelete = 'Test Suite Deleted',
  unitTestCreate = 'Unit Test Created',
  unitTestDelete = 'Unit Test Deleted',
  unitTestRun = 'Ran Individual Unit Test',
  unitTestRunAll = 'Ran All Unit Tests',
  vcsSyncStart = 'VCS Sync Started',
  vcsSyncComplete = 'VCS Sync Completed',
  vcsAction = 'VCS Action Executed',
  buttonClick = 'Button Clicked',
}

function hashString(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export async function trackSegmentEvent(event: SegmentEvent, properties?: Record<string, any>) {
  // Аналитика отключена для локальной версии
  console.log('[analytics] Event disabled in local version:', event, properties);
}

export async function trackPageView(name: string) {
  // Аналитика отключена для локальной версии  
  console.log('[analytics] Page view disabled in local version:', name);
}

// ~~~~~~~~~~~~~~~~~ //
// Private Functions //
// ~~~~~~~~~~~~~~~~~ //
function _getOsName() {
  switch (process.platform) {
    case 'darwin':
      return 'Mac';
    case 'win32':
      return 'Windows';
    default:
      return 'Linux';
  }
}
