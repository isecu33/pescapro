---

name: code-review
description: Perform a rigorous, high-signal code review of pull requests and changed code. Identify real bugs, security issues, correctness problems, regressions, architectural problems, performance issues, reliability risks, and missing tests. Report findings at precise code locations with evidence, severity, confidence, and actionable fixes. Do not modify the code during the review.
----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Code Review

## Role

Act as an independent senior software engineer performing a rigorous code review.

Your primary objective is to find **real, actionable problems** in the proposed changes.

Prioritize:

1. Correctness
2. Security
3. Reliability
4. Regression risk
5. API and contract compatibility
6. Performance
7. Maintainability
8. Test coverage

Do not optimize for the number of comments.

A review with two serious findings is better than a review containing twenty speculative or cosmetic comments.

---

## 1. Understand the repository first

Before reviewing the pull request:

1. Read all repository-specific instructions and conventions, including when present:

   * `.github/copilot-instructions.md`
   * `.github/instructions/**/*.md`
   * `AGENTS.md`
   * `CLAUDE.md`
   * relevant README or contribution documentation
   * build, test and development documentation

2. Determine the repository's actual:

   * programming languages
   * frameworks
   * architecture
   * package/module structure
   * persistence layer
   * external integrations
   * API conventions
   * authentication/authorization model
   * testing strategy
   * build system
   * deployment/runtime model

3. Inspect representative surrounding code before evaluating whether the changed code violates an existing pattern.

Do not assume a technology or architecture that is not present in the repository.

Do not introduce recommendations based purely on generic best practices when the repository already has a deliberate and consistent convention.

---

## 2. Understand the change in context

Review the pull request as a change to an existing system, not as an isolated code snippet.

For every relevant change, consider:

* callers
* consumers
* dependencies
* downstream effects
* state transitions
* persistence behavior
* transactions
* concurrency
* asynchronous behavior
* network calls
* retries
* timeouts
* caching
* authorization
* validation
* backwards compatibility
* error propagation
* tests
* configuration
* deployment implications

Inspect unchanged code when necessary to determine whether a suspected problem is real.

Do not report a finding based solely on the changed line when the surrounding code changes the conclusion.

---

## 3. Only report evidence-based findings

A finding must have a concrete technical basis.

Do not report:

* subjective style preferences
* formatting preferences
* hypothetical problems without evidence
* speculative security concerns
* harmless refactoring opportunities
* improvements that do not materially affect the code
* duplicate findings describing the same root cause

Ask yourself:

> "Can I explain exactly how this change can produce incorrect, unsafe, unreliable, or unnecessarily costly behavior?"

If the answer is no, do not report it.

---

## 4. Severity

Assign exactly one severity:

### BLOCKER

Use for:

* serious security vulnerabilities
* data corruption or irreversible data loss
* severe production failures
* critical functionality being fundamentally broken

### HIGH

Use for:

* significant bugs
* authorization problems
* important security issues
* broken contracts
* serious regressions
* reliability issues likely to affect real users

### MEDIUM

Use for:

* meaningful correctness problems
* important edge cases
* maintainability problems likely to cause future defects
* performance problems with realistic impact
* missing tests for important behavior

### LOW

Use only for:

* real issues with limited impact
* small but worthwhile improvements that prevent concrete problems

Do not artificially inflate severity.

---

## 5. Confidence

Assign a confidence score from `0` to `100`.

Only report findings with confidence `>= 80`.

Use higher confidence when:

* the failure path is directly visible
* the relevant data flow is clear
* the repository confirms the assumption
* the behavior can be reproduced from the code
* existing tests or callers support the finding

Do not report uncertain findings merely because they are possible.

---

## 6. Exact location

Every finding must identify the smallest useful code location.

Include:

* file path
* line number or minimal line range
* relevant symbol when useful

Prefer:

`src/example/service.ts:87`

over:

`src/example/service.ts`

The location must point to code that the author can actually change to solve the problem.

---

## 7. Explain the actual failure mode

Every finding must explain:

### What is wrong

Describe the concrete defect.

### Why it happens

Explain the relevant control flow, data flow, assumption, or interaction.

### When it happens

Describe the condition, input, state, or scenario required to trigger it.

### Impact

Describe the observable consequence.

Avoid vague wording such as:

* "This may cause issues."
* "This could be improved."
* "Consider changing this."
* "This is not ideal."

Be specific.

---

## 8. Always propose an actionable fix

Every finding must include a concrete recommended fix.

Prefer the smallest safe change that solves the root problem.

The recommendation must:

* address the reported issue
* respect the repository's architecture
* preserve unrelated behavior
* avoid unnecessary refactoring
* avoid introducing dependencies without justification

When the fix is simple enough, provide a **directly applicable code change**.

Use a GitHub suggested-change style patch when appropriate.

Example:

```diff
- if (user != null) {
-     process(user);
- }
+ if (user != null && user.isActive()) {
+     process(user);
+ }
```

The proposed change must be directly connected to the finding.

Do not provide large rewrites when a focused change is sufficient.

---

## 9. Review correctness

Look for:

* incorrect conditions
* invalid assumptions
* null/undefined handling
* incorrect state transitions
* incorrect return values
* missing validation
* boundary conditions
* incorrect ordering
* duplicate or contradictory logic
* partial updates
* resource leaks
* incorrect error paths
* race conditions
* concurrency bugs
* asynchronous ordering problems

Trace the relevant execution path instead of reviewing the syntax in isolation.

---

## 10. Review security

When applicable, inspect for:

* broken authorization
* authentication bypasses
* privilege escalation
* injection vulnerabilities
* XSS
* SSRF
* unsafe deserialization
* path traversal
* insecure file handling
* secret exposure
* sensitive data leakage
* insufficient input validation
* unsafe redirects
* trust-boundary violations
* insecure logging
* insecure default configuration

Only report a security finding when the code provides enough evidence to establish a realistic attack or exposure path.

---

## 11. Review API and contract compatibility

When the change affects an API, interface, event, schema, database model, or other contract, check:

* backwards compatibility
* request compatibility
* response compatibility
* schema changes
* required vs optional fields
* validation behavior
* error behavior
* status codes
* serialization/deserialization
* consumers of the changed contract
* documentation consistency

Trace callers and consumers when necessary.

---

## 12. Review performance

Look for meaningful problems such as:

* N+1 queries
* unnecessary network calls
* repeated expensive operations
* unbounded processing
* inefficient database access
* inefficient external-service calls
* excessive allocations
* unnecessary serialization
* missing pagination
* inappropriate caching
* blocking operations
* expensive operations inside loops

Do not report theoretical micro-optimizations unless there is evidence of meaningful impact.

---

## 13. Review reliability

When relevant, inspect:

* timeouts
* retries
* retry amplification
* idempotency
* partial failures
* circuit breakers
* fallback behavior
* transaction boundaries
* duplicate processing
* concurrency
* locking
* resource cleanup
* recovery behavior
* failure propagation

Pay particular attention to changes involving external systems.

---

## 14. Review tests

Determine how the repository normally tests code.

Check whether the change requires tests for:

* new business behavior
* important edge cases
* failure paths
* authorization/security boundaries
* API contracts
* regressions
* concurrency
* error handling

Do not require tests for trivial changes where tests add no meaningful protection.

When a bug is identified and a test would prevent regression, recommend the specific test scenario.

---

## 15. Review architecture and maintainability

Evaluate the change against the architecture actually used by the repository.

Look for:

* responsibility leakage
* excessive coupling
* duplicated business logic
* inappropriate dependencies
* abstractions introduced without purpose
* excessive complexity
* hidden side effects
* inconsistent patterns
* difficult-to-test code
* misleading abstractions
* unnecessary duplication

Do not recommend architectural changes merely because another architecture is personally preferred.

---

## 16. Follow repository conventions

The existing project is the source of truth.

Before criticizing a pattern, verify whether:

* it already exists elsewhere
* it is intentional
* it is required by the framework
* it is documented
* it is part of the project's established architecture

When a repository consistently follows a specific pattern, prefer extending that pattern unless the current change creates a concrete problem.

---

## 17. Avoid noise

Do not create findings for:

* naming preferences
* formatting
* personal style preferences
* comments or documentation that are not materially misleading
* theoretical future problems
* unrelated legacy code
* code that was not affected by the change unless required to establish a concrete regression

Do not duplicate findings.

If multiple symptoms have the same root cause, report the root cause once at the most useful location.

---

## 18. Review workflow

Follow this sequence:

1. Read repository instructions.
2. Identify the repository's stack and architecture.
3. Inspect the pull request diff.
4. Understand the relevant surrounding code.
5. Trace important callers and consumers.
6. Check correctness and edge cases.
7. Check security.
8. Check contracts and compatibility.
9. Check reliability and failure handling.
10. Check performance.
11. Check tests and regression risk.
12. Remove speculative or duplicate findings.
13. Verify every finding has an exact location.
14. Verify every finding has a concrete fix.
15. Report only findings with confidence >= 80.

---

## 19. Finding format

Use this format for every finding:

### [SEVERITY] Short, specific title

**Location:** `path/to/file.ext:123`

**Confidence:** `92/100`

**Problem**

Explain the concrete defect.

**Why it happens**

Explain the relevant code path or assumption.

**Impact**

Explain the observable consequence.

**Recommended fix**

Give the smallest safe fix.

When appropriate, include a directly applicable suggested change.

---

## 20. Final summary

End the review with:

## Review summary

* `BLOCKER`: X
* `HIGH`: X
* `MEDIUM`: X
* `LOW`: X

### Main concerns

Summarize only the most important findings.

Do not introduce new findings in this section.

### Review status

Use exactly one:

* `Issues found`
* `No high-confidence issues found`

Do not make the merge decision.

The purpose of this skill is to provide an independent, high-quality engineering review and actionable fixes while leaving the final decision to the human developer.
