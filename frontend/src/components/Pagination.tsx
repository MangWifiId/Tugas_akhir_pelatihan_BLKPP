interface PaginationProps {
  page: number
  limit: number
  total: number
  onPageChange: (page: number) => void
}

export default function Pagination({
  page,
  limit,
  total,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  return (
    <div className="pagination">
      <span className="pagination-info">
        Menampilkan {start}–{end} dari {total} data
      </span>

      <div className="pagination-controls">
        <button
          type="button"
          className="button button-ghost button-small"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          ‹ Sebelumnya
        </button>

        <span className="pagination-page">
          {page} / {totalPages}
        </span>

        <button
          type="button"
          className="button button-ghost button-small"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Berikutnya ›
        </button>
      </div>
    </div>
  )
}
