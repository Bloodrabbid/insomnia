// Note: we cannot import these from `node-libcurl` like normal because they come from the native library and it's not possible to load it while testing because it was built to run with Electron.
// That applies to these Enum type imports, but also applies to the members of the class below.

import { EventEmitter } from 'events';
import fs from 'fs';
import https from 'https';
import http from 'http';

// Define enums locally to avoid circular dependency
export const CurlAuth = {
  BASIC: 'BASIC',
  DIGEST: 'DIGEST',
  DIGEST_IE: 'DIGEST_IE',
  NEGOTIATE: 'NEGOTIATE',
  NTLM: 'NTLM',
  NTLM_WB: 'NTLM_WB',
  ANY: 'ANY',
  ANYSAFE: 'ANYSAFE',
  ONLY: 'ONLY',
};

export const CurlCode = {
  CURLE_OK: 0,
  CURLE_UNSUPPORTED_PROTOCOL: 1,
  CURLE_FAILED_INIT: 2,
  CURLE_URL_MALFORMAT: 3,
  CURLE_NOT_BUILT_IN: 4,
  CURLE_COULDNT_RESOLVE_PROXY: 5,
  CURLE_COULDNT_RESOLVE_HOST: 6,
  CURLE_COULDNT_CONNECT: 7,
  CURLE_WEIRD_SERVER_REPLY: 8,
  CURLE_REMOTE_ACCESS_DENIED: 9,
  CURLE_FTP_ACCEPT_FAILED: 10,
  CURLE_FTP_WEIRD_PASS_REPLY: 11,
  CURLE_FTP_ACCEPT_TIMEOUT: 12,
  CURLE_FTP_WEIRD_PASV_REPLY: 13,
  CURLE_FTP_WEIRD_227_FORMAT: 14,
  CURLE_FTP_CANT_GET_HOST: 15,
  CURLE_HTTP2: 16,
  CURLE_FTP_COULDNT_SET_TYPE: 17,
  CURLE_PARTIAL_FILE: 18,
  CURLE_FTP_COULDNT_RETR_FILE: 19,
  CURLE_OBSOLETE20: 20,
  CURLE_QUOTE_ERROR: 21,
  CURLE_HTTP_RETURNED_ERROR: 22,
  CURLE_WRITE_ERROR: 23,
  CURLE_OBSOLETE24: 24,
  CURLE_UPLOAD_FAILED: 25,
  CURLE_READ_ERROR: 26,
  CURLE_OUT_OF_MEMORY: 27,
  CURLE_OPERATION_TIMEDOUT: 28,
  CURLE_OBSOLETE29: 29,
  CURLE_FTP_PORT_FAILED: 30,
  CURLE_FTP_COULDNT_USE_REST: 31,
  CURLE_OBSOLETE32: 32,
  CURLE_RANGE_ERROR: 33,
  CURLE_HTTP_POST_ERROR: 34,
  CURLE_SSL_CONNECT_ERROR: 35,
  CURLE_BAD_DOWNLOAD_RESUME: 36,
  CURLE_FILE_COULDNT_READ_FILE: 37,
  CURLE_LDAP_CANNOT_BIND: 38,
  CURLE_LDAP_SEARCH_FAILED: 39,
  CURLE_OBSOLETE40: 40,
  CURLE_FUNCTION_NOT_FOUND: 41,
  CURLE_ABORTED_BY_CALLBACK: 42,
  CURLE_BAD_FUNCTION_ARGUMENT: 43,
  CURLE_OBSOLETE44: 44,
  CURLE_INTERFACE_FAILED: 45,
  CURLE_OBSOLETE46: 46,
  CURLE_TOO_MANY_REDIRECTS: 47,
  CURLE_UNKNOWN_OPTION: 48,
  CURLE_TELNET_OPTION_SYNTAX: 49,
  CURLE_OBSOLETE50: 50,
  CURLE_OBSOLETE51: 51,
  CURLE_GOT_NOTHING: 52,
  CURLE_SSL_ENGINE_NOTFOUND: 53,
  CURLE_SSL_ENGINE_SETFAILED: 54,
  CURLE_SEND_ERROR: 55,
  CURLE_RECV_ERROR: 56,
  CURLE_OBSOLETE57: 57,
  CURLE_SSL_CERTPROBLEM: 58,
  CURLE_SSL_CIPHER: 59,
  CURLE_PEER_FAILED_VERIFICATION: 60,
  CURLE_BAD_CONTENT_ENCODING: 61,
  CURLE_LDAP_INVALID_URL: 62,
  CURLE_FILESIZE_EXCEEDED: 63,
  CURLE_USE_SSL_FAILED: 64,
  CURLE_SEND_FAIL_REWIND: 65,
  CURLE_SSL_ENGINE_INITFAILED: 66,
  CURLE_LOGIN_DENIED: 67,
  CURLE_TFTP_NOTFOUND: 68,
  CURLE_TFTP_PERM: 69,
  CURLE_REMOTE_DISK_FULL: 70,
  CURLE_TFTP_ILLEGAL: 71,
  CURLE_TFTP_UNKNOWNID: 72,
  CURLE_REMOTE_FILE_EXISTS: 73,
  CURLE_TFTP_NOSUCHUSER: 74,
  CURLE_CONV_FAILED: 75,
  CURLE_CONV_REQD: 76,
  CURLE_SSL_CACERT_BADFILE: 77,
  CURLE_REMOTE_FILE_NOT_FOUND: 78,
  CURLE_SSH: 79,
  CURLE_SSL_SHUTDOWN_FAILED: 80,
  CURLE_AGAIN: 81,
  CURLE_SSL_CRL_BADFILE: 82,
  CURLE_SSL_ISSUER_ERROR: 83,
  CURLE_FTP_PRET_FAILED: 84,
  CURLE_RTSP_CSEQ_ERROR: 85,
  CURLE_RTSP_SESSION_ERROR: 86,
  CURLE_FTP_BAD_FILE_LIST: 87,
  CURLE_CHUNK_FAILED: 88,
  CURLE_NO_CONNECTION_AVAILABLE: 89,
  CURLE_SSL_PINNEDPUBKEYNOTMATCH: 90,
  CURLE_SSL_INVALIDCERTSTATUS: 91,
  CURLE_HTTP2_STREAM: 92,
  CURLE_RECURSIVE_API_CALL: 93,
  CURLE_AUTH_ERROR: 94,
  CURLE_HTTP3: 95,
  CURLE_QUIC_CONNECT_ERROR: 96,
  CURLE_PROXY: 97,
  CURLE_SSL_CLIENTCERT: 98,
  CURL_LAST: 99,
};

export const CurlFeature = {
  IPV6: 'IPV6',
  KERBEROS4: 'KERBEROS4',
  SSL: 'SSL',
  LIBZ: 'LIBZ',
  NTLM: 'NTLM',
  GSSNEGOTIATE: 'GSSNEGOTIATE',
  DEBUG: 'DEBUG',
  ASYNCHDNS: 'ASYNCHDNS',
  SPNEGO: 'SPNEGO',
  LARGEFILE: 'LARGEFILE',
  IDN: 'IDN',
  SSPI: 'SSPI',
  CONV: 'CONV',
  CURLDEBUG: 'CURLDEBUG',
  TLSAUTH_SRP: 'TLSAUTH_SRP',
  NTLM_WB: 'NTLM_WB',
  HTTP2: 'HTTP2',
  GSSAPI: 'GSSAPI',
  KERBEROS5: 'KERBEROS5',
  UNIX_SOCKETS: 'UNIX_SOCKETS',
  PSL: 'PSL',
  HTTPS_PROXY: 'HTTPS_PROXY',
  MULTI_SSL: 'MULTI_SSL',
  BROTLI: 'BROTLI',
  ALTSVC: 'ALTSVC',
  HTTP3: 'HTTP3',
  ZSTD: 'ZSTD',
  UNICODE: 'UNICODE',
  HSTS: 'HSTS',
  GSASL: 'GSASL',
  THREADSAFE: 'THREADSAFE',
};

export const CurlHttpVersion = {
  CURL_HTTP_VERSION_NONE: 0,
  CURL_HTTP_VERSION_1_0: 1,
  CURL_HTTP_VERSION_1_1: 2,
  CURL_HTTP_VERSION_2_0: 3,
  CURL_HTTP_VERSION_2TLS: 4,
  CURL_HTTP_VERSION_2_PRIOR_KNOWLEDGE: 5,
  CURL_HTTP_VERSION_3: 30,
  CURL_HTTP_VERSION_LAST: 31,
};

export const CurlInfoDebug = {
  TEXT: 0,
  HEADER_IN: 1,
  HEADER_OUT: 2,
  DATA_IN: 3,
  DATA_OUT: 4,
  SSL_DATA_IN: 5,
  SSL_DATA_OUT: 6,
};

export const CurlNetrc = {
  CURL_NETRC_IGNORED: 0,
  CURL_NETRC_OPTIONAL: 1,
  CURL_NETRC_REQUIRED: 2,
  CURL_NETRC_LAST: 3,
};

export const CurlSslOpt = {
  CURLSSLOPT_ALLOW_BEAST: 1,
  CURLSSLOPT_NO_REVOKE: 2,
  CURLSSLOPT_NO_PARTIALCHAIN: 4,
  CURLSSLOPT_REVOKE_BEST_EFFORT: 8,
  CURLSSLOPT_NATIVE_CA: 16,
  CURLSSLOPT_AUTO_CLIENT_CERT: 32,
};

export const CurlProxy = {
  CURLPROXY_HTTP: 0,
  CURLPROXY_HTTP_1_0: 1,
  CURLPROXY_HTTPS: 2,
  CURLPROXY_SOCKS4: 4,
  CURLPROXY_SOCKS5: 5,
  CURLPROXY_SOCKS4A: 6,
  CURLPROXY_SOCKS5_HOSTNAME: 7,
};

export interface HeaderInfo {
  name: string;
  value: string;
}

class Curl extends EventEmitter {
  _options: Record<string, any> = {};
  _meta: Record<string, any> = {};
  _features: Record<string, any> = {};

  static info = {
    COOKIELIST: 'COOKIELIST',
    EFFECTIVE_URL: 'EFFECTIVE_URL',
    SIZE_DOWNLOAD: 'SIZE_DOWNLOAD',
    TOTAL_TIME: 'TOTAL_TIME',
  };

  static option = {
    ACCEPT_ENCODING: 'ACCEPT_ENCODING',
    CAINFO: 'CAINFO',
    CAINFO_BLOB: 'CAINFO_BLOB',
    COOKIEFILE: 'COOKIEFILE',
    COOKIELIST: 'COOKIELIST',
    CUSTOMREQUEST: 'CUSTOMREQUEST',
    DEBUGFUNCTION: 'DEBUGFUNCTION',
    FOLLOWLOCATION: 'FOLLOWLOCATION',
    HTTPAUTH: 'HTTPAUTH',
    HTTPGET: 'HTTPGET',
    HTTPHEADER: 'HTTPHEADER',
    HTTPPOST: 'HTTPPOST',
    HTTP_VERSION: 'HTTP_VERSION',
    INFILESIZE_LARGE: 'INFILESIZE_LARGE',
    KEYPASSWD: 'KEYPASSWD',
    MAXREDIRS: 'MAXREDIRS',
    NETRC: 'NETRC',
    NOBODY: 'NOBODY',
    NOPROGRESS: 'NOPROGRESS',
    NOPROXY: 'NOPROXY',
    PASSWORD: 'PASSWORD',
    POST: 'POST',
    POSTFIELDS: 'POSTFIELDS',
    PROXY: 'PROXY',
    PROXYAUTH: 'PROXYAUTH',
    READDATA: 'READDATA',
    READFUNCTION: 'READFUNCTION',
    SSLCERT: 'SSLCERT',
    SSLCERTTYPE: 'SSLCERTTYPE',
    SSLKEY: 'SSLKEY',
    SSL_VERIFYHOST: 'SSL_VERIFYHOST',
    SSL_VERIFYPEER: 'SSL_VERIFYPEER',
    TIMEOUT_MS: 'TIMEOUT_MS',
    UNIX_SOCKET_PATH: 'UNIX_SOCKET_PATH',
    UPLOAD: 'UPLOAD',
    URL: 'URL',
    USERAGENT: 'USERAGENT',
    USERNAME: 'USERNAME',
    VERBOSE: 'VERBOSE',
    WRITEFUNCTION: 'WRITEFUNCTION',
    XFERINFOFUNCTION: 'XFERINFOFUNCTION',
    SSL_OPTIONS: 'SSL_OPTIONS',
  };

  static getVersion() {
    return 'libcurl/7.54.0 LibreSSL/2.0.20 zlib/1.2.11 nghttp2/1.24.0';
  }

  enable(name: string | number) {
    this._features[name] = true;
  }

  setOpt(name: string, value: number | ((arg0: Buffer) => any)) {
    if (!name) {
      throw new Error(`Invalid option ${name} ${value}`);
    }

    if (name === Curl.option.CAINFO_BLOB) {
      // Just ignore this because it's platform-specific
      return;
    }

    if (name === Curl.option.READFUNCTION && typeof value === 'function') {
      let body = '';

      // Only limiting this to prevent infinite loops
      for (let i = 0; i < 1000; i++) {
        const buffer = Buffer.alloc(23);
        const bytes = value(buffer);

        if (bytes === 0) {
          break;
        }

        body += buffer.slice(0, bytes);
      }

      this._meta[`${name}_VALUE`] = body;
    }

    if (name === Curl.option.COOKIELIST) {
      // This can be set multiple times
      this._options[name] = this._options[name] || [];

      this._options[name].push(value);
    } else if (name === Curl.option.READDATA && typeof value === 'number') {
      const { size } = fs.fstatSync(value);
      const buffer = Buffer.alloc(size);
      fs.readSync(value, buffer, 0, size, 0);
      this._options[name] = buffer.toString();
    } else {
      this._options[name] = value;
    }
  }

  getInfo(name: string) {
    switch (name) {
      case Curl.info.COOKIELIST:
        return [`#HttpOnly_.insomnia.rest\tTRUE\t/url/path\tTRUE\t${Date.now() / 1000}\tfoo\tbar`];

      case Curl.info.EFFECTIVE_URL:
        return this._options[Curl.option.URL];

      case Curl.info.TOTAL_TIME:
        return 700;

      case Curl.info.SIZE_DOWNLOAD:
        return 800;

      default:
        throw new Error(`Invalid info ${name}`);
    }
  }

  perform() {
    process.nextTick(() => {
      const url = this._options[Curl.option.URL] || '';
      
      try {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const lib = isHttps ? https : http;
        
        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port || (isHttps ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: this._options[Curl.option.CUSTOMREQUEST] || 'GET',
          headers: {} as Record<string, string>,
          timeout: this._options[Curl.option.TIMEOUT_MS] || 30000,
          rejectUnauthorized: this._options[Curl.option.SSL_VERIFYPEER] !== false
        };

        // Добавляем заголовки из HTTPHEADER
        if (this._options[Curl.option.HTTPHEADER]) {
          this._options[Curl.option.HTTPHEADER].forEach((header: string) => {
            const [name, ...valueParts] = header.split(':');
            if (name && valueParts.length > 0) {
              options.headers[name.trim()] = valueParts.join(':').trim();
            }
          });
        }

        // Добавляем User-Agent если установлен
        if (this._options[Curl.option.USERAGENT]) {
          options.headers['User-Agent'] = this._options[Curl.option.USERAGENT];
        }

        const req = lib.request(options, (res) => {
          let responseData = Buffer.alloc(0);
          
          res.on('data', (chunk) => {
            responseData = Buffer.concat([responseData, chunk]);
            this.emit('data', chunk);
            this._options.WRITEFUNCTION?.(chunk);
          });

          res.on('end', () => {
            const statusLine = `HTTP/${res.httpVersion} ${res.statusCode} ${res.statusMessage}`;
            const headers = Object.entries(res.headers)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n');
            const responseHeaders = `${statusLine}\n${headers}\n\n`;
            
            this.emit('end', 'NOT_USED', 'NOT_USED', responseHeaders);
          });
        });

        req.on('error', (err) => {
          console.error('HTTP Request error:', err);
          // В случае ошибки возвращаем mock ответ с информацией об ошибке
          const errorResponse = {
            error: 'Network error in offline mode',
            message: err.message,
            url: url,
            offline: true
          };
          const data = Buffer.from(JSON.stringify(errorResponse, null, 2));
          this.emit('data', data);
          this._options.WRITEFUNCTION?.(data);
          
          process.nextTick(() => {
            this.emit('end', 'NOT_USED', 'NOT_USED', 'HTTP/1.1 500 Network Error\nContent-Type: application/json\n\n');
          });
        });

        req.on('timeout', () => {
          req.destroy();
          const timeoutResponse = {
            error: 'Request timeout',
            url: url,
            timeout: options.timeout
          };
          const data = Buffer.from(JSON.stringify(timeoutResponse, null, 2));
          this.emit('data', data);
          this._options.WRITEFUNCTION?.(data);
          
          process.nextTick(() => {
            this.emit('end', 'NOT_USED', 'NOT_USED', 'HTTP/1.1 408 Request Timeout\nContent-Type: application/json\n\n');
          });
        });

        // Отправляем данные POST/PUT если есть
        if (this._options[Curl.option.POSTFIELDS]) {
          req.write(this._options[Curl.option.POSTFIELDS]);
        }

        req.end();
        
      } catch (error) {
        console.error('URL parsing error:', error);
        // В случае ошибки парсинга URL возвращаем ошибку
        const errorResponse = {
          error: 'Invalid URL',
          message: error.message,
          url: url
        };
        const data = Buffer.from(JSON.stringify(errorResponse, null, 2));
        this.emit('data', data);
        this._options.WRITEFUNCTION?.(data);
        
        process.nextTick(() => {
          this.emit('end', 'NOT_USED', 'NOT_USED', 'HTTP/1.1 400 Bad Request\nContent-Type: application/json\n\n');
        });
      }
    });
  }

  close() {}
}

/**
 * This is just to make it easier to test
 * node-libcurl Enum exports (CurlAuth, CurlCode, etc) are TypeScript enums, which are converted to an object with format:
 * ```ts
 * const myEnum = {
 *   EnumKey: 0,
 *   0: EnumKey,
 * }
 * ```
 * We only want the named members (non-number ones)
 */
const getTsEnumOnlyWithNamedMembers = (enumObj: any) => {
  let obj = {};

  for (const member in enumObj) {
    if (typeof enumObj[member] === 'number') {
      obj = { ...obj, [member]: member };
    }
  }

  return obj;
};

// WARNING: changing this to `export default` will break the mock and be incredibly hard to debug. Ask me how I know.
export const nodeLibcurlMock = {
  Curl,
  CurlAuth: getTsEnumOnlyWithNamedMembers(CurlAuth),
  CurlCode: getTsEnumOnlyWithNamedMembers(CurlCode),
  CurlInfoDebug: getTsEnumOnlyWithNamedMembers(CurlInfoDebug),
  CurlFeature: getTsEnumOnlyWithNamedMembers(CurlFeature),
  CurlNetrc: getTsEnumOnlyWithNamedMembers(CurlNetrc),
  CurlHttpVersion: getTsEnumOnlyWithNamedMembers(CurlHttpVersion),
  CurlSslOpt: getTsEnumOnlyWithNamedMembers(CurlSslOpt),
};

// Export individual components for direct import compatibility
export { Curl };
