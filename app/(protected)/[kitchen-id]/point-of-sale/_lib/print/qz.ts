interface QzPrinterConfig {
  reconfigure: (options: Record<string, unknown>) => void
}

interface QzApi {
  websocket: {
    isActive: () => boolean
    connect: (options?: Record<string, unknown>) => Promise<void>
  }
  printers: {
    getDefault: () => Promise<string>
    find: (query?: string) => Promise<string | string[]>
  }
  configs: {
    create: (printer: string, options?: Record<string, unknown>) => QzPrinterConfig
  }
  security: {
    setCertificatePromise: (
      cb: (resolve: (cert: string | null) => void, reject: (reason?: unknown) => void) => void
    ) => void
    setSignatureAlgorithm: (algorithm: string) => void
    setSignaturePromise: (
      cb: (toSign: string) => (resolve: (signature?: string) => void, reject: (reason?: unknown) => void) => void
    ) => void
  }
  print: (config: QzPrinterConfig, data: unknown[]) => Promise<void>
}

function normalizePemFromEnv(value: string | undefined): string {
  if (!value) return ''
  return value.replace(/\\n/g, '\n').trim()
}

function getCertificate(): string {
  const raw = process.env.NEXT_PUBLIC_QZ_CERTIFICATE
  return normalizePemFromEnv(raw)
}

function stripPkcs8PemHeaders(pem: string): string {
  return pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '')
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i] as number)
  }
  return btoa(binary)
}

let privateKeyPromise: Promise<CryptoKey> | null = null

async function getSigningPrivateKey(): Promise<CryptoKey> {
  if (privateKeyPromise) {
    return privateKeyPromise
  }
  privateKeyPromise = (async () => {
    const pem = normalizePemFromEnv(process.env.NEXT_PUBLIC_QZ_PRIVATE_KEY)
    if (!pem) {
      throw new Error('NEXT_PUBLIC_QZ_PRIVATE_KEY is not set')
    }
    const pkcs8B64 = stripPkcs8PemHeaders(pem)
    const pkcs8 = base64ToArrayBuffer(pkcs8B64)
    return crypto.subtle.importKey(
      'pkcs8',
      pkcs8,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' },
      false,
      ['sign']
    )
  })().catch((error) => {
    privateKeyPromise = null
    throw error
  })
  return privateKeyPromise
}

async function signChallenge(toSign: string): Promise<string> {
  const key = await getSigningPrivateKey()
  const data = new TextEncoder().encode(toSign)
  const signature = await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, key, data)
  return arrayBufferToBase64(signature)
}

let qzPromise: Promise<QzApi> | null = null
let securityConfigured = false

async function loadQz(): Promise<QzApi> {
  if (typeof window === 'undefined') {
    throw new Error('QZ Tray is only available in the browser.')
  }
  const mod = await import('qz-tray')
  const qz = (mod.default ?? mod) as QzApi
  if (!securityConfigured) {
    qz.security.setCertificatePromise((resolve, reject) => {
      try {
        const cert = getCertificate()
        if (!cert) {
          reject(new Error('NEXT_PUBLIC_QZ_CERTIFICATE is not set'))
          return
        }
        resolve(cert)
      } catch (error) {
        reject(error)
      }
    })
    qz.security.setSignatureAlgorithm('SHA512')
    qz.security.setSignaturePromise(
      (toSign) => (resolve, reject) => {
        void signChallenge(toSign).then(resolve).catch(reject)
      }
    )
    securityConfigured = true
  }
  return qz
}

export async function getQz(): Promise<QzApi> {
  if (!qzPromise) {
    qzPromise = loadQz().catch((error) => {
      qzPromise = null
      throw error
    })
  }
  return qzPromise
}

export async function ensureQzConnection(): Promise<QzApi> {
  const qz = await getQz()
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect()
  }
  return qz
}

export async function findReceiptPrinter(preferred?: string | null): Promise<string> {
  const qz = await ensureQzConnection()
  if (preferred) {
    const match = await qz.printers.find(preferred)
    if (typeof match === 'string') return match
    if (Array.isArray(match) && match.length > 0) return match[0]
  }
  const fallback = await qz.printers.getDefault()
  if (!fallback) {
    throw new Error('No default printer found. Set a default printer in QZ Tray.')
  }
  return fallback
}
