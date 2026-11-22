export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: number
          metadata: Json
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: never
          metadata?: Json
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: never
          metadata?: Json
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_definitions: {
        Row: {
          accent: string
          created_at: string
          description: string | null
          icon: string
          id: string
          is_active: boolean
          name: string
          reward_expiry_days: number | null
          reward_max_value_tnd: number | null
          reward_requires_approval: boolean
          reward_terms: string | null
          reward_total_cap: number | null
          reward_type: string | null
          reward_value_tnd: number | null
          threshold: number
          tier: string
          updated_at: string
        }
        Insert: {
          accent?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          reward_expiry_days?: number | null
          reward_max_value_tnd?: number | null
          reward_requires_approval?: boolean
          reward_terms?: string | null
          reward_total_cap?: number | null
          reward_type?: string | null
          reward_value_tnd?: number | null
          threshold: number
          tier?: string
          updated_at?: string
        }
        Update: {
          accent?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          reward_expiry_days?: number | null
          reward_max_value_tnd?: number | null
          reward_requires_approval?: boolean
          reward_terms?: string | null
          reward_total_cap?: number | null
          reward_type?: string | null
          reward_value_tnd?: number | null
          threshold?: number
          tier?: string
          updated_at?: string
        }
        Relationships: []
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
      cms_page_revisions: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          slug: string
        }
        Insert: {
          content: Json
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          slug: string
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_page_revisions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_page_revisions_slug_fkey"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "cms_pages"
            referencedColumns: ["slug"]
          },
        ]
      }
      cms_pages: {
        Row: {
          draft: Json
          draft_updated_at: string
          draft_updated_by: string | null
          published_at: string | null
          published_revision_id: string | null
          slug: string
        }
        Insert: {
          draft?: Json
          draft_updated_at?: string
          draft_updated_by?: string | null
          published_at?: string | null
          published_revision_id?: string | null
          slug: string
        }
        Update: {
          draft?: Json
          draft_updated_at?: string
          draft_updated_by?: string | null
          published_at?: string | null
          published_revision_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_pages_draft_updated_by_fkey"
            columns: ["draft_updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_pages_published_fk"
            columns: ["published_revision_id"]
            isOneToOne: false
            referencedRelation: "cms_page_revisions"
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
          category: string
          created_at: string
          email: string
          handled_at: string | null
          id: string
          member_id: string | null
          message: string
          name: string
          replied_at: string | null
          status: Database["public"]["Enums"]["message_status"]
          subject: string
        }
        Insert: {
          category?: string
          created_at?: string
          email: string
          handled_at?: string | null
          id?: string
          member_id?: string | null
          message: string
          name: string
          replied_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          subject: string
        }
        Update: {
          category?: string
          created_at?: string
          email?: string
          handled_at?: string | null
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
          admin_unread: boolean
          coach_id: string
          created_at: string
          id: string
          last_message_at: string | null
          member_id: string
        }
        Insert: {
          admin_unread?: boolean
          coach_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          member_id: string
        }
        Update: {
          admin_unread?: boolean
          coach_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
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
      daily_motivations: {
        Row: {
          category: string
          displayed_at: string | null
          focus: string | null
          generated_at: string
          id: string
          motivation_date: string
          quote: string
          source: string
          user_id: string
        }
        Insert: {
          category?: string
          displayed_at?: string | null
          focus?: string | null
          generated_at?: string
          id?: string
          motivation_date: string
          quote: string
          source?: string
          user_id: string
        }
        Update: {
          category?: string
          displayed_at?: string | null
          focus?: string | null
          generated_at?: string
          id?: string
          motivation_date?: string
          quote?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_motivations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_deliveries: {
        Row: {
          attempts: number
          created_at: string
          delivery_key: string
          delivery_type: Database["public"]["Enums"]["email_delivery_type"]
          error_message: string | null
          id: string
          message_id: string | null
          recipient_email: string
          sent_at: string | null
          status: Database["public"]["Enums"]["email_delivery_status"]
          subject: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          delivery_key: string
          delivery_type: Database["public"]["Enums"]["email_delivery_type"]
          error_message?: string | null
          id?: string
          message_id?: string | null
          recipient_email: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_delivery_status"]
          subject?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          delivery_key?: string
          delivery_type?: Database["public"]["Enums"]["email_delivery_type"]
          error_message?: string | null
          id?: string
          message_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_delivery_status"]
          subject?: string | null
        }
        Relationships: []
      }
      event_invitations: {
        Row: {
          created_at: string
          event_id: string
          invited_by: string | null
          member_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          invited_by?: string | null
          member_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          invited_by?: string | null
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invitations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          amount_due_tnd: number
          attendance_recorded_at: string | null
          attendance_recorded_by: string | null
          attendance_status: Database["public"]["Enums"]["attendance_status"]
          attended: boolean
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          event_id: string
          id: string
          joined_at: string
          member_id: string
          payment_confirmed_at: string | null
          payment_confirmed_by: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_plan_note: string | null
          payment_status: Database["public"]["Enums"]["event_payment_status"]
          planned_payment_date: string | null
          registration_status: Database["public"]["Enums"]["registration_status"]
          status: Database["public"]["Enums"]["participation_status"]
          updated_at: string
          waitlisted_at: string | null
        }
        Insert: {
          amount_due_tnd?: number
          attendance_recorded_at?: string | null
          attendance_recorded_by?: string | null
          attendance_status?: Database["public"]["Enums"]["attendance_status"]
          attended?: boolean
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          event_id: string
          id?: string
          joined_at?: string
          member_id: string
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_plan_note?: string | null
          payment_status?: Database["public"]["Enums"]["event_payment_status"]
          planned_payment_date?: string | null
          registration_status?: Database["public"]["Enums"]["registration_status"]
          status?: Database["public"]["Enums"]["participation_status"]
          updated_at?: string
          waitlisted_at?: string | null
        }
        Update: {
          amount_due_tnd?: number
          attendance_recorded_at?: string | null
          attendance_recorded_by?: string | null
          attendance_status?: Database["public"]["Enums"]["attendance_status"]
          attended?: boolean
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          event_id?: string
          id?: string
          joined_at?: string
          member_id?: string
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_plan_note?: string | null
          payment_status?: Database["public"]["Enums"]["event_payment_status"]
          planned_payment_date?: string | null
          registration_status?: Database["public"]["Enums"]["registration_status"]
          status?: Database["public"]["Enums"]["participation_status"]
          updated_at?: string
          waitlisted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_attendance_recorded_by_fkey"
            columns: ["attendance_recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "event_participants_payment_confirmed_by_fkey"
            columns: ["payment_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          cancellation_deadline_hours: number
          cancellation_reason: string | null
          cancelled_at: string | null
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          end_at: string | null
          event_format: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          image_url: string | null
          is_free: boolean
          is_public: boolean
          location: string | null
          max_participants: number | null
          price_tnd: number | null
          registration_closes_at: string | null
          registration_opens_at: string | null
          requirements: string | null
          requires_approval: boolean
          start_at: string
          status: Database["public"]["Enums"]["event_status"]
          tags: string[]
          title: string
          updated_at: string
          waitlist_enabled: boolean
        }
        Insert: {
          cancellation_deadline_hours?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_at?: string | null
          event_format?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          image_url?: string | null
          is_free?: boolean
          is_public?: boolean
          location?: string | null
          max_participants?: number | null
          price_tnd?: number | null
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          requirements?: string | null
          requires_approval?: boolean
          start_at: string
          status?: Database["public"]["Enums"]["event_status"]
          tags?: string[]
          title: string
          updated_at?: string
          waitlist_enabled?: boolean
        }
        Update: {
          cancellation_deadline_hours?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_at?: string | null
          event_format?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          image_url?: string | null
          is_free?: boolean
          is_public?: boolean
          location?: string | null
          max_participants?: number | null
          price_tnd?: number | null
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          requirements?: string | null
          requires_approval?: boolean
          start_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          tags?: string[]
          title?: string
          updated_at?: string
          waitlist_enabled?: boolean
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
      faq_items: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          is_published: boolean
          position: number
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          id?: string
          is_published?: boolean
          position?: number
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          is_published?: boolean
          position?: number
          question?: string
          updated_at?: string
        }
        Relationships: []
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
      legal_documents: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          kind: string
          published_at: string | null
          status: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          published_at?: string | null
          status?: string
          title: string
          updated_at?: string
          version: number
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          published_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "legal_documents_created_by_fkey"
            columns: ["created_by"]
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
      member_badges: {
        Row: {
          awarded_at: string
          badge_id: string
          id: string
          member_id: string
          participation_count: number
          revoked_at: string | null
          revoked_reason: string | null
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          id?: string
          member_id: string
          participation_count: number
          revoked_at?: string | null
          revoked_reason?: string | null
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          id?: string
          member_id?: string
          participation_count?: number
          revoked_at?: string | null
          revoked_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_badges_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_profiles: {
        Row: {
          address: string | null
          ai_motivation_enabled: boolean
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
          ai_motivation_enabled?: boolean
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
          ai_motivation_enabled?: boolean
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
      member_rewards: {
        Row: {
          badge_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          member_badge_id: string | null
          member_id: string
          redeemed_registration_id: string | null
          redeemed_value_tnd: number | null
          reward_type: string
          status: Database["public"]["Enums"]["reward_status"]
          terms: string | null
          updated_at: string
          value_tnd: number
        }
        Insert: {
          badge_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          member_badge_id?: string | null
          member_id: string
          redeemed_registration_id?: string | null
          redeemed_value_tnd?: number | null
          reward_type: string
          status: Database["public"]["Enums"]["reward_status"]
          terms?: string | null
          updated_at?: string
          value_tnd: number
        }
        Update: {
          badge_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          member_badge_id?: string | null
          member_id?: string
          redeemed_registration_id?: string | null
          redeemed_value_tnd?: number | null
          reward_type?: string
          status?: Database["public"]["Enums"]["reward_status"]
          terms?: string | null
          updated_at?: string
          value_tnd?: number
        }
        Relationships: [
          {
            foreignKeyName: "member_rewards_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_rewards_member_badge_id_fkey"
            columns: ["member_badge_id"]
            isOneToOne: true
            referencedRelation: "member_badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_rewards_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_rewards_redeemed_registration_id_fkey"
            columns: ["redeemed_registration_id"]
            isOneToOne: false
            referencedRelation: "event_participants"
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
      message_templates: {
        Row: {
          body: string
          is_enabled: boolean
          is_essential: boolean
          key: string
          label: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body: string
          is_enabled?: boolean
          is_essential?: boolean
          key: string
          label: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string
          is_enabled?: boolean
          is_essential?: boolean
          key?: string
          label?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_mime: string | null
          attachment_name: string | null
          attachment_path: string | null
          attachment_size: number | null
          body: string
          conversation_id: string
          created_at: string
          id: string
          idempotency_key: string | null
          kind: string
          read_at: string | null
          sender_id: string
          status: Database["public"]["Enums"]["message_status"]
        }
        Insert: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size?: number | null
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          idempotency_key?: string | null
          kind?: string
          read_at?: string | null
          sender_id: string
          status?: Database["public"]["Enums"]["message_status"]
        }
        Update: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size?: number | null
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          idempotency_key?: string | null
          kind?: string
          read_at?: string | null
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
          archived_at: string | null
          category: string
          content: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string
          excerpt: string | null
          id: string
          is_published: boolean
          published_at: string | null
          seo_description: string | null
          slug: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          category?: string
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          seo_description?: string | null
          slug: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          category?: string
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          seo_description?: string | null
          slug?: string
          tags?: string[]
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
          dedupe_key: string | null
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
          dedupe_key?: string | null
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
          dedupe_key?: string | null
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
      payment_settings: {
        Row: {
          bank_instructions: string | null
          id: number
          in_person_instructions: string | null
          proof_resubmission_allowed: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bank_instructions?: string | null
          id?: number
          in_person_instructions?: string | null
          proof_resubmission_allowed?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bank_instructions?: string | null
          id?: number
          in_person_instructions?: string | null
          proof_resubmission_allowed?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_submissions: {
        Row: {
          amount_declared: number
          created_at: string
          id: string
          member_id: string
          member_note: string | null
          proof_mime: string
          proof_path: string
          proof_size: number
          registration_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_submission_status"]
          transfer_reference: string | null
        }
        Insert: {
          amount_declared: number
          created_at?: string
          id?: string
          member_id: string
          member_note?: string | null
          proof_mime: string
          proof_path: string
          proof_size: number
          registration_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_submission_status"]
          transfer_reference?: string | null
        }
        Update: {
          amount_declared?: number
          created_at?: string
          id?: string
          member_id?: string
          member_note?: string | null
          proof_mime?: string
          proof_path?: string
          proof_size?: number
          registration_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_submission_status"]
          transfer_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_submissions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_submissions_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
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
          note: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          recorded_by: string | null
          registration_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          submission_id: string | null
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
          note?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          recorded_by?: string | null
          registration_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          submission_id?: string | null
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
          note?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          recorded_by?: string | null
          registration_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          submission_id?: string | null
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
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "payment_submissions"
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
          show_badges_publicly: boolean
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
          show_badges_publicly?: boolean
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
          show_badges_publicly?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      push_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      reward_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: number
          kind: string
          note: string | null
          reward_id: string
          value_tnd: number | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: never
          kind: string
          note?: string | null
          reward_id: string
          value_tnd?: number | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: never
          kind?: string
          note?: string | null
          reward_id?: string
          value_tnd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_events_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "member_rewards"
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
      site_settings: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          id: number
          social_links: Json
          timezone: string
          updated_at: string
          updated_by: string | null
          whatsapp: string | null
          working_hours: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          id?: number
          social_links?: Json
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
          working_hours?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          id?: number
          social_links?: Json
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
          working_hours?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      apply_payment_plan: {
        Args: {
          p_is_change: boolean
          p_method: string
          p_note: string
          p_planned_date: string
          p_registration_id: string
        }
        Returns: undefined
      }
      cancel_my_registration: {
        Args: { p_registration_id: string }
        Returns: undefined
      }
      claim_email_delivery: {
        Args: {
          p_key: string
          p_recipient: string
          p_subject: string
          p_type: Database["public"]["Enums"]["email_delivery_type"]
        }
        Returns: {
          attempts: number
          created_at: string
          delivery_key: string
          delivery_type: Database["public"]["Enums"]["email_delivery_type"]
          error_message: string | null
          id: string
          message_id: string | null
          recipient_email: string
          sent_at: string | null
          status: Database["public"]["Enums"]["email_delivery_status"]
          subject: string | null
        }
        SetofOptions: {
          from: "*"
          to: "email_deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      conversation_for_member: {
        Args: { p_member_id: string }
        Returns: string
      }
      decide_registration: {
        Args: {
          p_decision: string
          p_reason?: string
          p_registration_id: string
        }
        Returns: Database["public"]["Enums"]["registration_status"]
      }
      ensure_coach_profile: { Args: { p_user_id: string }; Returns: undefined }
      ensure_member_profile: { Args: { p_user_id: string }; Returns: undefined }
      event_date_label: { Args: { p_start: string }; Returns: string }
      event_seats_taken: { Args: { p_event_id: string }; Returns: number }
      format_tnd: { Args: { p_amount: number }; Returns: string }
      get_admin_dashboard: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
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
      get_conversation_messages_v1: {
        Args: {
          p_before_id?: string
          p_conversation_id: string
          p_limit?: number
        }
        Returns: {
          attachment_mime: string
          attachment_name: string
          attachment_path: string
          attachment_size: number
          body: string
          created_at: string
          id: string
          kind: string
          read_at: string
          sender_id: string
          status: Database["public"]["Enums"]["message_status"]
        }[]
      }
      get_event_fingerprint: {
        Args: { p_event_id: string }
        Returns: {
          created_by: string
          description: string
          end_at: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          is_free: boolean
          is_public: boolean
          location: string
          max_participants: number
          participant_count: number
          price_tnd: number
          start_at: string
          title: string
        }[]
      }
      get_event_joined_participants: {
        Args: { p_event_id: string }
        Returns: {
          email: string
          full_name: string
          member_id: string
        }[]
      }
      get_event_report: {
        Args: { p_from: string; p_to: string }
        Returns: {
          attended: number
          cancelled: number
          capacity: number
          category: string
          confirmed: number
          event_id: string
          income: number
          is_free: boolean
          no_show: number
          outstanding: number
          paid_count: number
          pending: number
          start_at: string
          status: Database["public"]["Enums"]["event_status"]
          title: string
          waitlisted: number
        }[]
      }
      get_event_seats_taken: { Args: { p_event_id: string }; Returns: number }
      get_events_in_range: {
        Args: { p_end: string; p_start: string }
        Returns: {
          created_by: string
          description: string
          end_at: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          is_free: boolean
          is_public: boolean
          location: string
          max_participants: number
          participant_count: number
          price_tnd: number
          start_at: string
          title: string
        }[]
      }
      get_inbox: {
        Args: { p_limit?: number; p_search?: string }
        Returns: {
          conversation_id: string
          last_kind: string
          last_message_at: string
          last_message_body: string
          last_sender_id: string
          member_avatar: string
          member_email: string
          member_id: string
          member_name: string
          unread_count: number
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
      get_or_create_conversation: {
        Args: { p_member_id?: string }
        Returns: string
      }
      get_profile_contact: {
        Args: { p_profile_id: string }
        Returns: {
          email: string
          full_name: string
          id: string
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
      get_public_author_names: {
        Args: { p_author_ids: string[] }
        Returns: {
          full_name: string
          id: string
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
      get_public_event_participant_counts: {
        Args: never
        Returns: {
          active_count: number
          event_id: string
        }[]
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
      get_published_page: {
        Args: { p_slug: string }
        Returns: {
          content: Json
          published_at: string
        }[]
      }
      get_reward_liability: {
        Args: never
        Returns: {
          outstanding_count: number
          outstanding_value: number
          pending_approval_count: number
          pending_approval_value: number
          redeemed_count: number
          redeemed_value: number
        }[]
      }
      get_staff_event_participant_counts: {
        Args: never
        Returns: {
          active_count: number
          event_id: string
        }[]
      }
      get_staff_recipients: {
        Args: never
        Returns: {
          email: string
          full_name: string
          id: string
        }[]
      }
      get_unread_message_count: { Args: never; Returns: number }
      has_role: { Args: { role_name: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_coach: { Args: never; Returns: boolean }
      is_invited_to_event: { Args: { p_event_id: string }; Returns: boolean }
      log_audit: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_target_id: string
          p_target_type: string
        }
        Returns: undefined
      }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: number
      }
      mark_email_delivery_failed: {
        Args: { p_error_message: string; p_id: string }
        Returns: undefined
      }
      mark_email_delivery_sent: {
        Args: { p_id: string; p_message_id: string }
        Returns: undefined
      }
      notify_user: {
        Args: {
          p_content: string
          p_dedupe_key: string
          p_resource_id: string
          p_resource_type: string
          p_title: string
          p_type: Database["public"]["Enums"]["notification_type"]
          p_user_id: string
        }
        Returns: undefined
      }
      platform_owner_id: { Args: never; Returns: string }
      preview_badge_impact: { Args: { p_threshold: number }; Returns: number }
      promote_waitlist: { Args: { p_event_id: string }; Returns: number }
      publish_legal_document: { Args: { p_id: string }; Returns: undefined }
      publish_page: {
        Args: { p_note?: string; p_slug: string }
        Returns: string
      }
      reconcile_all_progress: { Args: never; Returns: number }
      reconcile_member_progress: {
        Args: { p_member_id: string }
        Returns: undefined
      }
      record_attendance: {
        Args: {
          p_registration_id: string
          p_status: Database["public"]["Enums"]["attendance_status"]
        }
        Returns: undefined
      }
      record_in_person_payment: {
        Args: {
          p_amount: number
          p_note?: string
          p_paid_at?: string
          p_registration_id: string
        }
        Returns: undefined
      }
      redeem_reward: {
        Args: { p_registration_id: string; p_reward_id: string }
        Returns: number
      }
      register_for_event: {
        Args: { p_event_id: string }
        Returns: {
          amount_due_tnd: number
          payment_status: Database["public"]["Enums"]["event_payment_status"]
          registration_id: string
          registration_status: Database["public"]["Enums"]["registration_status"]
        }[]
      }
      register_for_event_with_plan: {
        Args: {
          p_event_id: string
          p_note?: string
          p_payment_method?: string
          p_planned_date?: string
        }
        Returns: {
          amount_due_tnd: number
          payment_status: Database["public"]["Enums"]["event_payment_status"]
          registration_id: string
          registration_status: Database["public"]["Enums"]["registration_status"]
        }[]
      }
      render_template: {
        Args: { p_body: string; p_vars: Json }
        Returns: string
      }
      require_staff: { Args: never; Returns: string }
      restore_page_revision: {
        Args: { p_revision_id: string }
        Returns: undefined
      }
      review_payment_submission: {
        Args: {
          p_amount?: number
          p_decision: string
          p_reason?: string
          p_submission_id: string
        }
        Returns: Database["public"]["Enums"]["payment_submission_status"]
      }
      reward_label: {
        Args: { p_type: string; p_value: number }
        Returns: string
      }
      send_system_message: {
        Args: {
          p_idempotency_key: string
          p_member_id: string
          p_template: string
          p_vars: Json
        }
        Returns: undefined
      }
      set_event_invitation: {
        Args: { p_event_id: string; p_invited: boolean; p_member_id: string }
        Returns: undefined
      }
      set_event_status: {
        Args: {
          p_event_id: string
          p_reason?: string
          p_status: Database["public"]["Enums"]["event_status"]
        }
        Returns: undefined
      }
      set_my_avatar: { Args: { p_path: string }; Returns: string }
      set_my_payment_plan: {
        Args: {
          p_note?: string
          p_payment_method: string
          p_planned_date?: string
          p_registration_id: string
        }
        Returns: undefined
      }
      set_reward_status: {
        Args: { p_action: string; p_reason?: string; p_reward_id: string }
        Returns: Database["public"]["Enums"]["reward_status"]
      }
      settle_registration_payment: {
        Args: {
          p_amount: number
          p_method: Database["public"]["Enums"]["payment_method"]
          p_note: string
          p_paid_at: string
          p_registration_id: string
          p_submission_id: string
        }
        Returns: undefined
      }
      submit_payment_proof: {
        Args: {
          p_amount: number
          p_note?: string
          p_proof_path: string
          p_reference?: string
          p_registration_id: string
        }
        Returns: string
      }
      upsert_daily_motivation: {
        Args: {
          p_category: string
          p_focus: string
          p_motivation_date: string
          p_quote: string
          p_source: string
          p_user_id: string
        }
        Returns: {
          category: string
          displayed_at: string | null
          focus: string | null
          generated_at: string
          id: string
          motivation_date: string
          quote: string
          source: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "daily_motivations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      achievement_type: "TITLE" | "TROPHY" | "MEDAL" | "CERTIFICATE" | "RANKING"
      attendance_status: "UNMARKED" | "ATTENDED" | "NO_SHOW"
      billing_interval: "MONTHLY" | "QUARTERLY" | "ANNUAL" | "CUSTOM"
      booking_status:
        | "PENDING"
        | "CONFIRMED"
        | "COMPLETED"
        | "CANCELLED"
        | "NO_SHOW"
      email_delivery_status: "PENDING" | "SENT" | "FAILED"
      email_delivery_type:
        | "EVENT_REMINDER_COACH"
        | "EVENT_REMINDER_MEMBER"
        | "DAILY_COACH_REPORT"
        | "EVENT_CANCELLATION_ALERT"
        | "EVENT_EMPTY_ALERT"
      event_payment_status:
        | "UNPAID"
        | "PAID"
        | "NOT_REQUIRED"
        | "PROOF_SUBMITTED"
        | "REJECTED"
        | "WAIVED"
      event_status: "DRAFT" | "PUBLISHED" | "CANCELLED" | "ARCHIVED"
      event_type: "TRAINING" | "WORKSHOP" | "COMPETITION" | "SEMINAR" | "OTHER"
      gender: "MALE" | "FEMALE" | "OTHER"
      media_type: "IMAGE" | "VIDEO" | "DOCUMENT"
      message_status: "UNREAD" | "READ" | "REPLIED"
      notification_type:
        | "BOOKING"
        | "SESSION"
        | "EVENT"
        | "MESSAGE"
        | "SYSTEM"
        | "PAYMENT"
        | "BADGE"
        | "REWARD"
      participation_status:
        | "JOINED"
        | "INTERESTED"
        | "CANCELLED"
        | "ATTENDED"
        | "NO_SHOW"
      payment_method: "CASH" | "BANK_TRANSFER" | "ONLINE" | "OTHER" | "CARD"
      payment_status: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "COMPLETED"
      payment_submission_status: "SUBMITTED" | "CONFIRMED" | "REJECTED"
      plan_tier:
        | "STUDENT"
        | "ADULT"
        | "KIDS"
        | "FAMILY"
        | "PRO_FIGHTER"
        | "UNLIMITED"
      registration_status:
        | "PENDING"
        | "CONFIRMED"
        | "WAITLISTED"
        | "REJECTED"
        | "CANCELLED"
      review_status: "PENDING" | "APPROVED" | "REJECTED"
      review_target_type: "COACH" | "SESSION" | "CLUB"
      reward_status:
        | "PENDING_APPROVAL"
        | "AVAILABLE"
        | "REDEEMED"
        | "REVOKED"
        | "EXPIRED"
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
      attendance_status: ["UNMARKED", "ATTENDED", "NO_SHOW"],
      billing_interval: ["MONTHLY", "QUARTERLY", "ANNUAL", "CUSTOM"],
      booking_status: [
        "PENDING",
        "CONFIRMED",
        "COMPLETED",
        "CANCELLED",
        "NO_SHOW",
      ],
      email_delivery_status: ["PENDING", "SENT", "FAILED"],
      email_delivery_type: [
        "EVENT_REMINDER_COACH",
        "EVENT_REMINDER_MEMBER",
        "DAILY_COACH_REPORT",
        "EVENT_CANCELLATION_ALERT",
        "EVENT_EMPTY_ALERT",
      ],
      event_payment_status: [
        "UNPAID",
        "PAID",
        "NOT_REQUIRED",
        "PROOF_SUBMITTED",
        "REJECTED",
        "WAIVED",
      ],
      event_status: ["DRAFT", "PUBLISHED", "CANCELLED", "ARCHIVED"],
      event_type: ["TRAINING", "WORKSHOP", "COMPETITION", "SEMINAR", "OTHER"],
      gender: ["MALE", "FEMALE", "OTHER"],
      media_type: ["IMAGE", "VIDEO", "DOCUMENT"],
      message_status: ["UNREAD", "READ", "REPLIED"],
      notification_type: [
        "BOOKING",
        "SESSION",
        "EVENT",
        "MESSAGE",
        "SYSTEM",
        "PAYMENT",
        "BADGE",
        "REWARD",
      ],
      participation_status: [
        "JOINED",
        "INTERESTED",
        "CANCELLED",
        "ATTENDED",
        "NO_SHOW",
      ],
      payment_method: ["CASH", "BANK_TRANSFER", "ONLINE", "OTHER", "CARD"],
      payment_status: ["PENDING", "PAID", "FAILED", "REFUNDED", "COMPLETED"],
      payment_submission_status: ["SUBMITTED", "CONFIRMED", "REJECTED"],
      plan_tier: [
        "STUDENT",
        "ADULT",
        "KIDS",
        "FAMILY",
        "PRO_FIGHTER",
        "UNLIMITED",
      ],
      registration_status: [
        "PENDING",
        "CONFIRMED",
        "WAITLISTED",
        "REJECTED",
        "CANCELLED",
      ],
      review_status: ["PENDING", "APPROVED", "REJECTED"],
      review_target_type: ["COACH", "SESSION", "CLUB"],
      reward_status: [
        "PENDING_APPROVAL",
        "AVAILABLE",
        "REDEEMED",
        "REVOKED",
        "EXPIRED",
      ],
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

