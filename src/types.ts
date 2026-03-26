export interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  name: string;
}

export interface OrderItem {
  sku: string;
  product_name: string;
  size: string;
  quantity: number;
  price: number;
  cost_price: number;
}

export interface Order {
  id: number;
  order_id: string;
  order_date: string;
  tracking_number: string;
  expedition: string;
  store_name: string;
  marketplace: string;
  status: 'pending' | 'scanned';
  scanned_at?: string;
  items: OrderItem[];
  total_quantity: number;
  total_amount: number;
  total_cost: number;
  admin_fee: number;
  payment_status: 'pending' | 'released';
}

export interface ScanSession {
  id: number;
  session_name: string;
  created_at: string;
  ended_at?: string;
  user_id: number;
  total_packages: number;
  total_pcs: number;
}

export interface SessionDetail {
  id: number;
  session_id: number;
  tracking_number: string;
  scanned_at: string;
}
