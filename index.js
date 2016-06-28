const origShell = require('shelljs');
const cmdArrayAttr = require('./common').cmdArrayAttr;

const proxyifyCmd = (t, ...cmdStart) => {
  // Create the target (or use the one passed in)
  t = t || function _t(...args) {
    // Wrap all the arguments in quotes
    const newArgs = cmdStart.
        concat(args).
        map(x => JSON.stringify(x));
    // Run this command in the shell
    return origShell.exec.call(this.stdout, newArgs.join(' '));
  };
  // Store the list of commands, in case we have a subcommand chain
  t[cmdArrayAttr] = cmdStart;

  // Create the handler
  const handler = {
    // Don't delete reserved attributes
    deleteProperty: (target, methodName) => {
      if (methodName === cmdArrayAttr)
        throw new Error(`Cannot delete reserved attribute '${methodName}'`);
      delete target[methodName];
    },

    // Don't override reserved attributes
    set: (target, methodName, value) => {
      if (methodName === cmdArrayAttr)
        throw new Error(`Cannot modify reserved attribute '${methodName}'`);
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
      return (methodName in target || noProxyifyList.includes(methodName)) ?
          target[methodName] :
          proxyifyCmd(null, ...target[cmdArrayAttr], methodName);
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
module.exports = proxyifyCmd(origShell);
