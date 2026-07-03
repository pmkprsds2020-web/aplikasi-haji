import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Base Repository (Chapter 2: UI → Service → Repository → Supabase)
// Chapter 7: CRUD (Create/Read/Update/Delete/Restore/Bulk), Search,
//            Pagination, Sorting, Filtering
// Chapter 8: Error handling — never ignore errors, always surface them
// Chapter 16: Structured logging
// ============================================================================

export interface PaginationParams {
  page?: number; // 1-based
  pageSize?: number;
}

export interface QueryParams extends PaginationParams {
  search?: string;
  searchColumns?: string[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: Record<string, unknown>;
  includeDeleted?: boolean; // super_admin only — default false (soft delete)
}

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 20;

function logSupabase(table: string, operation: string, payload: unknown, response: unknown, executionMs: number, error?: unknown) {
  console.log("========== SUPABASE ==========");
  console.log("Table:", table);
  console.log("Operation:", operation);
  console.log("Payload:", JSON.stringify(payload));
  console.log("Response:", JSON.stringify(response)?.slice(0, 500));
  console.log("Execution Time:", `${executionMs}ms`);
  if (error) console.error("Error:", error);
  console.log("==============================");
}

/**
 * Generic Supabase repository implementing the standard CRUD contract.
 * Every method enforces soft-delete (deleted_at IS NULL) unless explicitly
 * overridden by super_admin via `includeDeleted`.
 *
 * Note: we use `unknown` casts for insert/update payloads because the
 * Supabase typed client enforces strict row types per table. This base
 * class is table-agnostic; concrete repositories provide typed wrappers.
 */
export class BaseRepository<T> {
  constructor(
    private readonly table: string,
    private readonly searchColumns: string[] = []
  ) {}

  /** CREATE */
  async create(input: Partial<T>): Promise<T> {
    const t0 = Date.now();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(this.table)
      .insert(input as never)
      .select()
      .single();
    logSupabase(this.table, "INSERT", input, data, Date.now() - t0, error);
    if (error) {
      console.error(error);
      throw error;
    }
    return data as unknown as T;
  }

  /** CREATE BULK */
  async createBulk(inputs: Partial<T>[]): Promise<T[]> {
    const t0 = Date.now();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(this.table)
      .insert(inputs as never)
      .select();
    logSupabase(this.table, "BULK_INSERT", { count: inputs.length }, data, Date.now() - t0, error);
    if (error) {
      console.error(error);
      throw error;
    }
    return (data ?? []) as unknown as T[];
  }

  /** READ by id */
  async findById(id: string, includeDeleted = false): Promise<T | null> {
    const t0 = Date.now();
    const supabase = await createClient();
    let q = supabase.from(this.table).select("*").eq("id", id);
    if (!includeDeleted) q = q.is("deleted_at", null);
    const { data, error } = await q.maybeSingle();
    logSupabase(this.table, "SELECT_BY_ID", { id }, data, Date.now() - t0, error);
    if (error) {
      console.error(error);
      throw error;
    }
    return (data ? (data as unknown as T) : null);
  }

  /** READ with pagination, search, sort, filter */
  async findMany(params: QueryParams = {}): Promise<PagedResult<T>> {
    const t0 = Date.now();
    const {
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
      search,
      searchColumns = this.searchColumns,
      sortBy = "created_at",
      sortOrder = "desc",
      filters,
      includeDeleted = false,
    } = params;
    const supabase = await createClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from(this.table).select("*", { count: "exact" });
    if (!includeDeleted) query = query.is("deleted_at", null);

    // Search (OR across columns)
    if (search && searchColumns.length > 0) {
      const orExpr = searchColumns
        .map((c) => `${c}.ilike.%${search}%`)
        .join(",");
      query = query.or(orExpr);
    }

    // Filters (exact match)
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== "") {
          query = query.eq(key, value as never);
        }
      }
    }

    // Sort + paginate
    query = query.order(sortBy, { ascending: sortOrder === "asc" }).range(from, to);

    const { data, error, count } = await query;
    logSupabase(this.table, "SELECT_PAGED", { params }, { count, rows: data?.length }, Date.now() - t0, error);
    if (error) {
      console.error(error);
      throw error;
    }
    const total = count ?? 0;
    return {
      data: (data ?? []) as unknown as T[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  /** UPDATE */
  async update(id: string, patch: Partial<T>): Promise<T> {
    const t0 = Date.now();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(this.table)
      .update(patch as never)
      .eq("id", id)
      .select()
      .single();
    logSupabase(this.table, "UPDATE", { id, patch }, data, Date.now() - t0, error);
    if (error) {
      console.error(error);
      throw error;
    }
    return data as unknown as T;
  }

  /** SOFT DELETE (sets deleted_at + is_active=false) */
  async softDelete(id: string): Promise<void> {
    const t0 = Date.now();
    const supabase = await createClient();
    const { error } = await supabase
      .from(this.table)
      .update({ deleted_at: new Date().toISOString(), is_active: false } as never)
      .eq("id", id);
    logSupabase(this.table, "SOFT_DELETE", { id }, null, Date.now() - t0, error);
    if (error) {
      console.error(error);
      throw error;
    }
  }

  /** BULK SOFT DELETE */
  async softDeleteBulk(ids: string[]): Promise<void> {
    const t0 = Date.now();
    const supabase = await createClient();
    const { error } = await supabase
      .from(this.table)
      .update({ deleted_at: new Date().toISOString(), is_active: false } as never)
      .in("id", ids);
    logSupabase(this.table, "BULK_SOFT_DELETE", { count: ids.length }, null, Date.now() - t0, error);
    if (error) {
      console.error(error);
      throw error;
    }
  }

  /** RESTORE (clears deleted_at, sets is_active=true) */
  async restore(id: string): Promise<T> {
    const t0 = Date.now();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(this.table)
      .update({ deleted_at: null, is_active: true } as never)
      .eq("id", id)
      .select()
      .single();
    logSupabase(this.table, "RESTORE", { id }, data, Date.now() - t0, error);
    if (error) {
      console.error(error);
      throw error;
    }
    return data as unknown as T;
  }

  /** HARD DELETE (permanent — super_admin only) */
  async hardDelete(id: string): Promise<void> {
    const t0 = Date.now();
    const supabase = await createClient();
    const { error } = await supabase.from(this.table).delete().eq("id", id);
    logSupabase(this.table, "HARD_DELETE", { id }, null, Date.now() - t0, error);
    if (error) {
      console.error(error);
      throw error;
    }
  }
}
