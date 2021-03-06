# Contributing to mountebank

Congratulations! You're here because you want to join the millions of open source developers
contributing to mountebank. The good news is contributing is an easy process. In fact, you can
make a difference without writing a single line of code. I am grateful for all of the following contributions:

* Submitting an issue, either through github or the [support page](http://www.mbtest.org/support)
* Comment on existing issues
* Answer questions in the [support forum](https://groups.google.com/forum/#!forum/mountebank-discuss)
* Letting me know that you're using mountebank and how you're using it. It's surprisingly hard to find
that out with open source projects, and provides healthy motivation. Feel free to email at
brandon.byars@gmail.com
* Writing about mountebank (bonus points if you link to the [home page](http://www.mbtest.org/))
* Creating a how-to video about mountebank
* Speaking about mountebank in conferences or meetups
* Telling your friends about mountebank
* Starring and forking the repo. Open source is a popularity contest, and the number of stars and forks matter.
* Convincing your company to let me announce that they're using mountebank, including letting me put their logo
on a web page (I will never announce a company's usage of mountebank without their express permission).
* Writing a client library that hides the REST API under a language-specific API
* Writing a build plugin for (maven, gradle, MSBuild, rake, gulp, etc)

Still want to write some code?  Great! You may want to keep the
[source documentation](https://mountebank.firebaseapp.com/)
handy, and you may want to review [the issues](https://github.com/bbyars/mountebank/issues).

I have two high level goals for community contributions. First, I'd like contributing to be as fun
as possible. Secondly, I'd like contributions to follow the design vision of mountebank.
Unfortunately, those two goals can conflict, especially when you're just getting started and
don't understand the design vision or coding standards. I hope this document helps, and feel free
to make a pull request to improve it!

## Designing mountebank

The code in mountebank is now a few years old, and maintaining consistency of design vision
is key to keeping the code maintainable. The following describe key concepts:

### API changes

I consider the REST API the public API from a semantic versioning standpoint, and I aspire never
to have to release a v2 of mountebank. In my opinion, the API is more important than the code
behind it; we can fix the code, but we can't change the API once it's been documented. Therefore,
expect more scrutiny for API changes, and don't be offended if I recommend some changes.

Before API changes can be released, the documentation and [contract page](http://www.mbtest.org/docs/api/contracts)
need to be updated.

### Protocol Agnosticism

Most of mountebank is protocol-agnostic, and I consider this a key design concern. In general, every file
outside fo the protocol folders (http, tcp, etc) should _not_ reference any of the request or response fields
(like http bodies). Instead, they should accept generic object structures and deal with them appropriately.
This includes much of the core logic in mountebank, including predicates, behaviors, and response resolution.
To help myself maintain that mentality, I often write unit tests that use a different request or response
structure than any of the existing protocols. This approach both makes it easier to add protocols in the future
and ensures that the logic will work for existing protocols.

I aim in a [future version](https://github.com/bbyars/mountebank/issues/174) to completely separate
the protocol implementations as separate plugins, making protocol extension as easy as pie.

### Aim for the broadest reach

Many development decisions implicitly frame a tradeoff between the developers of mountebank and the users.  Whenever I
recognize such a tradeoff, I always favor the users.  Here are a few examples, maybe you can think of more, or inform
me of ways to overcome these tradeoffs in a mutually agreeable manner:

* I stick to ES5 instead of ES6 to maintain compatibility with older versions of node
* The build and CI infrastructure is quite complex and a little slow, but I'd prefer that over releasing flaky software
* I aim for fairly comprehensive error handling with useful error messages to help users out
* Windows support can be painful at times, but it is a core platform for mountebank

## Coding mountebank

I've aimed to keep the code in mountebank as maintainable as possible, but like any old codebase
it has its share of warts. The following help to keep the code as clean as possible:

### Pull Requests

While all pull requests are welcome, the following make them easier to consume quickly:

* Smaller is better. If you have multiple changes to make, consider separate pull requests.
* Provide as much information as possible. Consider providing an example of how to use your change
in the pull request comments
* Provide tests for your change. See below for the different types of testing in mountebank
* Provide documentation for your change.

### Developer Workflow

The following steps will set up your development environment:

* `npm install`
* `npm install -g grunt-cli`
* `grunt airplane`

Note that running `./build` (Linux/Mac) or `build` (Windows) will run everything for you even without
an `npm install`, and is what CI uses. The `grunt airplane` command is what I use before committing.
You can also run `grunt`, which more accurately models what happens in CI, but there are some tests
that may pass or fail depending on your ISP. These tests that require network connectivity and verify
the correct behavior under DNS failures. If your ISP is kind enough to hijack the NXDOMAIN DNS response
in an attempt to allow you to conveniently peruse their advertising page, those tests will fail.

When you're ready to commit, do the following

* Look at your diffs! Many times accidental whitespace changes get included, adding noise
to what needs reviewing.
* Use a descriptive message explaining "why" instead of "what" if possible
* Include a link to the github issue in the commit message if appropriate

### JavaScript OO

Try to avoid using the `new` and `this` keyword, unless a third-party dependency requires it.  They
are poorly implemented (most JavaScript developers don't know what the `new` keyword does, and every
time I know it, I forget it 30 seconds later).  In a similar vein, prefer avoiding typical JavaScript
constructor functions and prototypes.

Instead prefer modules that return object literals.  If you need a creation function, prefer the name
`create`, although I've certainly abused that with layers and layers of creations in places that I'm none
too proud about.  Although I'm of mixed opinion on this, I've tended to capitalize objects with a `create`
method to emulate the style for standard JavaScript constructors.

I have not used ES6 because it's not fully available on node 4, which is the lowest version of node
supported by mountebank.

### Dependency Injection

Early commits in mountebank's life included [mockery](https://github.com/mfncooper/mockery) to mock out
dependencies.  Despite the excellence of the library, I found the resultant code both harder to understand
and less testable.  Prefer passing dependencies into creation methods instead.

### Asynchronous Code

Use promises.  mountebank ships with [q](https://github.com/kriskowal/q) in the codebase.  The inimitable
[Pete Hodgson](http://blog.thepete.net) taught me how to
[test asynchronous JavaScript](http://martinfowler.com/articles/asyncJS.html) using promises.

### Requiring Packages

In the early days, the `mb` process started up quite quickly. Years later, that was no longer true,
but it was like boiling a frog, the small increase that came from various changes were imperceptible
at the time. The root cause was adding package dependencies - I had a pattern of making the `require`
calls at the top of each module. Since that was true for internal modules as well, the entire app,
including all dependencies, was loaded and parsed at startup, and each new dependency increased the
startup time.

The pattern now is, where possible, to scope the `require` calls inside the function that needs them.

### Linting

Like all bodies of code that have been around for several years, mountebank has its share of tech debt.
In the spirit of being as lazy as possible towards maintaining code quality, I rely on linting heavily.
You are welcome to fix any of it that you see in SaaS dashboards:

* [Code Climate](https://codeclimate.com/github/bbyars/mountebank)
* [Codacy](https://www.codacy.com/app/brandonbyars/mountebank/dashboard)
* [Bithound](https://www.bithound.io/github/bbyars/mountebank/master)
* [Test Coverage](https://codeclimate.com/github/bbyars/mountebank/coverage)

There are several linting tools run locally as well:

* eslint - I have a strict set of rules. Feel free to suggest changes if they interfere with your ability
to get changes committed, but if not I'd prefer to keep the style consistent.
* custom code that looks for unused packages and `only` calls left in the codebase
* A custom `shonkwrapCheck` test, that makes some verifications of the `npm-shrinkwrap.json` file.
Unfortunately, the standard `npm shrinkwrap` command doesn't work if you want to install mountebank
behind a repository manager (see [this issue](https://github.com/bbyars/mountebank/issues/141)), which
makes adding package dependencies to mountebank (or upgrading versions) clumsy. My general workflow
is to update `package.json`, delete `npm-shrinkwrap.json`, and then run `node_modules/.bin/shonkwrap`.

## Testing mountebank

I almost never manually QA anything before releasing, so automated testing is essential to
maintaining a quality product. There are four levels of testing in mountebank:

### Unit tests

These live in the `test` directory, with a directory structure that mostly mimics the production
code being tested (except in scenarios where I've used multiple test files for one production file,
as is the case for `predicates` and `behaviors`).  My general rule for unit tests is that they run
in-process. I have no moral objection to unit tests writing to the file system, but I aim to keep
each test small in scope. Your best bet is probably copying an existing test and modifying it.
Nearly all (maybe all) unit tests are protocol-agnostic, and I often use fake protocol requests
during the setup part of each test.

### Functional tests

These live in the `functionalTest` directory, and are out-of-process tests that verify three types
of behavior:

* Protocol-specific API behavior, in the `functionalTest/api` directory. Each of these tests expects
`mb` to be running (sometimes with the `--mock --debug --allowInjection` flags) and calls its API.
* Command line behavior, in the `functionalTest/commandLine` directory. Each of these tests spins
up a new instance of `mb` and verifies certain behaviors
* Website integrity, in the `functionalTest/html` directory. These expect `mb` to be running and
validate that there are no broken links, that each page is proper HTML, that the feed works, that
the site map is valid, and that the documentation examples are valid. That last point is unique
enough that I consider it to be an entirely different type of test, described next.

### Documentation tests

The `functionalTest/html/docsIntegrityTest.js` file crawls the website and looks for HTML code
blocks with certain attributes. It then executes those code examples and validates that the
documented results are correct. At first I wrote these tests as a check on my own laziness;
I know from experience how hard it is to keep the docs up-to-date. They proved quite useful,
however, as a kind of BDD style outside-in description of the behavior. They're also painful
to create and maintain.

You start by writing the docs, with the examples, in the appropriate file in `src/views/docs`.
The examples are wrapped in `pre` and `code` HTML blocks, and the `code` block uses special
HTML attributes:

* `data-test-id` defines the test scenario. All steps in a scenario are run sequentially.
* `data-test-step` defines the sequence within a scenario. For example, step 1 is run
before step 2
* `data-test-type` defines how the example is executed. There are four types supported:
  * `http` is the most common one, representing HTTP requests and responses.
  * `exec` is used for command line executions, like on the [getting started](http://www.mbtest.org/docs/gettingStarted)
  page
  * `smtp` is used for SMTP examples, as on the [mock verification](http://www.mbtest.org/docs/api/mocks) page
  * `file` is used to create and delete a file, as on the lookup examples on the
  [behavior](http://www.mbtest.org/docs/api/behaviors) page. The filename is provided with the
  `data-test-filename` attribute. To delete the file, leave the `code` block empty.
* `data-test-verify-step` references the `data-test-step` and validates that the response
(HTTP or command line) is as expected. The response generated by the referenced step must
be textually equivalent to what's in this `code` block
* `data-test-ignore-lines` provides an array of regular expressions. Every line matching
that pattern is ignored in the verification. For HTTP responses, for example, every
verification uses `data-test-ignore-lines='["^Date"]'` at a minimum to ignore the `Date`
header, which will never match since it changes with every run.

I will often comment out all files except the one I'm troubleshooting in
`functionalTest/html/docsIntegrityTest.js`.

### Performance tests

I only have a few of these, to ensure a flat memory usage under normal circumstances and
to ensure that the application startup time doesn't increase over time (as was happening
as more package dependencies were added). Performance testing is a key use case of
mountebank, so if you have experience writing performance tests and want to add some to
mountebank, I'd be eternally grateful. These are run in a special CI job and not as
part of the pre-commit script.

### Debugging

I was somewhat of a JavaScript newbie when I started mountebank, and even now, I don't actually
code for a living so I find it hard to keep my skills up-to-date. If you're a pro, feel free to skip
this section, but if you're like me, you may find the tips below helpful:

* mocha decorates test functions with an `only` function, that allows you to isolate test runs
  to a single context or a single function.  This works on both `describe` blocks and on `it` functions.
  You'll notice that I use a `promiseIt` function for my asynchronous tests, which just wraps the `it`
  function with promise resolution and error handling.  `promiseIt` also accepts an `only` function, so you
  can do `promiseIt.only('test description', function () {/*...*/});`
* Debugging asynchronous code is hard.  I'm not too proud to use `console.log`, and neither should you be.
* The functional tests require a running instance of `mb`.  If you're struggling with a particular test,
  and you've isolated it using the `only` function, you may want to run `mb` with the `--loglevel debug`
  switch.  The additional logging exposes a number of API and socket events.

A combination of `only` calls on tests with `console.log`s alongside a running instance of `mb`
is how I debug every test where it isn't immediately obvious why it's broken.

### The Continuous Integration Pipeline

Looking at the [README](https://github.com/bbyars/mountebank#build-status) will show that I have a complex CI pipeline.
Currently it involves Travis CI, Appveyor, and Snap CI, although I may add or remove from that list as I continue to
try and improve the pipeline.  At the moment, a commit will trigger a Travis CI build, which in turn triggers the other
CI systems through API calls, ensuring a consistent version throughout.  I've had bugs in different operating systems,
in different versions of node, and in the packages available for download.  The CI system tests as many of those combinations
as I reasonably can.

Every successful build that isn't a pull request deploys to a [test site](http://mountebank-dev.herokuapp.com/) that will
have a link to the artifacts for that prerelease version.

## Getting Help

The source documentation is always available at [Firebase](https://mountebank.firebaseapp.com/).

I'm also available via Skype or something similar for questions.  Feel free to reach me at brandon.byars@gmail.com
