const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('shared page initialization tolerates inner pages without home-only widgets', () => {
  const navStates = [];
  const navbar = { classList: { toggle: (...args) => navStates.push(args) } };
  const context = {
    window: { matchMedia: () => ({ matches: false }), addEventListener() {}, scrollY: 0 },
    document: {
      getElementById: id => id === 'navbar' ? navbar : null,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener() {}
    },
    IntersectionObserver: class { observe() {} unobserve() {} }
  };
  const source = fs.readFileSync(path.join(__dirname, '../js/main.js'), 'utf8');
  assert.doesNotThrow(() => vm.runInNewContext(source, context));
  assert.deepEqual(navStates, [['is-solid', true]]);
});
