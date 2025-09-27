// types/supabase.ts
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      company: {
        Row: {
          id: string;
          name: string;
          code: string;
          contact_name: string | null;
          contact_phone: string | null;
          password_hash: string | null;
          business_number: string | null;
          address: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          password_hash?: string | null;
          business_number?: string | null;
          address?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          password_hash?: string | null;
          business_number?: string | null;
          address?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      admin_user: {
        Row: {
          id: string;
          email: string | null;
          name: string | null;
          role: 'admin' | 'counter';
          password_hash: string;
          created_at: string | null;
          failed_attempts: number;
          locked_until: string | null;
        };
        Insert: {
          id?: string;
          email?: string | null;
          name?: string | null;
          role: 'admin' | 'counter';
          password_hash: string;
          created_at?: string | null;
          failed_attempts?: number;
          locked_until?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          name?: string | null;
          role?: 'admin' | 'counter';
          password_hash?: string;
          created_at?: string | null;
          failed_attempts?: number;
          locked_until?: string | null;
        };
      };
      entry: {
        Row: {
          id: string;
          company_id: string;
          entry_date: string;
          count: number;
          signer: string | null;
          created_by: string | null;
          created_at: string | null;
          is_paid: boolean;
          payment_id: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          entry_date: string;
          count: number;
          signer?: string | null;
          created_by?: string | null;
          created_at?: string | null;
          is_paid?: boolean;
          payment_id?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          entry_date?: string;
          count?: number;
          signer?: string | null;
          created_by?: string | null;
          created_at?: string | null;
          is_paid?: boolean;
          payment_id?: string | null;
        };
      };
      payment: {
        Row: {
          id: string;
          company_id: string;
          from_date: string;
          to_date: string;
          total_count: number;
          unit_price: number;
          total_amount: number;
          paid_at: string | null;
          paid_by: string | null;
          receipt_url: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          from_date: string;
          to_date: string;
          total_count: number;
          unit_price?: number;
          paid_at?: string | null;
          paid_by?: string | null;
          receipt_url?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          from_date?: string;
          to_date?: string;
          total_count?: number;
          unit_price?: number;
          paid_at?: string | null;
          paid_by?: string | null;
          receipt_url?: string | null;
          created_at?: string | null;
        };
      };
      receipt: {
        Row: {
          id: string;
          payment_id: string | null;
          file_path: string;
          uploaded_by: string | null;
          uploaded_at: string | null;
        };
        Insert: {
          id?: string;
          payment_id?: string | null;
          file_path: string;
          uploaded_by?: string | null;
          uploaded_at?: string | null;
        };
        Update: {
          id?: string;
          payment_id?: string | null;
          file_path?: string;
          uploaded_by?: string | null;
          uploaded_at?: string | null;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
