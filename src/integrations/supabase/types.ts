export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      carpool_bookings: {
        Row: {
          carpool_id: string
          created_at: string
          id: string
          passenger_id: string
          pickup_address: string | null
          seats: number
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          carpool_id: string
          created_at?: string
          id?: string
          passenger_id: string
          pickup_address?: string | null
          seats?: number
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          carpool_id?: string
          created_at?: string
          id?: string
          passenger_id?: string
          pickup_address?: string | null
          seats?: number
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carpool_bookings_carpool_id_fkey"
            columns: ["carpool_id"]
            isOneToOne: false
            referencedRelation: "carpools"
            referencedColumns: ["id"]
          },
        ]
      }
      carpools: {
        Row: {
          created_at: string
          departure_at: string
          description: string | null
          destination_address: string
          destination_lat: number
          destination_lng: number
          driver_id: string
          id: string
          origin_address: string
          origin_lat: number
          origin_lng: number
          price_per_seat: number
          seats_available: number
          seats_total: number
          status: Database["public"]["Enums"]["carpool_status"]
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          departure_at: string
          description?: string | null
          destination_address: string
          destination_lat: number
          destination_lng: number
          driver_id: string
          id?: string
          origin_address: string
          origin_lat: number
          origin_lng: number
          price_per_seat?: number
          seats_available: number
          seats_total: number
          status?: Database["public"]["Enums"]["carpool_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          departure_at?: string
          description?: string | null
          destination_address?: string
          destination_lat?: number
          destination_lng?: number
          driver_id?: string
          id?: string
          origin_address?: string
          origin_lat?: number
          origin_lng?: number
          price_per_seat?: number
          seats_available?: number
          seats_total?: number
          status?: Database["public"]["Enums"]["carpool_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carpools_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          storage_path: string
          type: Database["public"]["Enums"]["document_type"]
          user_id: string
          vehicle_id: string | null
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          storage_path: string
          type: Database["public"]["Enums"]["document_type"]
          user_id: string
          vehicle_id?: string | null
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          storage_path?: string
          type?: Database["public"]["Enums"]["document_type"]
          user_id?: string
          vehicle_id?: string | null
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_withdrawals: {
        Row: {
          amount: number
          created_at: string
          driver_id: string
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          driver_id: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          driver_id?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_withdrawals_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_withdrawals_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          bio: string | null
          created_at: string
          current_lat: number | null
          current_lng: number | null
          fleet_id: string | null
          id: string
          is_online: boolean
          is_suspended: boolean
          is_verified: boolean
          license_category: string | null
          license_expires_at: string | null
          license_number: string
          rating: number | null
          suspended_reason: string | null
          total_trips: number
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          fleet_id?: string | null
          id: string
          is_online?: boolean
          is_suspended?: boolean
          is_verified?: boolean
          license_category?: string | null
          license_expires_at?: string | null
          license_number: string
          rating?: number | null
          suspended_reason?: string | null
          total_trips?: number
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          fleet_id?: string | null
          id?: string
          is_online?: boolean
          is_suspended?: boolean
          is_verified?: boolean
          license_category?: string | null
          license_expires_at?: string | null
          license_number?: string
          rating?: number | null
          suspended_reason?: string | null
          total_trips?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drivers_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
        ]
      }
      fleets: {
        Row: {
          address: string | null
          cnpj: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          carpool_id: string | null
          content: string
          created_at: string
          id: string
          read_at: string | null
          ride_id: string | null
          sender_id: string
        }
        Insert: {
          carpool_id?: string | null
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          ride_id?: string | null
          sender_id: string
        }
        Update: {
          carpool_id?: string | null
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          ride_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_carpool_id_fkey"
            columns: ["carpool_id"]
            isOneToOne: false
            referencedRelation: "carpools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          brand: string | null
          created_at: string
          id: string
          is_default: boolean
          last4: string | null
          method: Database["public"]["Enums"]["payment_method"]
          stripe_payment_method_id: string | null
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          last4?: string | null
          method: Database["public"]["Enums"]["payment_method"]
          stripe_payment_method_id?: string | null
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          last4?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          stripe_payment_method_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          id: string
          platform_fee_percent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform_fee_percent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          platform_fee_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          default_payment_method:
            | Database["public"]["Enums"]["payment_method"]
            | null
          full_name: string | null
          id: string
          is_blocked: boolean
          phone: string | null
          rating: number | null
          total_rides: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          default_payment_method?:
            | Database["public"]["Enums"]["payment_method"]
            | null
          full_name?: string | null
          id: string
          is_blocked?: boolean
          phone?: string | null
          rating?: number | null
          total_rides?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          default_payment_method?:
            | Database["public"]["Enums"]["payment_method"]
            | null
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          phone?: string | null
          rating?: number | null
          total_rides?: number
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          carpool_id: string | null
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          ride_id: string | null
        }
        Insert: {
          carpool_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          ride_id?: string | null
        }
        Update: {
          carpool_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
          ride_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_carpool_id_fkey"
            columns: ["carpool_id"]
            isOneToOne: false
            referencedRelation: "carpools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          accepted_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string
          destination_address: string
          destination_lat: number
          destination_lng: number
          distance_km: number | null
          driver_id: string | null
          duration_min: number | null
          estimated_fare: number | null
          final_fare: number | null
          id: string
          notes: string | null
          origin_address: string
          origin_lat: number
          origin_lng: number
          passenger_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          requested_at: string
          started_at: string | null
          status: Database["public"]["Enums"]["ride_status"]
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          destination_address: string
          destination_lat: number
          destination_lng: number
          distance_km?: number | null
          driver_id?: string | null
          duration_min?: number | null
          estimated_fare?: number | null
          final_fare?: number | null
          id?: string
          notes?: string | null
          origin_address: string
          origin_lat: number
          origin_lng: number
          passenger_id: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          requested_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["ride_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          destination_address?: string
          destination_lat?: number
          destination_lng?: number
          distance_km?: number | null
          driver_id?: string | null
          duration_min?: number | null
          estimated_fare?: number | null
          final_fare?: number | null
          id?: string
          notes?: string | null
          origin_address?: string
          origin_lat?: number
          origin_lng?: number
          passenger_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          requested_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["ride_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          carpool_booking_id: string | null
          created_at: string
          currency: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          payee_id: string | null
          payer_id: string
          ride_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          carpool_booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          payee_id?: string | null
          payer_id: string
          ride_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          carpool_booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          payee_id?: string | null
          payer_id?: string
          ride_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_carpool_booking_id_fkey"
            columns: ["carpool_booking_id"]
            isOneToOne: false
            referencedRelation: "carpool_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          brand: string
          color: string | null
          created_at: string
          driver_id: string | null
          fleet_id: string | null
          id: string
          is_active: boolean
          model: string
          photo_url: string | null
          plate: string
          seats: number
          type: Database["public"]["Enums"]["vehicle_type"]
          updated_at: string
          year: number | null
        }
        Insert: {
          brand: string
          color?: string | null
          created_at?: string
          driver_id?: string | null
          fleet_id?: string | null
          id?: string
          is_active?: boolean
          model: string
          photo_url?: string | null
          plate: string
          seats?: number
          type?: Database["public"]["Enums"]["vehicle_type"]
          updated_at?: string
          year?: number | null
        }
        Update: {
          brand?: string
          color?: string | null
          created_at?: string
          driver_id?: string | null
          fleet_id?: string | null
          id?: string
          is_active?: boolean
          model?: string
          photo_url?: string | null
          plate?: string
          seats?: number
          type?: Database["public"]["Enums"]["vehicle_type"]
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      drivers_public: {
        Row: {
          bio: string | null
          created_at: string | null
          fleet_id: string | null
          id: string | null
          is_online: boolean | null
          is_verified: boolean | null
          license_category: string | null
          rating: number | null
          total_trips: number | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          fleet_id?: string | null
          id?: string | null
          is_online?: boolean | null
          is_verified?: boolean | null
          license_category?: string | null
          rating?: number | null
          total_trips?: number | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          fleet_id?: string | null
          id?: string | null
          is_online?: boolean | null
          is_verified?: boolean | null
          license_category?: string | null
          rating?: number | null
          total_trips?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          rating: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          rating?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          rating?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "passenger" | "driver" | "admin" | "fleet_operator"
      booking_status: "pending" | "confirmed" | "rejected" | "cancelled"
      carpool_status:
        | "open"
        | "full"
        | "in_progress"
        | "completed"
        | "cancelled"
      document_type:
        | "cnh"
        | "crlv"
        | "vehicle_photo"
        | "profile_photo"
        | "insurance"
        | "other"
      payment_method: "cash" | "card" | "pix" | "wallet"
      payment_status: "pending" | "authorized" | "paid" | "failed" | "refunded"
      ride_status:
        | "requested"
        | "accepted"
        | "driver_arrived"
        | "in_progress"
        | "completed"
        | "cancelled"
      vehicle_type: "car" | "motorcycle" | "van" | "bike" | "scooter"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["passenger", "driver", "admin", "fleet_operator"],
      booking_status: ["pending", "confirmed", "rejected", "cancelled"],
      carpool_status: ["open", "full", "in_progress", "completed", "cancelled"],
      document_type: [
        "cnh",
        "crlv",
        "vehicle_photo",
        "profile_photo",
        "insurance",
        "other",
      ],
      payment_method: ["cash", "card", "pix", "wallet"],
      payment_status: ["pending", "authorized", "paid", "failed", "refunded"],
      ride_status: [
        "requested",
        "accepted",
        "driver_arrived",
        "in_progress",
        "completed",
        "cancelled",
      ],
      vehicle_type: ["car", "motorcycle", "van", "bike", "scooter"],
    },
  },
} as const
