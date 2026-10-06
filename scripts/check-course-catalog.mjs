import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
const output = ts.transpileModule(fs.readFileSync('src/lib/courseCatalog.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ES2020 } }).outputText
const { parseCourse } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`)
const features = Array.from({ length: 9 }, (_, i) => [
  { feature_type: 'hole_line', hole_number: i + 1, geometry: { type: 'LineString', coordinates: [[i, -0.01], [i, 0]] } },
  { feature_type: 'green', osm_id: String(i), geometry: { type: 'MultiPolygon', coordinates: [[[[i-.001,-.001],[i+.001,-.001],[i+.001,.001],[i-.001,.001],[i-.001,-.001]]]] } }
]).flat()
assert.equal(parseCourse('test','Test',{features}).course.holes.length,9)
assert.throws(() => parseCourse('test','Test',{features:features.slice(1)}))
assert.throws(() => parseCourse('test','Test',{features:[...features,features[0]]}))
assert.throws(() => parseCourse('test','Test',{features:[...features,features[1]]}))
assert.throws(() => parseCourse('test','Test',{}))
console.log('PASS: course import, incomplete maps, duplicate routes, ambiguous greens and invalid responses')
