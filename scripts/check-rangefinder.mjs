import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/lib/rangefinder.ts', import.meta.url), 'utf8')
const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } }).outputText
const { cameraAngle, elevation, windowStats, parseYardage, slopeAdjustedYards } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`)
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`)
near(cameraAngle(90, 0), 0)
near(cameraAngle(100, 0), 10)
near(cameraAngle(80, 0), -10)
near(cameraAngle(0, 0), -90)
assert.equal(cameraAngle(null, 0), null)
assert.equal(cameraAngle(90, NaN), null)
for (const target of [-30, 0, 24]) {
  near(elevation(170, Math.atan((target - 5) / 510) * 180 / Math.PI, 5).feet, target)
}
assert.equal(elevation(0, 0, 5), null)
assert.equal(elevation(170, 90, 5), null)
assert.equal(elevation(170, 0, NaN), null)
const samples = Array.from({ length: 21 }, (_, i) => ({ time: i * 30, angle: 2 }))
assert.equal(windowStats(samples, 610).stable, true)
assert.equal(windowStats(samples, 1150).stable, false)
assert.equal(windowStats([{ time: 600, angle: 2 }], 610).stable, false)
assert.equal(windowStats(samples.map((s, i) => ({ ...s, angle: i % 2 ? 1 : 3 })), 610).stable, false)
assert.equal(parseYardage('170'), 170)
assert.equal(parseYardage(' 170 yd '), 170)
assert.equal(parseYardage('170.5 yards'), 170.5)
for (const text of ['Front 150 Center 170 Back 190', '170\n180', '', '0', '401', '170m', '−170']) assert.equal(parseYardage(text), null)
console.log('PASS: rangefinder geometry, stale/noisy reading rejection, and unambiguous yardage import')

near(slopeAdjustedYards(150, 0), 150)
near(slopeAdjustedYards(150, 30), 150 * 150 / 140)
near(slopeAdjustedYards(150, -30), 150 * 150 / 160)
for (const values of [[0, 0], [401, 0], [150, NaN], [150, 300]]) assert.equal(slopeAdjustedYards(...values), null)
console.log('PASS: ideal projectile slope estimate, level/uphill/downhill, and invalid input rejection')
