const Environment = require("./Environment");
const Transformer = require("./transform/Transformer");
const evaParser = require("./parser/evaParser");
const assert = require("assert");

const fs = require("fs");
const { env } = require("process");

class Eva {
  /**
   * Creates an Eva instance with the global environment.
   */
  constructor(global = GlobalEnvironment) {
    this.global = global;
    this._transformer = new Transformer();
  }

  /**
   * Evaluates global code wrapping into a block.
   */
  evalGlobal(exp) {
    return this._evalBody(exp, this.global);
  }

  /**
   * Evaluates an expression in the given environment.
   */
  eval(exp, env = this.global) {
    if (this._isNumber(exp)) {
      return ~~exp;
    }

    if (this._isString(exp)) {
      return exp.slice(1, -1);
    }
    if (exp[0] === "begin") {
      const blockEnv = new Environment({}, env);
      return this._evalBlock(exp, blockEnv);
    }

    if (exp[0] === "var") {
      const [_, name, value] = exp;
      return env.define(name, this.eval(value));
    }
    if (this._isVariableName(exp)) return env.lookup(exp);

    if (exp[0] === "set") {
      const [_, name, value] = exp;
      return env.assign(name, this.eval(value, env));
    }

    if (exp[0] === "if") {
      const [_tag, condition, consequent, alternate] = exp;
      if (this.eval(condition, env)) {
        return this.eval(consequent, env);
      }
      return this.eval(alternate, env);
    }

    if (exp[0] === "while") {
      const [_tag, condition, body] = exp;
      let result;
      while (this.eval(condition, env)) {
        result = this.eval(body, env);
      }
      return result;
    }

    if (exp[0] === "def") {
      const [_tag, name, params, body] = exp;

      const fn = {
        params,
        body,
        env,
      };
      return env.define(name, fn);
    }

    if (exp[0] === "switch") {
      const ifExp = this._transformer.transformSwitchToIf(exp);
      return this.eval(ifExp, env);
    }

    if (exp[0] === "lambda") {
      const [_tag, params, body] = exp;

      return {
        params,
        body,
        env,
      };
    }

    if (Array.isArray(exp)) {
      const fn = this.eval(exp[0], env);

      const args = exp.slice(1).map((arg) => this.eval(arg, env));

      if (typeof fn === "function") {
        return fn(...args);
      }

      return this._callUserDefinedFunction(fn, args);
    }

    throw `Unimplemented: ${JSON.stringify(exp)}`;
  }

  _callUserDefinedFunction(fn, args) {
    const activationRecord = {};
    fn.params.forEach((param, index) => {
      activationRecord[param] = args[index];
    });
    const activationEnv = new Environment(activationRecord, fn.env);
    return this._evalBody(fn.body, activationEnv);
  }

  _evalBody(body, env) {
    if (body[0] === "begin") {
      return this._evalBlock(body, env);
    }
    return this.eval(body, env);
  }

  _evalBlock(block, env) {
    let result;
    const [_tag, ...expressions] = block;

    expressions.forEach((exp) => {
      result = this.eval(exp, env);
    });
    return result;
  }

  _isNumber(exp) {
    return typeof exp === "number";
  }

  _isString(exp) {
    return typeof exp === "string" && exp[0] === '"' && exp.slice(-1) === '"';
  }

  _isVariableName(exp) {
    return typeof exp === "string" && /^[+\-*/<>=a-zA-Z0-9_]+$/.test(exp);
  }
}

/**
 * Default Global Environment.
 */
const GlobalEnvironment = new Environment({
  null: null,

  true: true,
  false: false,

  VERSION: "0.1",

  "+"(op1, op2) {
    return op1 + op2;
  },

  "*"(op1, op2) {
    return op1 * op2;
  },

  "-"(op1, op2 = null) {
    if (op2 == null) {
      return -op1;
    }
    return op1 - op2;
  },

  "/"(op1, op2) {
    return op1 / op2;
  },

  ">"(op1, op2) {
    return op1 > op2;
  },

  "<"(op1, op2) {
    return op1 < op2;
  },

  ">="(op1, op2) {
    return op1 >= op2;
  },

  "<="(op1, op2) {
    return op1 <= op2;
  },

  "="(op1, op2) {
    return op1 === op2;
  },

  print(...args) {
    console.log(...args);
  },
});
const eva = new Eva();


module.exports = Eva;
