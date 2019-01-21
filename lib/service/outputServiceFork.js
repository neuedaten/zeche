'use strict';

class OutputServiceFork {

  constructor() {
    this.TYPE_INFO = 'info';
    this.TYPE_WARN = 'warn';
    this.TYPE_ERROR = 'error';
  }

  print(str, type = this.TYPE_INFO) {
    this.cb('print', {str, type});
  }

  printWithLoading(str, type = this.TYPE_INFO) {
    this.cb('printWithLoading', {str, type});
  }

  hideLoading(str = '', type = this.TYPE_INFO) {
    this.cb('hideLoading', {str, type});
  }

  setCallback(cb) {
    this.cb = cb;
  }

}

module.exports = OutputServiceFork;