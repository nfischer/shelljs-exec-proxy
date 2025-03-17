# ShellJS Exec Proxy

[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/nfischer/shelljs-exec-proxy/main.yml?style=flat-square&logo=github)](https://github.com/nfischer/shelljs-exec-proxy/actions/workflows/main.yml)
[![Codecov](https://img.shields.io/codecov/c/github/nfischer/shelljs-exec-proxy.svg?style=flat-square)](https://codecov.io/gh/nfischer/shelljs-exec-proxy)
[![npm](https://img.shields.io/npm/v/shelljs-exec-proxy.svg?style=flat-square)](https://www.npmjs.com/package/shelljs-exec-proxy)
[![npm downloads](https://img.shields.io/npm/dm/shelljs-exec-proxy.svg?style=flat-square)](https://www.npmjs.com/package/shelljs-exec-proxy)

Unleash the power of unlimited ShellJS commands... *with ES6 Proxies!*

Do you like [ShellJS](https://github.com/shelljs/shelljs), but wish it had your
favorite commands? Skip the weird `exec()` calls by using `shelljs-exec-proxy`:

```javascript
// Our goal: make a commit: `$ git commit -am "I'm updating the \"foo\" module to be more secure"`
// Standard ShellJS requires the exec function, with confusing string escaping:
shell.exec('git commit -am "I\'m updating the \\"foo\\" module to be more secure"');
// Skip the extra string escaping with shelljs-exec-proxy!
shell.git.commit('-am', `I'm updating the "foo" module to be more secure`);
```

## Installation

```
$ npm install --save shelljs-exec-proxy
```

## Get that JavaScript feeling back in your code

```javascript
const shell = require('shelljs-exec-proxy');
shell.git.status();
shell.git.add('.');
shell.git.commit('-am', 'Fixed issue #1');
shell.git.push('origin', 'main');
```

## Security improvements

Current versions of ShellJS export the `.exec()` method, which if not used
carefully, could introduce command injection Vulnerabilities to your module.
Here's an insecure code snippet:

```javascript
shell.ls('dir/*.txt').forEach(file => {
  shell.exec('git add ' + file);
}
```

This leaves you vulnerable to files like:

| Example file name | Unintended behavior |
|------------------ | ------------- |
| `File 1.txt` | This tries to add both `File` and `1.txt`, instead of `File 1.txt` |
| `foo;rm -rf *` | This executes both `git add foo` and `rm -rf *`, unexpectedly deleting your files! |
| `ThisHas"quotes'.txt` | This tries running `git add ThisHas"quotes'.txt`, producing a Bash syntax error |

`shelljs-exec-proxy` solves all these problems:

```javascript
shell.ls('dir/*.txt').forEach(file => {
  shell.git.add(file);
}
```

| Example file name | Behavior |
|------------------ | ------------ |
| `File 1.txt` | Arguments are automatically quoted, so spaces aren't an issue |
| `foo;rm -rf *` | Only one command runs at a time (semicolons are treated literally) and wildcards aren't expanded |
| `ThisHas"quotes'.txt` | Quote characters are automatically escaped for you, so there are never any issues |
