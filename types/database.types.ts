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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          coach_id: string
          created_at: string
          date: string | null
          description: string | null
          id: string
          image_url: string | null
          title: string
          type: Database["public"]["Enums"]["achievement_type"]
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          title: string
          type?: Database["public"]["Enums"]["achievement_type"]
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          title?: string
          type?: Database["public"]["Enums"]["achievement_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          member_id: string
          notes: string | null
          scheduled_at: string
          session_id: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          member_id: string
          notes?: string | null
          scheduled_at: string
          session_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          member_id?: string
          notes?: string | null
          scheduled_at?: string
          session_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_profiles: {
        Row: {
          biography: string | null
          created_at: string
          experience_years: number | null
          id: string
          is_available: boolean
          specialization: string | null
          updated_at: string
        }
        Insert: {
          biography?: string | null
          created_at?: string
          experience_years?: number | null
          id: string
          is_available?: boolean
          specialization?: string | null
          updated_at?: string
        }
        Update: {
          biography?: string | null
          created_at?: string
          experience_years?: number | null
          id?: string
          is_available?: boolean
          specialization?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          member_id: string | null
          message: string
          name: string
          replied_at: string | null
          status: Database["public"]["Enums"]["message_status"]
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          member_id?: string | null
          message: string
          name: string
          replied_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          member_id?: string | null
          message?: string
          name?: string
          replied_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_messages_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          member_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          member_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          event_id: string
          id: string
          joined_at: string
          member_id: string
          status: Database["public"]["Enums"]["participation_status"]
        }
        Insert: {
          event_id: string
          id?: string
          joined_at?: string
          member_id: string
          status?: Database["public"]["Enums"]["participation_status"]
        }
        Update: {
          event_id?: string
          id?: string
          joined_at?: string
          member_id?: string
          status?: Database["public"]["Enums"]["participation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_at: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          is_public: boolean
          location: string | null
          max_participants: number | null
          start_at: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_public?: boolean
          location?: string | null
          max_participants?: number | null
          start_at: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_public?: boolean
          location?: string | null
          max_participants?: number | null
          start_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          bucket: string
          created_at: string
          id: string
          mime_type: string | null
          name: string
          object_key: string
          path: string
          size_bytes: number | null
          uploaded_by: string | null
        }
        Insert: {
          bucket: string
          created_at?: string
          id?: string
          mime_type?: string | null
          name: string
          object_key: string
          path: string
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: string
          mime_type?: string | null
          name?: string
          object_key?: string
          path?: string
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          coach_id: string
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          title: string | null
          type: Database["public"]["Enums"]["media_type"]
          uploaded_at: string
          url: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          title?: string | null
          type?: Database["public"]["Enums"]["media_type"]
          uploaded_at?: string
          url: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          title?: string | null
          type?: Database["public"]["Enums"]["media_type"]
          uploaded_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_achievements: {
        Row: {
          achievement_id: string
          media_id: string
        }
        Insert: {
          achievement_id: string
          media_id: string
        }
        Update: {
          achievement_id?: string
          media_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_achievements_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      media_events: {
        Row: {
          event_id: string
          media_id: string
        }
        Insert: {
          event_id: string
          media_id: string
        }
        Update: {
          event_id?: string
          media_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_events_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      media_news: {
        Row: {
          media_id: string
          news_id: string
        }
        Insert: {
          media_id: string
          news_id: string
        }
        Update: {
          media_id?: string
          news_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_news_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_news_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news"
            referencedColumns: ["id"]
          },
        ]
      }
      member_profiles: {
        Row: {
          address: string | null
          bio: string | null
          created_at: string
          date_of_birth: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          height: number | null
          id: string
          is_verified: boolean
          skill_level: Database["public"]["Enums"]["skill_level"]
          updated_at: string
          weight: number | null
        }
        Insert: {
          address?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          height?: number | null
          id: string
          is_verified?: boolean
          skill_level?: Database["public"]["Enums"]["skill_level"]
          updated_at?: string
          weight?: number | null
        }
        Update: {
          address?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          height?: number | null
          id?: string
          is_verified?: boolean
          skill_level?: Database["public"]["Enums"]["skill_level"]
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "member_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_subscriptions: {
        Row: {
          auto_renew: boolean
          created_at: string
          ends_at: string
          id: string
          member_id: string
          notes: string | null
          plan_id: string
          remaining_credits: number
          renews_at: string | null
          starts_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          ends_at: string
          id?: string
          member_id: string
          notes?: string | null
          plan_id: string
          remaining_credits?: number
          renews_at?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          ends_at?: string
          id?: string
          member_id?: string
          notes?: string | null
          plan_id?: string
          remaining_credits?: number
          renews_at?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          billing_interval: Database["public"]["Enums"]["billing_interval"]
          created_at: string
          currency: string
          description: string | null
          features: string[]
          id: string
          is_active: boolean
          is_popular: boolean
          name: string
          price: number
          session_credits: number | null
          slug: string
          sort_order: number
          tier: Database["public"]["Enums"]["plan_tier"]
          updated_at: string
        }
        Insert: {
          billing_interval?: Database["public"]["Enums"]["billing_interval"]
          created_at?: string
          currency?: string
          description?: string | null
          features?: string[]
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name: string
          price: number
          session_credits?: number | null
          slug: string
          sort_order?: number
          tier?: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
        }
        Update: {
          billing_interval?: Database["public"]["Enums"]["billing_interval"]
          created_at?: string
          currency?: string
          description?: string | null
          features?: string[]
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name?: string
          price?: number
          session_credits?: number | null
          slug?: string
          sort_order?: number
          tier?: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
          status: Database["public"]["Enums"]["message_status"]
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
          status?: Database["public"]["Enums"]["message_status"]
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
          status?: Database["public"]["Enums"]["message_status"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          content: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_read: boolean
          resource_id: string | null
          resource_type: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          resource_id?: string | null
          resource_type?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          resource_id?: string | null
          resource_type?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          currency: string
          id: string
          member_id: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: string | null
          transaction_ref: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          member_id?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          transaction_ref?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          member_id?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          transaction_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "member_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          coach_id: string | null
          content: string
          created_at: string
          id: string
          is_featured: boolean
          member_id: string
          rating: number
          session_id: string | null
          status: Database["public"]["Enums"]["review_status"]
          target_type: Database["public"]["Enums"]["review_target_type"]
          title: string
          updated_at: string
        }
        Insert: {
          coach_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_featured?: boolean
          member_id: string
          rating: number
          session_id?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          target_type?: Database["public"]["Enums"]["review_target_type"]
          title: string
          updated_at?: string
        }
        Update: {
          coach_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_featured?: boolean
          member_id?: string
          rating?: number
          session_id?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          target_type?: Database["public"]["Enums"]["review_target_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      sessions: {
        Row: {
          coach_id: string
          created_at: string
          description: string | null
          discipline: string | null
          duration_min: number
          id: string
          is_active: boolean
          level: Database["public"]["Enums"]["skill_level"] | null
          price: number
          title: string
          type: Database["public"]["Enums"]["session_type"]
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          description?: string | null
          discipline?: string | null
          duration_min: number
          id?: string
          is_active?: boolean
          level?: Database["public"]["Enums"]["skill_level"] | null
          price?: number
          title: string
          type?: Database["public"]["Enums"]["session_type"]
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          description?: string | null
          discipline?: string | null
          duration_min?: number
          id?: string
          is_active?: boolean
          level?: Database["public"]["Enums"]["skill_level"] | null
          price?: number
          title?: string
          type?: Database["public"]["Enums"]["session_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transformation_stories: {
        Row: {
          after_image_url: string
          before_image_url: string
          created_at: string
          current_weight: number | null
          discipline: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          member_id: string | null
          starting_weight: number | null
          story: string
          timeframe_months: number | null
          title: string
          updated_at: string
        }
        Insert: {
          after_image_url: string
          before_image_url: string
          created_at?: string
          current_weight?: number | null
          discipline?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          member_id?: string | null
          starting_weight?: number | null
          story: string
          timeframe_months?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          after_image_url?: string
          before_image_url?: string
          created_at?: string
          current_weight?: number | null
          discipline?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          member_id?: string | null
          starting_weight?: number | null
          story?: string
          timeframe_months?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transformation_stories_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_assignments: {
        Row: {
          assigned_at: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_available_coaches: {
        Args: { p_coach_id?: string }
        Returns: {
          avatar_url: string
          biography: string
          created_at: string
          experience_years: number
          full_name: string
          id: string
          is_available: boolean
          specialization: string
          updated_at: string
        }[]
      }
      get_coaches_directory: {
        Args: { p_coach_ids?: string[] }
        Returns: {
          avatar_url: string
          biography: string
          created_at: string
          experience_years: number
          full_name: string
          id: string
          is_available: boolean
          specialization: string
          updated_at: string
        }[]
      }
      get_conversation_messages: {
        Args: {
          p_before_id?: string
          p_conversation_id: string
          p_limit?: number
        }
        Returns: {
          body: string
          created_at: string
          id: string
          sender_id: string
          status: Database["public"]["Enums"]["message_status"]
        }[]
      }
      get_my_conversations: {
        Args: never
        Returns: {
          conversation_id: string
          last_message_at: string
          last_message_body: string
          last_sender_id: string
          other_avatar_url: string
          other_full_name: string
          other_participant_id: string
          unread_count: number
        }[]
      }
      get_public_approved_reviews: {
        Args: {
          p_coach_id?: string
          p_featured?: boolean
          p_limit?: number
          p_session_id?: string
        }
        Returns: {
          author_avatar: string
          author_name: string
          coach_id: string
          content: string
          created_at: string
          id: string
          is_featured: boolean
          member_id: string
          rating: number
          session_id: string
          status: Database["public"]["Enums"]["review_status"]
          target_type: Database["public"]["Enums"]["review_target_type"]
          title: string
          updated_at: string
        }[]
      }
      get_public_coach: {
        Args: never
        Returns: {
          avatar_url: string
          biography: string
          experience_years: number
          full_name: string
          id: string
          is_available: boolean
          specialization: string
        }[]
      }
      get_public_event_participant_count: {
        Args: { p_event_id: string }
        Returns: number
      }
      get_public_transformations: {
        Args: { p_featured?: boolean; p_limit?: number }
        Returns: {
          after_image_url: string
          author_avatar: string
          author_name: string
          before_image_url: string
          created_at: string
          current_weight: number
          discipline: string
          id: string
          is_featured: boolean
          is_published: boolean
          member_id: string
          starting_weight: number
          story: string
          timeframe_months: number
          title: string
          updated_at: string
        }[]
      }
      get_unread_message_count: { Args: never; Returns: number }
      has_role: { Args: { role_name: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_coach: { Args: never; Returns: boolean }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: number
      }
    }
    Enums: {
      achievement_type: "TITLE" | "TROPHY" | "MEDAL" | "CERTIFICATE" | "RANKING"
      billing_interval: "MONTHLY" | "QUARTERLY" | "ANNUAL" | "CUSTOM"
      booking_status:
        | "PENDING"
        | "CONFIRMED"
        | "COMPLETED"
        | "CANCELLED"
        | "NO_SHOW"
      event_type: "TRAINING" | "WORKSHOP" | "COMPETITION" | "SEMINAR" | "OTHER"
      gender: "MALE" | "FEMALE" | "OTHER"
      media_type: "IMAGE" | "VIDEO" | "DOCUMENT"
      message_status: "UNREAD" | "READ" | "REPLIED"
      notification_type: "BOOKING" | "SESSION" | "EVENT" | "MESSAGE" | "SYSTEM"
      participation_status:
        | "JOINED"
        | "INTERESTED"
        | "CANCELLED"
        | "ATTENDED"
        | "NO_SHOW"
      payment_method: "CASH" | "BANK_TRANSFER" | "ONLINE" | "OTHER" | "CARD"
      payment_status: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "COMPLETED"
      plan_tier:
        | "STUDENT"
        | "ADULT"
        | "KIDS"
        | "FAMILY"
        | "PRO_FIGHTER"
        | "UNLIMITED"
      review_status: "PENDING" | "APPROVED" | "REJECTED"
      review_target_type: "COACH" | "SESSION" | "CLUB"
      session_type: "PERSONAL" | "TECHNICAL" | "PHYSICAL" | "STRATEGY" | "COMBO"
      skill_level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PROFESSIONAL"
      subscription_status:
        | "ACTIVE"
        | "PAST_DUE"
        | "CANCELLED"
        | "EXPIRED"
        | "TRIAL"
      user_role: "ADMIN" | "COACH" | "MEMBER"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      achievement_type: ["TITLE", "TROPHY", "MEDAL", "CERTIFICATE", "RANKING"],
      billing_interval: ["MONTHLY", "QUARTERLY", "ANNUAL", "CUSTOM"],
      booking_status: [
        "PENDING",
        "CONFIRMED",
        "COMPLETED",
        "CANCELLED",
        "NO_SHOW",
      ],
      event_type: ["TRAINING", "WORKSHOP", "COMPETITION", "SEMINAR", "OTHER"],
      gender: ["MALE", "FEMALE", "OTHER"],
      media_type: ["IMAGE", "VIDEO", "DOCUMENT"],
      message_status: ["UNREAD", "READ", "REPLIED"],
      notification_type: ["BOOKING", "SESSION", "EVENT", "MESSAGE", "SYSTEM"],
      participation_status: [
        "JOINED",
        "INTERESTED",
        "CANCELLED",
        "ATTENDED",
        "NO_SHOW",
      ],
      payment_method: ["CASH", "BANK_TRANSFER", "ONLINE", "OTHER", "CARD"],
      payment_status: ["PENDING", "PAID", "FAILED", "REFUNDED", "COMPLETED"],
      plan_tier: [
        "STUDENT",
        "ADULT",
        "KIDS",
        "FAMILY",
        "PRO_FIGHTER",
        "UNLIMITED",
      ],
      review_status: ["PENDING", "APPROVED", "REJECTED"],
      review_target_type: ["COACH", "SESSION", "CLUB"],
      session_type: ["PERSONAL", "TECHNICAL", "PHYSICAL", "STRATEGY", "COMBO"],
      skill_level: ["BEGINNER", "INTERMEDIATE", "ADVANCED", "PROFESSIONAL"],
      subscription_status: [
        "ACTIVE",
        "PAST_DUE",
        "CANCELLED",
        "EXPIRED",
        "TRIAL",
      ],
      user_role: ["ADMIN", "COACH", "MEMBER"],
    },
  },
} as const
