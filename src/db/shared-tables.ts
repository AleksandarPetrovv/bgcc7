// tables that exist only in the public schema; the bgcc7 client reaches them through search_path "bgcc7,public", so both editions share them
export const SHARED_TABLES = ["users", "user_names", "staff", "admin_log", "ref_apps"] as const;
