import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase configuration missing!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define Types for our DB
export type ClientStage = 'Emailing' | 'Check-in' | 'Confirmed' | 'Phoning / Calling' | 'Replied / Answered';

export interface Org {
  id: string;
  name: string;
  slug: string;
  admin_email: string;
  admin_password?: string;
  created_at?: string;
}

export interface ClientCard {
  id: string;
  org_id: string;
  full_name: string;
  email: string;
  phone: string;
  amount: number;
  date_time: string;
  stage: ClientStage;
  done: boolean;
  order_index?: number;
  created_at?: string;
}
