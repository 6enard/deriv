export interface AuthorizeResponse {
  msg_type: 'authorize';
  authorize: {
    account_list?: AccountInfo[];
    balance: number;
    currency: string;
    email: string;
    fullname: string;
    is_virtual: boolean;
    landing_company_fullname: string;
    loginid: string;
    user_id: number;
  };
  error?: ApiError;
}

export interface AccountInfo {
  account_type: 'trading' | 'wallet';
  currency: string;
  is_disabled: boolean;
  is_virtual: boolean;
  landing_company_short: string;
  loginid: string;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ActiveSymbol {
  allow_forward_starting: number;
  callput_limit: number;
  contract_display_name: string;
  display_name: string;
  exchange_is_open: number;
  is_forward_starting: number;
  market: string;
  market_display_name: string;
  pip: number;
  submarket: string;
  submarket_display_name: string;
  symbol: string;
  symbol_type: string;
}

export interface ActiveSymbolsResponse {
  msg_type: 'active_symbols';
  active_symbols: ActiveSymbol[];
  error?: ApiError;
}

export interface Tick {
  epoch: number;
  quote: number;
}

export interface TicksHistoryResponse {
  msg_type: 'ticks_history' | 'candles' | 'ohlc';
  candles?: Candle[];
  history?: { prices: number[]; times: number[] };
  ohlc?: Candle[];
  error?: ApiError;
}

export interface Candle {
  epoch: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface ProposalResponse {
  msg_type: 'proposal';
  proposal: {
    ask_price: number;
    bid_price: number;
    date_expiry: number;
    display_value: string;
    id: string;
    limit_order?: { take_profit?: { order_amount: number }; stop_loss?: { order_amount: number } };
    payout: number;
    spot: number;
    spot_time: number;
  };
  error?: ApiError;
}

export interface BuyResponse {
  msg_type: 'buy';
  buy: {
    balance_after: number;
    buy_price: number;
    contract_id: number;
    longcode: string;
    payout: number;
    purchase_time: number;
    start_time: number;
    transaction_ids: { buy: string; sell?: string };
  };
  error?: ApiError;
}

export interface SellResponse {
  msg_type: 'sell';
  sell: {
    balance_after: number;
    contract_id: number;
    longcode: string;
    payout: number;
    sell_price: number;
    sold_for: number;
    transaction_ids: { buy: string; sell: string };
  };
  error?: ApiError;
}

export interface PortfolioPosition {
  contract_id: number;
  contract_type: string;
  date_expiry: number;
  date_purchase: number;
  display_name: string;
  longcode: string;
  payout: number;
  purchase_time: number;
  symbol: string;
  multiplier: number;
  buy_price: number;
}

export interface PortfolioResponse {
  msg_type: 'portfolio';
  portfolio: { contracts: PortfolioPosition[] };
  error?: ApiError;
}

export interface OpenContract {
  contract_id: number;
  contract_type: string;
  date_expiry: number;
  date_purchase: number;
  display_name: string;
  entry_spot: number;
  exit_tick?: number;
  is_expired: number;
  is_sold: number;
  is_valid_to_sell: number;
  longcode: string;
  payout: number;
  profit: number;
  purchase_time: number;
  sell_price?: number;
  sell_time?: number;
  status?: string;
  underlying: string;
}

export interface ProposalOpenContractResponse {
  msg_type: 'proposal_open_contract';
  proposal_open_contract: OpenContract;
  subscription?: { id: string };
  error?: ApiError;
}

export interface BalanceResponse {
  msg_type: 'balance';
  balance: { balance: number; currency: string };
  error?: ApiError;
}

export interface ProfitTableEntry {
  app_id: number;
  buy_price: number;
  contract_id: number;
  longcode: string;
  payout: number;
  purchase_time: number;
  sell_price: number;
  sell_time: number;
  shortcode: string;
  transaction_ids: { buy: number; sell: number };
  profit: number;
}

export interface ProfitTableResponse {
  msg_type: 'profit_table';
  profit_table: {
    count: number;
    transactions: ProfitTableEntry[];
  };
  error?: ApiError;
}

export interface WebsiteStatusResponse {
  msg_type: 'website_status';
  website_status: { status: string };
}

export type ContractType =
  | 'CALL'
  | 'PUT'
  | 'DIGITOVER'
  | 'DIGITUNDER'
  | 'ASIANU'
  | 'ASIAND'
  | 'ONETOUCH'
  | 'NOTOUCH'
  | 'EXPIRYRANGE'
  | 'EXPIRYMISS';

export type DurationUnit = 't' | 's' | 'm' | 'h' | 'd';
