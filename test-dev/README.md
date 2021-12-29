# Tests for `snowpack dev`

We moved the tests out of the common `test/` folder because of problems with Windows. This way, we can run the dev tests using a separate command, which we can run on CI on Ubuntu only.

We would love to figure out the problem. If you develop on a Windows machine, we would appreciate your help. See [#1171](https://github.com/withastro/snowpack/pull/1171) for more information.
