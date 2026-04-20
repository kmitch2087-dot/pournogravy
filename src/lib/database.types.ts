// Placeholder types — will be auto-generated from Supabase CLI after schema is applied.
// Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
// For now this keeps the client typed and the app compiling.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          price_cents: number;
          currency: string;
          image_url: string | null;
          inventory_count: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["products"]["Row"]> & {
          slug: string;
          name: string;
          price_cents: number;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Row"]>;
      };
      cart_items: {
        Row: {
          id: string;
          user_id: string | null;
          session_id: string | null;
          product_id: string;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["cart_items"]["Row"]> & {
          product_id: string;
          quantity: number;
        };
        Update: Partial<Database["public"]["Tables"]["cart_items"]["Row"]>;
      };
      orders: {
        Row: {
          id: string;
          user_id: string | null;
          email: string;
          status: "pending" | "paid" | "fulfilled" | "cancelled" | "refunded";
          subtotal_cents: number;
          tax_cents: number;
          shipping_cents: number;
          total_cents: number;
          currency: string;
          stripe_session_id: string | null;
          stripe_payment_intent_id: string | null;
          shipping_address: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["orders"]["Row"]> & {
          email: string;
          subtotal_cents: number;
          total_cents: number;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          product_snapshot: Json;
          quantity: number;
          unit_price_cents: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["order_items"]["Row"]> & {
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price_cents: number;
          product_snapshot: Json;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
