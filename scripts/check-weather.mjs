import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
const output = ts.transpileModule(fs.readFileSync('src/lib/weather.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ES2020 } }).outputText
const { bearing, windComponents, parseConditions } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`)
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-8)
near(bearing([0,0],[0,1]),0); near(bearing([0,0],[1,0]),90)
near(windComponents(10,0,0).head,10)
near(windComponents(10,180,0).head,-10)
near(windComponents(10,270,0).right,10)
near(windComponents(10,90,0).right,-10)
near(windComponents(10,90,90).head,10)
near(windComponents(0,45,270).head,0)
const raw = { elevation: 100, current: { time: 1791360000, temperature_2m: 65, wind_speed_10m: 10, wind_direction_10m: 270, wind_gusts_10m: 18 } }
near(parseConditions(raw).elevation,328.084)
assert.throws(() => parseConditions({}))
assert.throws(() => parseConditions({...raw,current:{...raw.current,wind_speed_10m:null}}))
assert.throws(() => parseConditions({...raw,current:{...raw.current,wind_direction_10m:999}}))
console.log('PASS: bearing, head/tail/crosswind signs, calm, altitude units and invalid weather rejection')
