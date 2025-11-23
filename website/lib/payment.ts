// Types for payment functionality
export interface PaymentMethod {
  id: string;
  type: 'crypto' | 'credit_card' | 'bank_transfer';
  details: {
    name?: string;
    address?: string;
    network?: string;
    last4?: string;
    expiry?: string;
    bankName?: string;
  };
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  type: 'deposit' | 'withdrawal' | 'reward_claim';
  description: string;
  paymentMethodId?: string;
}

// Mock user balance data - in real app, this would be fetched from API
export async function getUserBalance(): Promise<{ 
  balance: number; 
  currency: string;
  pendingBalance: number;
  transactions: Transaction[];
}> {
  // Simulate API request delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Return mock data
  return {
    balance: 3250.00,
    currency: 'USD',
    pendingBalance: 750.00,
    transactions: [
      {
        id: 't1',
        amount: 450.00,
        currency: 'USD',
        status: 'completed',
        createdAt: '2025-10-15T12:00:00Z',
        type: 'reward_claim',
        description: 'Reward claimed for PR #38'
      },
      {
        id: 't2',
        amount: 750.00,
        currency: 'USD',
        status: 'completed',
        createdAt: '2025-09-28T14:30:00Z',
        type: 'reward_claim',
        description: 'Reward claimed for PR #41'
      },
      {
        id: 't3',
        amount: 2000.00,
        currency: 'USD',
        status: 'completed',
        createdAt: '2025-09-10T09:45:00Z',
        type: 'deposit',
        description: 'Fund deposit via ETH'
      }
    ]
  };
}

// Mock user payment methods - in real app, this would be fetched from API
export async function getUserPaymentMethods(): Promise<PaymentMethod[]> {
  // Simulate API request delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Return mock data
  return [
    {
      id: 'pm1',
      type: 'crypto',
      details: {
        name: 'Ethereum Wallet',
        address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        network: 'Ethereum'
      }
    },
    {
      id: 'pm2',
      type: 'credit_card',
      details: {
        name: 'Visa',
        last4: '4242',
        expiry: '12/28'
      }
    }
  ];
}

// Mock function to add a payment method
export async function addPaymentMethod(
  type: 'crypto' | 'credit_card' | 'bank_transfer',
  details: any
): Promise<PaymentMethod> {
  // Simulate API request delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Return mock data
  return {
    id: `pm${Date.now()}`,
    type,
    details
  };
}

// Mock function to initiate a deposit
export async function initiateDeposit(
  amount: number,
  paymentMethodId: string
): Promise<Transaction> {
  // Simulate API request delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Return mock transaction
  return {
    id: `tx${Date.now()}`,
    amount: amount,
    currency: 'USD',
    status: 'pending',
    createdAt: new Date().toISOString(),
    type: 'deposit',
    description: `Deposit of $${amount.toFixed(2)}`,
    paymentMethodId
  };
}

// Mock function to add a bounty to an issue
export async function addBounty(
  issueId: number,
  amount: number
): Promise<{ success: boolean; bountyId: string }> {
  // Simulate API request delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Return mock response
  return {
    success: true,
    bountyId: `bounty-${Date.now()}`
  };
}

// Mock function to claim a reward
export async function claimReward(
  rewardId: string | number,
  walletAddress: string
): Promise<{ success: boolean; transactionId: string }> {
  // Simulate API request delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Return mock response
  return {
    success: true,
    transactionId: `tx-${Date.now()}`
  };
}
