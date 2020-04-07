import {EventEmitter} from 'events';
import React, {Component, useState} from 'react';
import {render, Color, Box, Unmount, Static} from 'ink';
import {useEventEmitter} from './use-event-emitter';
import ansiEscapes from 'ansi-escapes';
import chalk from 'chalk';
import indent from 'indent-string';
const readline = require('readline');

// function BabelStatusOutput({babelErrors}: {babelErrors: Map<string, Error>}) {
//   return (
//     <Box flexDirection="column" paddingTop={1}>
//       <Box>
//         <Color bold underline>
//           Details: Babel
//         </Color>
//       </Box>
//       {Array.from(babelErrors.values()).map((err, i) => (
//         <Box key={i} paddingTop={1}>
//           {indent(err.toString(), 2)}
//         </Box>
//       ))}
//     </Box>
//   );
// }

// function TypeScriptWatchOutput({tscOutput}) {
//   return (
//     <Box flexDirection="column" paddingTop={1}>
//       <Box>
//         <Color bold red>
//           ERROR
//         </Color>{' '}
//         <Color bold underline>
//           TypeScript
//         </Color>
//       </Box>
//       <Box>{tscOutput}</Box>
//     </Box>
//   );
// }

// function LogsOutput({title, logs}) {
//   return (
//     <Box flexDirection="column" paddingTop={1}>
//       <Box paddingBottom={1}>
//         <Color bold underline>
//           {title}
//         </Color>
//       </Box>
//       {logs.length === 0
//         ? chalk.dim('  No output, yet.')
//         : logs.map((msg, i) => <Box key={i}>{msg}</Box>)}
//     </Box>
//   );
// }

// function StatusLine({key, title, state}: {key?: any; title: string; state: string}) {
//   const dotLength = 16 - title.length;
//   const dotStr = ''.padEnd(dotLength, '.');
//   let stateStr = state;
//   if (stateStr === 'READY' || stateStr === 'WATCHING') {
//     stateStr = chalk.green(state);
//   } else if (stateStr === 'RUNNING') {
//     stateStr = chalk.yellow(state);
//   } else if (stateStr === 'ERROR') {
//     stateStr = chalk.red(state);
//   }
//   return <Box key={key}>{`  ${title}${chalk.dim(dotStr)}[${stateStr}]`}</Box>;
// }

// function App({bus, registeredWorkers}) {
//   const [tscState, setTscState] = useState(null);
//   const [babelErrors, setBabelErrors] = useState(new Map());
//   const [serverLogs, setServerLogs] = useState([]);
//   const [consoleLogs, setConsoleLogs] = useState([]);
//   const hasTsc = !!tscState;

//   useEventEmitter(bus, 'TSC_RESET', () => {
//     process.stdout.write(ansiEscapes.clearTerminal);
//     setTscState('RUNNING');
//   });
//   useEventEmitter(bus, 'TSC_DONE', () => {
//     setTscState('WATCHING');
//   });
//   useEventEmitter(bus, 'TSC_ERROR', ({num}) => {
//     setTscState('ERROR');
//   });
//   useEventEmitter(bus, 'BABEL_ERROR', ({file, err}) => {
//     setBabelErrors((prevValue) => {
//       const newValue = new Map(prevValue);
//       newValue.set(file, err);
//       return newValue;
//     });
//   });
//   useEventEmitter(bus, 'BABEL_FINISH', ({file}) => {
//     setBabelErrors((prevValue) => {
//       const newValue = new Map(prevValue);
//       newValue.delete(file);
//       return newValue;
//     });
//   });
//   useEventEmitter(bus, 'CONSOLE', ({level, args}) => {
//     setConsoleLogs((prevValue) => prevValue.concat(`  [${level}] ${args.join(' ')}`));
//   });
//   useEventEmitter(bus, 'SERVER_RESPONSE', ({method, url, statusCode, processingTime}) => {
//     // const statusMsg = statusCode === 200 ? `${processingTime}ms` : statusCode;
//     setConsoleLogs((prevValue) => prevValue.concat(`  [${statusCode}] ${method} ${url}`));
//   });
//   useEventEmitter(bus, 'NEW_SESSION', () => {
//     setBabelErrors(new Map());
//     setConsoleLogs([]);
//     setServerLogs([]);
//   });

//   const showDetails = new Set();
//   if (babelErrors && babelErrors.size > 0) {
//     showDetails.add('BABEL');
//   }

//   return (
//     <>
//       {/* Status */}
//       <Box flexDirection="column">
//         <Box paddingBottom={1}>
//           <Color bold>{'☶ Snowpack'}</Color>
//         </Box>
//         <StatusLine title="Server" state="READY" />
//         {hasTsc && <StatusLine title="TypeScript" state={tscState} />}
//         {registeredWorkers.map((id, i) => (
//           <StatusLine key={i} title={id} state="READY" />
//         ))}
//       </Box>
//       {/* Babel Output */}
//       {showDetails.has('BABEL') && <BabelStatusOutput babelErrors={babelErrors} />}
//       {/* Console Output */}
//       {<LogsOutput title="Console" logs={consoleLogs} />}
//       {/* Server Output */}
//       {/* {!showDetails.has('TYPESCRIPT') && <LogsOutput title="Server Log" logs={serverLogs} />} */}
//       {/* TypeScript Output */}
//       {/* showDetails.has('TYPESCRIPT') && <TypeScriptWatchOutput tscOutput={tscOutput} /> */}
//     </>
//   );
// }

function getStateString(workerState) {
  if (workerState.state) {
    if (Array.isArray(workerState.state)) {
      return chalk[workerState.state[1]](workerState.state[0]);
    }
    return workerState.state;
  }
  if (workerState.done) {
    return workerState.error ? chalk.red('FAILED') : chalk.dim('DONE');
  }
  return chalk.dim('RUNNING');
}

const WORKER_BASE_STATE = {done: false, error: null, output: ''};

export function paint(bus: EventEmitter, registeredWorkers: string[]) {
  let consoleOutput = '';
  let hasBeenCleared = false;
  const allWorkerStates = {};

  for (const workerId of registeredWorkers) {
    allWorkerStates[workerId] = {...WORKER_BASE_STATE};
  }

  function repaint() {
    process.stdout.write(ansiEscapes.clearTerminal);
    process.stdout.write(`${chalk.bold('☶ Snowpack')}\n\n`);
    // Dashboard
    for (const workerId of registeredWorkers) {
      const workerState = allWorkerStates[workerId];
      const dotLength = 16 - workerId.length;
      const dots = ''.padEnd(dotLength, '.');
      const stateStr = getStateString(workerState);
      process.stdout.write(`  ${workerId}${chalk.dim(dots)}[${stateStr}]\n`);
    }
    process.stdout.write('\n');
    for (const workerId of registeredWorkers) {
      const workerState = allWorkerStates[workerId];
      if (workerState && workerState.output) {
        const chalkFn = Array.isArray(workerState.state) ? chalk[workerState.state[1]] : chalk;
        process.stdout.write(`${chalkFn.underline.bold('▼ ' + workerId)}\n\n`);
        process.stdout.write(
          workerState.output
            ? '  ' + workerState.output.trim().replace(/\n/gm, '\n  ')
            : hasBeenCleared
            ? chalk.dim('  Output cleared.')
            : chalk.dim('  No output, yet.'),
        );
        process.stdout.write('\n\n');
      }
    }
    if (consoleOutput) {
      process.stdout.write(`${chalk.underline.bold('▼ Console')}\n`);
      process.stdout.write(consoleOutput);
      process.stdout.write('\n\n');
    }
  }

  bus.on('WORKER_MSG', ({id, msg}) => {
    allWorkerStates[id].output += msg;
    repaint();
  });
  bus.on('WORKER_UPDATE', ({id, state}) => {
    allWorkerStates[id].state = state || allWorkerStates[id].state;
    repaint();
  });
  bus.on('WORKER_COMPLETE', ({id, error}) => {
    allWorkerStates[id].done = true;
    allWorkerStates[id].error = error;
    repaint();
  });
  bus.on('WORKER_RESET', ({id}) => {
    allWorkerStates[id] = {...WORKER_BASE_STATE};
    repaint();
  });
  bus.on('CONSOLE', ({level, args}) => {
    consoleOutput += `  [${level}] ${args.join(' ')}\n`;
    repaint();
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.on('line', (input) => {
    for (const workerId of registeredWorkers) {
      if (!allWorkerStates[workerId].done && !allWorkerStates[workerId].state) {
        allWorkerStates[workerId].output = '';
      }
    }
    hasBeenCleared = true;
    repaint();
  });

  // unmountDashboard = render(<App bus={bus} registeredWorkers={registeredWorkers} />).unmount;
}
