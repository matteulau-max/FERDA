import { TabNav } from '../components/TabNav'

interface RuleItem {
  bold?: string
  text: string
  tbd?: boolean
}

interface RuleSection {
  num: string
  title: string
  items: RuleItem[]
  note?: string
}

const RULES: RuleSection[] = [
  {
    num: 'RULE I',
    title: 'Out of Bounds & Lost Ball',
    items: [
      { bold: 'One-stroke penalty drop.', text: ' When a ball is out of bounds or lost, the player takes a one-stroke penalty and drops near the point where the ball crossed the OB line or was last seen.' },
      { bold: 'No return to the tee', text: ' is required. Play continues from the drop area.' },
      { bold: 'Ball search limit', text: ' is 3 minutes. After 3 minutes, the ball is considered lost and the one-stroke drop rule applies.' },
      { bold: 'Provisional balls', text: ' are encouraged on likely OB shots to maintain pace of play.' },
      { bold: 'Gallery Drop.', text: ' If the group unanimously agrees a ball is inbounds but cannot be located, the player receives free relief with no stroke penalty, dropping from where the group collectively agrees the ball most likely came to rest.' },
    ],
  },
  {
    num: 'RULE II',
    title: 'Maximum Score',
    items: [
      { bold: 'Maximum score is double par.', text: ' Once a player reaches double par on any hole, pick up and record the max.' },
      { text: 'In match play formats, a player may concede a hole at any time.' },
    ],
  },
  {
    num: 'RULE III',
    title: 'Mulligans',
    items: [
      { bold: 'No mulligans.', text: ' All shots count. Play the ball as it lies.' },
      { text: 'This applies to all rounds and all formats throughout the event.' },
    ],
  },
  {
    num: 'RULE IV',
    title: 'Concessions & Gimmes',
    items: [
      { bold: 'Gimme distance is inside 3 feet', text: ' in all match play formats.' },
      { text: 'A putt inside 3 feet may be conceded by the opponent. It may not be conceded by the player themselves.' },
    ],
  },
  {
    num: 'RULE V',
    title: 'Pace of Play',
    items: [
      { bold: 'Honors are observed on the tee.', text: ' The player with the lowest score on the previous hole tees off first.' },
      { bold: 'Ready golf is in effect', text: ' on the fairway and green. Hit when ready — do not wait for strict order of play.' },
      { text: 'Players are expected to be ready to play when it is their turn. Slow play may be subject to Commissioner intervention.' },
    ],
  },
  {
    num: 'RULE VI',
    title: 'Equipment & Devices',
    items: [
      { bold: 'Rangefinders, GPS devices, and apps are permitted', text: ' without restriction.' },
      { text: 'Slope compensation, wind readings, and all device features are allowed.' },
    ],
  },
  {
    num: 'RULE VII',
    title: 'The Flagstick',
    items: [
      { bold: "Player's choice.", text: ' Each player may putt with the flagstick in or out at their discretion.' },
      { text: 'Players may not unreasonably delay play to tend or remove the flagstick.' },
    ],
  },
  {
    num: 'RULE VIII',
    title: 'Disputes & Rulings',
    items: [
      { bold: 'The Commissioner has final ruling authority', text: ' on all disputes, penalties, and interpretations.' },
      { text: 'In cases not covered by these rules, USGA Rules of Golf apply as the default standard.' },
      { text: 'Rulings made in good faith are final. No retroactive scoring adjustments after a hole is completed.' },
    ],
  },
  {
    num: 'RULE IX',
    title: 'Ferda Rules',
    items: [
      { bold: 'Custom Ferda Rules', text: ' — including side games, prizes, and special format rules — to be announced prior to the event.', tbd: true },
      { text: 'All Ferda Rules will be distributed to players in advance and are subject to Commissioner approval.' },
    ],
  },
]

export function Rules() {
  return (
    <div className="min-h-screen" style={{ background: '#FDF8E8' }}>
      <div style={{ background: 'linear-gradient(135deg, #004d34 0%, #006747 60%, #004d34 100%)' }}>
        <div className="px-4 py-6 text-center">
          <p className="text-xs uppercase tracking-widest font-body mb-1" style={{ color: '#FFF200', opacity: 0.85 }}>
            A Tradition Unlike Any Other
          </p>
          <h1 className="font-serif italic text-2xl font-bold tracking-wide" style={{ color: '#FFF200' }}>
            Ferda Invitational
          </h1>
        </div>
        <TabNav />
      </div>

      <div className="px-5 pt-6 pb-4 text-center" style={{ borderBottom: '1px solid #E8E5D8' }}>
        <p className="font-body text-base italic" style={{ color: '#4a4a4a', lineHeight: 1.75 }}>
          These rules govern all competitive play during The Ferda Invitational. All participants are expected to know and abide by them. The Commissioner's rulings are final.
        </p>
        <div className="flex items-center gap-3 mt-5 opacity-25">
          <span className="flex-1 h-px" style={{ background: '#006747' }} />
          <span className="text-sm" style={{ color: '#006747' }}>❧</span>
          <span className="flex-1 h-px" style={{ background: '#006747' }} />
        </div>
      </div>

      <div className="px-3 py-4 flex flex-col gap-3">
        {RULES.map((rule) => (
          <RuleCard key={rule.num} rule={rule} />
        ))}
      </div>

      <footer
        className="text-center py-8"
        style={{ background: 'linear-gradient(135deg, #004d34 0%, #006747 100%)' }}
      >
        <p className="font-serif italic text-lg mb-1" style={{ color: '#e8d5a3' }}>
          Ferda Invitational
        </p>
        <p className="font-body text-xs tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
          These rules are official and binding for all competitive play · 2025
        </p>
      </footer>
    </div>
  )
}

function RuleCard({ rule }: { rule: RuleSection }) {
  return (
    <div
      className="rounded-xl overflow-hidden shadow-sm"
      style={{ border: '1px solid #E8E5D8', background: '#fff' }}
    >
      {/* Section header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid #E8E5D8', background: '#fafaf7' }}
      >
        <span
          className="font-body text-xs tracking-widest uppercase px-2.5 py-1 flex-shrink-0"
          style={{ background: '#004d34', color: '#FFF200' }}
        >
          {rule.num}
        </span>
        <span className="font-serif text-base font-semibold" style={{ color: '#006747' }}>
          {rule.title}
        </span>
      </div>

      {/* Items */}
      <ul className="px-4 py-1">
        {rule.items.map((item, i) => (
          <li
            key={i}
            className="flex gap-3 py-2.5 font-body text-sm leading-relaxed"
            style={{
              borderBottom: i < rule.items.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              color: '#1c1c1c',
            }}
          >
            <span className="flex-shrink-0 font-bold" style={{ color: '#FFF200', textShadow: '0 0 0 #c9a84c', filter: 'brightness(0.8)' }}>
              —
            </span>
            <span>
              {item.bold && (
                <strong style={{ color: '#006747' }}>{item.bold}</strong>
              )}
              {item.text}
              {item.tbd && (
                <span
                  className="inline-block font-body text-xs tracking-widest uppercase ml-2 px-1.5 py-0.5"
                  style={{ border: '1px solid #c9a84c', color: '#c9a84c', verticalAlign: 'middle', lineHeight: 1.4 }}
                >
                  TBD
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {/* Commissioner's note */}
      {rule.note && (
        <div className="mx-4 mb-4 px-4 py-3" style={{ background: '#006747' }}>
          <p
            className="font-body text-xs tracking-widest uppercase mb-1.5"
            style={{ color: '#FFF200', opacity: 0.85 }}
          >
            Commissioner's Note
          </p>
          <p className="font-body text-sm italic" style={{ color: 'rgba(253,248,232,0.9)', lineHeight: 1.65 }}>
            {rule.note}
          </p>
        </div>
      )}
    </div>
  )
}
