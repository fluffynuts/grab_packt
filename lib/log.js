const _ = require('./lodash-min')

function rawWrite(s) {
  process.stdout.write(s);
}

const colors = {
  white: 37,
  green: 32,
  red: 31,
  yellow: 33,
  blue: 34,
  purple: 35,
  teal: 36,
  whiteOnRed: 41
},
colorValues = _.values(colors)

var
  logToEventLog = false,
  eventLogger = null;
function enableEventLog(sourceName) {
  try {
    var EventLogger = require('node-windows').EventLogger
    eventLogger = new EventLogger(sourceName)
  } catch (e) {
    console.log('Event logging bootstrap fails: ', e)
  }
}

function isColor(val) {
  return colorValues.indexOf(val) > -1;
}

function startColor(arguments) {
  const args = Array.prototype.slice.apply(arguments)
  let offset = 0;
  if (args.length > 1 &&
      isColor(args[0])) {
    offset = 1;
    rawWrite('\x1B[' + args[0] + 'm');
  }
  return args.slice(offset)
}

function writeLine() {
  const toLog = startColor(arguments);
  console.log.apply(console, toLog);
  resetConsoleColors();
  if (eventLogger) {
    eventLogger.info(toLog.join(' '));
  }
}

function writeColor() {
  const otherArgs = startColor(arguments);
  rawWrite.apply(null, otherArgs);
  resetConsoleColors();
}

function resetConsoleColors() {
  rawWrite('\x1B[0m');
}

module.exports = {
  colors: colors,
  write: rawWrite,
  writeColor: writeColor,
  resetConsoleColors: resetConsoleColors,
  writeLine: writeLine,
  enableEventLog: enableEventLog
};