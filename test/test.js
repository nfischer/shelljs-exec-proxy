/* globals describe, it, before, afterEach */
const shell = require('../index');
const origShell = require('shelljs');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const cmdArrayAttr = require('../common').cmdArrayAttr;
require('should');

function assertShellStringEqual(a, b) {
  a.stdout.should.equal(b.stdout);
  a.stderr.should.equal(b.stderr);
  a.code.should.equal(b.code);
}

// returns true if on Unix
function unix() {
  return process.platform !== 'win32';
}

describe('proxy', () => {
  let delVarName;
  before(() => {
    // Configure shell variables so that we can use basic commands for testing
    // without using the ShellJS builtin
    shell.env.del = unix() ? 'rm' : 'del';
    delVarName = unix() ? '$del' : '%del%';
    shell.env.output = 'echo';
    shell.config.silent = true;
  });

  afterEach(() => {
    shell.rm('-f', '*.txt');
  });

  it('appropriately handles inspect() and valueOf()', () => {
    assert.strictEqual(shell.inspect, origShell.inspect);
    assert.strictEqual(shell.valueOf, origShell.valueOf);

    const oldInspect = shell.inspect;
    shell.inspect = () => 'foo';
    shell.inspect().should.equal('foo');
    if ('inspect' in shell)
      shell.inspect = oldInspect;
    else
      delete shell.inspect;

    const oldValueOf = shell.valueOf;
    shell.valueOf = () => 'bar';
    shell.valueOf().should.equal('bar');
    if ('valueOf' in shell)
      shell.valueOf = oldValueOf;
    else
      delete shell.valueOf;
  });

  it('returns appropriate keys', () => {
    Object.keys(shell).should.deepEqual(Object.keys(origShell));
  });

  it('does not override existing commands', () => {
    ('ls' in origShell).should.equal(true);
    ('ls' in shell).should.equal(true);
    (typeof shell.ls).should.equal('function');
  });

  it('does not mess up non-command properties', () => {
    ('env' in origShell).should.equal(true);
    ('env' in shell).should.equal(true);
    (typeof shell.env).should.equal('object');
    (typeof shell.env.PATH).should.equal('string');
  });

  it('does not allow overriding reserved attributes', () => {
    assert.throws(() => {
      shell[cmdArrayAttr] = 'foo';
    }, Error);
  });

  it('does not allow deleting reserved attributes', () => {
    assert.throws(() => {
      delete shell[cmdArrayAttr];
    }, Error);
  });

  it("doesn't claim to have properties that don't exist in target", () => {
    ('foobar' in origShell).should.equal(false);
    ('foobar' in shell).should.equal(false);
  });

  it('allows adding new attributes', () => {
    shell.hasOwnProperty('version').should.equal(false);
    shell.version = 'Proxy';
    shell.version.should.equal('Proxy');
    delete shell.version;
    shell.hasOwnProperty('version').should.equal(false);
  });

  describe('commands', () => {
    it.skip('runs tr', () => {
      if (shell.which('tr')) {
        shell.ShellString('hello world').to('file.txt');
        const ret1 = shell.cat('file.txt').tr('-d', 'l');
        const ret2 = shell.cat('file.txt').exec('tr -d "l"');
        assertShellStringEqual(ret1, ret2);
        ret2.stdout.should.equal('heo word');
        ret2.stderr.should.equal('');
        ret2.code.should.equal(0);
      } else {
        console.log('skipping test');
      }
    });

    it('runs whoami', () => {
      if (shell.which('whoami')) {
        const ret1 = shell.whoami();
        const ret2 = shell.exec('whoami');
        assertShellStringEqual(ret1, ret2);
      } else {
        console.log('skipping test');
      }
    });

    it('runs wc', () => {
      if (shell.which('wc')) {
        const fname = 'file.txt';
        shell.ShellString('This is a file\nthat has 2 lines\n').to(fname);
        const ret1 = shell.wc(fname);
        const ret2 = shell.exec(`wc ${fname}`);
        assertShellStringEqual(ret1, ret2);
      } else {
        console.log('skipping test');
      }
    });

    it('runs du', () => {
      if (shell.which('du')) {
        const fname = 'file.txt';
        shell.touch(fname);
        const ret1 = shell.du(fname);
        const ret2 = shell.exec(`du ${fname}`);
        assertShellStringEqual(ret1, ret2);
        // Don't assert the file size, since that may be OS dependent.
        // Note: newline should be '\n', because we're checking a JS string, not
        // something from the file system.
        ret1.stdout.should.endWith(`\t${fname}\n`);
      } else {
        console.log('skipping test');
      }
    });

    it('runs rmdir', () => {
      if (shell.which('rmdir')) {
        const dirName = 'sub';
        shell.mkdir(dirName);
        const ret1 = shell.rmdir(dirName);
        ret1.stdout.should.equal('');
        ret1.stderr.should.equal('');
        ret1.code.should.equal(0);
        fs.existsSync(dirName).should.equal(false);
      } else {
        console.log('skipping test');
      }
    });

    it('runs true', () => {
      if (shell.which('true')) {
        const ret1 = shell.true();
        const ret2 = shell.exec('true');
        assertShellStringEqual(ret1, ret2);
      } else {
        console.log('skipping test');
      }
    });

    it('runs printf', (done) => {
      if (shell.which('printf')) {
        const ret1 = shell.printf('first second third').to('file1.txt');
        shell.cat('file1.txt').toString().should.equal('first second third');
        const ret2 = shell.printf('first second third').to('file2.txt');
        shell.cat('file2.txt').toString().should.equal('first second third');
        assertShellStringEqual(ret1, ret2);
      } else {
        console.log('skipping test');
      }
      done();
    });

    it('runs garbage commands', (done) => {
      const randCmd = 'alsdkfjlaskdfjlaskjdffksjdf';
      assert.ok(!shell.which(randCmd)); // don't run anything real!
      shell[randCmd]().code.should.not.equal(0);
      done();
    });

    it('handles ShellStrings as arguments', (done) => {
      shell.touch('file.txt');
      fs.existsSync('file.txt').should.equal(true);
      shell[delVarName](shell.ShellString('file.txt'));
      // TODO(nfischer): this fails on Windows
      fs.existsSync('file.txt').should.equal(false);
      done();
    });
  });

  describe('subcommands', () => {
    it('can use subcommands', (done) => {
      const ret = shell.git.status();
      ret.code.should.equal(0);
      ret.stderr.should.equal('');
      done();
    });

    it('can use subcommands with options', (done) => {
      fs.existsSync('package.json').should.equal(true);

      // dont' actually remove this file, but do a dry run
      const ret = shell.git.rm('-qrnf', 'package.json');
      ret.code.should.equal(0);
      ret.stdout.should.equal('');
      ret.stderr.should.equal('');
      done();
    });

    it('runs very long subcommand chains', (done) => {
      const fun = (unix() ? shell.$output : shell['%output%']);
      const ret = fun.one.two.three.four.five.six('seven');
      // Note: newline should be '\n', because we're checking a JS string, not
      // something from the file system.
      ret.stdout.should.equal('one two three four five six seven\n');
      ret.stderr.should.equal('');
      ret.code.should.equal(0);
      done();
    });
  });

  describe('security', () => {
    it('handles unsafe filenames', (done) => {
      const fa = 'a.txt';
      const fb = 'b.txt';
      const fname = `${fa};${fb}`;
      shell.exec('echo hello world').to(fa);
      shell.exec('echo hello world').to(fb);
      shell.exec('echo hello world').to(fname);

      shell[delVarName](fname);
      // TODO(nfischer): this line fails on Windows
      fs.existsSync(fname).should.equal(false);
      shell.cat(fa).toString().should.equal(`hello world${os.EOL}`);

      // These files are still ok
      fs.existsSync(fa).should.equal(true);
      fs.existsSync(fb).should.equal(true);
      done();
    });

    it('avoids globs', (done) => {
      const fa = 'a.txt';
      const fglob = '*.txt';
      shell.exec('echo hello world').to(fa);
      shell.exec('echo hello world').to(fglob);

      shell[delVarName](fglob);
      // TODO(nfischer): this line fails on Windows
      fs.existsSync(fglob).should.equal(false);
      shell.cat(fa).toString().should.equal(`hello world${os.EOL}`);

      // These files are still ok
      fs.existsSync(fa).should.equal(true);
      done();
    });

    it('escapes quotes', (done) => {
      if (unix()) {
        const fquote = 'thisHas"Quotes.txt';
        shell.exec('echo hello world').to(fquote);
        fs.existsSync(fquote).should.equal(true);
        shell[delVarName](fquote);
        fs.existsSync(fquote).should.equal(false);
        done();
      } else {
        // Windows doesn't support `"` as a character in a filename, see
        // https://msdn.microsoft.com/en-us/library/windows/desktop/aa365247(v=vs.85).aspx
        console.log('skipping test');
      }
    });
  });
});
