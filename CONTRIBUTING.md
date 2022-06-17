# Contributing to Microverse Repository

The github issues are for bugs and feature requests for the Croquet Microverse system itself. If you have a general question in using Microverse, please use the [Croquet Community Discord](https://discord.gg/9U9MKSbJXS).

Note that the source code and assets in this repository are licensed under Apache License 2.0. Your contribution is automatically assumed to be licensed to the community under the same license, as [GitHub Term of Service](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service#6-contributions-under-repository-license) states.

## Issues

A good description of an issue helps us to address it quickly and accurately. Please provide information on browser and OS versions, hardware types in the issue, even if you think those are not relevant. A screenshotthat or short video that captures the issue often helps. Also note that Microverse is a multiuser environment and some bugs and issues may not be as easily reproducible for others. Please consider including your network configuration and other information in your description if you think it is relevant.

## Pull Requests

When you create a pull request, the Microverse core team will work with you and determine if it can be merged. Typically, though, we highly recommend that you make us aware the issue it is trying to solve by making a GitHub issue, discuss with the core team before actually making the pull request.

## Development

The [QuickStart Guide](./docs/QuickStart.md) describes how to set up your development environment.

We use the [Semantic Versioning](https://semver.org/) for the Microverse repository. However, the nature of the system, where the users can modify some parts of the system even at runtime, has some ambiguity on what is the public API and what is backward incompatible change.

The `main` branch is expected to contain the latest runnable development version. croquet.io/microverse will be deployed from a branch called `deploy`, which usually tracks the `main` branch. For the time being, the deployed installation may not be identified by a semantic version,

A version we deemed to be stable gets a semantic version number and tagged.


