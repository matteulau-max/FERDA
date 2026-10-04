import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
const output = ts.transpileModule(fs.readFileSync('src/lib/holeMap.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } }).outputText
const { holeMapProjection } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`)
const courses = JSON.parse(fs.readFileSync('src/data/gps-courses.json'))
const maps = JSON.parse(fs.readFileSync('src/data/gps-map.json'))
for (const c of courses) {
  assert.equal(Object.keys(maps[c.id].lines).length, 18)
  assert.ok(maps[c.id].layers.some(l => l.kind === 'fairway'))
  assert.ok(maps[c.id].layers.some(l => l.kind === 'bunker'))
  for (const h of c.holes) {
    const line = maps[c.id].lines[h.number]
    const player = [h.center[0] + .002, h.center[1] - .002]
    const projection = holeMapProjection(line, h.outline, [player])
    const tee = projection.project(line[0]), green = projection.project(line.at(-1))
    assert.ok(tee[1] > green[1], 'tee should sit below green')
    assert.ok(Math.abs(tee[0] - green[0]) < 1e-8)
    for (const p of [...line, ...h.outline, player]) {
      const pixel = projection.project(p), back = projection.unproject(pixel)
      assert.ok(pixel[0] >= 0 && pixel[0] <= 360 && pixel[1] >= 0 && pixel[1] <= 460, 'fit must include golfer and hole')
      assert.ok(Math.abs(back[0] - p[0]) < 1e-9 && Math.abs(back[1] - p[1]) < 1e-9, 'tap coordinates must invert projection')
    }
  }
}
console.log('PASS: 36 hole orientations, golfer auto-fit, inverse tap coordinates, and map layers')
