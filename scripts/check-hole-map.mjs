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
console.log('PASS: 72 hole orientations, golfer auto-fit, inverse tap coordinates, and map layers')

const aerial = JSON.parse(fs.readFileSync('src/data/gps-aerial.json'))
for (const c of courses) {
  if (!aerial[c.id]) continue // Imported courses have vector maps only.
  const e = aerial[c.id].extent
  assert.equal(e.spatialReference.wkid, 4326)
  assert.ok(fs.statSync(`public${aerial[c.id].image}`).size > 10000)
  for (const h of c.holes) {
    const p = holeMapProjection(maps[c.id].lines[h.number], h.outline, [], [h.center])
    const tl = p.project([e.xmin, e.ymax]), tr = p.project([e.xmax, e.ymax]), bl = p.project([e.xmin, e.ymin])
    for (const q of h.outline) {
      assert.ok(q[0] >= e.xmin && q[0] <= e.xmax && q[1] >= e.ymin && q[1] <= e.ymax)
      const u = (q[0]-e.xmin)/(e.xmax-e.xmin), v = (e.ymax-q[1])/(e.ymax-e.ymin)
      const raster = [tl[0]+u*(tr[0]-tl[0])+v*(bl[0]-tl[0]),tl[1]+u*(tr[1]-tl[1])+v*(bl[1]-tl[1])]
      const vector = p.project(q)
      assert.ok(Math.hypot(raster[0]-vector[0], raster[1]-vector[1]) < 1e-6, 'aerial must align with green geometry')
    }
  }
}
console.log('PASS: aerial georeferencing and selected-green focus for courses with bundled aerial imagery')
