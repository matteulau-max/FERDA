interface Props {
  value: number | ''
  strokes: number
  par: number
  onChange: (val: number | '') => void
  disabled?: boolean
}

interface InputStyle {
  background: string
  borderColor: string
  color: string
  borderRadius: string
  borderWidth: string
  outline?: string
  outlineOffset?: string
}

function scoreStyle(scoreToPar: number | null, hasStroke: boolean): InputStyle {
  if (scoreToPar === null) {
    return {
      background: hasStroke ? '#fffde0' : '#fff',
      borderColor: hasStroke ? '#e6c800' : '#d1d5db',
      color: '#222',
      borderRadius: '6px',
      borderWidth: '1px',
    }
  }
  if (scoreToPar <= -2) {
    // Eagle or better: double red ring
    return {
      background: '#fff',
      borderColor: '#DC2626',
      color: '#DC2626',
      borderRadius: '50%',
      borderWidth: '2px',
      outline: '2px solid #DC2626',
      outlineOffset: '2px',
    }
  }
  if (scoreToPar === -1) {
    // Birdie: single red circle
    return {
      background: '#fff',
      borderColor: '#DC2626',
      color: '#DC2626',
      borderRadius: '50%',
      borderWidth: '2px',
    }
  }
  if (scoreToPar === 0) {
    // Par: subtle green tint
    return {
      background: '#f0faf4',
      borderColor: '#86efac',
      color: '#166534',
      borderRadius: '6px',
      borderWidth: '1px',
    }
  }
  if (scoreToPar === 1) {
    // Bogey: single black square
    return {
      background: '#fff',
      borderColor: '#374151',
      color: '#374151',
      borderRadius: '2px',
      borderWidth: '2px',
    }
  }
  if (scoreToPar === 2) {
    // Double bogey: double black square
    return {
      background: '#fff',
      borderColor: '#111827',
      color: '#111827',
      borderRadius: '2px',
      borderWidth: '2px',
      outline: '2px solid #111827',
      outlineOffset: '2px',
    }
  }
  // Triple bogey or worse: filled dark
  return {
    background: '#374151',
    borderColor: '#374151',
    color: '#fff',
    borderRadius: '2px',
    borderWidth: '2px',
  }
}

export function ScoreInput({ value, strokes, par, onChange, disabled }: Props) {
  const hasStroke = strokes > 0
  const scoreToPar = typeof value === 'number' ? value - par : null
  const style = scoreStyle(scoreToPar, hasStroke)

  return (
    <td className="p-0 relative" style={{ minWidth: 36 }}>
      <div className="relative flex flex-col items-center">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={15}
          value={value === '' ? '' : value}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value
            if (v === '') { onChange(''); return }
            const n = parseInt(v, 10)
            if (!isNaN(n) && n >= 1) onChange(n)
          }}
          className="w-9 h-9 text-center text-sm font-body font-semibold appearance-none"
          style={{
            background: style.background,
            borderColor: style.borderColor,
            color: style.color,
            borderRadius: style.borderRadius,
            borderWidth: style.borderWidth,
            borderStyle: 'solid',
            outline: style.outline,
            outlineOffset: style.outlineOffset,
            // Remove spin buttons
            MozAppearance: 'textfield',
          }}
        />
      </div>
    </td>
  )
}
