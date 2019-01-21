'use strict';

const cliSpinners = require('cli-spinners');
const ora = require('ora');
const colors = require('colors/safe');


class OutputService {

  constructor() {
    this.TYPE_INFO = 'info';
    this.TYPE_WARN = 'warn';
    this.TYPE_ERROR = 'error';
  }

  print({str, type}) {

    let output = '';

    switch(type) {
      case this.TYPE_WARN:
        output = 'warn: ';
        break;
      case this.TYPE_ERROR:
        output = 'error: ';
        break;
      default:
        output = '';
        break;
    }

    output += str;



    console.log(output);



//    console.log(output);
    //
    // spinner.color = 'yellow';
    // spinner.text = output;
  }

  printWithLoading({str, type}) {
   if (!this.spinner) {
      this.spinner = ora({spinner: cliSpinners.dots});
      this.spinner.start();
   }

   this.spinner.text = str;
  }

  hideLoading(params) {
    let str = '';
    let type = this.TYPE_INFO;

    if (params) {
      if ('str' in params) {
        str = params.str;
      }
      if ('type' in params) {
        type = params.type;
      }
    }

    if (this.spinner) {
      switch(type) {
        case this.TYPE_WARN:
          this.spinner.warn();
          console.log(colors.yellow(str));
          break;
        case this.TYPE_ERROR:
          this.spinner.fail(this.spinner.text + ' ' + colors.red(str));
          break;
        default:
          this.spinner.succeed();
          break;
      }
      this.spinner = undefined;
    }
  }

}

module.exports = OutputService;