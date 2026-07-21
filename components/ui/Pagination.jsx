'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './pagination.css';

/**
 * Reusable pagination bar for admin list pages.
 *
 * Pairs with the backend envelope from src/common/pagination.ts:
 *   { data, total, page, limit, total_pages }
 *
 * Usage:
 *   const [meta, setMeta] = useState({ page: 1, limit: 25, total: 0, total_pages: 1 });
 *   ...
 *   <Pagination
 *       page={meta.page}
 *       totalPages={meta.total_pages}
 *       total={meta.total}
 *       limit={meta.limit}
 *       onPageChange={(p) => refresh({ page: p })}
 *       onLimitChange={(l) => refresh({ page: 1, limit: l })}
 *   />
 *
 * Renders nothing when there is only one page AND no limit picker is wanted,
 * so it is safe to drop into any list unconditionally.
 */
export default function Pagination({
    page = 1,
    totalPages = 1,
    total = 0,
    limit = 25,
    onPageChange,
    onLimitChange,
    limitOptions = [10, 25, 50, 100],
    disabled = false,
    itemLabel = 'items',
}) {
    if (totalPages <= 1 && !onLimitChange) return null;

    const from = total === 0 ? 0 : (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);

    const go = (p) => {
        if (disabled) return;
        const next = Math.min(Math.max(1, p), totalPages);
        if (next !== page) onPageChange?.(next);
    };

    return (
        <div className="pg-bar">
            <div className="pg-summary">
                {total === 0
                    ? `No ${itemLabel}`
                    : <>Showing <strong>{from.toLocaleString()}–{to.toLocaleString()}</strong> of <strong>{total.toLocaleString()}</strong> {itemLabel}</>}
            </div>

            <div className="pg-controls">
                {onLimitChange && (
                    <select
                        className="pg-limit"
                        value={limit}
                        disabled={disabled}
                        onChange={(e) => onLimitChange(Number(e.target.value))}
                        aria-label={`${itemLabel} per page`}
                    >
                        {limitOptions.map((n) => (
                            <option key={n} value={n}>{n} / page</option>
                        ))}
                    </select>
                )}

                <div className="pg-nav">
                    <button
                        type="button"
                        className="pg-btn"
                        onClick={() => go(page - 1)}
                        disabled={disabled || page <= 1}
                        aria-label="Previous page"
                    >
                        <ChevronLeft size={16} />
                        <span className="pg-btn-text">Prev</span>
                    </button>

                    <span className="pg-page">
                        Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                    </span>

                    <button
                        type="button"
                        className="pg-btn"
                        onClick={() => go(page + 1)}
                        disabled={disabled || page >= totalPages}
                        aria-label="Next page"
                    >
                        <span className="pg-btn-text">Next</span>
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
