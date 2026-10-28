import { statusTone } from '../utils/format'

interface StatusBadgeProps {
  status: string
  label?: string
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span className={`badge badge-${statusTone(status)}`}>
      {label ?? status}
    </span>
  )
}
