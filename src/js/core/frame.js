'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mergeDataFrame = exports.default = undefined;

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _immutable = require('immutable');

var _immutable2 = _interopRequireDefault(_immutable);

var _exceptions = require('./exceptions');

var _series = require('./series');

var _series2 = _interopRequireDefault(_series);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Parse an array of data [{k1: v1, k2: v2}, ... ] into an Immutable.Map
 *
 * @param {Array} array
 * @param {List} index
 * @returns {Map<string, List>}
 */
var parseArrayToSeriesMap = function parseArrayToSeriesMap(array, index) {
  var dataMap = {};

  array.forEach(function (el) {
    if ((typeof el === 'undefined' ? 'undefined' : (0, _typeof3.default)(el)) === 'object') {
      Object.keys(el).forEach(function (k) {
        if (k in dataMap) {
          dataMap[k] = dataMap[k].push(el[k]);
        } else {
          dataMap[k] = _immutable2.default.List.of(el[k]);
        }
      });
    }
  });

  Object.keys(dataMap).forEach(function (k) {
    dataMap[k] = new _series2.default(dataMap[k], { name: k, index: index });
  });

  return _immutable2.default.Map(dataMap);
};

var DataFrame = function () {
  /**
   * Two-dimensional size-mutable, potentially heterogeneous tabular data
   * structure with labeled axes (rows and columns). Arithmetic operations
   * align on both row and column labels. Can be thought of as a Immutable.Map-like
   * container for Series objects. The primary pandas data structure
   *
   * * @param data {Array|Object}
   *    Data to be stored in DataFrame
   * @param {Object} kwargs
   *    Extra optional arguments for a DataFrame
   * @param {Array|Object} [kwargs.index]
   */
  function DataFrame(data) {
    var _this = this;

    var kwargs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    (0, _classCallCheck3.default)(this, DataFrame);

    if (Array.isArray(data)) {
      this._index = (0, _utils.parseIndex)(kwargs.index, _immutable2.default.List(data));
      this._data = parseArrayToSeriesMap(data, this._index);
      this._columns = this._data.keySeq();
    } else if (data instanceof _immutable2.default.Map) {
      data.keySeq().forEach(function (k) {
        if (!(data.get(k) instanceof _series2.default)) throw new Error('Map must have Series as values');
        data.set(k, data.get(k).copy());
      });
      this._data = data;
      this._columns = data.keySeq();
      this._index = data.get(data.keySeq().get(0)).index;
    } else if (typeof data === 'undefined') {
      this._data = _immutable2.default.Map({});
      this._columns = _immutable2.default.Seq.of();
      this._index = _immutable2.default.List.of();
    }

    this._values = _immutable2.default.List(this._columns.map(function (k) {
      return _this._data.get(k).values;
    }));
  }

  (0, _createClass3.default)(DataFrame, [{
    key: 'toString',
    value: function toString() {
      var _this2 = this;

      var string = '\t|';
      this.columns.forEach(function (k) {
        string += '  ' + k + '  |';
      });
      var headerRow = '-'.repeat(string.length);

      string += '\n' + headerRow + '\n';

      var stringUpdate = function stringUpdate(idx) {
        var s = '';
        _this2.columns.forEach(function (k) {
          s += '  ' + _this2._data.get(k).iloc(idx) + '  |';
        });
        return s;
      };

      for (var idx = 0; idx < this.length; idx += 1) {
        string += this.index.get(idx) + '\t|';
        string += stringUpdate(idx);
        string += '\n';
      }

      return string;
    }

    /**
     * @returns {DataFrame}
     */

  }, {
    key: 'copy',
    value: function copy() {
      return new DataFrame(this._data, { index: this.index });
    }
  }, {
    key: 'kwargs',
    value: function kwargs() {
      this.kwargs = {
        index: this.index
      };
    }
  }, {
    key: Symbol.iterator,
    value: function value() {
      var _this3 = this;

      var index = -1;

      return {
        next: function next() {
          index += 1;
          var row = {};
          _this3.columns.forEach(function (k) {
            row[k] = _this3._data.get(k).iloc(index);
          });
          return {
            value: new DataFrame([row], { name: _this3.name }),
            done: !(index >= 0 && index < _this3.length) };
        }
      };
    }
  }, {
    key: 'iterrows',
    value: function iterrows() {
      return (0, _utils.enumerate)(this);
    }

    /**
     * Immutable.List of Immutable.List, with [row][column] indexing
     *
     * @returns {List.<List>}
     */

  }, {
    key: 'columnExists',
    value: function columnExists(col) {
      return this._columns.indexOf(col) >= 0;
    }
  }, {
    key: 'get',
    value: function get(columns) {
      if (typeof columns === 'string' && this.columnExists(columns)) return this._data.get(columns);
      throw new Error('KeyError: ' + columns + ' not found');
    }
  }, {
    key: 'filter',
    value: function filter() {
      throw new Error('not implemented');
    }

    /**
     * Merge this DataFrame with another DataFrame, optionally on some set of columns
     *
     * @param {DataFrame} df
     * @param {Array} on
     * @param {string} how='inner'
     *
     * @returns {DataFrame}
     */

  }, {
    key: 'merge',
    value: function merge(df, on) {
      var how = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'inner';

      return mergeDataFrame(this, df, on, how);
    }
  }, {
    key: 'to_csv',
    value: function to_csv() {
      var _this4 = this;

      var csvString = '';
      this.columns.forEach(function (k) {
        csvString += k + ',';
      });
      csvString += '\r\n';

      var updateString = function updateString(idx) {
        var s = '';
        _this4.columns.forEach(function (k) {
          s += _this4.get(k).iloc(idx) + ',';
        });
        return s;
      };
      for (var idx = 0; idx < this.length; idx += 1) {
        csvString += updateString(idx);
        csvString += '\r\n';
      }

      return csvString;
    }
  }, {
    key: 'sum',
    value: function sum() {
      var _this5 = this;

      var axis = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

      if (axis === 0) {
        return new _series2.default(this.columns.toArray().map(function (k) {
          return _this5.get(k).sum();
        }), { index: this.columns.toArray() });
      } else if (axis === 1) {
        return new _series2.default(_immutable2.default.Range(0, this.length).map(function (idx) {
          return _this5.columns.toArray().reduce(function (s, k) {
            return s + _this5.get(k).iloc(idx);
          }, 0);
        }).toList(), { index: this.index });
      }

      throw new _exceptions.InvalidAxisError();
    }
  }, {
    key: 'mean',
    value: function mean() {
      var _this6 = this;

      var axis = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

      if (axis === 0) {
        return new _series2.default(this.columns.toArray().map(function (k) {
          return _this6.get(k).mean();
        }), { index: this.columns.toArray() });
      } else if (axis === 1) {
        return new _series2.default(_immutable2.default.Range(0, this.length).map(function (idx) {
          return _this6.columns.toArray().reduce(function (s, k) {
            return s + _this6.get(k).iloc(idx) / _this6.columns.size;
          }, 0);
        }).toList(), { index: this.index });
      }

      throw new _exceptions.InvalidAxisError();
    }
  }, {
    key: 'std',
    value: function std() {
      var _this7 = this;

      var axis = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

      if (axis === 0) {
        return new _series2.default(this.columns.toArray().map(function (k) {
          return _this7.get(k).std();
        }), { index: this.columns.toArray() });
      } else if (axis === 1) {
        var variances = this.variance(axis);
        return new _series2.default(variances.values.map(function (v) {
          return Math.sqrt(v);
        }), { index: this.index });
      }

      throw new _exceptions.InvalidAxisError();
    }
  }, {
    key: 'variance',
    value: function variance() {
      var _this8 = this;

      var axis = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

      if (axis === 0) {
        return new _series2.default(this.columns.toArray().map(function (k) {
          return _this8.get(k).variance();
        }), { index: this.columns.toArray() });
      } else if (axis === 1) {
        var _ret = function () {
          var means = _this8.mean(axis).values;
          return {
            v: new _series2.default(_immutable2.default.Range(0, _this8.length).map(function (idx) {
              return _this8.columns.toArray().reduce(function (s, k) {
                var diff = _this8.get(k).iloc(idx) - means.get(idx);
                return s + diff * diff / (_this8.columns.size - 1);
              }, 0);
            }).toArray(), { index: _this8.index })
          };
        }();

        if ((typeof _ret === 'undefined' ? 'undefined' : (0, _typeof3.default)(_ret)) === "object") return _ret.v;
      }

      throw new _exceptions.InvalidAxisError();
    }

    /**
     *
     * @param periods=1
     * @param axis=0
     * @returns {DataFrame}
     */

  }, {
    key: 'pct_change',
    value: function pct_change() {
      var _this9 = this;

      var periods = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
      var axis = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

      if (typeof periods !== 'number' || !Number.isInteger(periods)) throw new Error('periods must be an integer');
      if (periods <= 0) throw new Error('periods must be positive');

      if (axis === 0) {
        var _ret2 = function () {
          var data = _immutable2.default.Map.of();
          _this9._columns.forEach(function (k) {
            data = data.set(k, _this9._data.get(k).pct_change(periods));
          });
          return {
            v: new DataFrame(data, { index: _this9.index })
          };
        }();

        if ((typeof _ret2 === 'undefined' ? 'undefined' : (0, _typeof3.default)(_ret2)) === "object") return _ret2.v;
      } else if (axis === 1) {
        throw new Error('Not implemented');
      }

      throw new _exceptions.InvalidAxisError();
    }
  }, {
    key: 'values',
    get: function get() {
      return this._values;
    }

    /**
     * Returns the indexed Immutable.Seq of columns
     *
     * @returns {Seq.Indexed<string>}
     */

  }, {
    key: 'columns',
    get: function get() {
      return this._columns;
    },
    set: function set(columns) {
      var _this10 = this;

      if (!Array.isArray(columns) || columns.length !== this.columns.size) throw new Error('Columns must be array of same dimension');

      var nextData = {};
      columns.forEach(function (k, idx) {
        var prevColumn = _this10.columns.get(idx);
        var prevSeries = _this10.get(prevColumn);

        prevSeries.name = k;
        nextData[k] = prevSeries;
      });

      this._data = _immutable2.default.Map(nextData);
      this._columns = _immutable2.default.Seq(columns);
    }

    /**
     * @returns {List}
     */

  }, {
    key: 'index',
    get: function get() {
      return this._index;
    },
    set: function set(index) {
      this._index = (0, _utils.parseIndex)(index, this._data.get(this._columns.get(0)).values);
    }
  }, {
    key: 'length',
    get: function get() {
      var _this11 = this;

      return Math.max.apply(Math, (0, _toConsumableArray3.default)(this._data.keySeq().map(function (k) {
        return _this11.get(k).length;
      }).toArray()));
    }
  }]);
  return DataFrame;
}();

/**
 * Perform an inner merge of two DataFrames
 *
 * @param {DataFrame} df1
 * @param {DataFrame} df2
 * @param {Array} on
 *
 * @returns {DataFrame}
 */


exports.default = DataFrame;
var innerMerge = function innerMerge(df1, df2, on) {
  var data = [];

  var cols1 = (0, _utils.nonMergeColumns)(df1.columns, on);
  var cols2 = (0, _utils.nonMergeColumns)(df2.columns, on);

  var intersectCols = (0, _utils.intersectingColumns)(cols1, cols2);
  intersectCols.count(); // Cache intersectCols size

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    var _loop = function _loop() {
      var _step$value = (0, _slicedToArray3.default)(_step.value, 2),
          row1 = _step$value[0],
          _1 = _step$value[1];

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        var _loop2 = function _loop2() {
          var _step2$value = (0, _slicedToArray3.default)(_step2.value, 2),
              row2 = _step2$value[0],
              _2 = _step2$value[1];

          var match = true;
          var _iteratorNormalCompletion3 = true;
          var _didIteratorError3 = false;
          var _iteratorError3 = undefined;

          try {
            for (var _iterator3 = on[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
              var c = _step3.value;

              if (row1.get(c).iloc(0) !== row2.get(c).iloc(0)) {
                match = false;
                break;
              }
            }
          } catch (err) {
            _didIteratorError3 = true;
            _iteratorError3 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion3 && _iterator3.return) {
                _iterator3.return();
              }
            } finally {
              if (_didIteratorError3) {
                throw _iteratorError3;
              }
            }
          }

          if (match) {
            (function () {
              var rowData = {};

              on.forEach(function (k) {
                rowData[k] = row1.get(k).iloc(0);
              });

              cols1.forEach(function (k) {
                var nextColName = intersectCols.size > 0 && intersectCols.indexOf(k) >= 0 ? k + '_x' : k;
                rowData[nextColName] = row1.get(k).iloc(0);
              });

              cols2.forEach(function (k) {
                var nextColName = intersectCols.size > 0 && intersectCols.indexOf(k) >= 0 ? k + '_y' : k;
                rowData[nextColName] = row2.get(k).iloc(0);
              });

              data.push(rowData);
            })();
          }
        };

        for (var _iterator2 = df2.iterrows()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          _loop2();
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }
    };

    for (var _iterator = df1.iterrows()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      _loop();
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return new DataFrame(data);
};

/**
 * Perform an outer merge of two DataFrames
 *
 * @param {DataFrame} df1
 * @param {DataFrame} df2
 * @param {Array} on
 *
 * @returns {DataFrame}
 */
var outerMerge = function outerMerge(df1, df2, on) {
  var data = [];

  var cols1 = (0, _utils.nonMergeColumns)(df1.columns, on);
  var cols2 = (0, _utils.nonMergeColumns)(df2.columns, on);

  var intersectCols = (0, _utils.intersectingColumns)(cols1, cols2);
  intersectCols.count(); // Cache intersectCols size

  var matched1 = new Array(df1.length).fill(false);
  var matched2 = new Array(df2.length).fill(false);

  var _iteratorNormalCompletion4 = true;
  var _didIteratorError4 = false;
  var _iteratorError4 = undefined;

  try {
    var _loop3 = function _loop3() {
      var _step4$value = (0, _slicedToArray3.default)(_step4.value, 2),
          row1 = _step4$value[0],
          idx_1 = _step4$value[1];

      var _iteratorNormalCompletion5 = true;
      var _didIteratorError5 = false;
      var _iteratorError5 = undefined;

      try {
        var _loop4 = function _loop4() {
          var _step5$value = (0, _slicedToArray3.default)(_step5.value, 2),
              row2 = _step5$value[0],
              idx_2 = _step5$value[1];

          var match = true;
          var _iteratorNormalCompletion6 = true;
          var _didIteratorError6 = false;
          var _iteratorError6 = undefined;

          try {
            for (var _iterator6 = on[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
              var c = _step6.value;

              if (row1.get(c).iloc(0) !== row2.get(c).iloc(0)) {
                match = false;
                break;
              }
            }
          } catch (err) {
            _didIteratorError6 = true;
            _iteratorError6 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion6 && _iterator6.return) {
                _iterator6.return();
              }
            } finally {
              if (_didIteratorError6) {
                throw _iteratorError6;
              }
            }
          }

          var rowData = {};

          on.forEach(function (k) {
            rowData[k] = row1.get(k).iloc(0);
          });

          cols1.forEach(function (k) {
            var nextColName = intersectCols.size > 0 && intersectCols.indexOf(k) >= 0 ? k + '_x' : k;
            rowData[nextColName] = row1.get(k).iloc(0);
          });

          if (match) {
            cols2.forEach(function (k) {
              var nextColName = intersectCols.size > 0 && intersectCols.indexOf(k) >= 0 ? k + '_y' : k;
              rowData[nextColName] = row2.get(k).iloc(0);
            });
            data.push(rowData);
            matched1[idx_1] = true;
            matched2[idx_2] = true;
          }
        };

        for (var _iterator5 = df2.iterrows()[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
          _loop4();
        }
      } catch (err) {
        _didIteratorError5 = true;
        _iteratorError5 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion5 && _iterator5.return) {
            _iterator5.return();
          }
        } finally {
          if (_didIteratorError5) {
            throw _iteratorError5;
          }
        }
      }
    };

    for (var _iterator4 = df1.iterrows()[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
      _loop3();
    }
  } catch (err) {
    _didIteratorError4 = true;
    _iteratorError4 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion4 && _iterator4.return) {
        _iterator4.return();
      }
    } finally {
      if (_didIteratorError4) {
        throw _iteratorError4;
      }
    }
  }

  matched1.forEach(function (m, idx) {
    if (!m) {
      (function () {
        var rowData = {};
        on.forEach(function (k) {
          rowData[k] = df1.get(k).iloc(idx);
        });

        cols1.forEach(function (k) {
          var nextColName = intersectCols.size > 0 && intersectCols.indexOf(k) >= 0 ? k + '_x' : k;
          rowData[nextColName] = df1.get(k).iloc(idx);
        });

        cols2.forEach(function (k) {
          var nextColName = intersectCols.size > 0 && intersectCols.indexOf(k) >= 0 ? k + '_y' : k;
          rowData[nextColName] = null;
        });
        data.push(rowData);
      })();
    }
  });

  matched2.forEach(function (m, idx) {
    if (!m) {
      (function () {
        var rowData = {};
        on.forEach(function (k) {
          rowData[k] = df2.get(k).iloc(idx);
        });

        cols1.forEach(function (k) {
          var nextColName = intersectCols.size > 0 && intersectCols.indexOf(k) >= 0 ? k + '_x' : k;
          rowData[nextColName] = null;
        });

        cols2.forEach(function (k) {
          var nextColName = intersectCols.size > 0 && intersectCols.indexOf(k) >= 0 ? k + '_y' : k;
          rowData[nextColName] = df2.get(k).iloc(idx);
        });
        data.push(rowData);
      })();
    }
  });

  return new DataFrame(data);
};

/**
 * Perform a merge of two DataFrames
 *
 * @param {DataFrame} df1
 * @param {DataFrame} df2
 * @param {Array} on
 * @param {string} how='inner'
 *
 * @returns {DataFrame}
 */
var mergeDataFrame = exports.mergeDataFrame = function mergeDataFrame(df1, df2, on) {
  var how = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'inner';

  var mergeOn = void 0;
  if (typeof on === 'undefined') {
    mergeOn = df1.columns.filter(function (c1) {
      return df2.columns.filter(function (c2) {
        return c1 === c2;
      }).size > 0;
    });
    if (mergeOn.size === 0) throw new Error('No common keys');
  } else {
    on.forEach(function (col) {
      if (!df1.columnExists(col) || !df2.columnExists(col)) throw new Error('KeyError: ' + col + ' not found');
    });
    mergeOn = on;
  }

  switch (how) {
    case 'inner':
      return innerMerge(df1, df2, mergeOn);
    case 'outer':
      return outerMerge(df1, df2, mergeOn);
    default:
      throw new Error('MergeError: ' + how + ' not a supported merge type');
  }
};
