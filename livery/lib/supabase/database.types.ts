// Hand-written to match supabase/migrations. Replace with generated types
// (Supabase MCP generate_typescript_types) once the project is linked, and
// keep the two in sync from then on.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type KitStatus = "building" | "ready" | "failed" | "withdrawn";
export type KitItemKind = "font" | "icon_set" | "icon" | "image" | "logo" | "illustration";
export type KitLicence = "free" | "licence_required" | "style_only";
export type KitKind = "page" | "site" | "taste";
export type SiteOptIn = "none" | "granted" | "forbidden";
export type ReadFailureReason =
  | "bot_protection"
  | "login_required"
  | "empty_render"
  | "not_found"
  | "robots_disallowed"
  | "unsafe_url"
  | "timeout"
  | "sensitive_page"
  | "blocked_by_owner";

type Table<Row, Insert = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      sites: Table<{
        domain: string;
        opt_in: SiteOptIn;
        grant_doc: Json | null;
        grant_checked_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      kits: Table<{
        id: string;
        kind: KitKind;
        /** Page kits only. */
        source_url: string | null;
        /** Page and site kits; null for a taste. */
        domain: string | null;
        /** Site and taste kits: sha256 of what they combine. */
        sources_key: string | null;
        curator: string | null;
        curator_slug: string | null;
        display_name: string | null;
        featured: boolean;
        hidden: boolean;
        cover_path: string | null;
        slug: string;
        owner_id: string | null;
        created_at: string;
      }>;
      kit_versions: Table<{
        id: string;
        kit_id: string;
        version: number | null;
        extractor_version: number;
        flow_version: number;
        status: KitStatus;
        levels: number[];
        data: Json | null;
        skill_md: string | null;
        zip_path: string | null;
        tar_path: string | null;
        manifest: Json | null;
        content_hash: string | null;
        grant_snapshot: Json | null;
        grant_hash: string | null;
        sources_hash: string | null;
        error: string | null;
        build_started_at: string;
        published_at: string | null;
        withdrawn_at: string | null;
        created_at: string;
      }>;
      kit_items: Table<{
        id: number;
        kit_version_id: string;
        kind: KitItemKind;
        name: string;
        source: string | null;
        licence: KitLicence;
        licence_name: string | null;
        alternative: string | null;
      }>;
      kit_sources: Table<{
        kit_version_id: string;
        position: number;
        source_url: string;
        domain: string;
        source_version_id: string;
      }>;
      kit_events: Table<{ kit_id: string; kind: "view" | "like" | "download"; visitor: string; network: string; created_at: string }>;
      kit_stats: Table<{ kit_id: string; views: number; likes: number; downloads: number; updated_at: string }>;
      read_failures: Table<{
        source_url: string;
        domain: string;
        reason: ReadFailureReason;
        detail: string | null;
        retry_after: string;
        hits: number;
        first_at: string;
        last_at: string;
      }>;
      rate_limits: Table<{ key: string; window_start: string; count: number }>;
      takedown_requests: Table<{
        id: number;
        domain: string;
        email: string;
        message: string;
        relationship: "owner" | "agent" | "other";
        status: "open" | "actioned" | "rejected";
        created_at: string;
      }>;
    };
    Views: {
      kit_library: {
        Row: {
          id: string;
          kit_id: string;
          version: number;
          published_at: string;
          data: Json;
          grant_hash: string | null;
          views: number;
          likes: number;
          downloads: number;
          scheme: "light" | "dark" | null;
          accent: string | null;
          colour: string;
          font: string | null;
          icon_set: string | null;
        };
        Relationships: [{ foreignKeyName: "kit_versions_kit_id_fkey"; columns: ["kit_id"]; isOneToOne: false; referencedRelation: "kits"; referencedColumns: ["id"] }];
      };
      blocked_domains: { Row: { domain: string; reason: ReadFailureReason; hits: number; pages: number; last_at: string }; Relationships: [] };
    };
    Functions: {
      bump_rate: {
        Args: { p_key: string; p_window_seconds: number; p_max: number };
        Returns: { allowed: boolean; current_count: number; reset_at: string }[];
      };
      start_build: {
        Args: {
          p_source_url: string;
          p_domain: string;
          p_slug: string;
          p_extractor_version: number;
          p_flow_version: number;
          p_stale_after?: string;
        };
        Returns: { kit_id: string; kit_version_id: string; claimed: boolean }[];
      };
      start_combined_build: {
        Args: {
          p_kind: "site" | "taste";
          p_sources_key: string;
          p_domain: string | null;
          p_slug: string;
          p_curator: string | null;
          p_curator_slug: string | null;
          p_sources: Json;
          p_sources_hash: string;
          p_extractor_version: number;
          p_flow_version: number;
          p_stale_after?: string;
        };
        Returns: { kit_id: string; kit_version_id: string; claimed: boolean }[];
      };
      start_combined_version: {
        Args: {
          p_kit_id: string;
          p_sources_key: string;
          p_sources: Json;
          p_sources_hash: string;
          p_extractor_version: number;
          p_flow_version: number;
          p_stale_after?: string;
        };
        Returns: { kit_id: string; kit_version_id: string; claimed: boolean }[];
      };
      publish_build: {
        Args: {
          p_kit_version_id: string;
          p_data: Json;
          p_skill_md: string;
          p_zip_path: string;
          p_tar_path: string;
          p_manifest: Json;
          p_content_hash: string;
          p_levels: number[];
          p_items?: Json;
          p_grant_snapshot?: Json | null;
          p_grant_hash?: string | null;
        };
        Returns: number;
      };
      fail_build: { Args: { p_kit_version_id: string; p_error: string }; Returns: undefined };
      withdraw_version: {
        Args: { p_kit_version_id: string };
        Returns: { zip_path: string | null; tar_path: string | null }[];
      };
      record_read_failure: {
        Args: {
          p_source_url: string;
          p_domain: string;
          p_reason: ReadFailureReason;
          p_detail: string | null;
          p_retry_after: string;
        };
        Returns: undefined;
      };
      record_kit_event: { Args: { p_kit_id: string; p_kind: "view" | "like" | "download"; p_visitor: string; p_network: string }; Returns: boolean };
      remove_like: { Args: { p_kit_id: string; p_visitor: string; p_network: string }; Returns: boolean };
      prune_ephemeral: { Args: Record<string, never>; Returns: undefined };
      stale_frame_versions: { Args: { p_age?: string }; Returns: { kit_version_id: string }[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
