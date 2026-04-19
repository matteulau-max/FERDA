interface Props {
  value: number | ''
  strokes: number
  onChange: (val: number | '') => void
  disabled?: boolean
}

export function ScoreInput({ value, strokes, onChange, disabled }: Props) {
  const hasStroke = strokes > 0

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
          className="w-9 h-9 text-center text-sm font-body font-semibold rounded border outline-none focus:ring-2 focus:ring-offset-0 appearance-none"
          style={{
            background: hasStroke ? '#fffde0' : '#fff',
            borderColor: hasStroke ? '#e6c800' : '#d1d5db',
            color: '#222',
            // Remove spin buttons
            MozAppearance: 'textfield',
          }}
        />
      </div>
    </td>
  )
}
