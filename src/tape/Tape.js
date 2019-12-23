'use strict';
var _ = require('lodash/fp');

/*
 * supported unicode variants
 *
 * m: monospace
 * b: bold
 * i: italic
 * c: script
 * g: gothic / fraktur
 * d: double-struck
 * s: sans-serif
 * o: circled text
 * p: parenthesized latin letters
 * w: fullwidth
 */

function toUnicodeVariant(str, variant, flags) {

  if (str === 'θ') {
    str = 'O';
  } else if (str === 'Ι') {
    str = 'I';
  }
  var offsets = {
    m: [0x1d670, 0x1d7f6],
    b: [0x1d400, 0x1d7ce],
    i: [0x1d434, 0x00030],
    bi: [0x1d468, 0x00030],
    c: [0x1d49c, 0x00030],
    bc: [0x1d4d0, 0x00030],
    g: [0x1d504, 0x00030],
    d: [0x1d538, 0x1d7d8],
    bg: [0x1d56c, 0x00030],
    s: [0x1d5a0, 0x1d7e2],
    bs: [0x1d5d4, 0x1d7ec],
    is: [0x1d608, 0x00030],
    bis: [0x1d63c, 0x00030],
    o: [0x24B6, 0x2460],
    p: [0x249C, 0x2474],
    w: [0xff21, 0xff10],
    u: [0x2090, 0xff10]
  };

  var variantOffsets = {
    'monospace': 'm',
    'bold' : 'b',
    'italic' : 'i',
    'bold italic' : 'bi',
    'script': 'c',
    'bold script': 'bc',
    'gothic': 'g',
    'gothic bold': 'bg',
    'doublestruck': 'd',
    'sans': 's',
    'bold sans' : 'bs',
    'italic sans': 'is',
    'bold italic sans': 'bis',
    'parenthesis': 'p',
    'circled': 'o',
    'fullwidth': 'w'
  };

  // special characters (absolute values)
  var special = {
    m: {
      ' ': 0x2000,
      '-': 0x2013
    },
    i: {
      'h': 0x210e
    },
    g: {
      'C': 0x212d,
      'H': 0x210c,
      'I': 0x2111,
      'R': 0x211c,
      'Z': 0x2128
    },
    o: {
      '0': 0x24EA,
      '1': 0x2460,
      '2': 0x2461,
      '3': 0x2462,
      '4': 0x2463,
      '5': 0x2464,
      '6': 0x2465,
      '7': 0x2466,
      '8': 0x2467,
      '9': 0x2468,
    },
    p: {},
    w: {}
  };
  //support for parenthesized latin letters small cases
  for (var i = 97; i <= 122; i++) {
    special.p[String.fromCharCode(i)] = 0x249C + (i-97);
  }
  //support for full width latin letters small cases
  for (i = 97; i <= 122; i++) {
    special.w[String.fromCharCode(i)] = 0xff41 + (i-97);
  }

  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  var numbers = '0123456789';

  var getType = function (variantt) {
    if (variantOffsets[variantt]) return variantOffsets[variantt];
    if (offsets[variantt]) return variantt;
    return 'm'; //monospace as default
  };
  var getFlag = function (flag, flagz) {
    if (!flagz) return false;
    return flagz.split(',').indexOf(flag)>-1;
  };

  var type = getType(variant);
  var underline = getFlag('underline', flags);
  var strike = getFlag('strike', flags);
  var result = '';

  for (i = 0; i < str.length; i++) {
    var k = str.charAt(i);
    var index;
    var c = k;
    if (special[type] && special[type][c]) c = String.fromCodePoint(special[type][c]);
    if (type && (index = chars.indexOf(c)) > -1) {
      result += String.fromCodePoint(index + offsets[type][0]);
    } else if (type && (index = numbers.indexOf(c)) > -1) {
      result += String.fromCodePoint(index + offsets[type][1]);
    } else {
      result += c;
    }
    if (underline) result += '\u0332'; // add combining underline
    if (strike) result += '\u0336'; // add combining strike
  }
  return result;
}

// Bidirectional infinite tape
function Tape(blank, input) {
  Object.defineProperty(this, 'blank', {
    value: blank,
    writable: false,
    enumerable: true
  });
  // zipper data structure
  // INVARIANTS: tape.before can be empty, tape.after must be nonempty.
  // before: cells before the head (in order; left to right).
  // after:  cells after and including the head (in reverse; right to left).
  this.tape = {
    before: [],
    after: (input == null || input.length == 0) ? [blank] : input.slice().reverse(),
    toString: function () {
      return this.before.join('') + toUnicodeVariant(_.last(this.after), 'circled') + this.after.slice(0, this.after.length-1).reverse().join('');
    }
  };
}

// Read the value at the tape head.
Tape.prototype.read = function () {
  return _.last(this.tape.after);
};
Tape.prototype.write = function (symbol) {
  this.tape.after[this.tape.after.length - 1] = symbol;
};

Tape.prototype.headRight = function () {
  var before = this.tape.before,
      after = this.tape.after;
  before.push(after.pop());
  if (_.isEmpty(after)) {
    after.push(this.blank);
  }
};
Tape.prototype.headLeft = function () {
  var before = this.tape.before,
      after = this.tape.after;
  if (_.isEmpty(before)) {
    before.push(this.blank);
  }
  after.push(before.pop());
};

Tape.prototype.toString = function () {
  return this.tape.toString();
};

// for tape visualization. not part of TM definition.
// Read the value at an offset from the tape head.
// 0 is the tape head. + is to the right, - to the left.
Tape.prototype.readOffset = function (i) {
  var tape = this.tape;
  if (i >= 0) {
    // right side: offset [0..length-1] ↦ array index [length-1..0]
    return (i <= tape.after.length - 1) ? tape.after[tape.after.length - 1 - i] : this.blank;
  } else {
    // left side: offset [-1..-length] ↦ array index [length-1..0]
    return (i >= -tape.before.length) ? tape.before[tape.before.length + i] : this.blank;
  }
};

// for tape visualization.
// Read the values from an offset range (inclusive of start and end).
Tape.prototype.readRange = function (start, end) {
  return _.range(start, end+1).map(function (i) {
    return this.readOffset(i);
  }, this);
};

module.exports = Tape;
