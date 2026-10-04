import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
const source = fs.readFileSync('src/lib/golfGps.ts', 'utf8')
const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } }).outputText
const { distanceYards, greenDistances } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`)
assert.equal(distanceYards([0, 0], [0, 0]), 0)
assert.ok(Math.abs(distanceYards([0, 0], [0, 1]) * 0.9144 - 111195.08) < 1)
const box = [[-.001, -.001], [.001, -.001], [.001, .001], [-.001, .001], [-.001, -.001]]
for (const p of [[0, -.01], [.01, 0], [0, .01], [-.01, 0]]) {
  const d = greenDistances(p, [0, 0], box)
  assert.ok(d.front < d.center && d.center < d.back)
  assert.ok(Math.abs(d.front / d.center - .9) < 1e-8)
  assert.ok(Math.abs(d.back / d.center - 1.1) < 1e-8)
}
assert.equal(greenDistances([0, 0], [0, 0], box).front, null)
assert.equal(greenDistances([0, .0005], [0, 0], box).front, null)
const courses = JSON.parse(fs.readFileSync('src/data/gps-courses.json'))
for (const c of courses) {
  assert.equal(c.holes.length, 18)
  assert.equal(new Set(c.holes.map(h => h.osmGreen)).size, 18)
  assert.deepEqual(c.holes.map(h => h.number), Array.from({ length: 18 }, (_, i) => i + 1))
  for (const h of c.holes) {
    const d = greenDistances([h.center[0], h.center[1] - .001], h.center, h.outline)
    assert.ok(d.front > 0 && d.front < d.center && d.back > d.center, `${c.id} hole ${h.number}`)
  }
}
console.log('PASS: spherical distance, approach-line green edges, on-green behavior, and 36 mapped targets')
