// HAND-WRITTEN STAND-IN for the output of `pnpm db:types` (supabase gen types typescript), kept in the same
// shape so nothing changes when it is regenerated. Regenerate against the linked project as soon as one
// exists; after that this file is GENERATED and must never be hand-edited.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      claim_events: {
        Row: {
          actor_id: string | null;
          claim_id: string;
          created_at: string;
          event_type: string;
          id: number;
          payload: Json;
        };
        Insert: {
          actor_id?: string | null;
          claim_id: string;
          created_at?: string;
          event_type: string;
          id?: never;
          payload?: Json;
        };
        Update: {
          actor_id?: string | null;
          claim_id?: string;
          created_at?: string;
          event_type?: string;
          id?: never;
          payload?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "claim_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "claim_events_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "claims";
            referencedColumns: ["id"];
          },
        ];
      };
      claim_files: {
        Row: {
          claim_id: string;
          created_at: string;
          file_name: string;
          id: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          uploaded_by: string;
        };
        Insert: {
          claim_id: string;
          created_at?: string;
          file_name: string;
          id?: string;
          mime_type: string;
          size_bytes: number;
          storage_path?: string;
          uploaded_by: string;
        };
        Update: {
          claim_id?: string;
          created_at?: string;
          file_name?: string;
          id?: string;
          mime_type?: string;
          size_bytes?: number;
          storage_path?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "claim_files_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "claims";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "claim_files_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      claim_notes: {
        Row: {
          author_id: string;
          body: string;
          claim_id: string;
          created_at: string;
          id: string;
          visibility: Database["public"]["Enums"]["note_visibility"];
        };
        Insert: {
          author_id: string;
          body: string;
          claim_id: string;
          created_at?: string;
          id?: string;
          visibility?: Database["public"]["Enums"]["note_visibility"];
        };
        Update: {
          author_id?: string;
          body?: string;
          claim_id?: string;
          created_at?: string;
          id?: string;
          visibility?: Database["public"]["Enums"]["note_visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "claim_notes_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "claim_notes_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "claims";
            referencedColumns: ["id"];
          },
        ];
      };
      claims: {
        Row: {
          agent_id: string;
          assigned_to: string | null;
          claim_type: string;
          claimant_name: string | null;
          created_at: string;
          description: string;
          details: Json;
          id: string;
          incident_date: string | null;
          policy_number: string | null;
          status: Database["public"]["Enums"]["claim_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          agent_id: string;
          assigned_to?: string | null;
          claim_type: string;
          claimant_name?: string | null;
          created_at?: string;
          description?: string;
          details?: Json;
          id?: string;
          incident_date?: string | null;
          policy_number?: string | null;
          status?: Database["public"]["Enums"]["claim_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          agent_id?: string;
          assigned_to?: string | null;
          claim_type?: string;
          claimant_name?: string | null;
          created_at?: string;
          description?: string;
          details?: Json;
          id?: string;
          incident_date?: string | null;
          policy_number?: string | null;
          status?: Database["public"]["Enums"]["claim_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "claims_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "claims_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          expo_push_token: string | null;
          full_name: string;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          expo_push_token?: string | null;
          full_name?: string;
          id: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          expo_push_token?: string | null;
          full_name?: string;
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      release_push_token: {
        Args: { p_token: string };
        Returns: undefined;
      };
    };
    Enums: {
      claim_status: "draft" | "submitted" | "under_review" | "approved" | "rejected" | "info_requested";
      note_visibility: "internal" | "agent_visible";
      user_role: "agent" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database["public"];

export type Tables<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Update"];
export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T];

export const Constants = {
  public: {
    Enums: {
      claim_status: ["draft", "submitted", "under_review", "approved", "rejected", "info_requested"],
      note_visibility: ["internal", "agent_visible"],
      user_role: ["agent", "admin"],
    },
  },
} as const;
