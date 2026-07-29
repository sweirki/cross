# Cross Mathematics Specification

Version: 1.0  
Status: Draft

## 1. Purpose

This document defines the arithmetic rules used by the Cross puzzle engine.

The mathematics layer is independent from rendering, input handling, puzzle generation, and persistence. Every subsystem must use the same arithmetic contracts and validation rules.

## 2. Canonical Equation Shape

The first engine version supports equations with exactly two operands and one result:

```text
left operand operator right operand = result
```

Examples:

```text
7 + 5 = 12
9 - 4 = 5
6 Ã— 3 = 18
20 Ã· 4 = 5
```

Longer expressions, parentheses, exponentiation, roots, percentages, and fractions are excluded from version 1.

## 3. Supported Operators

The supported arithmetic operators are:

- addition
- subtraction
- multiplication
- division

The serialized operator names are:

```text
add
subtract
multiply
divide
```

Display symbols are renderer concerns and are not used as the canonical engine representation.

## 4. Integer-Only Rule

All operands and results must be integers.

Version 1 does not allow:

- decimal operands,
- decimal results,
- fractional results,
- approximate equality,
- floating-point arithmetic.

All arithmetic must be evaluated using exact integer rules.

## 5. Numeric Domain

The engine supports positive integers only.

The canonical version 1 range is:

```text
minimum value: 1
maximum value: 99
```

Zero and negative values are excluded from version 1 puzzle content.

The range is a generation policy and may later be made difficulty-dependent, but all version 1 puzzles must remain inside the canonical domain.

## 6. Operator Rules

### Addition

```text
left + right = result
```

Requirements:

- all values are positive integers;
- the result must be within the numeric domain.

### Subtraction

```text
left - right = result
```

Requirements:

- `left` must be greater than `right`;
- the result must be positive;
- negative and zero results are forbidden.

Canonical subtraction never swaps operands during evaluation. Equation order is meaningful.

### Multiplication

```text
left Ã— right = result
```

Requirements:

- all values are positive integers;
- the result must be within the numeric domain.

### Division

```text
left Ã· right = result
```

Requirements:

- the divisor must not be zero;
- division must be exact;
- `left % right` must equal zero;
- the result must be a positive integer;
- the result must be within the numeric domain.

Fractional division is forbidden.

## 7. Equality Rule

An equation is valid only when the ordered operands and operator evaluate exactly to the stored result.

No tolerance, rounding, coercion, or alternate interpretation is permitted.

## 8. Duplicate Values

Duplicate numeric values are allowed on the board and in the number bank.

However, duplicate values must remain distinct logical entities.

Example:

```text
tile-17: value 8
tile-42: value 8
```

The game engine must track tile identity separately from tile value.

## 9. Commutativity

Addition and multiplication are mathematically commutative, but equation paths remain ordered.

These two equations have the same arithmetic truth:

```text
3 + 5 = 8
5 + 3 = 8
```

They are still different serialized equations because their node order differs.

Subtraction and division are never commutative.

## 10. Arithmetic Evaluation Contract

The arithmetic engine must provide deterministic operations for:

1. evaluating a complete equation;
2. validating a complete equation;
3. deriving one missing value when the other two values and the operator are known;
4. rejecting impossible or ambiguous derivations;
5. enumerating legal values within a supplied domain.

The same evaluator must be used by:

- gameplay validation,
- solver search,
- puzzle generation,
- uniqueness certification,
- test fixtures.

No subsystem may implement its own arithmetic interpretation.

## 11. Missing-Value Derivation

For one equation containing exactly one unknown number, the engine may derive the missing value.

Examples:

```text
? + 5 = 12  -> 7
9 - ? = 4   -> 5
6 Ã— ? = 18  -> 3
20 Ã· ? = 5  -> 4
? Ã· 4 = 5   -> 20
```

A derivation is valid only when the resulting complete equation passes every arithmetic rule and remains inside the numeric domain.

## 12. Generation Policies

The mathematics layer defines legality. The generator defines desirability.

Therefore, mathematically legal equations may still be rejected by generation policy for reasons such as:

- excessive repeated values,
- trivial identity patterns,
- overly obvious multiplication facts,
- weak deduction value,
- unsuitable difficulty,
- poor interaction with intersecting equations.

Those are generator or difficulty concerns, not arithmetic validity concerns.

## 13. Locked Version 1 Rules

The following are locked for the first production engine:

1. exactly two operands per equation;
2. positive integers only;
3. numeric values from 1 through 99;
4. no zero;
5. no negative numbers;
6. no fractions or decimals;
7. exact division only;
8. positive subtraction results only;
9. deterministic integer evaluation;
10. one shared arithmetic implementation for every subsystem.
