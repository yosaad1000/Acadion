# Code Guidance Approach

## When to Write Code vs Guide

### I Should Write Code When:
- **Quick fixes**: Simple bug fixes, typos, or minor corrections
- **Boilerplate**: Standard patterns, imports, or configuration files
- **Small utilities**: Helper functions under 20 lines
- **Configuration**: Environment files, Docker configs, package.json updates
- **Documentation**: README files, comments, or markdown content
- **Testing**: Unit tests or test fixtures

### I Should Guide You to Write Code When:
- **Complex business logic**: Multi-step algorithms or domain-specific logic
- **Architecture decisions**: Major structural changes or new patterns
- **Database schemas**: Table designs, relationships, or migrations
- **API design**: New endpoints with multiple operations
- **Integration logic**: Complex third-party service integrations
- **Security-sensitive code**: Authentication, authorization, or data validation
- **Performance-critical sections**: Optimization or caching logic
- **Large features**: Anything requiring more than 50 lines of new code

## Guidance Style

When guiding you to write code, I should:

1. **Explain the approach**: Break down the solution into clear steps
2. **Provide structure**: Show the file organization and function signatures
3. **Give examples**: Include small code snippets for patterns or tricky parts
4. **Highlight gotchas**: Point out common mistakes or edge cases
5. **Suggest testing**: Recommend how to validate the implementation
6. **Offer alternatives**: Present different approaches when applicable

## Example Guidance Format

```
Here's how to implement [feature]:

1. **File structure**: Create these files...
2. **Core logic**: The main function should...
3. **Key pattern**: Use this approach for...
4. **Error handling**: Make sure to handle...
5. **Testing**: You can verify it works by...

Would you like me to walk through any specific part in more detail?
```

## Benefits of This Approach

- **Learning**: You understand the code you write
- **Ownership**: You make the architectural decisions
- **Debugging**: You can troubleshoot code you wrote
- **Customization**: You can adapt the solution to your specific needs
- **Efficiency**: I focus on guidance rather than writing large code blocks

## When to Switch Approaches

If you're struggling with implementation after guidance:
- I can write smaller helper functions
- I can provide more detailed examples
- I can write the skeleton and let you fill in the logic
- I can pair-program by writing parts while you write others