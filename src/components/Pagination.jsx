import { useState } from 'react';

export const PAGE_SIZE = 10;

/**
 * Client-side pagination over an in-memory array.
 * Returns the current page's slice plus paging state; the page is
 * clamped when the underlying list shrinks (search/filter/delete).
 */
export function usePager(items, pageSize = PAGE_SIZE) {
  const [rawPage, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(rawPage, pages);
  const start = (page - 1) * pageSize;
  return {
    page,
    pages,
    setPage,
    items: items.slice(start, start + pageSize),
    total: items.length,
  };
}

export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;

  const first = Math.max(1, Math.min(page - 2, pages - 4));
  const nums = [];
  for (let n = first; n <= Math.min(pages, first + 4); n++) nums.push(n);

  const btn = 'px-2.5 py-1 border rounded disabled:opacity-40';

  return (
    <div className="flex items-center gap-1 mt-3 text-sm">
      <button disabled={page === 1} onClick={() => onChange(page - 1)}
        className={btn}>Prev</button>
      {nums.map((n) => (
        <button key={n} onClick={() => onChange(n)}
          className={`${btn} ${n === page
            ? 'bg-blue-600 text-white border-blue-600'
            : 'hover:bg-gray-100'}`}>
          {n}
        </button>
      ))}
      <button disabled={page === pages} onClick={() => onChange(page + 1)}
        className={btn}>Next</button>
    </div>
  );
}
