interface Props {
  value: number | ''
  strokes: number
  par: number
  onChange: (val: number | '') => void
  disabled?: boolean
}

type ScoreDecoration =
  | { shape: 'none' }
  | { shape: 'circle'; double: false }
  | { shape: 'circle'; double: true }
  | { shape: 'square'; double: false }
  | { shape: 'square'; double: true }

function getDecoration(scoreToPar: number | null): ScoreDecoration {
  if (scoreToPar === null) return { shape: 'none' }
  if (scoreToPar <= -2) return { shape: 'circle', double: true }
  if (scoreToPar === -1) return { shape: 'circle', double: false }
  if (scoreToPar >= 3) return { shape: 'square', double: true }
  if (scoreToPar === 2) return { shape: 'square', double: true }
  if (scoreToPar === 1) return { shape: 'square', double: false }
  return { shape: 'none' }
}

const BIRDIE_COLOR = '#DC2626'
const BOGEY_COLOR = '#1f2937'

export function ScoreInput({ value, strokes, par, onChange, disabled }: Props) {
  const hasStroke = strokes > 0
  const scoreToPar = typeof value === 'number' ? value - par : null
  const decoration = getDecoration(scoreToPar)

  const hasBorder = decoration.shape !== 'none'
  const isCircle = decoration.shape === 'circle'
  const isDouble = decoration.shape !== 'none' && decoration.double

  const borderColor = isCircle ? BIRDIE_COLOR : BOGEY_COLOR
  const borderRadius = isCircle ? '50%' : '3px'
  const textColor = isCircle ? BIRDIE_COLOR : hasBorder ? BOGEY_COLOR : '#222'

  // Outer ring wrapper: present only for eagle/double bogey
  // Inner input: always w-7 h-7 (28px)
  // Cell is minWidth 36px; outer ring (if present) is input + 2px gap + 1.5px border each side ≈ 35px
  const outerStyle: React.CSSProperties = isDouble
    ? {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius,
        border: `1.5px solid ${borderColor}`,
        padding: '2px',
      }
    : {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }

  return (
    <td className="p-0" style={{ minWidth: 36 }}>
      <div className="flex items-center justify-center" style={{ padding: '2px' }}>
        <div style={outerStyle}>
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
            className="w-7 h-7 text-center text-sm font-body font-semibold appearance-none"
            style={{
              background: hasStroke && !hasBorder ? '#fffde0' : 'transparent',
              border: hasBorder
                ? `2px solid ${borderColor}`
                : `1px solid ${hasStroke ? '#e6c800' : '#d1d5db'}`,
              borderRadius,
              color: textColor,
              outline: 'none',
              MozAppearance: 'textfield',
            }}
          />
        </div>
      </div>
    </td>
  )
}
