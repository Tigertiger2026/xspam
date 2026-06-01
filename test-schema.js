import fs from 'fs';
function extract(json, matcher) {
  let results = []
  function traverse(obj) {
    if (matcher(obj)) {
      results.push(obj)
    }
    for (let key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        traverse(obj[key])
      }
    }
  }
  traverse(json)
  return results
}
const data = JSON.parse(fs.readFileSync('./src/lib/__tests__/assets/TweetDetail11.json', 'utf-8'));
const instructions = extract(data, (it) => it && Array.isArray(it) && it[0] && it[0].type);
if (instructions.length > 0) {
  console.log(instructions[0].map(it => it.type));
}
