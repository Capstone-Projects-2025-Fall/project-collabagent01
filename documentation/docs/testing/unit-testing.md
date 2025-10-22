---
sidebar_position: 1
---
# Unit tests

## Unit Test Library

We chose Jest as the unit testing framework because most of our files are in TypeScript and JavaScript. Jest is easy to set up, works well with these languages, and has built-in support for mocking and stubbing external classes.

## Key Features:

Mocking: Can fake modules and VS Code APIs so tests run on their own.

Auto Test Discovery: Finds and runs all test files automatically.

Assertions: Check results, function calls, and objects easily.

Code Coverage: Shows what parts of the code are tested.

Async Support: Works with async/await for things like team creation.

Test Isolation: Resets mocks and sets up fresh instances before each test.

## Suitability
Handles complex dependencies like VS Code APIs.

Supports async operations without extra setup.

Works well with TypeScript using ts-jest.

Good for VS Code extension testing (webviews, commands, extension lifecycle).

Easy to use in CI/CD pipelines.

[View Coverage Report](/test-coverage/index.html)
