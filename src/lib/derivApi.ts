import type {
  ActiveSymbolsResponse,
  AuthorizeResponse,
  BalanceResponse,
  BuyResponse,
  PortfolioResponse,
  ProfitTableResponse,
  ProposalOpenContractResponse,
  ProposalResponse,
  SellResponse,
  TicksHistoryResponse,
  WebsiteStatusResponse,
} from './derivTypes';

export const DERIV_WS_URL = 'wss://ws.binaryws.com/websockets/v3?app_id=1089';

type Resolver = (data: unknown) => void;
type Rejecter = (err: Error) => void;

interface PendingRequest {
  req_id: number;
  resolve: Resolver;
  reject: Rejecter;
  msg_type: string;
  passthrough?: string;
}

type SubscriptionHandler = (data: unknown) => void;

interface ActiveSubscription {
  req_id: number;
  msg_type: string;
  handler: SubscriptionHandler;
}

let socket: WebSocket | null = null;
let reqIdCounter = 1;
const pendingRequests = new Map<number, PendingRequest>();
const subscriptions = new Map<string, ActiveSubscription>();
let connecting: Promise<WebSocket> | null = null;
let connectionHandlers: Array<(connected: boolean) => void> = [];

function getSocket(): Promise<WebSocket> {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return Promise.resolve(socket);
  }
  if (connecting) return connecting;

  connecting = new Promise<WebSocket>((resolve, reject) => {
    const ws = new WebSocket(DERIV_WS_URL);
    ws.onopen = () => {
      socket = ws;
      connecting = null;
      connectionHandlers.forEach((h) => h(true));
      resolve(ws);
    };
    ws.onerror = () => {
      connecting = null;
      reject(new Error('WebSocket connection failed'));
    };
    ws.onclose = () => {
      socket = null;
      connecting = null;
      connectionHandlers.forEach((h) => h(false));
      pendingRequests.forEach((p) => p.reject(new Error('Connection closed')));
      pendingRequests.clear();
      subscriptions.clear();
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        handleMessage(data);
      } catch {
        // ignore malformed messages
      }
    };
  });

  return connecting;
}

function handleMessage(data: Record<string, unknown>) {
  const msgType = data.msg_type as string;
  const reqId = data.req_id as number;

  // Check for subscription updates (has subscription field or matches a subscription msg_type)
  const sub = subscriptions.get(`${msgType}:${reqId}`);
  if (sub) {
    sub.handler(data);
  }

  // Resolve one-shot requests
  const pending = pendingRequests.get(reqId);
  if (pending) {
    if (data.error) {
      pending.reject(new Error((data.error as { message: string }).message));
      pendingRequests.delete(reqId);
    } else if (!data.subscription) {
      pending.resolve(data);
      pendingRequests.delete(reqId);
    }
  }
}

function send<T>(
  request: Record<string, unknown>,
  msg_type: string,
  subscribe = false
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    getSocket()
      .then((ws) => {
        const id = reqIdCounter++;
        const payload: Record<string, unknown> = { ...request, req_id: id };
        if (subscribe) {
          payload.subscribe = 1;
        }
        pendingRequests.set(id, {
          req_id: id,
          resolve: resolve as Resolver,
          reject,
          msg_type,
        });
        ws.send(JSON.stringify(payload));
      })
      .catch(reject);
  });
}

function subscribe<T>(
  request: Record<string, unknown>,
  msg_type: string,
  handler: (data: T) => void
): Promise<{ unsubscribe: () => void }> {
  return new Promise((resolve, reject) => {
    getSocket()
      .then((ws) => {
        const id = reqIdCounter++;
        const payload = { ...request, req_id: id, subscribe: 1 };
        subscriptions.set(`${msg_type}:${id}`, {
          req_id: id,
          msg_type,
          handler: handler as SubscriptionHandler,
        });
        pendingRequests.set(id, {
          req_id: id,
          resolve: (data) => resolve({ unsubscribe: () => forgetSubscription(id, msg_type, ws) }),
          reject,
          msg_type,
        });
        ws.send(JSON.stringify(payload));
      })
      .catch(reject);
  });
}

function forgetSubscription(req_id: number, msg_type: string, ws: WebSocket) {
  subscriptions.delete(`${msg_type}:${req_id}`);
  ws.send(JSON.stringify({ forget_all: msg_type }));
}

export function onConnectionChange(handler: (connected: boolean) => void) {
  connectionHandlers.push(handler);
  if (socket) handler(socket.readyState === WebSocket.OPEN);
  return () => {
    connectionHandlers = connectionHandlers.filter((h) => h !== handler);
  };
}

export function isConnected() {
  return socket !== null && socket.readyState === WebSocket.OPEN;
}

export async function authorize(apiToken: string): Promise<AuthorizeResponse> {
  return send<AuthorizeResponse>({ authorize: apiToken }, 'authorize');
}

export async function getActiveSymbols(): Promise<ActiveSymbolsResponse> {
  return send<ActiveSymbolsResponse>(
    { active_symbols: 'brief', product_type: 'basic' },
    'active_symbols'
  );
}

export async function getTicksHistory(params: {
  symbol: string;
  count?: number;
  end?: string;
  granularity?: number;
  style?: 'ticks' | 'candles' | 'ohlc';
  subscribe?: boolean;
}): Promise<TicksHistoryResponse> {
  const payload: Record<string, unknown> = {
    ticks_history: params.symbol,
    count: params.count ?? 500,
    end: params.end ?? 'latest',
    style: params.style ?? 'candles',
    granularity: params.granularity ?? 60,
  };
  if (params.subscribe) payload.subscribe = 1;
  return send<TicksHistoryResponse>(payload, params.style ?? 'candles');
}

export async function getBalance(): Promise<BalanceResponse> {
  return send<BalanceResponse>({ balance: 1 }, 'balance');
}

export async function getProposal(params: {
  contract_type: string;
  amount: number;
  basis: 'payout' | 'stake';
  contract_duration?: number;
  duration?: number;
  duration_unit: string;
  symbol: string;
  currency?: string;
}): Promise<ProposalResponse> {
  const payload: Record<string, unknown> = {
    proposal: 1,
    contract_type: params.contract_type,
    amount: params.amount,
    basis: params.basis,
    duration: params.duration ?? params.contract_duration ?? 5,
    duration_unit: params.duration_unit,
    symbol: params.symbol,
    currency: params.currency ?? 'USD',
  };
  return send<ProposalResponse>(payload, 'proposal');
}

export async function buyContract(
  proposalId: string,
  price: number
): Promise<BuyResponse> {
  return send<BuyResponse>({ buy: proposalId, price }, 'buy');
}

export async function sellContract(
  contractId: number,
  price: number
): Promise<SellResponse> {
  return send<SellResponse>({ sell: contractId, price: 0 }, 'sell');
}

export async function getPortfolio(): Promise<PortfolioResponse> {
  return send<PortfolioResponse>({ portfolio: 1 }, 'portfolio');
}

export async function getProfitTable(params: {
  limit?: number;
  sort?: 'ASC' | 'DESC';
}): Promise<ProfitTableResponse> {
  return send<ProfitTableResponse>(
    {
      profit_table: 1,
      description: 1,
      limit: params.limit ?? 50,
      sort: params.sort ?? 'DESC',
    },
    'profit_table'
  );
}

export async function subscribeOpenContract(
  contractId: number,
  handler: (data: ProposalOpenContractResponse) => void
): Promise<{ unsubscribe: () => void }> {
  return subscribe<ProposalOpenContractResponse>(
    { proposal_open_contract: 1, contract_id: contractId },
    'proposal_open_contract',
    handler
  );
}

export async function subscribeBalance(
  handler: (data: BalanceResponse) => void
): Promise<{ unsubscribe: () => void }> {
  return subscribe<BalanceResponse>({ balance: 1 }, 'balance', handler);
}

export async function subscribeTicks(
  symbol: string,
  handler: (data: TicksHistoryResponse) => void
): Promise<{ unsubscribe: () => void }> {
  return subscribe<TicksHistoryResponse>(
    { ticks: symbol },
    'tick',
    handler
  );
}

export async function subscribeProposal(
  params: {
    contract_type: string;
    amount: number;
    basis: 'payout' | 'stake';
    duration: number;
    duration_unit: string;
    symbol: string;
    currency?: string;
  },
  handler: (data: ProposalResponse) => void
): Promise<{ unsubscribe: () => void }> {
  return subscribe<ProposalResponse>(
    {
      proposal: 1,
      contract_type: params.contract_type,
      amount: params.amount,
      basis: params.basis,
      duration: params.duration,
      duration_unit: params.duration_unit,
      symbol: params.symbol,
      currency: params.currency ?? 'USD',
    },
    'proposal',
    handler
  );
}

export async function subscribeAllOpenContracts(
  handler: (data: ProposalOpenContractResponse) => void
): Promise<{ unsubscribe: () => void }> {
  return subscribe<ProposalOpenContractResponse>(
    { proposal_open_contract: 1 },
    'proposal_open_contract',
    handler
  );
}

export async function getWebsiteStatus(): Promise<WebsiteStatusResponse> {
  return send<WebsiteStatusResponse>({ website_status: 1 }, 'website_status');
}
