/**
 * A pandas.Series one-dimensional array with axis labels, with an Immutable.List instead of
 * numpy.ndarray as the values
 */

import { autobind } from 'core-decorators';
import Immutable from 'immutable';

import { enumerate, sum, parseIndex } from './utils';
import { DType, arrayToDType } from './dtype';


export default class Series {
  /**
   * One dimensional array with axis labels
   *
   * Operations between Series (+, -, /, *, **) align values based on their associated index values
   *
   * @param data {Array|List}
   *    Data to be stored in Series
   * @param {Object} kwargs
   *    Extra optional arguments for a Series
   * @param {string} [kwargs.name='']
   *    The _name to assign to the Series
   * @param {Array|List} [kwargs.index]
   */
  constructor(data = null, kwargs = {}) {
    if (Array.isArray(data)) {
      this._values = Immutable.List(data);
      this._dtype = arrayToDType(data);
    } else if (data instanceof Immutable.List) {
      this._values = data;
      this._dtype = arrayToDType(data);
    } else {
      this._values = Immutable.List.of(data);
    }

    this.name = typeof kwargs.name !== 'undefined' ? kwargs.name : '';

    this._index = parseIndex(kwargs.index, this.values);
  }

  [Symbol.iterator]() {
    const values = this.values;
    let index = -1;

    return {
      next: () => {
        index += 1;
        return {value: values.get(index), done: !(index >= 0 && index < values.size)};
      },
    };
  }

  map(func) {
    const array = [];
    for (const [val, idx] of enumerate(this)) { array.push(func(val, idx)); }

    return new Series(array);
  }

  toString() {
    const vals = this.iloc(0, 10).values;

    let valString = '';
    vals.forEach((v, idx) => {
      valString += `${this.index.get(idx)}\t${v}\n`;
    });

    return `${valString}Name: ${this.name}, dtype: ${this.dtype}`;
  }

  copy() {
    return new Series(this.values, {index: this.index, name: this.name});
  }

  get kwargs() {
    return {
      name: this.name,
      index: this._index,
    };
  }

  get dtype() {
    return this._dtype;
  }

  /**
   * @returns {List}
   */
  get index() {
    return this._index;
  }

  set index(index) {
    this._index = parseIndex(index, this.values);
  }

  get length() {
    return this.values.size;
  }

  get values() {
    return this._values;
  }

  /**
   * Convert the series to the desired type
   *
   * @param {DType} nextType
   */
  astype(nextType) {
    if (!(nextType instanceof DType))
      throw new Error('Next type must be a DType');

    if (nextType.dtype === this.dtype)
      return this;

    switch (nextType.dtype) {
      case 'int': {
        if (this.dtype.dtype === 'object') throw new Error('Cannot convert object to int');
        const kwargs = {name: this.name, index: this.index};
        return new Series(this.values.map(v => Math.floor(v)), kwargs);
      }
      case 'float': {
        if (this.dtype.dtype === 'object') throw new Error('Cannot convert object to float');
        this._dtype = new DType('float');
        return this;
      }
      default:
        throw new Error(`Invalid dtype ${nextType}`);
    }
  }

  /**
   * Return the Series between [startVal, endVal), or at startVal if endVal is undefined
   *
   * @param {int} startVal
   * @param {int} [endVal]
   *
   * @returns {Series|number|string}
   */
  iloc(startVal, endVal) {
    if (typeof endVal === 'undefined')
      return this.values.get(startVal);

    const { name } = this.kwargs;
    const index = this.index.slice(startVal, endVal);

    return new Series(this.values.slice(startVal, endVal), {name, index});
  }

  sum() {
    return sum(this.values);
  }

  mean() {
    return this.sum() / this.length;
  }

  variance() {
    const mean = this.mean();

    return this.values.reduce((s, v) => {
      const diff = v - mean;
      return s + ((diff * diff) / (this.length - 1));
    }, 0);
  }

  std() {
    return Math.sqrt(this.variance());
  }

  /**
   * Add another Iterable, Series, or number to the Series
   * @param {Iterable|Series|number} val
   *
   * @returns {Series}
   */
  plus(val) {
    if (typeof val === 'number')
      return new Series(this.values.map(v => v + val));
    else if (val instanceof Series)
      return new Series(this.values.map((v, idx) => v + val.values.get(idx)));
    else if (Array.isArray(val))
      return new Series(this.values.map((v, idx) => v + val[idx]));
    else if (val instanceof Immutable.List)
      return new Series(this.values.map((v, idx) => v + val.get(idx)));

    throw new Error('plus only supports numbers, Arrays, Immutable List and pandas.Series');
  }

  /**
   * Subtract another Iterable, Series, or number from the Series
   *
   * @param {Iterable|Series|number} val
   *
   * @returns {Series}
   */
  minus(val) {
    if (typeof val === 'number')
      return new Series(this.values.map(v => v - val));
    else if (val instanceof Series)
      return new Series(this.values.map((v, idx) => v - val.values.get(idx)));
    else if (Array.isArray(val))
      return new Series(this.values.map((v, idx) => v - val[idx]));
    else if (val instanceof Immutable.List)
      return new Series(this.values.map((v, idx) => v - val.get(idx)));

    throw new Error('minus only supports numbers, Arrays, Immutable List and pandas.Series');
  }

  /**
   * Multiply by another Iterable, Series, or number
   *
   * @param {Iterable|Series|number} val
   *
   * @returns {Series}
   */
  times(val) {
    if (typeof val === 'number')
      return new Series(this.values.map(v => v * val));
    else if (val instanceof Series)
      return new Series(this.values.map((v, idx) => v * val.values.get(idx)));
    else if (Array.isArray(val))
      return new Series(this.values.map((v, idx) => v * val[idx]));
    else if (val instanceof Immutable.List)
      return new Series(this.values.map((v, idx) => v * val.get(idx)));

    throw new Error('times only supports numbers, Arrays, Immutable List and pandas.Series');
  }

  /**
   * Divide by another Iterable, Series, or number
   *
   * @param {Iterable|Series|number} val
   *
   * @returns {Series}
   */
  dividedBy(val) {
    if (typeof val === 'number')
      return new Series(this.values.map(v => v / val));
    else if (val instanceof Series)
      return new Series(this.values.map((v, idx) => v / val.values.get(idx)));
    else if (Array.isArray(val))
      return new Series(this.values.map((v, idx) => v / val[idx]));
    else if (val instanceof Immutable.List)
      return new Series(this.values.map((v, idx) => v / val.get(idx)));

    throw new Error('dividedBy only supports numbers, Arrays, Immutable List and pandas.Series');
  }

  /**
   * Return the percentage change over a given number of periods
   *
   * @param {number} periods
   * @returns {Series}
   */
  pct_change(periods = 1) {
    if (typeof periods !== 'number' || !Number.isInteger(periods))
      throw new Error('periods must be an integer');
    if (periods <= 0)
      throw new Error('periods must be positive');

    return new Series(
      Immutable.Repeat(null, periods).toList().concat(
        Immutable.Range(periods, this.length).map(idx =>
        (this.values.get(idx) / this.values.get(idx - periods)) - 1).toList()),
      {index: this.index, name: this.name});
  }

  @autobind
  _sort_ascending(valueA, valueB) {
    const valA = this.iloc(valueA);
    const valB = this.iloc(valueB);

    if (valA < valB) return -1;
    else if (valA > valB) return 1;
    return 0;
  }

  @autobind
  _sort_descending(valueA, valueB) {
    const valA = this.iloc(valueA);
    const valB = this.iloc(valueB);

    if (valA > valB) return -1;
    else if (valA < valB) return 1;
    return 0;
  }

  /**
   * @param {boolean} ascending
   *
   * @returns {Series}
   */
  sort_values(ascending = true) {
    const sortedIndex = ascending
      ? this.index.sort(this._sort_ascending)
      : this.index.sort(this._sort_descending);

    return new Series(sortedIndex.map(i => this.iloc(i)), {name: this.name, index: sortedIndex});
  }
}
