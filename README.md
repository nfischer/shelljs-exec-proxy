# ShellJS Exec Proxy

Unleash the power of limitless ShellJS commands... with ES6 Proxies!

Do you like [ShellJS](https://github.com/shelljs/shelljs), but wish it had your
favorite commands? Skip the weird `exec()` calls using `shelljs-exec-proxy`:

```javascript
// We want to run this git command:
// $ git commit -am "I'm updating the \"foo\" module to be more secure"
// Standard ShellJS requires the exec function, with confusing string escaping:
shell.exec('git commit -am "I\'m updating the \\"foo\\" module to be more secure"');
// Skip the extra string escaping with shelljs-exec-proxy!
shell.git.commit('-am', `I'm updating the "foo" module to be more secure`);
```

## Installation

**Important note:** This is only available for Node v6+ (it requires ES6
Proxies!)

```
$ npm install --save shelljs-exec-proxy
```

## Convenience

Get that JavaScript feel, back in your code:

```javascript
shell.git.status();
shell.git.add('.');
shell.git.commit('-am', 'Fixed issue #1');
shell.git.push('origin', 'master');
```

## Security improvements

ShellJS v0.7 is vulnerable to command injection, wild cards, and string
escaping mistakes. Here's an insecure code snippet:

```javascript
shell.ls('dir/*.txt').forEach(file => {
  shell.exec('git add ' + file);
}
```

This leaves you vulnerable to files like:

| Example file name | Vulnerability |
|------------------ | ------------- |
| `File 1.txt` | this tries to add both `File` and `1.txt`, instead of just `File 1.txt` |
| `foo;rm -rf *` | This executes both `git add foo` and `rm -rf *`, unexpectedly deleting your files! |
| `ThisHas"quotes'.txt` | This tries running `git add ThisHas"quotes'.txt` producing a Bash syntax error |

`shelljs-exec-proxy` solves this:

```javascript
shell.ls('dir/*.txt').forEach(file => {
  shell.git.add(file);
}
```

| Example file name | Vulnerability fix |
|------------------ | ----------------- |
| `File 1.txt` | Filenames are automatically quoted, so spaces aren't an issue |
| `foo;rm -rf *` | Only one command runs at a time (semicolons are treated literally) and wild cards aren't expanded |
| `ThisHas"quotes'.txt` | Quotes are automatically escaped, so there are never any issues |
