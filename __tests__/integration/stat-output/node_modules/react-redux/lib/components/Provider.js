"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard");

exports.__esModule = true;
exports["default"] = void 0;

var _react = _interopRequireWildcard(require("react"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _Context = require("./Context");

var _Subscription = _interopRequireDefault(require("../utils/Subscription"));

function Provider(_ref) {
  var store = _ref.store,
      context = _ref.context,
      children = _ref.children;
  var contextValue = (0, _react.useMemo)(function () {
    var subscription = new _Subscription["default"](store);
    subscription.onStateChange = subscription.notifyNestedSubs;
    return {
      store: store,
      subscription: subscription
    };
  }, [store]);
  var previousState = (0, _react.useMemo)(function () {
    return store.getState();
  }, [store]);
  (0, _react.useEffect)(function () {
    var subscription = contextValue.subscription;
    subscription.trySubscribe();

    if (previousState !== store.getState()) {
      subscription.notifyNestedSubs();
    }

    return function () {
      subscription.tryUnsubscribe();
      subscription.onStateChange = null;
    };
  }, [contextValue, previousState]);
  var Context = context || _Context.ReactReduxContext;
  return _react["default"].createElement(Context.Provider, {
    value: contextValue
  }, children);
}

Provider.propTypes = {
  store: _propTypes["default"].shape({
    subscribe: _propTypes["default"].func.isRequired,
    dispatch: _propTypes["default"].func.isRequired,
    getState: _propTypes["default"].func.isRequired
  }),
  context: _propTypes["default"].object,
  children: _propTypes["default"].any
};
var _default = Provider;
exports["default"] = _default;