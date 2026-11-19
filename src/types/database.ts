export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrderStatus =
  | "pending_confirmation"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "completed"
  | "no_show";

export type StaffRole =
  | "administrator"
  | "order_manager"
  | "menu_manager"
  | "reservation_manager";

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<{
        id: string;
        full_name: string;
        phone: string | null;
        default_delivery_address: string | null;
        terms_accepted_at: string | null;
        privacy_acknowledged_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      user_roles: Table<{
        id: string;
        user_id: string;
        role: StaffRole;
        created_at: string;
      }>;
      categories: Table<{
        id: string;
        name: string;
        slug: string;
        description: string | null;
        image_path: string | null;
        sort_order: number;
        is_active: boolean;
        created_at: string;
        updated_at: string;
      }>;
      products: Table<{
        id: string;
        category_id: string | null;
        name: string;
        slug: string;
        description: string | null;
        image_path: string | null;
        price_cents: number;
        sort_order: number;
        is_active: boolean;
        is_available: boolean;
        is_featured: boolean;
        created_at: string;
        updated_at: string;
      }>;
      product_variants: Table<{
        id: string;
        product_id: string;
        name: string;
        price_adjustment_cents: number;
        is_active: boolean;
        created_at: string;
        updated_at: string;
      }>;
      product_addons: Table<{
        id: string;
        name: string;
        description: string | null;
        price_cents: number;
        is_active: boolean;
        created_at: string;
        updated_at: string;
      }>;
      product_addon_assignments: Table<{
        product_id: string;
        addon_id: string;
      }>;
      orders: Table<{
        id: string;
        order_reference: string;
        customer_id: string;
        fulfillment_method: "pickup" | "delivery";
        delivery_address: string | null;
        service_area: string | null;
        customer_phone: string | null;
        order_status: OrderStatus;
        subtotal_cents: number;
        delivery_fee_cents: number;
        discount_cents: number;
        total_cents: number;
        currency: string;
        payment_method: string;
        payment_status: "unpaid" | "pending" | "paid" | "failed" | "expired" | "refunded";
        customer_notes: string | null;
        idempotency_key: string;
        created_at: string;
        updated_at: string;
      }>;
      order_items: Table<{
        id: string;
        order_id: string;
        product_id: string | null;
        item_name_snapshot: string;
        selection_snapshot: Json;
        unit_price_cents: number;
        quantity: number;
        line_total_cents: number;
        created_at: string;
      }>;
      payments: Table<{
        id: string;
        order_id: string;
        provider: string;
        payment_method: string;
        provider_session_id: string | null;
        provider_reference: string | null;
        qr_image_path: string | null;
        amount_cents: number;
        currency: string;
        status: string;
        created_at: string;
        updated_at: string;
      }>;
      payment_events: Table<{
        id: string;
        provider: string;
        provider_event_id: string;
        event_type: string;
        processing_status: string;
        received_at: string;
      }>;
      order_status_history: Table<{
        id: string;
        order_id: string;
        old_status: OrderStatus | null;
        new_status: OrderStatus;
        changed_by: string | null;
        note: string | null;
        created_at: string;
      }>;
      reservations: Table<{
        id: string;
        reservation_reference: string;
        customer_id: string;
        reservation_type: string;
        requested_at: string;
        party_size: number | null;
        customer_phone: string | null;
        customer_notes: string | null;
        terms_accepted_at: string;
        reservation_status: ReservationStatus;
        created_at: string;
        updated_at: string;
      }>;
      reservation_status_history: Table<{
        id: string;
        reservation_id: string;
        old_status: ReservationStatus | null;
        new_status: ReservationStatus;
        changed_by: string | null;
        note: string | null;
        created_at: string;
      }>;
      business_settings: Table<{
        id: boolean;
        config: Json;
        updated_at: string;
        updated_by: string | null;
      }>;
      audit_logs: Table<{
        id: string;
        actor_id: string | null;
        action: string;
        entity_type: string;
        entity_id: string | null;
        details: Json;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      get_customer_favorite_menu: {
        Args: Record<string, never>;
        Returns: Array<{ item_name: string; item_quantity: number }>;
      };
      place_order: {
        Args: {
          p_items: Json;
          p_fulfillment_method: string;
          p_delivery_address: string | null;
          p_service_area: string | null;
          p_phone: string | null;
          p_notes: string | null;
          p_payment_method: string;
          p_idempotency_key: string;
          p_expected_total_cents: number;
        };
        Returns: Array<{
          order_id: string;
          order_reference: string;
          total_cents: number;
        }>;
      };
      submit_qr_payment_reference: {
        Args: { p_order_id: string; p_reference: string };
        Returns: undefined;
      };
      attach_paymongo_checkout_session: {
        Args: { p_order_id: string; p_session_id: string; p_checkout_url: string };
        Returns: Array<{ provider_session_id: string; provider_reference: string }>;
      };
      process_paymongo_webhook: {
        Args: {
          p_event_id: string;
          p_event_type: string;
          p_session_id: string | null;
          p_order_reference: string | null;
          p_session_amount: number | null;
          p_payment_amount: number | null;
          p_currency: string | null;
          p_payment_id: string | null;
        };
        Returns: string;
      };
      mark_paymongo_session_expired: {
        Args: { p_order_id: string; p_session_id: string };
        Returns: undefined;
      };
      record_manual_payment_collected: {
        Args: { p_order_id: string; p_note: string | null };
        Returns: undefined;
      };
      request_reservation: {
        Args: {
          p_type: string;
          p_requested_at: string;
          p_party_size: number | null;
          p_phone: string | null;
          p_notes: string | null;
          p_terms_accepted: boolean;
        };
        Returns: Array<{
          reservation_id: string;
          reservation_reference: string;
          reservation_status: ReservationStatus;
        }>;
      };
      change_order_status: {
        Args: { p_order_id: string; p_new_status: OrderStatus; p_note: string | null };
        Returns: undefined;
      };
      change_reservation_status: {
        Args: {
          p_reservation_id: string;
          p_new_status: ReservationStatus;
          p_note: string | null;
        };
        Returns: undefined;
      };
      is_staff: { Args: { p_roles: StaffRole[] }; Returns: boolean };
      assign_staff_role: { Args: { p_email: string; p_role: StaffRole; p_enabled: boolean }; Returns: undefined };
      get_admin_metrics: {
        Args: { p_from: string | null; p_to: string | null };
        Returns: Array<{
          total_orders: number;
          pending_orders: number;
          confirmed_orders: number;
          preparing_orders: number;
          ready_for_pickup_orders: number;
          out_for_delivery_orders: number;
          completed_orders: number;
          cancelled_orders: number;
          pending_reservations: number;
          confirmed_reservations: number;
          paid_sales_cents: number;
          unpaid_order_cents: number;
          unavailable_products: number;
        }>;
      };
      get_admin_sales_series: {
        Args: { p_from: string; p_to: string; p_bucket: string };
        Returns: Array<{ bucket_start: string; sales_cents: number }>;
      };
      get_admin_top_products: {
        Args: { p_from: string | null; p_to: string | null; p_limit: number | null };
        Returns: Array<{
          product_id: string | null;
          product_name: string;
          items_sold: number;
          sales_cents: number;
          image_path: string | null;
        }>;
      };
      current_business_time: { Args: Record<string, never>; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type Reservation = Database["public"]["Tables"]["reservations"]["Row"];
