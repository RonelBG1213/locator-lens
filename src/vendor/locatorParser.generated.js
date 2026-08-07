/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Playwright's isomorphic selector-text tooling, bundled from
 * playwright-core@1.58.2 (lib/utils/isomorphic/{locatorParser,selectorParser}.js)
 * by scripts/vendor-playwright-engine.mjs.
 *
 * Regenerate with: npm run vendor
 */
/* eslint-disable */
// @ts-nocheck
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/playwright-core/lib/utils/isomorphic/cssTokenizer.js
var require_cssTokenizer = __commonJS({
  "node_modules/playwright-core/lib/utils/isomorphic/cssTokenizer.js"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var cssTokenizer_exports = {};
    __export(cssTokenizer_exports, {
      AtKeywordToken: () => AtKeywordToken,
      BadStringToken: () => BadStringToken,
      BadURLToken: () => BadURLToken,
      CDCToken: () => CDCToken,
      CDOToken: () => CDOToken,
      CSSParserToken: () => CSSParserToken,
      CloseCurlyToken: () => CloseCurlyToken,
      CloseParenToken: () => CloseParenToken,
      CloseSquareToken: () => CloseSquareToken,
      ColonToken: () => ColonToken,
      ColumnToken: () => ColumnToken,
      CommaToken: () => CommaToken,
      DashMatchToken: () => DashMatchToken,
      DelimToken: () => DelimToken,
      DimensionToken: () => DimensionToken,
      EOFToken: () => EOFToken,
      FunctionToken: () => FunctionToken,
      GroupingToken: () => GroupingToken,
      HashToken: () => HashToken,
      IdentToken: () => IdentToken,
      IncludeMatchToken: () => IncludeMatchToken,
      InvalidCharacterError: () => InvalidCharacterError,
      NumberToken: () => NumberToken,
      OpenCurlyToken: () => OpenCurlyToken,
      OpenParenToken: () => OpenParenToken,
      OpenSquareToken: () => OpenSquareToken,
      PercentageToken: () => PercentageToken,
      PrefixMatchToken: () => PrefixMatchToken,
      SemicolonToken: () => SemicolonToken,
      StringToken: () => StringToken,
      StringValuedToken: () => StringValuedToken,
      SubstringMatchToken: () => SubstringMatchToken,
      SuffixMatchToken: () => SuffixMatchToken,
      URLToken: () => URLToken,
      WhitespaceToken: () => WhitespaceToken,
      tokenize: () => tokenize
    });
    module.exports = __toCommonJS(cssTokenizer_exports);
    var between = function(num, first, last) {
      return num >= first && num <= last;
    };
    function digit(code) {
      return between(code, 48, 57);
    }
    function hexdigit(code) {
      return digit(code) || between(code, 65, 70) || between(code, 97, 102);
    }
    function uppercaseletter(code) {
      return between(code, 65, 90);
    }
    function lowercaseletter(code) {
      return between(code, 97, 122);
    }
    function letter(code) {
      return uppercaseletter(code) || lowercaseletter(code);
    }
    function nonascii(code) {
      return code >= 128;
    }
    function namestartchar(code) {
      return letter(code) || nonascii(code) || code === 95;
    }
    function namechar(code) {
      return namestartchar(code) || digit(code) || code === 45;
    }
    function nonprintable(code) {
      return between(code, 0, 8) || code === 11 || between(code, 14, 31) || code === 127;
    }
    function newline(code) {
      return code === 10;
    }
    function whitespace(code) {
      return newline(code) || code === 9 || code === 32;
    }
    var maximumallowedcodepoint = 1114111;
    var InvalidCharacterError = class extends Error {
      constructor(message) {
        super(message);
        this.name = "InvalidCharacterError";
      }
    };
    function preprocess(str) {
      const codepoints = [];
      for (let i = 0; i < str.length; i++) {
        let code = str.charCodeAt(i);
        if (code === 13 && str.charCodeAt(i + 1) === 10) {
          code = 10;
          i++;
        }
        if (code === 13 || code === 12)
          code = 10;
        if (code === 0)
          code = 65533;
        if (between(code, 55296, 56319) && between(str.charCodeAt(i + 1), 56320, 57343)) {
          const lead = code - 55296;
          const trail = str.charCodeAt(i + 1) - 56320;
          code = Math.pow(2, 16) + lead * Math.pow(2, 10) + trail;
          i++;
        }
        codepoints.push(code);
      }
      return codepoints;
    }
    function stringFromCode(code) {
      if (code <= 65535)
        return String.fromCharCode(code);
      code -= Math.pow(2, 16);
      const lead = Math.floor(code / Math.pow(2, 10)) + 55296;
      const trail = code % Math.pow(2, 10) + 56320;
      return String.fromCharCode(lead) + String.fromCharCode(trail);
    }
    function tokenize(str1) {
      const str = preprocess(str1);
      let i = -1;
      const tokens = [];
      let code;
      let line = 0;
      let column = 0;
      let lastLineLength = 0;
      const incrLineno = function() {
        line += 1;
        lastLineLength = column;
        column = 0;
      };
      const locStart = { line, column };
      const codepoint = function(i2) {
        if (i2 >= str.length)
          return -1;
        return str[i2];
      };
      const next = function(num) {
        if (num === void 0)
          num = 1;
        if (num > 3)
          throw "Spec Error: no more than three codepoints of lookahead.";
        return codepoint(i + num);
      };
      const consume = function(num) {
        if (num === void 0)
          num = 1;
        i += num;
        code = codepoint(i);
        if (newline(code))
          incrLineno();
        else
          column += num;
        return true;
      };
      const reconsume = function() {
        i -= 1;
        if (newline(code)) {
          line -= 1;
          column = lastLineLength;
        } else {
          column -= 1;
        }
        locStart.line = line;
        locStart.column = column;
        return true;
      };
      const eof = function(codepoint2) {
        if (codepoint2 === void 0)
          codepoint2 = code;
        return codepoint2 === -1;
      };
      const donothing = function() {
      };
      const parseerror = function() {
      };
      const consumeAToken = function() {
        consumeComments();
        consume();
        if (whitespace(code)) {
          while (whitespace(next()))
            consume();
          return new WhitespaceToken();
        } else if (code === 34) {
          return consumeAStringToken();
        } else if (code === 35) {
          if (namechar(next()) || areAValidEscape(next(1), next(2))) {
            const token = new HashToken("");
            if (wouldStartAnIdentifier(next(1), next(2), next(3)))
              token.type = "id";
            token.value = consumeAName();
            return token;
          } else {
            return new DelimToken(code);
          }
        } else if (code === 36) {
          if (next() === 61) {
            consume();
            return new SuffixMatchToken();
          } else {
            return new DelimToken(code);
          }
        } else if (code === 39) {
          return consumeAStringToken();
        } else if (code === 40) {
          return new OpenParenToken();
        } else if (code === 41) {
          return new CloseParenToken();
        } else if (code === 42) {
          if (next() === 61) {
            consume();
            return new SubstringMatchToken();
          } else {
            return new DelimToken(code);
          }
        } else if (code === 43) {
          if (startsWithANumber()) {
            reconsume();
            return consumeANumericToken();
          } else {
            return new DelimToken(code);
          }
        } else if (code === 44) {
          return new CommaToken();
        } else if (code === 45) {
          if (startsWithANumber()) {
            reconsume();
            return consumeANumericToken();
          } else if (next(1) === 45 && next(2) === 62) {
            consume(2);
            return new CDCToken();
          } else if (startsWithAnIdentifier()) {
            reconsume();
            return consumeAnIdentlikeToken();
          } else {
            return new DelimToken(code);
          }
        } else if (code === 46) {
          if (startsWithANumber()) {
            reconsume();
            return consumeANumericToken();
          } else {
            return new DelimToken(code);
          }
        } else if (code === 58) {
          return new ColonToken();
        } else if (code === 59) {
          return new SemicolonToken();
        } else if (code === 60) {
          if (next(1) === 33 && next(2) === 45 && next(3) === 45) {
            consume(3);
            return new CDOToken();
          } else {
            return new DelimToken(code);
          }
        } else if (code === 64) {
          if (wouldStartAnIdentifier(next(1), next(2), next(3)))
            return new AtKeywordToken(consumeAName());
          else
            return new DelimToken(code);
        } else if (code === 91) {
          return new OpenSquareToken();
        } else if (code === 92) {
          if (startsWithAValidEscape()) {
            reconsume();
            return consumeAnIdentlikeToken();
          } else {
            parseerror();
            return new DelimToken(code);
          }
        } else if (code === 93) {
          return new CloseSquareToken();
        } else if (code === 94) {
          if (next() === 61) {
            consume();
            return new PrefixMatchToken();
          } else {
            return new DelimToken(code);
          }
        } else if (code === 123) {
          return new OpenCurlyToken();
        } else if (code === 124) {
          if (next() === 61) {
            consume();
            return new DashMatchToken();
          } else if (next() === 124) {
            consume();
            return new ColumnToken();
          } else {
            return new DelimToken(code);
          }
        } else if (code === 125) {
          return new CloseCurlyToken();
        } else if (code === 126) {
          if (next() === 61) {
            consume();
            return new IncludeMatchToken();
          } else {
            return new DelimToken(code);
          }
        } else if (digit(code)) {
          reconsume();
          return consumeANumericToken();
        } else if (namestartchar(code)) {
          reconsume();
          return consumeAnIdentlikeToken();
        } else if (eof()) {
          return new EOFToken();
        } else {
          return new DelimToken(code);
        }
      };
      const consumeComments = function() {
        while (next(1) === 47 && next(2) === 42) {
          consume(2);
          while (true) {
            consume();
            if (code === 42 && next() === 47) {
              consume();
              break;
            } else if (eof()) {
              parseerror();
              return;
            }
          }
        }
      };
      const consumeANumericToken = function() {
        const num = consumeANumber();
        if (wouldStartAnIdentifier(next(1), next(2), next(3))) {
          const token = new DimensionToken();
          token.value = num.value;
          token.repr = num.repr;
          token.type = num.type;
          token.unit = consumeAName();
          return token;
        } else if (next() === 37) {
          consume();
          const token = new PercentageToken();
          token.value = num.value;
          token.repr = num.repr;
          return token;
        } else {
          const token = new NumberToken();
          token.value = num.value;
          token.repr = num.repr;
          token.type = num.type;
          return token;
        }
      };
      const consumeAnIdentlikeToken = function() {
        const str2 = consumeAName();
        if (str2.toLowerCase() === "url" && next() === 40) {
          consume();
          while (whitespace(next(1)) && whitespace(next(2)))
            consume();
          if (next() === 34 || next() === 39)
            return new FunctionToken(str2);
          else if (whitespace(next()) && (next(2) === 34 || next(2) === 39))
            return new FunctionToken(str2);
          else
            return consumeAURLToken();
        } else if (next() === 40) {
          consume();
          return new FunctionToken(str2);
        } else {
          return new IdentToken(str2);
        }
      };
      const consumeAStringToken = function(endingCodePoint) {
        if (endingCodePoint === void 0)
          endingCodePoint = code;
        let string = "";
        while (consume()) {
          if (code === endingCodePoint || eof()) {
            return new StringToken(string);
          } else if (newline(code)) {
            parseerror();
            reconsume();
            return new BadStringToken();
          } else if (code === 92) {
            if (eof(next()))
              donothing();
            else if (newline(next()))
              consume();
            else
              string += stringFromCode(consumeEscape());
          } else {
            string += stringFromCode(code);
          }
        }
        throw new Error("Internal error");
      };
      const consumeAURLToken = function() {
        const token = new URLToken("");
        while (whitespace(next()))
          consume();
        if (eof(next()))
          return token;
        while (consume()) {
          if (code === 41 || eof()) {
            return token;
          } else if (whitespace(code)) {
            while (whitespace(next()))
              consume();
            if (next() === 41 || eof(next())) {
              consume();
              return token;
            } else {
              consumeTheRemnantsOfABadURL();
              return new BadURLToken();
            }
          } else if (code === 34 || code === 39 || code === 40 || nonprintable(code)) {
            parseerror();
            consumeTheRemnantsOfABadURL();
            return new BadURLToken();
          } else if (code === 92) {
            if (startsWithAValidEscape()) {
              token.value += stringFromCode(consumeEscape());
            } else {
              parseerror();
              consumeTheRemnantsOfABadURL();
              return new BadURLToken();
            }
          } else {
            token.value += stringFromCode(code);
          }
        }
        throw new Error("Internal error");
      };
      const consumeEscape = function() {
        consume();
        if (hexdigit(code)) {
          const digits = [code];
          for (let total = 0; total < 5; total++) {
            if (hexdigit(next())) {
              consume();
              digits.push(code);
            } else {
              break;
            }
          }
          if (whitespace(next()))
            consume();
          let value = parseInt(digits.map(function(x) {
            return String.fromCharCode(x);
          }).join(""), 16);
          if (value > maximumallowedcodepoint)
            value = 65533;
          return value;
        } else if (eof()) {
          return 65533;
        } else {
          return code;
        }
      };
      const areAValidEscape = function(c1, c2) {
        if (c1 !== 92)
          return false;
        if (newline(c2))
          return false;
        return true;
      };
      const startsWithAValidEscape = function() {
        return areAValidEscape(code, next());
      };
      const wouldStartAnIdentifier = function(c1, c2, c3) {
        if (c1 === 45)
          return namestartchar(c2) || c2 === 45 || areAValidEscape(c2, c3);
        else if (namestartchar(c1))
          return true;
        else if (c1 === 92)
          return areAValidEscape(c1, c2);
        else
          return false;
      };
      const startsWithAnIdentifier = function() {
        return wouldStartAnIdentifier(code, next(1), next(2));
      };
      const wouldStartANumber = function(c1, c2, c3) {
        if (c1 === 43 || c1 === 45) {
          if (digit(c2))
            return true;
          if (c2 === 46 && digit(c3))
            return true;
          return false;
        } else if (c1 === 46) {
          if (digit(c2))
            return true;
          return false;
        } else if (digit(c1)) {
          return true;
        } else {
          return false;
        }
      };
      const startsWithANumber = function() {
        return wouldStartANumber(code, next(1), next(2));
      };
      const consumeAName = function() {
        let result = "";
        while (consume()) {
          if (namechar(code)) {
            result += stringFromCode(code);
          } else if (startsWithAValidEscape()) {
            result += stringFromCode(consumeEscape());
          } else {
            reconsume();
            return result;
          }
        }
        throw new Error("Internal parse error");
      };
      const consumeANumber = function() {
        let repr = "";
        let type = "integer";
        if (next() === 43 || next() === 45) {
          consume();
          repr += stringFromCode(code);
        }
        while (digit(next())) {
          consume();
          repr += stringFromCode(code);
        }
        if (next(1) === 46 && digit(next(2))) {
          consume();
          repr += stringFromCode(code);
          consume();
          repr += stringFromCode(code);
          type = "number";
          while (digit(next())) {
            consume();
            repr += stringFromCode(code);
          }
        }
        const c1 = next(1), c2 = next(2), c3 = next(3);
        if ((c1 === 69 || c1 === 101) && digit(c2)) {
          consume();
          repr += stringFromCode(code);
          consume();
          repr += stringFromCode(code);
          type = "number";
          while (digit(next())) {
            consume();
            repr += stringFromCode(code);
          }
        } else if ((c1 === 69 || c1 === 101) && (c2 === 43 || c2 === 45) && digit(c3)) {
          consume();
          repr += stringFromCode(code);
          consume();
          repr += stringFromCode(code);
          consume();
          repr += stringFromCode(code);
          type = "number";
          while (digit(next())) {
            consume();
            repr += stringFromCode(code);
          }
        }
        const value = convertAStringToANumber(repr);
        return { type, value, repr };
      };
      const convertAStringToANumber = function(string) {
        return +string;
      };
      const consumeTheRemnantsOfABadURL = function() {
        while (consume()) {
          if (code === 41 || eof()) {
            return;
          } else if (startsWithAValidEscape()) {
            consumeEscape();
            donothing();
          } else {
            donothing();
          }
        }
      };
      let iterationCount = 0;
      while (!eof(next())) {
        tokens.push(consumeAToken());
        iterationCount++;
        if (iterationCount > str.length * 2)
          throw new Error("I'm infinite-looping!");
      }
      return tokens;
    }
    var CSSParserToken = class {
      constructor() {
        this.tokenType = "";
      }
      toJSON() {
        return { token: this.tokenType };
      }
      toString() {
        return this.tokenType;
      }
      toSource() {
        return "" + this;
      }
    };
    var BadStringToken = class extends CSSParserToken {
      constructor() {
        super(...arguments);
        this.tokenType = "BADSTRING";
      }
    };
    var BadURLToken = class extends CSSParserToken {
      constructor() {
        super(...arguments);
        this.tokenType = "BADURL";
      }
    };
    var WhitespaceToken = class extends CSSParserToken {
      constructor() {
        super(...arguments);
        this.tokenType = "WHITESPACE";
      }
      toString() {
        return "WS";
      }
      toSource() {
        return " ";
      }
    };
    var CDOToken = class extends CSSParserToken {
      constructor() {
        super(...arguments);
        this.tokenType = "CDO";
      }
      toSource() {
        return "<!--";
      }
    };
    var CDCToken = class extends CSSParserToken {
      constructor() {
        super(...arguments);
        this.tokenType = "CDC";
      }
      toSource() {
        return "-->";
      }
    };
    var ColonToken = class extends CSSParserToken {
      constructor() {
        super(...arguments);
        this.tokenType = ":";
      }
    };
    var SemicolonToken = class extends CSSParserToken {
      constructor() {
        super(...arguments);
        this.tokenType = ";";
      }
    };
    var CommaToken = class extends CSSParserToken {
      constructor() {
        super(...arguments);
        this.tokenType = ",";
      }
    };
    var GroupingToken = class extends CSSParserToken {
      constructor() {
        super(...arguments);
        this.value = "";
        this.mirror = "";
      }
    };
    var OpenCurlyToken = class extends GroupingToken {
      constructor() {
        super();
        this.tokenType = "{";
        this.value = "{";
        this.mirror = "}";
      }
    };
    var CloseCurlyToken = class extends GroupingToken {
      constructor() {
        super();
        this.tokenType = "}";
        this.value = "}";
        this.mirror = "{";
      }
    };
    var OpenSquareToken = class extends GroupingToken {
      constructor() {
        super();
        this.tokenType = "[";
        this.value = "[";
        this.mirror = "]";
      }
    };
    var CloseSquareToken = class extends GroupingToken {
      constructor() {
        super();
        this.tokenType = "]";
        this.value = "]";
        this.mirror = "[";
      }
    };
    var OpenParenToken = class extends GroupingToken {
      constructor() {
        super();
        this.tokenType = "(";
        this.value = "(";
        this.mirror = ")";
      }
    };
    var CloseParenToken = class extends GroupingToken {
      constructor() {
        super();
        this.tokenType = ")";
        this.value = ")";
        this.mirror = "(";
      }
    };
    var IncludeMatchToken = class extends CSSParserToken {
      constructor() {
        super(...arguments);
        this.tokenType = "~=";
      }
    };
    var DashMatchToken = class extends CSSParserToken {
      constructor() {
        super(...arguments);
        this.tokenType = "|=";
      }
    };
    var PrefixMatchToken = class extends CSSParserToken {
      constructor() {
        super(...arguments);
        this.tokenType = "^=";
      }
    };
    var SuffixMatchToken = class extends CSSParserToken {
      constructor() {
        super(...arguments);
        this.tokenType = "$=";
      }
    };
    var SubstringMatchToken = class extends CSSParserToken {
      constructor() {
        super(...arguments);
        this.tokenType = "*=";
      }
    };
    var ColumnToken = class extends CSSParserToken {
      constructor() {
        super(...arguments);
        this.tokenType = "||";
      }
    };
    var EOFToken = class extends CSSParserToken {
      constructor() {
        super(...arguments);
        this.tokenType = "EOF";
      }
      toSource() {
        return "";
      }
    };
    var DelimToken = class extends CSSParserToken {
      constructor(code) {
        super();
        this.tokenType = "DELIM";
        this.value = "";
        this.value = stringFromCode(code);
      }
      toString() {
        return "DELIM(" + this.value + ")";
      }
      toJSON() {
        const json = this.constructor.prototype.constructor.prototype.toJSON.call(this);
        json.value = this.value;
        return json;
      }
      toSource() {
        if (this.value === "\\")
          return "\\\n";
        else
          return this.value;
      }
    };
    var StringValuedToken = class extends CSSParserToken {
      constructor() {
        super(...arguments);
        this.value = "";
      }
      ASCIIMatch(str) {
        return this.value.toLowerCase() === str.toLowerCase();
      }
      toJSON() {
        const json = this.constructor.prototype.constructor.prototype.toJSON.call(this);
        json.value = this.value;
        return json;
      }
    };
    var IdentToken = class extends StringValuedToken {
      constructor(val) {
        super();
        this.tokenType = "IDENT";
        this.value = val;
      }
      toString() {
        return "IDENT(" + this.value + ")";
      }
      toSource() {
        return escapeIdent(this.value);
      }
    };
    var FunctionToken = class extends StringValuedToken {
      constructor(val) {
        super();
        this.tokenType = "FUNCTION";
        this.value = val;
        this.mirror = ")";
      }
      toString() {
        return "FUNCTION(" + this.value + ")";
      }
      toSource() {
        return escapeIdent(this.value) + "(";
      }
    };
    var AtKeywordToken = class extends StringValuedToken {
      constructor(val) {
        super();
        this.tokenType = "AT-KEYWORD";
        this.value = val;
      }
      toString() {
        return "AT(" + this.value + ")";
      }
      toSource() {
        return "@" + escapeIdent(this.value);
      }
    };
    var HashToken = class extends StringValuedToken {
      constructor(val) {
        super();
        this.tokenType = "HASH";
        this.value = val;
        this.type = "unrestricted";
      }
      toString() {
        return "HASH(" + this.value + ")";
      }
      toJSON() {
        const json = this.constructor.prototype.constructor.prototype.toJSON.call(this);
        json.value = this.value;
        json.type = this.type;
        return json;
      }
      toSource() {
        if (this.type === "id")
          return "#" + escapeIdent(this.value);
        else
          return "#" + escapeHash(this.value);
      }
    };
    var StringToken = class extends StringValuedToken {
      constructor(val) {
        super();
        this.tokenType = "STRING";
        this.value = val;
      }
      toString() {
        return '"' + escapeString(this.value) + '"';
      }
    };
    var URLToken = class extends StringValuedToken {
      constructor(val) {
        super();
        this.tokenType = "URL";
        this.value = val;
      }
      toString() {
        return "URL(" + this.value + ")";
      }
      toSource() {
        return 'url("' + escapeString(this.value) + '")';
      }
    };
    var NumberToken = class extends CSSParserToken {
      constructor() {
        super();
        this.tokenType = "NUMBER";
        this.type = "integer";
        this.repr = "";
      }
      toString() {
        if (this.type === "integer")
          return "INT(" + this.value + ")";
        return "NUMBER(" + this.value + ")";
      }
      toJSON() {
        const json = super.toJSON();
        json.value = this.value;
        json.type = this.type;
        json.repr = this.repr;
        return json;
      }
      toSource() {
        return this.repr;
      }
    };
    var PercentageToken = class extends CSSParserToken {
      constructor() {
        super();
        this.tokenType = "PERCENTAGE";
        this.repr = "";
      }
      toString() {
        return "PERCENTAGE(" + this.value + ")";
      }
      toJSON() {
        const json = this.constructor.prototype.constructor.prototype.toJSON.call(this);
        json.value = this.value;
        json.repr = this.repr;
        return json;
      }
      toSource() {
        return this.repr + "%";
      }
    };
    var DimensionToken = class extends CSSParserToken {
      constructor() {
        super();
        this.tokenType = "DIMENSION";
        this.type = "integer";
        this.repr = "";
        this.unit = "";
      }
      toString() {
        return "DIM(" + this.value + "," + this.unit + ")";
      }
      toJSON() {
        const json = this.constructor.prototype.constructor.prototype.toJSON.call(this);
        json.value = this.value;
        json.type = this.type;
        json.repr = this.repr;
        json.unit = this.unit;
        return json;
      }
      toSource() {
        const source = this.repr;
        let unit = escapeIdent(this.unit);
        if (unit[0].toLowerCase() === "e" && (unit[1] === "-" || between(unit.charCodeAt(1), 48, 57))) {
          unit = "\\65 " + unit.slice(1, unit.length);
        }
        return source + unit;
      }
    };
    function escapeIdent(string) {
      string = "" + string;
      let result = "";
      const firstcode = string.charCodeAt(0);
      for (let i = 0; i < string.length; i++) {
        const code = string.charCodeAt(i);
        if (code === 0)
          throw new InvalidCharacterError("Invalid character: the input contains U+0000.");
        if (between(code, 1, 31) || code === 127 || i === 0 && between(code, 48, 57) || i === 1 && between(code, 48, 57) && firstcode === 45)
          result += "\\" + code.toString(16) + " ";
        else if (code >= 128 || code === 45 || code === 95 || between(code, 48, 57) || between(code, 65, 90) || between(code, 97, 122))
          result += string[i];
        else
          result += "\\" + string[i];
      }
      return result;
    }
    function escapeHash(string) {
      string = "" + string;
      let result = "";
      for (let i = 0; i < string.length; i++) {
        const code = string.charCodeAt(i);
        if (code === 0)
          throw new InvalidCharacterError("Invalid character: the input contains U+0000.");
        if (code >= 128 || code === 45 || code === 95 || between(code, 48, 57) || between(code, 65, 90) || between(code, 97, 122))
          result += string[i];
        else
          result += "\\" + code.toString(16) + " ";
      }
      return result;
    }
    function escapeString(string) {
      string = "" + string;
      let result = "";
      for (let i = 0; i < string.length; i++) {
        const code = string.charCodeAt(i);
        if (code === 0)
          throw new InvalidCharacterError("Invalid character: the input contains U+0000.");
        if (between(code, 1, 31) || code === 127)
          result += "\\" + code.toString(16) + " ";
        else if (code === 34 || code === 92)
          result += "\\" + string[i];
        else
          result += string[i];
      }
      return result;
    }
  }
});

// node_modules/playwright-core/lib/utils/isomorphic/cssParser.js
var require_cssParser = __commonJS({
  "node_modules/playwright-core/lib/utils/isomorphic/cssParser.js"(exports, module) {
    "use strict";
    var __create2 = Object.create;
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __getProtoOf2 = Object.getPrototypeOf;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toESM2 = (mod, isNodeMode, target) => (target = mod != null ? __create2(__getProtoOf2(mod)) : {}, __copyProps2(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      isNodeMode || !mod || !mod.__esModule ? __defProp2(target, "default", { value: mod, enumerable: true }) : target,
      mod
    ));
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var cssParser_exports = {};
    __export(cssParser_exports, {
      InvalidSelectorError: () => InvalidSelectorError2,
      isInvalidSelectorError: () => isInvalidSelectorError2,
      parseCSS: () => parseCSS,
      serializeSelector: () => serializeSelector
    });
    module.exports = __toCommonJS(cssParser_exports);
    var css = __toESM2(require_cssTokenizer());
    var InvalidSelectorError2 = class extends Error {
    };
    function isInvalidSelectorError2(error) {
      return error instanceof InvalidSelectorError2;
    }
    function parseCSS(selector, customNames) {
      let tokens;
      try {
        tokens = css.tokenize(selector);
        if (!(tokens[tokens.length - 1] instanceof css.EOFToken))
          tokens.push(new css.EOFToken());
      } catch (e) {
        const newMessage = e.message + ` while parsing css selector "${selector}". Did you mean to CSS.escape it?`;
        const index = (e.stack || "").indexOf(e.message);
        if (index !== -1)
          e.stack = e.stack.substring(0, index) + newMessage + e.stack.substring(index + e.message.length);
        e.message = newMessage;
        throw e;
      }
      const unsupportedToken = tokens.find((token) => {
        return token instanceof css.AtKeywordToken || token instanceof css.BadStringToken || token instanceof css.BadURLToken || token instanceof css.ColumnToken || token instanceof css.CDOToken || token instanceof css.CDCToken || token instanceof css.SemicolonToken || // TODO: Consider using these for something, e.g. to escape complex strings.
        // For example :xpath{ (//div/bar[@attr="foo"])[2]/baz }
        // Or this way :xpath( {complex-xpath-goes-here("hello")} )
        token instanceof css.OpenCurlyToken || token instanceof css.CloseCurlyToken || // TODO: Consider treating these as strings?
        token instanceof css.URLToken || token instanceof css.PercentageToken;
      });
      if (unsupportedToken)
        throw new InvalidSelectorError2(`Unsupported token "${unsupportedToken.toSource()}" while parsing css selector "${selector}". Did you mean to CSS.escape it?`);
      let pos = 0;
      const names = /* @__PURE__ */ new Set();
      function unexpected() {
        return new InvalidSelectorError2(`Unexpected token "${tokens[pos].toSource()}" while parsing css selector "${selector}". Did you mean to CSS.escape it?`);
      }
      function skipWhitespace() {
        while (tokens[pos] instanceof css.WhitespaceToken)
          pos++;
      }
      function isIdent(p = pos) {
        return tokens[p] instanceof css.IdentToken;
      }
      function isString(p = pos) {
        return tokens[p] instanceof css.StringToken;
      }
      function isNumber(p = pos) {
        return tokens[p] instanceof css.NumberToken;
      }
      function isComma(p = pos) {
        return tokens[p] instanceof css.CommaToken;
      }
      function isOpenParen(p = pos) {
        return tokens[p] instanceof css.OpenParenToken;
      }
      function isCloseParen(p = pos) {
        return tokens[p] instanceof css.CloseParenToken;
      }
      function isFunction(p = pos) {
        return tokens[p] instanceof css.FunctionToken;
      }
      function isStar(p = pos) {
        return tokens[p] instanceof css.DelimToken && tokens[p].value === "*";
      }
      function isEOF(p = pos) {
        return tokens[p] instanceof css.EOFToken;
      }
      function isClauseCombinator(p = pos) {
        return tokens[p] instanceof css.DelimToken && [">", "+", "~"].includes(tokens[p].value);
      }
      function isSelectorClauseEnd(p = pos) {
        return isComma(p) || isCloseParen(p) || isEOF(p) || isClauseCombinator(p) || tokens[p] instanceof css.WhitespaceToken;
      }
      function consumeFunctionArguments() {
        const result2 = [consumeArgument()];
        while (true) {
          skipWhitespace();
          if (!isComma())
            break;
          pos++;
          result2.push(consumeArgument());
        }
        return result2;
      }
      function consumeArgument() {
        skipWhitespace();
        if (isNumber())
          return tokens[pos++].value;
        if (isString())
          return tokens[pos++].value;
        return consumeComplexSelector();
      }
      function consumeComplexSelector() {
        const result2 = { simples: [] };
        skipWhitespace();
        if (isClauseCombinator()) {
          result2.simples.push({ selector: { functions: [{ name: "scope", args: [] }] }, combinator: "" });
        } else {
          result2.simples.push({ selector: consumeSimpleSelector(), combinator: "" });
        }
        while (true) {
          skipWhitespace();
          if (isClauseCombinator()) {
            result2.simples[result2.simples.length - 1].combinator = tokens[pos++].value;
            skipWhitespace();
          } else if (isSelectorClauseEnd()) {
            break;
          }
          result2.simples.push({ combinator: "", selector: consumeSimpleSelector() });
        }
        return result2;
      }
      function consumeSimpleSelector() {
        let rawCSSString = "";
        const functions = [];
        while (!isSelectorClauseEnd()) {
          if (isIdent() || isStar()) {
            rawCSSString += tokens[pos++].toSource();
          } else if (tokens[pos] instanceof css.HashToken) {
            rawCSSString += tokens[pos++].toSource();
          } else if (tokens[pos] instanceof css.DelimToken && tokens[pos].value === ".") {
            pos++;
            if (isIdent())
              rawCSSString += "." + tokens[pos++].toSource();
            else
              throw unexpected();
          } else if (tokens[pos] instanceof css.ColonToken) {
            pos++;
            if (isIdent()) {
              if (!customNames.has(tokens[pos].value.toLowerCase())) {
                rawCSSString += ":" + tokens[pos++].toSource();
              } else {
                const name = tokens[pos++].value.toLowerCase();
                functions.push({ name, args: [] });
                names.add(name);
              }
            } else if (isFunction()) {
              const name = tokens[pos++].value.toLowerCase();
              if (!customNames.has(name)) {
                rawCSSString += `:${name}(${consumeBuiltinFunctionArguments()})`;
              } else {
                functions.push({ name, args: consumeFunctionArguments() });
                names.add(name);
              }
              skipWhitespace();
              if (!isCloseParen())
                throw unexpected();
              pos++;
            } else {
              throw unexpected();
            }
          } else if (tokens[pos] instanceof css.OpenSquareToken) {
            rawCSSString += "[";
            pos++;
            while (!(tokens[pos] instanceof css.CloseSquareToken) && !isEOF())
              rawCSSString += tokens[pos++].toSource();
            if (!(tokens[pos] instanceof css.CloseSquareToken))
              throw unexpected();
            rawCSSString += "]";
            pos++;
          } else {
            throw unexpected();
          }
        }
        if (!rawCSSString && !functions.length)
          throw unexpected();
        return { css: rawCSSString || void 0, functions };
      }
      function consumeBuiltinFunctionArguments() {
        let s = "";
        let balance = 1;
        while (!isEOF()) {
          if (isOpenParen() || isFunction())
            balance++;
          if (isCloseParen())
            balance--;
          if (!balance)
            break;
          s += tokens[pos++].toSource();
        }
        return s;
      }
      const result = consumeFunctionArguments();
      if (!isEOF())
        throw unexpected();
      if (result.some((arg) => typeof arg !== "object" || !("simples" in arg)))
        throw new InvalidSelectorError2(`Error while parsing css selector "${selector}". Did you mean to CSS.escape it?`);
      return { selector: result, names: Array.from(names) };
    }
    function serializeSelector(args) {
      return args.map((arg) => {
        if (typeof arg === "string")
          return `"${arg}"`;
        if (typeof arg === "number")
          return String(arg);
        return arg.simples.map(({ selector, combinator }) => {
          let s = selector.css || "";
          s = s + selector.functions.map((func) => `:${func.name}(${serializeSelector(func.args)})`).join("");
          if (combinator)
            s += " " + combinator;
          return s;
        }).join(" ");
      }).join(", ");
    }
  }
});

// node_modules/playwright-core/lib/utils/isomorphic/selectorParser.js
var require_selectorParser = __commonJS({
  "node_modules/playwright-core/lib/utils/isomorphic/selectorParser.js"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var selectorParser_exports = {};
    __export(selectorParser_exports, {
      InvalidSelectorError: () => import_cssParser2.InvalidSelectorError,
      customCSSNames: () => customCSSNames,
      isInvalidSelectorError: () => import_cssParser2.isInvalidSelectorError,
      parseAttributeSelector: () => parseAttributeSelector,
      parseSelector: () => parseSelector2,
      splitSelectorByFrame: () => splitSelectorByFrame2,
      stringifySelector: () => stringifySelector2,
      visitAllSelectorParts: () => visitAllSelectorParts
    });
    module.exports = __toCommonJS(selectorParser_exports);
    var import_cssParser = require_cssParser();
    var import_cssParser2 = require_cssParser();
    var kNestedSelectorNames = /* @__PURE__ */ new Set(["internal:has", "internal:has-not", "internal:and", "internal:or", "internal:chain", "left-of", "right-of", "above", "below", "near"]);
    var kNestedSelectorNamesWithDistance = /* @__PURE__ */ new Set(["left-of", "right-of", "above", "below", "near"]);
    var customCSSNames = /* @__PURE__ */ new Set(["not", "is", "where", "has", "scope", "light", "visible", "text", "text-matches", "text-is", "has-text", "above", "below", "right-of", "left-of", "near", "nth-match"]);
    function parseSelector2(selector) {
      const parsedStrings = parseSelectorString(selector);
      const parts = [];
      for (const part of parsedStrings.parts) {
        if (part.name === "css" || part.name === "css:light") {
          if (part.name === "css:light")
            part.body = ":light(" + part.body + ")";
          const parsedCSS = (0, import_cssParser.parseCSS)(part.body, customCSSNames);
          parts.push({
            name: "css",
            body: parsedCSS.selector,
            source: part.body
          });
          continue;
        }
        if (kNestedSelectorNames.has(part.name)) {
          let innerSelector;
          let distance;
          try {
            const unescaped = JSON.parse("[" + part.body + "]");
            if (!Array.isArray(unescaped) || unescaped.length < 1 || unescaped.length > 2 || typeof unescaped[0] !== "string")
              throw new import_cssParser.InvalidSelectorError(`Malformed selector: ${part.name}=` + part.body);
            innerSelector = unescaped[0];
            if (unescaped.length === 2) {
              if (typeof unescaped[1] !== "number" || !kNestedSelectorNamesWithDistance.has(part.name))
                throw new import_cssParser.InvalidSelectorError(`Malformed selector: ${part.name}=` + part.body);
              distance = unescaped[1];
            }
          } catch (e) {
            throw new import_cssParser.InvalidSelectorError(`Malformed selector: ${part.name}=` + part.body);
          }
          const nested = { name: part.name, source: part.body, body: { parsed: parseSelector2(innerSelector), distance } };
          const lastFrame = [...nested.body.parsed.parts].reverse().find((part2) => part2.name === "internal:control" && part2.body === "enter-frame");
          const lastFrameIndex = lastFrame ? nested.body.parsed.parts.indexOf(lastFrame) : -1;
          if (lastFrameIndex !== -1 && selectorPartsEqual(nested.body.parsed.parts.slice(0, lastFrameIndex + 1), parts.slice(0, lastFrameIndex + 1)))
            nested.body.parsed.parts.splice(0, lastFrameIndex + 1);
          parts.push(nested);
          continue;
        }
        parts.push({ ...part, source: part.body });
      }
      if (kNestedSelectorNames.has(parts[0].name))
        throw new import_cssParser.InvalidSelectorError(`"${parts[0].name}" selector cannot be first`);
      return {
        capture: parsedStrings.capture,
        parts
      };
    }
    function splitSelectorByFrame2(selectorText) {
      const selector = parseSelector2(selectorText);
      const result = [];
      let chunk = {
        parts: []
      };
      let chunkStartIndex = 0;
      for (let i = 0; i < selector.parts.length; ++i) {
        const part = selector.parts[i];
        if (part.name === "internal:control" && part.body === "enter-frame") {
          if (!chunk.parts.length)
            throw new import_cssParser.InvalidSelectorError("Selector cannot start with entering frame, select the iframe first");
          result.push(chunk);
          chunk = { parts: [] };
          chunkStartIndex = i + 1;
          continue;
        }
        if (selector.capture === i)
          chunk.capture = i - chunkStartIndex;
        chunk.parts.push(part);
      }
      if (!chunk.parts.length)
        throw new import_cssParser.InvalidSelectorError(`Selector cannot end with entering frame, while parsing selector ${selectorText}`);
      result.push(chunk);
      if (typeof selector.capture === "number" && typeof result[result.length - 1].capture !== "number")
        throw new import_cssParser.InvalidSelectorError(`Can not capture the selector before diving into the frame. Only use * after the last frame has been selected`);
      return result;
    }
    function selectorPartsEqual(list1, list2) {
      return stringifySelector2({ parts: list1 }) === stringifySelector2({ parts: list2 });
    }
    function stringifySelector2(selector, forceEngineName) {
      if (typeof selector === "string")
        return selector;
      return selector.parts.map((p, i) => {
        let includeEngine = true;
        if (!forceEngineName && i !== selector.capture) {
          if (p.name === "css")
            includeEngine = false;
          else if (p.name === "xpath" && p.source.startsWith("//") || p.source.startsWith(".."))
            includeEngine = false;
        }
        const prefix = includeEngine ? p.name + "=" : "";
        return `${i === selector.capture ? "*" : ""}${prefix}${p.source}`;
      }).join(" >> ");
    }
    function visitAllSelectorParts(selector, visitor) {
      const visit = (selector2, nested) => {
        for (const part of selector2.parts) {
          visitor(part, nested);
          if (kNestedSelectorNames.has(part.name))
            visit(part.body.parsed, true);
        }
      };
      visit(selector, false);
    }
    function parseSelectorString(selector) {
      let index = 0;
      let quote;
      let start = 0;
      const result = { parts: [] };
      const append = () => {
        const part = selector.substring(start, index).trim();
        const eqIndex = part.indexOf("=");
        let name;
        let body;
        if (eqIndex !== -1 && part.substring(0, eqIndex).trim().match(/^[a-zA-Z_0-9-+:*]+$/)) {
          name = part.substring(0, eqIndex).trim();
          body = part.substring(eqIndex + 1);
        } else if (part.length > 1 && part[0] === '"' && part[part.length - 1] === '"') {
          name = "text";
          body = part;
        } else if (part.length > 1 && part[0] === "'" && part[part.length - 1] === "'") {
          name = "text";
          body = part;
        } else if (/^\(*\/\//.test(part) || part.startsWith("..")) {
          name = "xpath";
          body = part;
        } else {
          name = "css";
          body = part;
        }
        let capture = false;
        if (name[0] === "*") {
          capture = true;
          name = name.substring(1);
        }
        result.parts.push({ name, body });
        if (capture) {
          if (result.capture !== void 0)
            throw new import_cssParser.InvalidSelectorError(`Only one of the selectors can capture using * modifier`);
          result.capture = result.parts.length - 1;
        }
      };
      if (!selector.includes(">>")) {
        index = selector.length;
        append();
        return result;
      }
      const shouldIgnoreTextSelectorQuote = () => {
        const prefix = selector.substring(start, index);
        const match = prefix.match(/^\s*text\s*=(.*)$/);
        return !!match && !!match[1];
      };
      while (index < selector.length) {
        const c = selector[index];
        if (c === "\\" && index + 1 < selector.length) {
          index += 2;
        } else if (c === quote) {
          quote = void 0;
          index++;
        } else if (!quote && (c === '"' || c === "'" || c === "`") && !shouldIgnoreTextSelectorQuote()) {
          quote = c;
          index++;
        } else if (!quote && c === ">" && selector[index + 1] === ">") {
          append();
          index += 2;
          start = index;
        } else {
          index++;
        }
      }
      append();
      return result;
    }
    function parseAttributeSelector(selector, allowUnquotedStrings) {
      let wp = 0;
      let EOL = selector.length === 0;
      const next = () => selector[wp] || "";
      const eat1 = () => {
        const result2 = next();
        ++wp;
        EOL = wp >= selector.length;
        return result2;
      };
      const syntaxError = (stage) => {
        if (EOL)
          throw new import_cssParser.InvalidSelectorError(`Unexpected end of selector while parsing selector \`${selector}\``);
        throw new import_cssParser.InvalidSelectorError(`Error while parsing selector \`${selector}\` - unexpected symbol "${next()}" at position ${wp}` + (stage ? " during " + stage : ""));
      };
      function skipSpaces() {
        while (!EOL && /\s/.test(next()))
          eat1();
      }
      function isCSSNameChar(char) {
        return char >= "\x80" || char >= "0" && char <= "9" || char >= "A" && char <= "Z" || char >= "a" && char <= "z" || char >= "0" && char <= "9" || char === "_" || char === "-";
      }
      function readIdentifier() {
        let result2 = "";
        skipSpaces();
        while (!EOL && isCSSNameChar(next()))
          result2 += eat1();
        return result2;
      }
      function readQuotedString(quote) {
        let result2 = eat1();
        if (result2 !== quote)
          syntaxError("parsing quoted string");
        while (!EOL && next() !== quote) {
          if (next() === "\\")
            eat1();
          result2 += eat1();
        }
        if (next() !== quote)
          syntaxError("parsing quoted string");
        result2 += eat1();
        return result2;
      }
      function readRegularExpression() {
        if (eat1() !== "/")
          syntaxError("parsing regular expression");
        let source = "";
        let inClass = false;
        while (!EOL) {
          if (next() === "\\") {
            source += eat1();
            if (EOL)
              syntaxError("parsing regular expression");
          } else if (inClass && next() === "]") {
            inClass = false;
          } else if (!inClass && next() === "[") {
            inClass = true;
          } else if (!inClass && next() === "/") {
            break;
          }
          source += eat1();
        }
        if (eat1() !== "/")
          syntaxError("parsing regular expression");
        let flags = "";
        while (!EOL && next().match(/[dgimsuy]/))
          flags += eat1();
        try {
          return new RegExp(source, flags);
        } catch (e) {
          throw new import_cssParser.InvalidSelectorError(`Error while parsing selector \`${selector}\`: ${e.message}`);
        }
      }
      function readAttributeToken() {
        let token = "";
        skipSpaces();
        if (next() === `'` || next() === `"`)
          token = readQuotedString(next()).slice(1, -1);
        else
          token = readIdentifier();
        if (!token)
          syntaxError("parsing property path");
        return token;
      }
      function readOperator() {
        skipSpaces();
        let op = "";
        if (!EOL)
          op += eat1();
        if (!EOL && op !== "=")
          op += eat1();
        if (!["=", "*=", "^=", "$=", "|=", "~="].includes(op))
          syntaxError("parsing operator");
        return op;
      }
      function readAttribute() {
        eat1();
        const jsonPath = [];
        jsonPath.push(readAttributeToken());
        skipSpaces();
        while (next() === ".") {
          eat1();
          jsonPath.push(readAttributeToken());
          skipSpaces();
        }
        if (next() === "]") {
          eat1();
          return { name: jsonPath.join("."), jsonPath, op: "<truthy>", value: null, caseSensitive: false };
        }
        const operator = readOperator();
        let value = void 0;
        let caseSensitive = true;
        skipSpaces();
        if (next() === "/") {
          if (operator !== "=")
            throw new import_cssParser.InvalidSelectorError(`Error while parsing selector \`${selector}\` - cannot use ${operator} in attribute with regular expression`);
          value = readRegularExpression();
        } else if (next() === `'` || next() === `"`) {
          value = readQuotedString(next()).slice(1, -1);
          skipSpaces();
          if (next() === "i" || next() === "I") {
            caseSensitive = false;
            eat1();
          } else if (next() === "s" || next() === "S") {
            caseSensitive = true;
            eat1();
          }
        } else {
          value = "";
          while (!EOL && (isCSSNameChar(next()) || next() === "+" || next() === "."))
            value += eat1();
          if (value === "true") {
            value = true;
          } else if (value === "false") {
            value = false;
          } else {
            if (!allowUnquotedStrings) {
              value = +value;
              if (Number.isNaN(value))
                syntaxError("parsing attribute value");
            }
          }
        }
        skipSpaces();
        if (next() !== "]")
          syntaxError("parsing attribute value");
        eat1();
        if (operator !== "=" && typeof value !== "string")
          throw new import_cssParser.InvalidSelectorError(`Error while parsing selector \`${selector}\` - cannot use ${operator} in attribute with non-string matching value - ${value}`);
        return { name: jsonPath.join("."), jsonPath, op: operator, value, caseSensitive };
      }
      const result = {
        name: "",
        attributes: []
      };
      result.name = readIdentifier();
      skipSpaces();
      while (next() === "[") {
        result.attributes.push(readAttribute());
        skipSpaces();
      }
      if (!EOL)
        syntaxError(void 0);
      if (!result.name && !result.attributes.length)
        throw new import_cssParser.InvalidSelectorError(`Error while parsing selector \`${selector}\` - selector cannot be empty`);
      return result;
    }
  }
});

// node_modules/playwright-core/lib/utils/isomorphic/stringUtils.js
var require_stringUtils = __commonJS({
  "node_modules/playwright-core/lib/utils/isomorphic/stringUtils.js"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var stringUtils_exports = {};
    __export(stringUtils_exports, {
      ansiRegex: () => ansiRegex,
      cacheNormalizedWhitespaces: () => cacheNormalizedWhitespaces,
      escapeForAttributeSelector: () => escapeForAttributeSelector,
      escapeForTextSelector: () => escapeForTextSelector,
      escapeHTML: () => escapeHTML,
      escapeHTMLAttribute: () => escapeHTMLAttribute,
      escapeRegExp: () => escapeRegExp,
      escapeTemplateString: () => escapeTemplateString,
      escapeWithQuotes: () => escapeWithQuotes,
      formatObject: () => formatObject,
      formatObjectOrVoid: () => formatObjectOrVoid,
      isString: () => isString,
      longestCommonSubstring: () => longestCommonSubstring,
      normalizeEscapedRegexQuotes: () => normalizeEscapedRegexQuotes,
      normalizeWhiteSpace: () => normalizeWhiteSpace,
      parseRegex: () => parseRegex,
      quoteCSSAttributeValue: () => quoteCSSAttributeValue,
      stripAnsiEscapes: () => stripAnsiEscapes,
      toSnakeCase: () => toSnakeCase,
      toTitleCase: () => toTitleCase,
      trimString: () => trimString,
      trimStringWithEllipsis: () => trimStringWithEllipsis
    });
    module.exports = __toCommonJS(stringUtils_exports);
    function escapeWithQuotes(text, char = "'") {
      const stringified = JSON.stringify(text);
      const escapedText = stringified.substring(1, stringified.length - 1).replace(/\\"/g, '"');
      if (char === "'")
        return char + escapedText.replace(/[']/g, "\\'") + char;
      if (char === '"')
        return char + escapedText.replace(/["]/g, '\\"') + char;
      if (char === "`")
        return char + escapedText.replace(/[`]/g, "\\`") + char;
      throw new Error("Invalid escape char");
    }
    function escapeTemplateString(text) {
      return text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
    }
    function isString(obj) {
      return typeof obj === "string" || obj instanceof String;
    }
    function toTitleCase(name) {
      return name.charAt(0).toUpperCase() + name.substring(1);
    }
    function toSnakeCase(name) {
      return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/([A-Z])([A-Z][a-z])/g, "$1_$2").toLowerCase();
    }
    function formatObject(value, indent = "  ", mode = "multiline") {
      if (typeof value === "string")
        return escapeWithQuotes(value, "'");
      if (Array.isArray(value))
        return `[${value.map((o) => formatObject(o)).join(", ")}]`;
      if (typeof value === "object") {
        const keys = Object.keys(value).filter((key) => value[key] !== void 0).sort();
        if (!keys.length)
          return "{}";
        const tokens = [];
        for (const key of keys)
          tokens.push(`${key}: ${formatObject(value[key])}`);
        if (mode === "multiline")
          return `{
${tokens.join(`,
${indent}`)}
}`;
        return `{ ${tokens.join(", ")} }`;
      }
      return String(value);
    }
    function formatObjectOrVoid(value, indent = "  ") {
      const result = formatObject(value, indent);
      return result === "{}" ? "" : result;
    }
    function quoteCSSAttributeValue(text) {
      return `"${text.replace(/["\\]/g, (char) => "\\" + char)}"`;
    }
    var normalizedWhitespaceCache;
    function cacheNormalizedWhitespaces() {
      normalizedWhitespaceCache = /* @__PURE__ */ new Map();
    }
    function normalizeWhiteSpace(text) {
      let result = normalizedWhitespaceCache?.get(text);
      if (result === void 0) {
        result = text.replace(/[\u200b\u00ad]/g, "").trim().replace(/\s+/g, " ");
        normalizedWhitespaceCache?.set(text, result);
      }
      return result;
    }
    function normalizeEscapedRegexQuotes(source) {
      return source.replace(/(^|[^\\])(\\\\)*\\(['"`])/g, "$1$2$3");
    }
    function escapeRegexForSelector(re) {
      if (re.unicode || re.unicodeSets)
        return String(re);
      return String(re).replace(/(^|[^\\])(\\\\)*(["'`])/g, "$1$2\\$3").replace(/>>/g, "\\>\\>");
    }
    function escapeForTextSelector(text, exact) {
      if (typeof text !== "string")
        return escapeRegexForSelector(text);
      return `${JSON.stringify(text)}${exact ? "s" : "i"}`;
    }
    function escapeForAttributeSelector(value, exact) {
      if (typeof value !== "string")
        return escapeRegexForSelector(value);
      return `"${value.replace(/\\/g, "\\\\").replace(/["]/g, '\\"')}"${exact ? "s" : "i"}`;
    }
    function trimString(input, cap, suffix = "") {
      if (input.length <= cap)
        return input;
      const chars = [...input];
      if (chars.length > cap)
        return chars.slice(0, cap - suffix.length).join("") + suffix;
      return chars.join("");
    }
    function trimStringWithEllipsis(input, cap) {
      return trimString(input, cap, "\u2026");
    }
    function escapeRegExp(s) {
      return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    var escaped = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    function escapeHTMLAttribute(s) {
      return s.replace(/[&<>"']/ug, (char) => escaped[char]);
    }
    function escapeHTML(s) {
      return s.replace(/[&<]/ug, (char) => escaped[char]);
    }
    function longestCommonSubstring(s1, s2) {
      const n = s1.length;
      const m = s2.length;
      let maxLen = 0;
      let endingIndex = 0;
      const dp = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));
      for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
          if (s1[i - 1] === s2[j - 1]) {
            dp[i][j] = dp[i - 1][j - 1] + 1;
            if (dp[i][j] > maxLen) {
              maxLen = dp[i][j];
              endingIndex = i;
            }
          }
        }
      }
      return s1.slice(endingIndex - maxLen, endingIndex);
    }
    function parseRegex(regex) {
      if (regex[0] !== "/")
        throw new Error(`Invalid regex, must start with '/': ${regex}`);
      const lastSlash = regex.lastIndexOf("/");
      if (lastSlash <= 0)
        throw new Error(`Invalid regex, must end with '/' followed by optional flags: ${regex}`);
      const source = regex.slice(1, lastSlash);
      const flags = regex.slice(lastSlash + 1);
      return new RegExp(source, flags);
    }
    var ansiRegex = new RegExp("([\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~])))", "g");
    function stripAnsiEscapes(str) {
      return str.replace(ansiRegex, "");
    }
  }
});

// node_modules/playwright-core/lib/utils/isomorphic/locatorGenerators.js
var require_locatorGenerators = __commonJS({
  "node_modules/playwright-core/lib/utils/isomorphic/locatorGenerators.js"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var locatorGenerators_exports = {};
    __export(locatorGenerators_exports, {
      CSharpLocatorFactory: () => CSharpLocatorFactory,
      JavaLocatorFactory: () => JavaLocatorFactory,
      JavaScriptLocatorFactory: () => JavaScriptLocatorFactory,
      JsonlLocatorFactory: () => JsonlLocatorFactory,
      PythonLocatorFactory: () => PythonLocatorFactory,
      asLocator: () => asLocator,
      asLocatorDescription: () => asLocatorDescription,
      asLocators: () => asLocators,
      locatorCustomDescription: () => locatorCustomDescription
    });
    module.exports = __toCommonJS(locatorGenerators_exports);
    var import_selectorParser2 = require_selectorParser();
    var import_stringUtils = require_stringUtils();
    function asLocatorDescription(lang, selector) {
      try {
        const parsed = (0, import_selectorParser2.parseSelector)(selector);
        const customDescription = parseCustomDescription(parsed);
        if (customDescription)
          return customDescription;
        return innerAsLocators(new generators[lang](), parsed, false, 1)[0];
      } catch (e) {
        return selector;
      }
    }
    function locatorCustomDescription(selector) {
      try {
        const parsed = (0, import_selectorParser2.parseSelector)(selector);
        return parseCustomDescription(parsed);
      } catch (e) {
        return void 0;
      }
    }
    function parseCustomDescription(parsed) {
      const lastPart = parsed.parts[parsed.parts.length - 1];
      if (lastPart?.name === "internal:describe") {
        const description = JSON.parse(lastPart.body);
        if (typeof description === "string")
          return description;
      }
      return void 0;
    }
    function asLocator(lang, selector, isFrameLocator = false) {
      return asLocators(lang, selector, isFrameLocator, 1)[0];
    }
    function asLocators(lang, selector, isFrameLocator = false, maxOutputSize = 20, preferredQuote) {
      try {
        return innerAsLocators(new generators[lang](preferredQuote), (0, import_selectorParser2.parseSelector)(selector), isFrameLocator, maxOutputSize);
      } catch (e) {
        return [selector];
      }
    }
    function innerAsLocators(factory, parsed, isFrameLocator = false, maxOutputSize = 20) {
      const parts = [...parsed.parts];
      const tokens = [];
      let nextBase = isFrameLocator ? "frame-locator" : "page";
      for (let index = 0; index < parts.length; index++) {
        const part = parts[index];
        const base = nextBase;
        nextBase = "locator";
        if (part.name === "internal:describe")
          continue;
        if (part.name === "nth") {
          if (part.body === "0")
            tokens.push([factory.generateLocator(base, "first", ""), factory.generateLocator(base, "nth", "0")]);
          else if (part.body === "-1")
            tokens.push([factory.generateLocator(base, "last", ""), factory.generateLocator(base, "nth", "-1")]);
          else
            tokens.push([factory.generateLocator(base, "nth", part.body)]);
          continue;
        }
        if (part.name === "visible") {
          tokens.push([factory.generateLocator(base, "visible", part.body), factory.generateLocator(base, "default", `visible=${part.body}`)]);
          continue;
        }
        if (part.name === "internal:text") {
          const { exact, text } = detectExact(part.body);
          tokens.push([factory.generateLocator(base, "text", text, { exact })]);
          continue;
        }
        if (part.name === "internal:has-text") {
          const { exact, text } = detectExact(part.body);
          if (!exact) {
            tokens.push([factory.generateLocator(base, "has-text", text, { exact })]);
            continue;
          }
        }
        if (part.name === "internal:has-not-text") {
          const { exact, text } = detectExact(part.body);
          if (!exact) {
            tokens.push([factory.generateLocator(base, "has-not-text", text, { exact })]);
            continue;
          }
        }
        if (part.name === "internal:has") {
          const inners = innerAsLocators(factory, part.body.parsed, false, maxOutputSize);
          tokens.push(inners.map((inner) => factory.generateLocator(base, "has", inner)));
          continue;
        }
        if (part.name === "internal:has-not") {
          const inners = innerAsLocators(factory, part.body.parsed, false, maxOutputSize);
          tokens.push(inners.map((inner) => factory.generateLocator(base, "hasNot", inner)));
          continue;
        }
        if (part.name === "internal:and") {
          const inners = innerAsLocators(factory, part.body.parsed, false, maxOutputSize);
          tokens.push(inners.map((inner) => factory.generateLocator(base, "and", inner)));
          continue;
        }
        if (part.name === "internal:or") {
          const inners = innerAsLocators(factory, part.body.parsed, false, maxOutputSize);
          tokens.push(inners.map((inner) => factory.generateLocator(base, "or", inner)));
          continue;
        }
        if (part.name === "internal:chain") {
          const inners = innerAsLocators(factory, part.body.parsed, false, maxOutputSize);
          tokens.push(inners.map((inner) => factory.generateLocator(base, "chain", inner)));
          continue;
        }
        if (part.name === "internal:label") {
          const { exact, text } = detectExact(part.body);
          tokens.push([factory.generateLocator(base, "label", text, { exact })]);
          continue;
        }
        if (part.name === "internal:role") {
          const attrSelector = (0, import_selectorParser2.parseAttributeSelector)(part.body, true);
          const options = { attrs: [] };
          for (const attr of attrSelector.attributes) {
            if (attr.name === "name") {
              options.exact = attr.caseSensitive;
              options.name = attr.value;
            } else {
              if (attr.name === "level" && typeof attr.value === "string")
                attr.value = +attr.value;
              options.attrs.push({ name: attr.name === "include-hidden" ? "includeHidden" : attr.name, value: attr.value });
            }
          }
          tokens.push([factory.generateLocator(base, "role", attrSelector.name, options)]);
          continue;
        }
        if (part.name === "internal:testid") {
          const attrSelector = (0, import_selectorParser2.parseAttributeSelector)(part.body, true);
          const { value } = attrSelector.attributes[0];
          tokens.push([factory.generateLocator(base, "test-id", value)]);
          continue;
        }
        if (part.name === "internal:attr") {
          const attrSelector = (0, import_selectorParser2.parseAttributeSelector)(part.body, true);
          const { name, value, caseSensitive } = attrSelector.attributes[0];
          const text = value;
          const exact = !!caseSensitive;
          if (name === "placeholder") {
            tokens.push([factory.generateLocator(base, "placeholder", text, { exact })]);
            continue;
          }
          if (name === "alt") {
            tokens.push([factory.generateLocator(base, "alt", text, { exact })]);
            continue;
          }
          if (name === "title") {
            tokens.push([factory.generateLocator(base, "title", text, { exact })]);
            continue;
          }
        }
        if (part.name === "internal:control" && part.body === "enter-frame") {
          const lastTokens = tokens[tokens.length - 1];
          const lastPart = parts[index - 1];
          const transformed = lastTokens.map((token) => factory.chainLocators([token, factory.generateLocator(base, "frame", "")]));
          if (["xpath", "css"].includes(lastPart.name)) {
            transformed.push(
              factory.generateLocator(base, "frame-locator", (0, import_selectorParser2.stringifySelector)({ parts: [lastPart] })),
              factory.generateLocator(base, "frame-locator", (0, import_selectorParser2.stringifySelector)({ parts: [lastPart] }, true))
            );
          }
          lastTokens.splice(0, lastTokens.length, ...transformed);
          nextBase = "frame-locator";
          continue;
        }
        const nextPart = parts[index + 1];
        const selectorPart = (0, import_selectorParser2.stringifySelector)({ parts: [part] });
        const locatorPart = factory.generateLocator(base, "default", selectorPart);
        if (nextPart && ["internal:has-text", "internal:has-not-text"].includes(nextPart.name)) {
          const { exact, text } = detectExact(nextPart.body);
          if (!exact) {
            const nextLocatorPart = factory.generateLocator("locator", nextPart.name === "internal:has-text" ? "has-text" : "has-not-text", text, { exact });
            const options = {};
            if (nextPart.name === "internal:has-text")
              options.hasText = text;
            else
              options.hasNotText = text;
            const combinedPart = factory.generateLocator(base, "default", selectorPart, options);
            tokens.push([factory.chainLocators([locatorPart, nextLocatorPart]), combinedPart]);
            index++;
            continue;
          }
        }
        let locatorPartWithEngine;
        if (["xpath", "css"].includes(part.name)) {
          const selectorPart2 = (0, import_selectorParser2.stringifySelector)(
            { parts: [part] },
            /* forceEngineName */
            true
          );
          locatorPartWithEngine = factory.generateLocator(base, "default", selectorPart2);
        }
        tokens.push([locatorPart, locatorPartWithEngine].filter(Boolean));
      }
      return combineTokens(factory, tokens, maxOutputSize);
    }
    function combineTokens(factory, tokens, maxOutputSize) {
      const currentTokens = tokens.map(() => "");
      const result = [];
      const visit = (index) => {
        if (index === tokens.length) {
          result.push(factory.chainLocators(currentTokens));
          return result.length < maxOutputSize;
        }
        for (const taken of tokens[index]) {
          currentTokens[index] = taken;
          if (!visit(index + 1))
            return false;
        }
        return true;
      };
      visit(0);
      return result;
    }
    function detectExact(text) {
      let exact = false;
      const match = text.match(/^\/(.*)\/([igm]*)$/);
      if (match)
        return { text: new RegExp(match[1], match[2]) };
      if (text.endsWith('"')) {
        text = JSON.parse(text);
        exact = true;
      } else if (text.endsWith('"s')) {
        text = JSON.parse(text.substring(0, text.length - 1));
        exact = true;
      } else if (text.endsWith('"i')) {
        text = JSON.parse(text.substring(0, text.length - 1));
        exact = false;
      }
      return { exact, text };
    }
    var JavaScriptLocatorFactory = class {
      constructor(preferredQuote) {
        this.preferredQuote = preferredQuote;
      }
      generateLocator(base, kind, body, options = {}) {
        switch (kind) {
          case "default":
            if (options.hasText !== void 0)
              return `locator(${this.quote(body)}, { hasText: ${this.toHasText(options.hasText)} })`;
            if (options.hasNotText !== void 0)
              return `locator(${this.quote(body)}, { hasNotText: ${this.toHasText(options.hasNotText)} })`;
            return `locator(${this.quote(body)})`;
          case "frame-locator":
            return `frameLocator(${this.quote(body)})`;
          case "frame":
            return `contentFrame()`;
          case "nth":
            return `nth(${body})`;
          case "first":
            return `first()`;
          case "last":
            return `last()`;
          case "visible":
            return `filter({ visible: ${body === "true" ? "true" : "false"} })`;
          case "role":
            const attrs = [];
            if (isRegExp(options.name)) {
              attrs.push(`name: ${this.regexToSourceString(options.name)}`);
            } else if (typeof options.name === "string") {
              attrs.push(`name: ${this.quote(options.name)}`);
              if (options.exact)
                attrs.push(`exact: true`);
            }
            for (const { name, value } of options.attrs)
              attrs.push(`${name}: ${typeof value === "string" ? this.quote(value) : value}`);
            const attrString = attrs.length ? `, { ${attrs.join(", ")} }` : "";
            return `getByRole(${this.quote(body)}${attrString})`;
          case "has-text":
            return `filter({ hasText: ${this.toHasText(body)} })`;
          case "has-not-text":
            return `filter({ hasNotText: ${this.toHasText(body)} })`;
          case "has":
            return `filter({ has: ${body} })`;
          case "hasNot":
            return `filter({ hasNot: ${body} })`;
          case "and":
            return `and(${body})`;
          case "or":
            return `or(${body})`;
          case "chain":
            return `locator(${body})`;
          case "test-id":
            return `getByTestId(${this.toTestIdValue(body)})`;
          case "text":
            return this.toCallWithExact("getByText", body, !!options.exact);
          case "alt":
            return this.toCallWithExact("getByAltText", body, !!options.exact);
          case "placeholder":
            return this.toCallWithExact("getByPlaceholder", body, !!options.exact);
          case "label":
            return this.toCallWithExact("getByLabel", body, !!options.exact);
          case "title":
            return this.toCallWithExact("getByTitle", body, !!options.exact);
          default:
            throw new Error("Unknown selector kind " + kind);
        }
      }
      chainLocators(locators) {
        return locators.join(".");
      }
      regexToSourceString(re) {
        return (0, import_stringUtils.normalizeEscapedRegexQuotes)(String(re));
      }
      toCallWithExact(method, body, exact) {
        if (isRegExp(body))
          return `${method}(${this.regexToSourceString(body)})`;
        return exact ? `${method}(${this.quote(body)}, { exact: true })` : `${method}(${this.quote(body)})`;
      }
      toHasText(body) {
        if (isRegExp(body))
          return this.regexToSourceString(body);
        return this.quote(body);
      }
      toTestIdValue(value) {
        if (isRegExp(value))
          return this.regexToSourceString(value);
        return this.quote(value);
      }
      quote(text) {
        return (0, import_stringUtils.escapeWithQuotes)(text, this.preferredQuote ?? "'");
      }
    };
    var PythonLocatorFactory = class {
      generateLocator(base, kind, body, options = {}) {
        switch (kind) {
          case "default":
            if (options.hasText !== void 0)
              return `locator(${this.quote(body)}, has_text=${this.toHasText(options.hasText)})`;
            if (options.hasNotText !== void 0)
              return `locator(${this.quote(body)}, has_not_text=${this.toHasText(options.hasNotText)})`;
            return `locator(${this.quote(body)})`;
          case "frame-locator":
            return `frame_locator(${this.quote(body)})`;
          case "frame":
            return `content_frame`;
          case "nth":
            return `nth(${body})`;
          case "first":
            return `first`;
          case "last":
            return `last`;
          case "visible":
            return `filter(visible=${body === "true" ? "True" : "False"})`;
          case "role":
            const attrs = [];
            if (isRegExp(options.name)) {
              attrs.push(`name=${this.regexToString(options.name)}`);
            } else if (typeof options.name === "string") {
              attrs.push(`name=${this.quote(options.name)}`);
              if (options.exact)
                attrs.push(`exact=True`);
            }
            for (const { name, value } of options.attrs) {
              let valueString = typeof value === "string" ? this.quote(value) : value;
              if (typeof value === "boolean")
                valueString = value ? "True" : "False";
              attrs.push(`${(0, import_stringUtils.toSnakeCase)(name)}=${valueString}`);
            }
            const attrString = attrs.length ? `, ${attrs.join(", ")}` : "";
            return `get_by_role(${this.quote(body)}${attrString})`;
          case "has-text":
            return `filter(has_text=${this.toHasText(body)})`;
          case "has-not-text":
            return `filter(has_not_text=${this.toHasText(body)})`;
          case "has":
            return `filter(has=${body})`;
          case "hasNot":
            return `filter(has_not=${body})`;
          case "and":
            return `and_(${body})`;
          case "or":
            return `or_(${body})`;
          case "chain":
            return `locator(${body})`;
          case "test-id":
            return `get_by_test_id(${this.toTestIdValue(body)})`;
          case "text":
            return this.toCallWithExact("get_by_text", body, !!options.exact);
          case "alt":
            return this.toCallWithExact("get_by_alt_text", body, !!options.exact);
          case "placeholder":
            return this.toCallWithExact("get_by_placeholder", body, !!options.exact);
          case "label":
            return this.toCallWithExact("get_by_label", body, !!options.exact);
          case "title":
            return this.toCallWithExact("get_by_title", body, !!options.exact);
          default:
            throw new Error("Unknown selector kind " + kind);
        }
      }
      chainLocators(locators) {
        return locators.join(".");
      }
      regexToString(body) {
        const suffix = body.flags.includes("i") ? ", re.IGNORECASE" : "";
        return `re.compile(r"${(0, import_stringUtils.normalizeEscapedRegexQuotes)(body.source).replace(/\\\//, "/").replace(/"/g, '\\"')}"${suffix})`;
      }
      toCallWithExact(method, body, exact) {
        if (isRegExp(body))
          return `${method}(${this.regexToString(body)})`;
        if (exact)
          return `${method}(${this.quote(body)}, exact=True)`;
        return `${method}(${this.quote(body)})`;
      }
      toHasText(body) {
        if (isRegExp(body))
          return this.regexToString(body);
        return `${this.quote(body)}`;
      }
      toTestIdValue(value) {
        if (isRegExp(value))
          return this.regexToString(value);
        return this.quote(value);
      }
      quote(text) {
        return (0, import_stringUtils.escapeWithQuotes)(text, '"');
      }
    };
    var JavaLocatorFactory = class {
      generateLocator(base, kind, body, options = {}) {
        let clazz;
        switch (base) {
          case "page":
            clazz = "Page";
            break;
          case "frame-locator":
            clazz = "FrameLocator";
            break;
          case "locator":
            clazz = "Locator";
            break;
        }
        switch (kind) {
          case "default":
            if (options.hasText !== void 0)
              return `locator(${this.quote(body)}, new ${clazz}.LocatorOptions().setHasText(${this.toHasText(options.hasText)}))`;
            if (options.hasNotText !== void 0)
              return `locator(${this.quote(body)}, new ${clazz}.LocatorOptions().setHasNotText(${this.toHasText(options.hasNotText)}))`;
            return `locator(${this.quote(body)})`;
          case "frame-locator":
            return `frameLocator(${this.quote(body)})`;
          case "frame":
            return `contentFrame()`;
          case "nth":
            return `nth(${body})`;
          case "first":
            return `first()`;
          case "last":
            return `last()`;
          case "visible":
            return `filter(new ${clazz}.FilterOptions().setVisible(${body === "true" ? "true" : "false"}))`;
          case "role":
            const attrs = [];
            if (isRegExp(options.name)) {
              attrs.push(`.setName(${this.regexToString(options.name)})`);
            } else if (typeof options.name === "string") {
              attrs.push(`.setName(${this.quote(options.name)})`);
              if (options.exact)
                attrs.push(`.setExact(true)`);
            }
            for (const { name, value } of options.attrs)
              attrs.push(`.set${(0, import_stringUtils.toTitleCase)(name)}(${typeof value === "string" ? this.quote(value) : value})`);
            const attrString = attrs.length ? `, new ${clazz}.GetByRoleOptions()${attrs.join("")}` : "";
            return `getByRole(AriaRole.${(0, import_stringUtils.toSnakeCase)(body).toUpperCase()}${attrString})`;
          case "has-text":
            return `filter(new ${clazz}.FilterOptions().setHasText(${this.toHasText(body)}))`;
          case "has-not-text":
            return `filter(new ${clazz}.FilterOptions().setHasNotText(${this.toHasText(body)}))`;
          case "has":
            return `filter(new ${clazz}.FilterOptions().setHas(${body}))`;
          case "hasNot":
            return `filter(new ${clazz}.FilterOptions().setHasNot(${body}))`;
          case "and":
            return `and(${body})`;
          case "or":
            return `or(${body})`;
          case "chain":
            return `locator(${body})`;
          case "test-id":
            return `getByTestId(${this.toTestIdValue(body)})`;
          case "text":
            return this.toCallWithExact(clazz, "getByText", body, !!options.exact);
          case "alt":
            return this.toCallWithExact(clazz, "getByAltText", body, !!options.exact);
          case "placeholder":
            return this.toCallWithExact(clazz, "getByPlaceholder", body, !!options.exact);
          case "label":
            return this.toCallWithExact(clazz, "getByLabel", body, !!options.exact);
          case "title":
            return this.toCallWithExact(clazz, "getByTitle", body, !!options.exact);
          default:
            throw new Error("Unknown selector kind " + kind);
        }
      }
      chainLocators(locators) {
        return locators.join(".");
      }
      regexToString(body) {
        const suffix = body.flags.includes("i") ? ", Pattern.CASE_INSENSITIVE" : "";
        return `Pattern.compile(${this.quote((0, import_stringUtils.normalizeEscapedRegexQuotes)(body.source))}${suffix})`;
      }
      toCallWithExact(clazz, method, body, exact) {
        if (isRegExp(body))
          return `${method}(${this.regexToString(body)})`;
        if (exact)
          return `${method}(${this.quote(body)}, new ${clazz}.${(0, import_stringUtils.toTitleCase)(method)}Options().setExact(true))`;
        return `${method}(${this.quote(body)})`;
      }
      toHasText(body) {
        if (isRegExp(body))
          return this.regexToString(body);
        return this.quote(body);
      }
      toTestIdValue(value) {
        if (isRegExp(value))
          return this.regexToString(value);
        return this.quote(value);
      }
      quote(text) {
        return (0, import_stringUtils.escapeWithQuotes)(text, '"');
      }
    };
    var CSharpLocatorFactory = class {
      generateLocator(base, kind, body, options = {}) {
        switch (kind) {
          case "default":
            if (options.hasText !== void 0)
              return `Locator(${this.quote(body)}, new() { ${this.toHasText(options.hasText)} })`;
            if (options.hasNotText !== void 0)
              return `Locator(${this.quote(body)}, new() { ${this.toHasNotText(options.hasNotText)} })`;
            return `Locator(${this.quote(body)})`;
          case "frame-locator":
            return `FrameLocator(${this.quote(body)})`;
          case "frame":
            return `ContentFrame`;
          case "nth":
            return `Nth(${body})`;
          case "first":
            return `First`;
          case "last":
            return `Last`;
          case "visible":
            return `Filter(new() { Visible = ${body === "true" ? "true" : "false"} })`;
          case "role":
            const attrs = [];
            if (isRegExp(options.name)) {
              attrs.push(`NameRegex = ${this.regexToString(options.name)}`);
            } else if (typeof options.name === "string") {
              attrs.push(`Name = ${this.quote(options.name)}`);
              if (options.exact)
                attrs.push(`Exact = true`);
            }
            for (const { name, value } of options.attrs)
              attrs.push(`${(0, import_stringUtils.toTitleCase)(name)} = ${typeof value === "string" ? this.quote(value) : value}`);
            const attrString = attrs.length ? `, new() { ${attrs.join(", ")} }` : "";
            return `GetByRole(AriaRole.${(0, import_stringUtils.toTitleCase)(body)}${attrString})`;
          case "has-text":
            return `Filter(new() { ${this.toHasText(body)} })`;
          case "has-not-text":
            return `Filter(new() { ${this.toHasNotText(body)} })`;
          case "has":
            return `Filter(new() { Has = ${body} })`;
          case "hasNot":
            return `Filter(new() { HasNot = ${body} })`;
          case "and":
            return `And(${body})`;
          case "or":
            return `Or(${body})`;
          case "chain":
            return `Locator(${body})`;
          case "test-id":
            return `GetByTestId(${this.toTestIdValue(body)})`;
          case "text":
            return this.toCallWithExact("GetByText", body, !!options.exact);
          case "alt":
            return this.toCallWithExact("GetByAltText", body, !!options.exact);
          case "placeholder":
            return this.toCallWithExact("GetByPlaceholder", body, !!options.exact);
          case "label":
            return this.toCallWithExact("GetByLabel", body, !!options.exact);
          case "title":
            return this.toCallWithExact("GetByTitle", body, !!options.exact);
          default:
            throw new Error("Unknown selector kind " + kind);
        }
      }
      chainLocators(locators) {
        return locators.join(".");
      }
      regexToString(body) {
        const suffix = body.flags.includes("i") ? ", RegexOptions.IgnoreCase" : "";
        return `new Regex(${this.quote((0, import_stringUtils.normalizeEscapedRegexQuotes)(body.source))}${suffix})`;
      }
      toCallWithExact(method, body, exact) {
        if (isRegExp(body))
          return `${method}(${this.regexToString(body)})`;
        if (exact)
          return `${method}(${this.quote(body)}, new() { Exact = true })`;
        return `${method}(${this.quote(body)})`;
      }
      toHasText(body) {
        if (isRegExp(body))
          return `HasTextRegex = ${this.regexToString(body)}`;
        return `HasText = ${this.quote(body)}`;
      }
      toTestIdValue(value) {
        if (isRegExp(value))
          return this.regexToString(value);
        return this.quote(value);
      }
      toHasNotText(body) {
        if (isRegExp(body))
          return `HasNotTextRegex = ${this.regexToString(body)}`;
        return `HasNotText = ${this.quote(body)}`;
      }
      quote(text) {
        return (0, import_stringUtils.escapeWithQuotes)(text, '"');
      }
    };
    var JsonlLocatorFactory = class {
      generateLocator(base, kind, body, options = {}) {
        return JSON.stringify({
          kind,
          body,
          options
        });
      }
      chainLocators(locators) {
        const objects = locators.map((l) => JSON.parse(l));
        for (let i = 0; i < objects.length - 1; ++i)
          objects[i].next = objects[i + 1];
        return JSON.stringify(objects[0]);
      }
    };
    var generators = {
      javascript: JavaScriptLocatorFactory,
      python: PythonLocatorFactory,
      java: JavaLocatorFactory,
      csharp: CSharpLocatorFactory,
      jsonl: JsonlLocatorFactory
    };
    function isRegExp(obj) {
      return obj instanceof RegExp;
    }
  }
});

// node_modules/playwright-core/lib/utils/isomorphic/locatorParser.js
var require_locatorParser = __commonJS({
  "node_modules/playwright-core/lib/utils/isomorphic/locatorParser.js"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var locatorParser_exports = {};
    __export(locatorParser_exports, {
      locatorOrSelectorAsSelector: () => locatorOrSelectorAsSelector,
      unsafeLocatorOrSelectorAsSelector: () => unsafeLocatorOrSelectorAsSelector2
    });
    module.exports = __toCommonJS(locatorParser_exports);
    var import_locatorGenerators = require_locatorGenerators();
    var import_selectorParser2 = require_selectorParser();
    var import_stringUtils = require_stringUtils();
    function parseLocator(locator, testIdAttributeName) {
      locator = locator.replace(/AriaRole\s*\.\s*([\w]+)/g, (_, group) => group.toLowerCase()).replace(/(get_by_role|getByRole)\s*\(\s*(?:["'`])([^'"`]+)['"`]/g, (_, group1, group2) => `${group1}(${group2.toLowerCase()}`);
      const params = [];
      let template = "";
      for (let i = 0; i < locator.length; ++i) {
        const quote = locator[i];
        if (quote !== '"' && quote !== "'" && quote !== "`" && quote !== "/") {
          template += quote;
          continue;
        }
        const isRegexEscaping = locator[i - 1] === "r" || locator[i] === "/";
        ++i;
        let text = "";
        while (i < locator.length) {
          if (locator[i] === "\\") {
            if (isRegexEscaping) {
              if (locator[i + 1] !== quote)
                text += locator[i];
              ++i;
              text += locator[i];
            } else {
              ++i;
              if (locator[i] === "n")
                text += "\n";
              else if (locator[i] === "r")
                text += "\r";
              else if (locator[i] === "t")
                text += "	";
              else
                text += locator[i];
            }
            ++i;
            continue;
          }
          if (locator[i] !== quote) {
            text += locator[i++];
            continue;
          }
          break;
        }
        params.push({ quote, text });
        template += (quote === "/" ? "r" : "") + "$" + params.length;
      }
      template = template.toLowerCase().replace(/get_by_alt_text/g, "getbyalttext").replace(/get_by_test_id/g, "getbytestid").replace(/get_by_([\w]+)/g, "getby$1").replace(/has_not_text/g, "hasnottext").replace(/has_text/g, "hastext").replace(/has_not/g, "hasnot").replace(/frame_locator/g, "framelocator").replace(/content_frame/g, "contentframe").replace(/[{}\s]/g, "").replace(/new\(\)/g, "").replace(/new[\w]+\.[\w]+options\(\)/g, "").replace(/\.set/g, ",set").replace(/\.or_\(/g, "or(").replace(/\.and_\(/g, "and(").replace(/:/g, "=").replace(/,re\.ignorecase/g, "i").replace(/,pattern.case_insensitive/g, "i").replace(/,regexoptions.ignorecase/g, "i").replace(/re.compile\(([^)]+)\)/g, "$1").replace(/pattern.compile\(([^)]+)\)/g, "r$1").replace(/newregex\(([^)]+)\)/g, "r$1").replace(/string=/g, "=").replace(/regex=/g, "=").replace(/,,/g, ",").replace(/,\)/g, ")");
      const preferredQuote = params.map((p) => p.quote).filter((quote) => "'\"`".includes(quote))[0];
      return { selector: transform(template, params, testIdAttributeName), preferredQuote };
    }
    function countParams(template) {
      return [...template.matchAll(/\$\d+/g)].length;
    }
    function shiftParams(template, sub) {
      return template.replace(/\$(\d+)/g, (_, ordinal) => `$${ordinal - sub}`);
    }
    function transform(template, params, testIdAttributeName) {
      while (true) {
        const hasMatch = template.match(/filter\(,?(has=|hasnot=|sethas\(|sethasnot\()/);
        if (!hasMatch)
          break;
        const start = hasMatch.index + hasMatch[0].length;
        let balance = 0;
        let end = start;
        for (; end < template.length; end++) {
          if (template[end] === "(")
            balance++;
          else if (template[end] === ")")
            balance--;
          if (balance < 0)
            break;
        }
        let prefix = template.substring(0, start);
        let extraSymbol = 0;
        if (["sethas(", "sethasnot("].includes(hasMatch[1])) {
          extraSymbol = 1;
          prefix = prefix.replace(/sethas\($/, "has=").replace(/sethasnot\($/, "hasnot=");
        }
        const paramsCountBeforeHas = countParams(template.substring(0, start));
        const hasTemplate = shiftParams(template.substring(start, end), paramsCountBeforeHas);
        const paramsCountInHas = countParams(hasTemplate);
        const hasParams = params.slice(paramsCountBeforeHas, paramsCountBeforeHas + paramsCountInHas);
        const hasSelector = JSON.stringify(transform(hasTemplate, hasParams, testIdAttributeName));
        template = prefix.replace(/=$/, "2=") + `$${paramsCountBeforeHas + 1}` + shiftParams(template.substring(end + extraSymbol), paramsCountInHas - 1);
        const paramsBeforeHas = params.slice(0, paramsCountBeforeHas);
        const paramsAfterHas = params.slice(paramsCountBeforeHas + paramsCountInHas);
        params = paramsBeforeHas.concat([{ quote: '"', text: hasSelector }]).concat(paramsAfterHas);
      }
      template = template.replace(/\,set([\w]+)\(([^)]+)\)/g, (_, group1, group2) => "," + group1.toLowerCase() + "=" + group2.toLowerCase()).replace(/framelocator\(([^)]+)\)/g, "$1.internal:control=enter-frame").replace(/contentframe(\(\))?/g, "internal:control=enter-frame").replace(/locator\(([^)]+),hastext=([^),]+)\)/g, "locator($1).internal:has-text=$2").replace(/locator\(([^)]+),hasnottext=([^),]+)\)/g, "locator($1).internal:has-not-text=$2").replace(/locator\(([^)]+),hastext=([^),]+)\)/g, "locator($1).internal:has-text=$2").replace(/locator\(([^)]+)\)/g, "$1").replace(/getbyrole\(([^)]+)\)/g, "internal:role=$1").replace(/getbytext\(([^)]+)\)/g, "internal:text=$1").replace(/getbylabel\(([^)]+)\)/g, "internal:label=$1").replace(/getbytestid\(([^)]+)\)/g, `internal:testid=[${testIdAttributeName}=$1]`).replace(/getby(placeholder|alt|title)(?:text)?\(([^)]+)\)/g, "internal:attr=[$1=$2]").replace(/first(\(\))?/g, "nth=0").replace(/last(\(\))?/g, "nth=-1").replace(/nth\(([^)]+)\)/g, "nth=$1").replace(/filter\(,?visible=true\)/g, "visible=true").replace(/filter\(,?visible=false\)/g, "visible=false").replace(/filter\(,?hastext=([^)]+)\)/g, "internal:has-text=$1").replace(/filter\(,?hasnottext=([^)]+)\)/g, "internal:has-not-text=$1").replace(/filter\(,?has2=([^)]+)\)/g, "internal:has=$1").replace(/filter\(,?hasnot2=([^)]+)\)/g, "internal:has-not=$1").replace(/,exact=false/g, "").replace(/,exact=true/g, "s").replace(/,includehidden=/g, ",include-hidden=").replace(/\,/g, "][");
      const parts = template.split(".");
      for (let index = 0; index < parts.length - 1; index++) {
        if (parts[index] === "internal:control=enter-frame" && parts[index + 1].startsWith("nth=")) {
          const [nth] = parts.splice(index, 1);
          parts.splice(index + 1, 0, nth);
        }
      }
      return parts.map((t) => {
        if (!t.startsWith("internal:") || t === "internal:control")
          return t.replace(/\$(\d+)/g, (_, ordinal) => {
            const param = params[+ordinal - 1];
            return param.text;
          });
        t = t.includes("[") ? t.replace(/\]/, "") + "]" : t;
        t = t.replace(/(?:r)\$(\d+)(i)?/g, (_, ordinal, suffix) => {
          const param = params[+ordinal - 1];
          if (t.startsWith("internal:attr") || t.startsWith("internal:testid") || t.startsWith("internal:role"))
            return (0, import_stringUtils.escapeForAttributeSelector)(new RegExp(param.text), false) + (suffix || "");
          return (0, import_stringUtils.escapeForTextSelector)(new RegExp(param.text, suffix), false);
        }).replace(/\$(\d+)(i|s)?/g, (_, ordinal, suffix) => {
          const param = params[+ordinal - 1];
          if (t.startsWith("internal:has=") || t.startsWith("internal:has-not="))
            return param.text;
          if (t.startsWith("internal:testid"))
            return (0, import_stringUtils.escapeForAttributeSelector)(param.text, true);
          if (t.startsWith("internal:attr") || t.startsWith("internal:role"))
            return (0, import_stringUtils.escapeForAttributeSelector)(param.text, suffix === "s");
          return (0, import_stringUtils.escapeForTextSelector)(param.text, suffix === "s");
        });
        return t;
      }).join(" >> ");
    }
    function locatorOrSelectorAsSelector(language, locator, testIdAttributeName) {
      try {
        return unsafeLocatorOrSelectorAsSelector2(language, locator, testIdAttributeName);
      } catch (e) {
        return "";
      }
    }
    function unsafeLocatorOrSelectorAsSelector2(language, locator, testIdAttributeName) {
      try {
        (0, import_selectorParser2.parseSelector)(locator);
        return locator;
      } catch (e) {
      }
      const { selector, preferredQuote } = parseLocator(locator, testIdAttributeName);
      const locators = (0, import_locatorGenerators.asLocators)(language, selector, void 0, void 0, preferredQuote);
      const digest = digestForComparison(language, locator);
      if (locators.some((candidate) => digestForComparison(language, candidate) === digest))
        return selector;
      return "";
    }
    function digestForComparison(language, locator) {
      locator = locator.replace(/\s/g, "");
      if (language === "javascript")
        locator = locator.replace(/\\?["`]/g, "'").replace(/,{}/g, "");
      return locator;
    }
  }
});

// <stdin>
var import_locatorParser = __toESM(require_locatorParser());
var import_selectorParser = __toESM(require_selectorParser());
var export_parseSelector = import_selectorParser.parseSelector;
var export_splitSelectorByFrame = import_selectorParser.splitSelectorByFrame;
var export_stringifySelector = import_selectorParser.stringifySelector;
var export_unsafeLocatorOrSelectorAsSelector = import_locatorParser.unsafeLocatorOrSelectorAsSelector;
export {
  export_parseSelector as parseSelector,
  export_splitSelectorByFrame as splitSelectorByFrame,
  export_stringifySelector as stringifySelector,
  export_unsafeLocatorOrSelectorAsSelector as unsafeLocatorOrSelectorAsSelector
};
