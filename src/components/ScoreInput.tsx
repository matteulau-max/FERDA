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
  boxShadow?: string
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
    // Eagle: double red ring via box-shadow (stays within layout, no clipping)
    return {
      background: '#fff',
      borderColor: '#DC2626',
      color: '#DC2626',
      borderRadius: '50%',
      borderWidth: '2px',
      boxShadow: '0 0 0 2px #fff, 0 0 0 4px #DC2626',
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
    // Double bogey: double black square via box-shadow
    return {
      background: '#f9fafb',
      borderColor: '#111827',
      color: '#111827',
      borderRadius: '2px',
      borderWidth: '2px',
      boxShadow: '0 0 0 2px #fff, 0 0 0 4px #111827',
    }
  }
  // Triple+: light red fill — keeps number readable
  return {
    background: '#fecaca',
    borderColor: '#DC2626',
    color: '#7f1d1d',
    borderRadius: '2px',
    borderWidth: '1px',
  }
}

export function ScoreInput({ value, strokes, par, onChange, disabled }: Props) {
  const hasStroke = strokes > 0
  const scoreToPar = typeof value === 'number' ? value - par : null
  const style = scoreStyle(scoreToPar, hasStroke)

  return (
    <td className="p-0 relative" style={{ minWidth: 36 }}>
      {/* 2px padding gives box-shadow room without clipping into adjacent cells */}
      <div className="flex items-center justify-center" style={{ padding: '2px' }}>
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
          className="w-8 h-8 text-center text-sm font-body font-semibold appearance-none"
          style={{
            background: style.background,
            borderColor: style.borderColor,
            color: style.color,
            borderRadius: style.borderRadius,
            borderWidth: style.borderWidth,
            borderStyle: 'solid',
            boxShadow: style.boxShadow,
            outline: 'none',
            MozAppearance: 'textfield',
          }}
        />
      </div>
    </td>
  )
}
