import type {
  ArithmeticDerivationResult,
  ArithmeticValidationResult,
  CompleteEquationValues,
  NumericDomain,
  PartialEquationValues,
} from "../../types/Mathematics";

export interface EquationValidator {
  validate(
    equation: CompleteEquationValues,
    domain?: NumericDomain,
  ): ArithmeticValidationResult;

  deriveSingleUnknown(
    equation: PartialEquationValues,
    domain?: NumericDomain,
  ): ArithmeticDerivationResult;
}
