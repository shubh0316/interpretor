class Environment {
  constructor(record = {}, parent = null) {
    this.record = record;
    this.parent = parent;
  }

  /**
   * Creates a variable with the given name and value.
   */
  define(name, value) {
    this.record[name] = value;
    return value;
  }

  /**
   * Updates an existing variable.
   */
  assign(name, value) {
    this.resolve(name).record[name] = value;
    return value;
  }

  /**
   * Returns the value of a defined variable, or throws
   * if the variable is not defined.
   */
  lookup(name) {
    return this.resolve(name).record[name];
  }

  /**
   * Returns specific environment in which a variable is defined, or
   * throws if a variable is not defined.
   */
  resolve(name) {
    //variable exists in this env
    if (this.record.hasOwnProperty(name)) {
      return this;
    }

    //global env with null parent
    if (this.parent == null) {
      throw new ReferenceError(`Variable ${name} not defined`);
    }
    return this.parent.resolve(name);
  }
}

module.exports = Environment;
