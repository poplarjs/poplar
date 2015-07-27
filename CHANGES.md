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
