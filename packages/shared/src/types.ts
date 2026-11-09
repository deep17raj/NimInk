export type WalletMode = 'demo' | 'nimiq'

export interface WalletAdapter {
  mode: WalletMode
  connect(): Promise<{ address: string }>
  getBalance(address: string): Promise<number>
  signMessage(message: string): Promise<{ publicKey: string; signature: string }>
  sendPayment(p: {
    recipient: string
    valueLuna: number
    data?: string
  }): Promise<{ txHash: string }>
  stake(p: {
    validator?: string
    valueLuna: number
    firstTime: boolean
  }): Promise<{ txHash: string }>
  getDeviceId(reason: string): Promise<string>
  language(): string
}

export interface PaymentVerifier {
  verify(p: {
    txHash: string
    expectedRecipient: string
    expectedValueLuna: number
    expectedDataId?: string
  }): Promise<'confirmed' | 'pending' | 'failed'>
}

export interface User {
  id: string
  address: string
  displayName: string
  bio: string
  createdAt: string
  validReadCount: number
  tipsSentCount: number
}

export interface Article {
  id: string
  authorId: string
  title: string
  body: string
  tags: string[]
  wordCount: number
  readTimeMinutes: number
  quizJson: QuizQuestion | null
  status: 'draft' | 'published' | 'hidden'
  createdAt: string
  updatedAt: string
  totalTipsLuna: number
  verifiedReadCount: number
}

export interface QuizQuestion {
  question: string
  options: [string, string, string]
  correctIndex: number
}

export interface Tip {
  id: string
  articleId: string
  senderId: string
  recipientId: string
  amountLuna: number
  note: string
  txHash: string
  status: 'pending' | 'confirmed' | 'failed'
  createdAt: string
}

export interface ReadSession {
  id: string
  articleId: string
  userId: string
  deviceHash: string
  ipHash: string
  startedAt: string
  checkpoints: number[]
  checkpointTimes: string[]
  quizPassed: boolean | null
  valid: boolean | null
  rejectReason: string | null
  weight: number
}

export interface ArticleRequest {
  id: string
  requesterId: string
  topic: string
  description: string
  budgetLuna: number
  deadline: string
  status: 'open' | 'in_review' | 'awarded' | 'paid' | 'expired'
  winnerId: string | null
  txHash: string | null
  createdAt: string
}

export interface Submission {
  id: string
  requestId: string
  articleId: string
  authorId: string
  createdAt: string
}

export interface Pool {
  id: string
  weekStart: string
  weekEnd: string
  totalLuna: number
  sponsor: string
  distributed: boolean
  createdAt: string
}

export interface Payout {
  id: string
  poolId: string
  authorId: string
  amountLuna: number
  score: number
  txHash: string | null
  status: 'pending' | 'confirmed' | 'failed'
  payoutDate: string
}

export interface Report {
  id: string
  targetType: 'article' | 'request'
  targetId: string
  reporterId: string
  reason: 'illegal' | 'hateful' | 'sexual' | 'scam' | 'plagiarism' | 'other'
  details: string
  status: 'pending' | 'hidden' | 'restored'
  createdAt: string
}

export interface DemoStake {
  id: string
  userId: string
  validatorId: string
  amountLuna: number
  txHash: string
  status: 'active' | 'deactivating' | 'retired' | 'removed'
  createdAt: string
  rewardsLuna: number
}

export interface Validator {
  id: string
  name: string
  address: string
  fee: number
  payoutType: 'restake' | 'direct'
  trustScore: number
}

export interface DemoTransaction {
  id: string
  fromAddress: string
  toAddress: string
  valueLuna: number
  data: string | null
  txHash: string
  status: 'pending' | 'confirmed' | 'failed'
  createdAt: string
}

export interface EarningsSummary {
  totalLuna: number
  tipsLuna: number
  requestsLuna: number
  readRewardsLuna: number
  stakedLuna: number
  pendingPayoutsLuna: number
}

export interface ApiError {
  error: string
  code: string
  details?: unknown
}
