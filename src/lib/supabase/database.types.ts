export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          owner_user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name?: string;
          owner_user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          owner_user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          business_id: string;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          active: boolean;
          base_price: number;
          business_id: string;
          category: string | null;
          created_at: string;
          display_order: number;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          base_price: number;
          business_id?: string;
          category?: string | null;
          created_at?: string;
          display_order?: number;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          base_price?: number;
          business_id?: string;
          category?: string | null;
          created_at?: string;
          display_order?: number;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cash_sessions: {
        Row: {
          business_id: string;
          closed_at: string | null;
          counted_cash: number | null;
          created_at: string;
          id: string;
          opened_at: string;
          opened_by: string;
          opening_amount: number;
          status: Database["public"]["Enums"]["cash_session_status"];
        };
        Insert: {
          business_id?: string;
          closed_at?: string | null;
          counted_cash?: number | null;
          created_at?: string;
          id?: string;
          opened_at?: string;
          opened_by?: string;
          opening_amount: number;
          status?: Database["public"]["Enums"]["cash_session_status"];
        };
        Update: {
          business_id?: string;
          closed_at?: string | null;
          counted_cash?: number | null;
          created_at?: string;
          id?: string;
          opened_at?: string;
          opened_by?: string;
          opening_amount?: number;
          status?: Database["public"]["Enums"]["cash_session_status"];
        };
        Relationships: [];
      };
      sales: {
        Row: {
          business_id: string;
          created_at: string;
          created_by: string;
          id: string;
          payment_method: Database["public"]["Enums"]["payment_method"];
          session_id: string;
          status: Database["public"]["Enums"]["sale_status"];
          total_amount: number;
        };
        Insert: {
          business_id?: string;
          created_at?: string;
          created_by?: string;
          id: string;
          payment_method: Database["public"]["Enums"]["payment_method"];
          session_id: string;
          status?: Database["public"]["Enums"]["sale_status"];
          total_amount: number;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          session_id?: string;
          status?: Database["public"]["Enums"]["sale_status"];
          total_amount?: number;
        };
        Relationships: [];
      };
      sale_items: {
        Row: {
          base_price: number;
          business_id: string;
          id: string;
          note: string | null;
          product_id: string | null;
          product_name_snapshot: string;
          quantity: number;
          sale_id: string;
          unit_price: number;
        };
        Insert: {
          base_price: number;
          business_id?: string;
          id?: string;
          note?: string | null;
          product_id?: string | null;
          product_name_snapshot: string;
          quantity: number;
          sale_id: string;
          unit_price: number;
        };
        Update: {
          base_price?: number;
          business_id?: string;
          id?: string;
          note?: string | null;
          product_id?: string | null;
          product_name_snapshot?: string;
          quantity?: number;
          sale_id?: string;
          unit_price?: number;
        };
        Relationships: [];
      };
      cash_expenses: {
        Row: {
          amount: number;
          business_id: string;
          created_at: string;
          created_by: string;
          id: string;
          reason: string;
          session_id: string;
        };
        Insert: {
          amount: number;
          business_id?: string;
          created_at?: string;
          created_by?: string;
          id: string;
          reason: string;
          session_id: string;
        };
        Update: {
          amount?: number;
          business_id?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          reason?: string;
          session_id?: string;
        };
        Relationships: [];
      };
      sale_voids: {
        Row: {
          business_id: string;
          id: string;
          resolution_mode: Database["public"]["Enums"]["void_resolution_mode"];
          sale_id: string;
          target_session_id: string | null;
          voided_at: string;
          voided_by: string;
        };
        Insert: {
          business_id?: string;
          id?: string;
          resolution_mode: Database["public"]["Enums"]["void_resolution_mode"];
          sale_id: string;
          target_session_id?: string | null;
          voided_at?: string;
          voided_by?: string;
        };
        Update: {
          business_id?: string;
          id?: string;
          resolution_mode?: Database["public"]["Enums"]["void_resolution_mode"];
          sale_id?: string;
          target_session_id?: string | null;
          voided_at?: string;
          voided_by?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      cash_session_summaries: {
        Row: {
          closed_at: string | null;
          counted_cash: number | null;
          current_session_void_cash: number;
          current_session_void_total: number;
          current_session_void_yape: number;
          effective_cash_sales: number;
          effective_sales_total: number;
          effective_yape_sales: number;
          expected_cash: number;
          expenses_total: number;
          id: string;
          opened_at: string;
          opening_amount: number;
          status: Database["public"]["Enums"]["cash_session_status"];
        };
        Relationships: [];
      };
    };
    Functions: {
      close_cash_session: {
        Args: {
          p_closed_at?: string | null;
          p_counted_cash: number;
          p_session_id: string;
        };
        Returns: Database["public"]["Tables"]["cash_sessions"]["Row"];
      };
      create_cash_expense: {
        Args: {
          p_amount: number;
          p_created_at?: string | null;
          p_expense_id: string;
          p_reason: string;
          p_session_id: string;
        };
        Returns: Database["public"]["Tables"]["cash_expenses"]["Row"];
      };
      create_sale: {
        Args: {
          p_created_at?: string | null;
          p_items: Json;
          p_payment_method: Database["public"]["Enums"]["payment_method"];
          p_sale_id: string;
          p_session_id: string;
        };
        Returns: Database["public"]["Tables"]["sales"]["Row"];
      };
      current_business_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      open_cash_session: {
        Args: {
          p_opened_at?: string | null;
          p_opening_amount: number;
        };
        Returns: Database["public"]["Tables"]["cash_sessions"]["Row"];
      };
      void_sale: {
        Args: {
          p_resolution_mode: Database["public"]["Enums"]["void_resolution_mode"];
          p_sale_id: string;
          p_target_session_id?: string | null;
          p_voided_at?: string | null;
        };
        Returns: Database["public"]["Tables"]["sale_voids"]["Row"];
      };
    };
    Enums: {
      cash_session_status: "open" | "closed";
      payment_method: "cash" | "yape";
      sale_status: "completed" | "voided";
      void_resolution_mode: "current_session" | "original_session";
    };
    CompositeTypes: never;
  };
};
