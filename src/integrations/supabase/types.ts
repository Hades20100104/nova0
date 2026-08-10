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
      agent_skills: {
        Row: {
          code: string
          created_at: string
          description: string
          enabled: boolean
          id: string
          last_used_at: string | null
          name: string
          params_schema: Json
          section_slug: string | null
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          enabled?: boolean
          id?: string
          last_used_at?: string | null
          name: string
          params_schema?: Json
          section_slug?: string | null
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          last_used_at?: string | null
          name?: string
          params_schema?: Json
          section_slug?: string | null
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      assistant_messages: {
        Row: {
          attachments: Json
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
        }
        Insert: {
          attachments?: Json
          created_at?: string
          id?: string
          parts: Json
          role: string
          thread_id: string
        }
        Update: {
          attachments?: Json
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "assistant_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_threads: {
        Row: {
          assistant: string
          created_at: string
          id: string
          module: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assistant: string
          created_at?: string
          id?: string
          module?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assistant?: string
          created_at?: string
          id?: string
          module?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      automations: {
        Row: {
          action_config: Json
          action_type: string
          created_at: string
          enabled: boolean
          id: string
          last_state: string | null
          last_triggered_at: string | null
          name: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_config?: Json
          action_type: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_state?: string | null
          last_triggered_at?: string | null
          name: string
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_state?: string | null
          last_triggered_at?: string | null
          name?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_members: {
        Row: {
          joined_at: string
          role: string
          room_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          role?: string
          room_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          role?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_room_messages: {
        Row: {
          ai_name: string | null
          attachments: Json
          body: string
          created_at: string
          id: string
          room_id: string
          sender_id: string | null
          sender_kind: string
        }
        Insert: {
          ai_name?: string | null
          attachments?: Json
          body?: string
          created_at?: string
          id?: string
          room_id: string
          sender_id?: string | null
          sender_kind?: string
        }
        Update: {
          ai_name?: string | null
          attachments?: Json
          body?: string
          created_at?: string
          id?: string
          room_id?: string
          sender_id?: string | null
          sender_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          ai_assistant: string | null
          ai_enabled: boolean
          avatar_url: string | null
          created_at: string
          created_by: string
          id: string
          kind: string
          name: string | null
          updated_at: string
        }
        Insert: {
          ai_assistant?: string | null
          ai_enabled?: boolean
          avatar_url?: string | null
          created_at?: string
          created_by: string
          id?: string
          kind: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          ai_assistant?: string | null
          ai_enabled?: boolean
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      code_artifacts: {
        Row: {
          code: string
          created_at: string
          id: string
          language: string
          thread_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          language?: string
          thread_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          language?: string
          thread_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "code_artifacts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "assistant_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_sessions: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string | null
          minutes: number
          task_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          label?: string | null
          minutes?: number
          task_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string | null
          minutes?: number
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          created_at: string
          file_name: string
          format: string
          id: string
          mime_type: string
          prompt: string
          storage_path: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          format: string
          id?: string
          mime_type: string
          prompt: string
          storage_path: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          format?: string
          id?: string
          mime_type?: string
          prompt?: string
          storage_path?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_images: {
        Row: {
          created_at: string
          id: string
          prompt: string
          public_url: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prompt: string
          public_url: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt?: string
          public_url?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          description: string | null
          horizon: string
          id: string
          progress: number
          status: string
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          horizon?: string
          id?: string
          progress?: number
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          horizon?: string
          id?: string
          progress?: number
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          created_at: string
          done_on: string
          habit_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done_on?: string
          habit_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          done_on?: string
          habit_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          archived: boolean
          cadence: string
          created_at: string
          icon: string | null
          id: string
          name: string
          target_per_week: number
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          cadence?: string
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          target_per_week?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          cadence?: string
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          target_per_week?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      merlin_access: {
        Row: {
          unlocked_at: string
          user_id: string
        }
        Insert: {
          unlocked_at?: string
          user_id: string
        }
        Update: {
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      merlin_concepts: {
        Row: {
          area: string | null
          confidence: number
          created_at: string
          id: string
          last_review_at: string | null
          mastery: Json
          name: string
          overall: number
          position: Json | null
          priority: string
          status: string
          subject_id: string
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string | null
          confidence?: number
          created_at?: string
          id?: string
          last_review_at?: string | null
          mastery?: Json
          name: string
          overall?: number
          position?: Json | null
          priority?: string
          status?: string
          subject_id: string
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string | null
          confidence?: number
          created_at?: string
          id?: string
          last_review_at?: string | null
          mastery?: Json
          name?: string
          overall?: number
          position?: Json | null
          priority?: string
          status?: string
          subject_id?: string
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merlin_concepts_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "merlin_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      merlin_documents: {
        Row: {
          concepts: string[]
          content: string | null
          created_at: string
          id: string
          kind: string
          source_url: string | null
          subject_id: string | null
          summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          concepts?: string[]
          content?: string | null
          created_at?: string
          id?: string
          kind?: string
          source_url?: string | null
          subject_id?: string | null
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          concepts?: string[]
          content?: string | null
          created_at?: string
          id?: string
          kind?: string
          source_url?: string | null
          subject_id?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merlin_documents_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "merlin_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      merlin_evidence: {
        Row: {
          agent: string
          concept_id: string | null
          confidence: number
          correct: boolean | null
          created_at: string
          hypothesis: string | null
          id: string
          importance: string
          kind: string
          payload: Json | null
          subject_id: string | null
          summary: string
          user_id: string
        }
        Insert: {
          agent: string
          concept_id?: string | null
          confidence?: number
          correct?: boolean | null
          created_at?: string
          hypothesis?: string | null
          id?: string
          importance?: string
          kind?: string
          payload?: Json | null
          subject_id?: string | null
          summary: string
          user_id: string
        }
        Update: {
          agent?: string
          concept_id?: string | null
          confidence?: number
          correct?: boolean | null
          created_at?: string
          hypothesis?: string | null
          id?: string
          importance?: string
          kind?: string
          payload?: Json | null
          subject_id?: string | null
          summary?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merlin_evidence_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "merlin_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merlin_evidence_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "merlin_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      merlin_goals: {
        Row: {
          created_at: string
          id: string
          kind: string
          progress: number
          status: string
          subject_id: string | null
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          progress?: number
          status?: string
          subject_id?: string | null
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          progress?: number
          status?: string
          subject_id?: string | null
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merlin_goals_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "merlin_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      merlin_recalls: {
        Row: {
          concept_id: string
          created_at: string
          due_at: string
          id: string
          question: string | null
          result: string | null
          status: string
          user_id: string
        }
        Insert: {
          concept_id: string
          created_at?: string
          due_at?: string
          id?: string
          question?: string | null
          result?: string | null
          status?: string
          user_id: string
        }
        Update: {
          concept_id?: string
          created_at?: string
          due_at?: string
          id?: string
          question?: string | null
          result?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merlin_recalls_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "merlin_concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      merlin_relations: {
        Row: {
          created_at: string
          from_concept: string
          id: string
          kind: string
          subject_id: string
          to_concept: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_concept: string
          id?: string
          kind?: string
          subject_id: string
          to_concept: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_concept?: string
          id?: string
          kind?: string
          subject_id?: string
          to_concept?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merlin_relations_from_concept_fkey"
            columns: ["from_concept"]
            isOneToOne: false
            referencedRelation: "merlin_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merlin_relations_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "merlin_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merlin_relations_to_concept_fkey"
            columns: ["to_concept"]
            isOneToOne: false
            referencedRelation: "merlin_concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      merlin_routes: {
        Row: {
          active: boolean
          confidence: number
          created_at: string
          id: string
          reason: string | null
          steps: Json
          subject_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          confidence?: number
          created_at?: string
          id?: string
          reason?: string | null
          steps?: Json
          subject_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          confidence?: number
          created_at?: string
          id?: string
          reason?: string | null
          steps?: Json
          subject_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merlin_routes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "merlin_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      merlin_sessions: {
        Row: {
          concept_id: string | null
          created_at: string
          id: string
          minutes: number
          mode: string
          notes: string | null
          score: number | null
          strategy: string | null
          subject_id: string | null
          user_id: string
        }
        Insert: {
          concept_id?: string | null
          created_at?: string
          id?: string
          minutes?: number
          mode?: string
          notes?: string | null
          score?: number | null
          strategy?: string | null
          subject_id?: string | null
          user_id: string
        }
        Update: {
          concept_id?: string | null
          created_at?: string
          id?: string
          minutes?: number
          mode?: string
          notes?: string | null
          score?: number | null
          strategy?: string | null
          subject_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merlin_sessions_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "merlin_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merlin_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "merlin_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      merlin_strategies: {
        Row: {
          concept_kind: string
          confidence: number
          created_at: string
          id: string
          last_used_at: string | null
          losses: number
          strategy: string
          updated_at: string
          user_id: string
          wins: number
        }
        Insert: {
          concept_kind: string
          confidence?: number
          created_at?: string
          id?: string
          last_used_at?: string | null
          losses?: number
          strategy: string
          updated_at?: string
          user_id: string
          wins?: number
        }
        Update: {
          concept_kind?: string
          confidence?: number
          created_at?: string
          id?: string
          last_used_at?: string | null
          losses?: number
          strategy?: string
          updated_at?: string
          user_id?: string
          wins?: number
        }
        Relationships: []
      }
      merlin_subjects: {
        Row: {
          color: string | null
          created_at: string
          curriculum: string | null
          id: string
          level: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          curriculum?: string | null
          id?: string
          level?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          curriculum?: string | null
          id?: string
          level?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      playlist_tracks: {
        Row: {
          cover_url: string | null
          created_at: string
          id: string
          playlist_id: string
          position: number
          query: string
          spotify_album: string | null
          spotify_artist: string | null
          spotify_track_id: string | null
          spotify_uri: string | null
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          id?: string
          playlist_id: string
          position?: number
          query: string
          spotify_album?: string | null
          spotify_artist?: string | null
          spotify_track_id?: string | null
          spotify_uri?: string | null
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          id?: string
          playlist_id?: string
          position?: number
          query?: string
          spotify_album?: string | null
          spotify_artist?: string | null
          spotify_track_id?: string | null
          spotify_uri?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          assistant_name: string | null
          created_at: string
          display_name: string | null
          id: string
          nevira_color: string
          nova_color: string
          theme: string
          updated_at: string
          username: string | null
        }
        Insert: {
          assistant_name?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          nevira_color?: string
          nova_color?: string
          theme?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          assistant_name?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          nevira_color?: string
          nova_color?: string
          theme?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          color: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      section_events: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          user_id?: string
        }
        Relationships: []
      }
      spotify_connections: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string | null
          scopes: string[]
          spotify_display_name: string | null
          spotify_user_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token?: string | null
          scopes?: string[]
          spotify_display_name?: string | null
          spotify_user_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string | null
          scopes?: string[]
          spotify_display_name?: string | null
          spotify_user_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          due_date: string | null
          effort: number
          estimate_minutes: number | null
          id: string
          impact: number
          notes: string | null
          position: number
          priority: number
          project_id: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          effort?: number
          estimate_minutes?: number | null
          id?: string
          impact?: number
          notes?: string | null
          position?: number
          priority?: number
          project_id?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          effort?: number
          estimate_minutes?: number | null
          id?: string
          impact?: number
          notes?: string | null
          position?: number
          priority?: number
          project_id?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_insights: {
        Row: {
          confidence: number
          content: string
          created_at: string
          evidence: string | null
          id: string
          kind: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number
          content: string
          created_at?: string
          evidence?: string | null
          id?: string
          kind?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number
          content?: string
          created_at?: string
          evidence?: string | null
          id?: string
          kind?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_memory: {
        Row: {
          category: string
          confidence: number
          created_at: string
          hits: number
          id: string
          key: string
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          category?: string
          confidence?: number
          created_at?: string
          hits?: number
          id?: string
          key: string
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          category?: string
          confidence?: number
          created_at?: string
          hits?: number
          id?: string
          key?: string
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      user_sections: {
        Row: {
          accent: string | null
          assistant: string
          created_at: string
          created_by: string
          icon: string | null
          id: string
          label: string
          layout: Json
          slug: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accent?: string | null
          assistant: string
          created_at?: string
          created_by?: string
          icon?: string | null
          id?: string
          label: string
          layout?: Json
          slug: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accent?: string | null
          assistant?: string
          created_at?: string
          created_by?: string
          icon?: string | null
          id?: string
          label?: string
          layout?: Json
          slug?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_contacts: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_read_room_attachment: {
        Args: { _object_name: string; _user: string }
        Returns: boolean
      }
      is_room_member: {
        Args: { _room: string; _user: string }
        Returns: boolean
      }
      is_room_owner: {
        Args: { _room: string; _user: string }
        Returns: boolean
      }
      search_profiles: {
        Args: { _term: string }
        Returns: {
          display_name: string
          id: string
          username: string
        }[]
      }
      shares_room_with: {
        Args: { _other: string; _user: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
