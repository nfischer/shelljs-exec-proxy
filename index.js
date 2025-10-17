const origShell = require('shelljs');
const { cmdArrayAttr } = require('./common');

const proxyifyCmd = (t, ...cmdStart) => {
  // Create the target (or use the one passed in)
  t = t || function _t(...args) {
    let newArgs = [];
    // The first segment of the command should not be wrapped in quotes
    newArgs.push(cmdStart[0]);

    // Wrap all subsequent arguments in quotes
    newArgs = newArgs
      .concat(cmdStart.slice(1))
      .concat(args);
    // Run this command in the shell with globbing temporarily disabled.
    // 'noglob' is part of ShellJS internals, but hopefully this will stay
    // around. We cannot achieve the same with `set('-f')` because we need to
    // know the previous state in order to reset globbing back the way it was.
    const oldGlob = origShell.config.noglob;
    try {
      origShell.config.noglob = true;
      return origShell.cmd.call(this.stdout, newArgs);
    } finally {
      origShell.config.noglob = oldGlob;
    }
  };
  // Store the list of commands, in case we have a subcommand chain
  t[cmdArrayAttr] = cmdStart;

  // Create the handler
  const handler = {
    // Don't delete reserved attributes
    deleteProperty: (target, methodName) => {
      if (methodName === cmdArrayAttr) {
        throw new Error(`Cannot delete reserved attribute '${methodName}'`);
      }
      delete target[methodName];
    },

    // Don't override reserved attributes
    set: (target, methodName, value) => {
      if (methodName === cmdArrayAttr) {
        throw new Error(`Cannot modify reserved attribute '${methodName}'`);
      }
      target[methodName] = value;
      return target[methodName];
    },

    // Always defer to `target`
    has: (target, methodName) => (methodName in target),
    ownKeys: (target) => Object.keys(target),

    // Prefer the existing attribute, otherwise return another Proxy
    get: (target, methodName) => {
      // Don't Proxy-ify these attributes, no matter what
      const noProxyifyList = ['inspect', 'valueOf'];

      // Return the attribute, either if it exists or if it's in the
      // `noProxyifyList`, otherwise return a new Proxy
      if (methodName in target || noProxyifyList.includes(methodName)) {
        return target[methodName];
      }
      return proxyifyCmd(null, ...target[cmdArrayAttr], methodName);
    },
  };

  // Each command and subcommand is a Proxy
  return new Proxy(t, handler);
};

// TODO(nate): put hooks in ShellString so that I can Proxy-ify it to allow new
// commands on the right hand side of pipes

// const OrigShellString = origShell.ShellString;
// // modify prototypes
// function ShellStringProxy(...args) {
//   return proxyifyCmd(new OrigShellString(...args));
// }
// origShell.ShellString = ShellStringProxy;

// export the modified shell
const proxifiedShell = proxyifyCmd(origShell);

// Allow access to native commands, bypassing ShellJS builtins. Useful for
// testing, but most usecases should prefer calling the proxifiedShell directly
// which prefers ShellJS builtins when available. Store this under an unusual
// name to limit the risk of name conflicts with real commands.
// eslint-disable-next-line no-underscore-dangle
proxifiedShell.__native = proxyifyCmd({});
module.exports = proxifiedShell;
