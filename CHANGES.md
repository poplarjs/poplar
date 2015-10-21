1.3.13
- Fix `ctx.method` conflicts with `ctx.request.method` bug

1.3.12
- Change Poplar global `__locals` to `Poplar.locals`

1.3.11
- Add type cast for Entity
- Add more Dynamic converters
- Allow user to directly access `ctx` in apiMethod when in non restrict mode
- Add delegates to `ctx` from `req` and `res`

1.3.10
- Add StateManager, before, after, afterError and method call will be reflected on state's change event
- Add corresponding tests for StateManager
- Delegate apiMethod error to afterError hook
- Update dependencies

1.3.9
- Add several methods for ApiBuilder.prototype: `prepend`, `exists`, `undefine` and update corresponding tests

1.3.8
- Change ApiMethod `returns` behaviour, use default context `done` method to handle request

1.3.7
- Avoid Entity parse empty value such as `undefined` and `null` after default value applied

1.3.6
- Update travis.yml
- Use `_.each` and `_.map` instead of original `Array.prototype.forEach` and `Array.prototype.map` for performance issue
- Update package and dependencies version

1.3.5
- Add `isValidated` and `isSanitized` statuses
- Remove HttpContext `helpers` support
- Update package and dependencies version

1.3.4
- Refactor `Validate` module, and allow using `{ required: 'name is required' }` syntax

1.3.3
- Update basePath regexp to allow `.`, `-`

1.3.2
-----------
- Enhance `ApiBuilder.prototype.extend` function with `events` inherits
- Move `required` from `validates` to outer
- Add tests for `Validate` and `Sanitize` for method existance check

1.3.1
-----------
- Add `#set`, `#get`, `#unset` for poplar constructor and instance
- Add more embed documentation
- Add `build.sh` script for generating documentation

1.3.0
-----------
- Add Sanitizer support: xss, trim e.g.
- Fix helpers.isEmpty return NaN as false
- Add Validate#extend method for adding custom validator
- Add missing `description` to MethodInvocation
- Add MethodInvocation to avoid direct change to ApiMethod
- Add test cases for MethodInvocation
- Update dependencies
- Remove unused functions and fix argument convert bug
- Change default error handler bahavior
- Allow to define multi hooks(before, after, afterError) for one time
- Add more tests
- Add Context options#helpers as method invocation context
- Better route debug info

1.2.0
-----------

- Add human readable routes debug info
- Fix Entity parse bug, options will lost when parsing array object
- Add args to entity options
- Allow validation required to be a function
- Better debug information for routers
- Add checking for http verb
- Add basePath support for Poplar instance


1.1.0
-----------

- Add default value to accepts
- Add params argument to validation custom function
- Fix broken tests and bug under node version 0.10
- Add `presenterSource` to ApiMethod options and cooresponding tests
- Better validation info when customized function contains errors
- Add function `flatten()` to validationError

1.0.0
-----------

- Initial release!
