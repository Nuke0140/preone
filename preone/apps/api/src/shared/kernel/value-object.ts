/**
 * ValueObject — base class for all DDD value objects (immutable, equals-by-value).
 *
 * Per BTD §5.1: "Immutable VOs (Address, Money, Age, TimeWindow)"
 * Per BTD §26.1: "Equals by value; throw on invalid construction"
 *
 * VOs enforce their own invariants in the constructor —
 * construction either succeeds (valid) or throws (invalid).
 * No partial / half-built VOs ever exist.
 */
export abstract class ValueObject<TProps extends Record<string, unknown>> {
  protected readonly _props: TProps;

  constructor(props: TProps) {
    this._props = Object.freeze({ ...props });
  }

  get props(): Readonly<TProps> {
    return this._props;
  }

  /** Equals-by-value comparison. */
  equals(other?: ValueObject<TProps>): boolean {
    if (other === undefined || other === null) return false;
    if (this.constructor !== other.constructor) return false;
    return JSON.stringify(this._props) === JSON.stringify(other._props);
  }

  /** Override for custom toString() in subclasses. */
  toString(): string {
    return JSON.stringify(this._props);
  }
}
